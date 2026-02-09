import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { WorkOS } from "@workos-inc/node";
import { generateICS } from "./lib/icsGenerator";

/**
 * HTTP Routes for OccuHealth
 *
 * This module defines all HTTP endpoints for the Convex backend:
 *
 * ## Authentication Routes (WorkOS AuthKit)
 * - GET /auth/login - Initiates OAuth flow, redirects to WorkOS
 * - GET /auth/callback - Handles OAuth callback, creates session
 * - GET /auth/logout - Signs out of WorkOS session
 * - POST /auth/refresh - Refreshes access token
 *
 * ## OAuth Flow
 * 1. User clicks login -> redirected to WorkOS AuthKit
 * 2. User authenticates -> WorkOS redirects to /auth/callback
 * 3. Backend validates code, fetches user info
 * 4. Role-based routing: employer/doctor/admin portal
 *
 * ## Utility Routes
 * - GET /health - Health check endpoint
 * - GET /calendar/:token - ICS calendar download for appointments
 *
 * @module http
 * @see {@link https://workos.com/docs/user-management} WorkOS AuthKit docs
 */

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
  handler: httpAction(async (ctx, request) => {
    try {
      const workos = getWorkOS();
      const clientId = process.env.WORKOS_CLIENT_ID!;
      const url = new URL(request.url);
      const fresh = url.searchParams.get("fresh") === "true";
      const returnTo = url.searchParams.get("returnTo");

      // SEC-002 FIX: Generate and store CSRF state
      const state = crypto.randomUUID();
      const createArgs: { state: string; expiresAt: number; returnTo?: string } = {
        state,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5-minute TTL
      };
      // Store validated returnTo origin in OAuth state for callback redirect
      if (returnTo && (returnTo.startsWith("http://") || returnTo.startsWith("https://"))) {
        createArgs.returnTo = returnTo;
      }
      await ctx.runMutation(internal.oauthState.create, createArgs);

      const authParams: Parameters<typeof workos.userManagement.getAuthorizationUrl>[0] = {
        provider: "authkit",
        redirectUri: `${process.env.CONVEX_SITE_URL}/auth/callback`,
        clientId,
        state,
      };

      let authorizationUrl = workos.userManagement.getAuthorizationUrl(authParams);

      // If fresh=true, append prompt=login to force re-authentication
      if (fresh) {
        authorizationUrl += "&prompt=login";
      }

      return Response.redirect(authorizationUrl, 302);
    } catch (err) {
      console.error("WorkOS login error:", err);
      return new Response(
        JSON.stringify({
          error: "CONFIGURATION_ERROR",
          message: "WorkOS authentication not configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// Logout route - properly signs out of WorkOS session
http.route({
  path: "/auth/logout",
  method: "GET",
  handler: httpAction(async (_, request) => {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const returnToParam = url.searchParams.get("returnTo");
    const appUrl =
      (returnToParam && (returnToParam.startsWith("http://") || returnToParam.startsWith("https://")) ? returnToParam : null)
      || process.env.APP_URL
      || "http://localhost:5175";

    if (!sessionId) {
      return Response.redirect(appUrl, 302);
    }

    try {
      const workos = getWorkOS();
      const logoutUrl = workos.userManagement.getLogoutUrl({
        sessionId,
        returnTo: appUrl,
      });
      return Response.redirect(logoutUrl, 302);
    } catch (err) {
      console.error("WorkOS logout error:", err);
      return Response.redirect(appUrl, 302);
    }
  }),
});

http.route({
  path: "/auth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    // appUrl is determined after state validation (returnTo from stored OAuth state)
    let appUrl = process.env.APP_URL || "http://localhost:5175";

    // Handle OAuth errors from WorkOS
    if (error) {
      console.error("WorkOS OAuth error:", error, errorDescription);
      return Response.redirect(
        `${appUrl}/login?error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    // SEC-002 FIX: Validate state parameter (CSRF protection)
    if (!state) {
      console.error("Missing OAuth state parameter");
      return Response.redirect(`${appUrl}/login?error=missing_state`, 302);
    }

    const storedState = await ctx.runQuery(internal.oauthState.validate, { state });
    if (!storedState) {
      console.error("Invalid or expired OAuth state");
      return Response.redirect(`${appUrl}/login?error=invalid_state`, 302);
    }

    // Use stored returnTo origin if available (dynamic origin passthrough)
    if (storedState.returnTo) {
      appUrl = storedState.returnTo;
    }

    // Delete used state to prevent replay attacks
    await ctx.runMutation(internal.oauthState.deleteState, { state });

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

      // Extract session ID from JWT for proper logout
      const jwtPayload = JSON.parse(atob(accessToken.split(".")[1]));
      const sessionId = jwtPayload.sid as string;

      // Check role-based routing - which table does this user belong to?
      const [employer, doctor, adminUser] = await Promise.all([
        ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
        ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
        ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
      ]);

      // Determine redirect path based on role (admin highest privilege first)
      let redirectPath = "/register/choose-role";
      if (adminUser) {
        redirectPath = "/admin";
      } else if (doctor) {
        redirectPath = "/doctor";
      } else if (employer) {
        redirectPath = "/employer";
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

      // SEC-001: Cross-origin auth requires URL params (sessionStorage is origin-specific)
      // The frontend reads tokens from URL params and immediately processes them
      // Note: Tokens in URLs appear in browser history - this is acceptable for OAuth flows
      // as the tokens are short-lived and the callback page processes them immediately
      const callbackUrl = new URL(`${appUrl}/auth/callback`);
      callbackUrl.searchParams.set("accessToken", accessToken);
      if (refreshToken) {
        callbackUrl.searchParams.set("refreshToken", refreshToken);
      }
      callbackUrl.searchParams.set("userId", user.id);
      callbackUrl.searchParams.set("sessionId", sessionId);
      callbackUrl.searchParams.set("redirectPath", redirectPath);

      return Response.redirect(callbackUrl.toString(), 302);
    } catch (err) {
      console.error("WorkOS callback error:", err);
      return Response.redirect(
        `${appUrl}/login?error=${encodeURIComponent("Authentication failed")}`,
        302
      );
    }
  }),
});

// ---------------------------------------------------------------------------
// CORS Headers for API Endpoints
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------------------------------------------------------------------
// Security Headers (CSP, X-Content-Type-Options, etc.)
// ---------------------------------------------------------------------------
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.workos.com",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

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
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );
  }),
});

// ---------------------------------------------------------------------------
// Token Refresh Endpoint
// ---------------------------------------------------------------------------
http.route({
  path: "/auth/refresh",
  method: "POST",
  handler: httpAction(async (_, request) => {
    try {
      const body = await request.json();
      const refreshToken = body?.refreshToken;

      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "Missing refresh token" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const workos = getWorkOS();
      const clientId = process.env.WORKOS_CLIENT_ID!;
      const result = await workos.userManagement.authenticateWithRefreshToken({
        clientId,
        refreshToken,
      });

      return new Response(
        JSON.stringify({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (error) {
      console.error("Token refresh failed:", error);
      return new Response(
        JSON.stringify({ error: "Token refresh failed" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }),
});

// CORS preflight for refresh endpoint
http.route({
  path: "/auth/refresh",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ---------------------------------------------------------------------------
// Calendar Download Endpoint (ICS file for appointment)
// ---------------------------------------------------------------------------
http.route({
  path: "/calendar/:token",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract token from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const token = pathParts[pathParts.length - 1];

    // Validate token and get appointment
    const result = await ctx.runQuery(
      internal.appointmentTokens.validateAndGetAppointmentInternal,
      { token }
    );

    // Handle invalid/expired token
    if (!result.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired appointment link" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate ICS file
    const ics = generateICS({
      title: result.appointmentType?.name || "Medical Appointment",
      description: result.appointment.reason || "",
      startDate: result.appointment.scheduledDate || "",
      startTime: result.appointment.startTime || "",
      endTime: result.appointment.endTime || "",
      location: result.doctor?.zoomLink,
      organizer: "noreply@occuhealth.com",
    });

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="appointment.ics"',
      },
    });
  }),
});

export default http;
