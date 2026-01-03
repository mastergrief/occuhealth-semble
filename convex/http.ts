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

      // Check role-based routing - which table does this user belong to?
      const [employer, doctor, adminUser] = await Promise.all([
        ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
        ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
        ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
      ]);

      // Determine redirect path based on role
      let redirectPath = "/register/choose-role";
      if (employer) {
        redirectPath = "/employer";
      } else if (doctor) {
        redirectPath = "/doctor";
      } else if (adminUser) {
        redirectPath = "/admin";
      }

      // If admin user, upsert to update last login
      if (adminUser) {
        await ctx.runMutation(internal.adminUsers.upsertAdminUser, {
          workosUserId: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          profilePictureUrl: user.profilePictureUrl || undefined,
        });
      }

      // Redirect to app with tokens (frontend will store them)
      const appUrl = process.env.APP_URL || "http://localhost:5175";
      const redirectUrl = new URL(`${appUrl}/auth/callback`);
      redirectUrl.searchParams.set("accessToken", accessToken);
      if (refreshToken) {
        redirectUrl.searchParams.set("refreshToken", refreshToken);
      }
      redirectUrl.searchParams.set("userId", user.id);
      redirectUrl.searchParams.set("redirectPath", redirectPath);

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
