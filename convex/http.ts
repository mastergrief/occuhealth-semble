import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { WorkOS } from "@workos-inc/node";

const http = httpRouter();

// ---------------------------------------------------------------------------
// WorkOS AuthKit Routes (Admin Authentication)
// ---------------------------------------------------------------------------
// Login: Redirects to WorkOS hosted auth page
// Callback: Handles OAuth callback and creates session
// ---------------------------------------------------------------------------

function getWorkOS() {
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;

  if (!apiKey || !clientId) {
    throw new Error("WORKOS_API_KEY and WORKOS_CLIENT_ID must be configured");
  }

  return new WorkOS(apiKey, { clientId });
}

http.route({
  path: "/auth/login",
  method: "GET",
  handler: httpAction(async () => {
    try {
      const workos = getWorkOS();
      const clientId = process.env.WORKOS_CLIENT_ID!;

      const authorizationUrl = workos.userManagement.getAuthorizationUrl({
        provider: "authkit",
        redirectUri: `${process.env.CONVEX_SITE_URL}/auth/callback`,
        clientId,
      });

      return Response.redirect(authorizationUrl, 302);
    } catch (err) {
      console.error("WorkOS login error:", err);
      return new Response("WorkOS not configured", { status: 500 });
    }
  }),
});

http.route({
  path: "/auth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("WorkOS OAuth error:", error, errorDescription);
      const appUrl = process.env.APP_URL || "http://localhost:5175";
      return Response.redirect(
        `${appUrl}/login?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    try {
      const workos = getWorkOS();
      const clientId = process.env.WORKOS_CLIENT_ID!;

      // Exchange code for user info
      const { user, accessToken, refreshToken } =
        await workos.userManagement.authenticateWithCode({
          code,
          clientId,
        });

      // Store/update admin user in database
      await ctx.runMutation(internal.adminUsers.upsertAdminUser, {
        workosUserId: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profilePictureUrl: user.profilePictureUrl || undefined,
      });

      // Redirect to app with tokens (frontend will store them)
      const appUrl = process.env.APP_URL || "http://localhost:5175";
      const redirectUrl = new URL(`${appUrl}/auth/callback`);
      redirectUrl.searchParams.set("accessToken", accessToken);
      if (refreshToken) {
        redirectUrl.searchParams.set("refreshToken", refreshToken);
      }
      redirectUrl.searchParams.set("userId", user.id);

      return Response.redirect(redirectUrl.toString(), 302);
    } catch (err) {
      console.error("WorkOS callback error:", err);
      const appUrl = process.env.APP_URL || "http://localhost:5175";
      return Response.redirect(
        `${appUrl}/login?error=${encodeURIComponent("Authentication failed")}`,
        302
      );
    }
  }),
});

// ---------------------------------------------------------------------------
// Auth Routes (Convex Auth)
// ---------------------------------------------------------------------------
auth.addHttpRoutes(http);

// ---------------------------------------------------------------------------
// Semble Webhook Endpoint
// ---------------------------------------------------------------------------
// Receives webhook events from Semble for real-time sync
// Configure in Semble: Settings > Integrations > Webhooks
// URL: https://your-deployment.convex.site/webhooks/semble
// ---------------------------------------------------------------------------

http.route({
  path: "/webhooks/semble",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // ------------------------------------
      // 1. Verify HMAC Signature
      // ------------------------------------
      const signature = request.headers.get("x-semble-signature");
      const webhookSecret = process.env.SEMBLE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("SEMBLE_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const body = await request.text();

      // Verify HMAC-SHA256 signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(body)
      );
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }

      // ------------------------------------
      // 2. Parse Event
      // ------------------------------------
      const event = JSON.parse(body) as {
        id: string;
        type: string;
        data: Record<string, unknown>;
        timestamp: string;
      };

      // ------------------------------------
      // 3. Idempotency Check
      // ------------------------------------
      const existingEvent = await ctx.runQuery(
        internal.sembleWebhooks.getEventById,
        { eventId: event.id }
      );

      if (existingEvent) {
        // Already processed - return success (idempotent)
        return new Response("OK", { status: 200 });
      }

      // ------------------------------------
      // 4. Store Event (pending)
      // ------------------------------------
      await ctx.runMutation(internal.sembleWebhooks.createEvent, {
        eventId: event.id,
        eventType: event.type,
        payload: event.data,
        status: "pending",
      });

      // ------------------------------------
      // 5. Process Event by Type
      // ------------------------------------
      try {
        switch (event.type) {
          case "patient.created":
          case "patient.updated":
            await ctx.runMutation(internal.sembleWebhooks.processPatientEvent, {
              eventId: event.id,
              data: event.data,
            });
            break;

          case "appointment.created":
          case "appointment.updated":
          case "appointment.cancelled":
            await ctx.runMutation(
              internal.sembleWebhooks.processAppointmentEvent,
              {
                eventId: event.id,
                data: event.data,
              }
            );
            break;

          default:
            console.log(`Unhandled webhook event type: ${event.type}`);
        }

        // Mark as processed
        await ctx.runMutation(internal.sembleWebhooks.markEventProcessed, {
          eventId: event.id,
        });
      } catch (error) {
        // Mark as failed
        await ctx.runMutation(internal.sembleWebhooks.markEventFailed, {
          eventId: event.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "convex-medical-starter",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
