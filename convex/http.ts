import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
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
  handler: httpAction(async (ctx, request) => {
    try {
      const workos = getWorkOS();
      const clientId = process.env.WORKOS_CLIENT_ID!;
      const url = new URL(request.url);
      const fresh = url.searchParams.get("fresh") === "true";

      // SEC-002 FIX: Generate and store CSRF state
      const state = crypto.randomUUID();
      await ctx.runMutation(internal.oauthState.create, {
        state,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5-minute TTL
      });

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
      return new Response("WorkOS not configured", { status: 500 });
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
    const appUrl = process.env.APP_URL || "http://localhost:5175";

    console.log("Logout request - sessionId:", sessionId ? "present" : "missing");

    if (!sessionId) {
      console.log("No sessionId, redirecting home");
      return Response.redirect(appUrl, 302);
    }

    try {
      const workos = getWorkOS();
      const logoutUrl = workos.userManagement.getLogoutUrl({
        sessionId,
        returnTo: appUrl,
      });
      console.log("WorkOS logout URL generated, redirecting...");
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
    const appUrl = process.env.APP_URL || "http://localhost:5175";

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
      console.log("JWT claims:", Object.keys(jwtPayload));
      console.log("Session ID from JWT:", sessionId || "NOT FOUND");

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


// ---------------------------------------------------------------------------
// CORS Headers for API Endpoints
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

export default http;
