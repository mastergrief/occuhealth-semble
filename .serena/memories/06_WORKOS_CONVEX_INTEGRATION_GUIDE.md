# WorkOS AuthKit + Convex Integration Guide

**Version**: 1.0
**Last Updated**: 2026-01-04
**Compatibility**: Convex 1.25+, @convex-dev/workos 0.0.1+, @workos-inc/authkit-react 0.11+

---

## Overview

This guide documents the complete setup for integrating WorkOS AuthKit with Convex for authentication. WorkOS provides enterprise-ready authentication (SSO, MFA, user management) while Convex handles the backend validation.

**Architecture Flow**:
```
User → AuthKit UI → WorkOS OAuth → JWT Token → Convex Backend → ctx.auth.getUserIdentity()
```

---

## Prerequisites

- Convex project initialized (`npx convex dev`)
- WorkOS account (https://workos.com/sign-up)
- React/Next.js frontend

---

## Step 1: WorkOS Dashboard Setup

### 1.1 Create WorkOS Account
1. Sign up at https://workos.com/sign-up
2. Create a new project/environment

### 1.2 Enable AuthKit
1. Navigate to **Authentication → AuthKit**
2. Click **Enable AuthKit**

### 1.3 Configure Redirect URI
1. Go to **Authentication → AuthKit → Redirects**
2. Add your callback URL:
   - Development: `http://localhost:5173` (Vite) or `http://localhost:3000` (Next.js)
   - Production: `https://your-domain.com`

### 1.4 Copy Credentials
From **API Keys** section, copy:
- **Client ID**: `client_01XXXXXXXXXXXXXXXXXX`
- **API Key**: `sk_test_XXXXXXXXXXXXXXXXXX` (for server-side operations)

---

## Step 2: Install Packages

```bash
# Required packages
npm install @convex-dev/workos @workos-inc/authkit-react

# For server-side operations (optional)
npm install @workos-inc/node
```

**Package purposes**:
- `@convex-dev/workos`: Bridges AuthKit to Convex's auth system
- `@workos-inc/authkit-react`: React hooks and providers for AuthKit
- `@workos-inc/node`: Server-side WorkOS SDK (for token refresh, user management)

---

## Step 3: Environment Variables

### 3.1 Frontend (.env.local)
```bash
# Convex
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# WorkOS (prefix with VITE_ for Vite, NEXT_PUBLIC_ for Next.js)
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173
```

### 3.2 Convex Backend (Dashboard or .env.local)
```bash
# Set in Convex Dashboard → Settings → Environment Variables
WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
WORKOS_API_KEY=sk_test_XXXXXXXXXXXXXXXXXX
```

**Important**: `WORKOS_CLIENT_ID` must be available to Convex backend for `auth.config.ts`.

---

## Step 4: Convex Auth Configuration

### 4.1 Create `convex/auth.config.ts`

**CRITICAL**: Two providers are required for WorkOS to work correctly.

```typescript
// convex/auth.config.ts

const clientId = process.env.WORKOS_CLIENT_ID;

export default {
  providers: [
    // Provider 1: SSO tokens (enterprise SSO flows)
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    // Provider 2: User Management tokens (AuthKit password/OAuth flows)
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
```

### 4.2 Deploy Configuration

```bash
npx convex dev --once
# or
npx convex deploy
```

**Why two providers?**
- WorkOS issues JWTs with different `iss` (issuer) claims depending on the auth flow
- SSO flow: `iss: "https://api.workos.com/"`
- AuthKit flow: `iss: "https://api.workos.com/user_management/{clientId}"`
- Both use the same JWKS endpoint for signature verification

---

## Step 5: Frontend Provider Setup

### 5.1 Standard AuthKit Setup (Recommended)

For new projects using AuthKit's built-in OAuth flow:

```tsx
// src/main.tsx (Vite) or app/layout.tsx (Next.js)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexReactClient } from "convex/react";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  </StrictMode>
);
```

### 5.2 Custom Token Storage (Advanced)

For projects with custom OAuth flows or server-side token handling:

```tsx
// src/main.tsx
import { StrictMode, useCallback, useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Custom hook that adapts your token storage to AuthKit interface
function useCustomAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    // Load user from your storage (localStorage, cookies, etc.)
    const stored = localStorage.getItem("auth_tokens");
    if (stored) {
      const { userId, accessToken } = JSON.parse(stored);
      if (userId && accessToken) {
        setUser({ id: userId });
      }
    }
    setIsLoading(false);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem("auth_tokens");
    if (!stored) return null;
    
    try {
      const { accessToken } = JSON.parse(stored);
      return accessToken || null;
    } catch {
      return null;
    }
  }, []);

  return useMemo(() => ({
    isLoading,
    user,
    getAccessToken,
  }), [isLoading, user, getAccessToken]);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProviderWithAuthKit client={convex} useAuth={useCustomAuth}>
      <App />
    </ConvexProviderWithAuthKit>
  </StrictMode>
);
```

---

## Step 6: Frontend Authentication UI

### 6.1 Using AuthKit's Built-in Methods

```tsx
// src/components/AuthButtons.tsx
import { useAuth } from "@workos-inc/authkit-react";
import { useConvexAuth } from "convex/react";

export function AuthButtons() {
  const { signIn, signUp, signOut, user } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) return <div>Loading...</div>;

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.email}</span>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signIn()}>Sign In</button>
      <button onClick={() => signUp()}>Sign Up</button>
    </div>
  );
}
```

### 6.2 Conditional Rendering

```tsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function App() {
  return (
    <>
      <AuthLoading>
        <LoadingSpinner />
      </AuthLoading>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  );
}
```

**Important**: Use `useConvexAuth()` (not AuthKit's `useAuth()`) to check authentication status for Convex operations.

---

## Step 7: Backend Authentication

### 7.1 Accessing User Identity

```typescript
// convex/myFunctions.ts
import { query, mutation } from "./_generated/server";

export const getProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return null; // User not authenticated
    }

    // identity contains:
    // - subject: WorkOS user ID (e.g., "user_01XXXXXXXXXX")
    // - issuer: JWT issuer URL
    // - tokenIdentifier: Unique token identifier
    
    return {
      userId: identity.subject,
      // Fetch additional user data from your tables
    };
  },
});
```

### 7.2 Creating Auth Guards

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);
  
  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", identity.subject))
    .first();
    
  if (!admin) {
    throw new Error("Admin access required");
  }
  
  return { identity, admin };
}
```

### 7.3 Using Guards in Functions

```typescript
// convex/admin.ts
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const getAdminStats = query({
  handler: async (ctx) => {
    const { admin } = await requireAdmin(ctx);
    
    // Admin-only logic here
    return { /* stats */ };
  },
});
```

---

## Step 8: Server-Side Token Operations (Optional)

### 8.1 Token Refresh via HTTP Action

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import WorkOS from "@workos-inc/node";

const http = httpRouter();

const workos = new WorkOS(process.env.WORKOS_API_KEY);

http.route({
  path: "/auth/refresh",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { refreshToken } = await request.json();
    
    try {
      const response = await workos.userManagement.authenticateWithRefreshToken({
        clientId: process.env.WORKOS_CLIENT_ID!,
        refreshToken,
      });
      
      return new Response(JSON.stringify({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Refresh failed" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
```

---

## Troubleshooting

### Issue: `ctx.auth.getUserIdentity()` returns `null`

**Causes & Solutions**:

1. **Missing second provider in auth.config.ts**
   - Ensure BOTH providers are configured (SSO + User Management)
   - Check issuer URLs match exactly

2. **WORKOS_CLIENT_ID not set in Convex**
   - Verify env var is set in Convex Dashboard
   - Run `npx convex dev --once` after adding

3. **Config not deployed**
   - Run `npx convex dev --once` or `npx convex deploy`

4. **Token not being sent**
   - Check browser Network tab for Authorization header
   - Verify `ConvexProviderWithAuthKit` is wrapping your app

5. **JWKS caching**
   - Wait a few minutes after config changes
   - Convex caches JWKS; may need time to refresh

### Issue: "Invalid token" errors

1. **Issuer mismatch**
   - Decode JWT at jwt.io
   - Verify `iss` claim matches one of your configured issuers

2. **Expired token**
   - Check `exp` claim in JWT
   - Implement token refresh

3. **Wrong JWKS URL**
   - JWKS URL format: `https://api.workos.com/sso/jwks/{clientId}`
   - Verify clientId is correct

### Issue: AuthKit signIn() not working

1. **Redirect URI mismatch**
   - Check WorkOS Dashboard → AuthKit → Redirects
   - Must match `VITE_WORKOS_REDIRECT_URI` exactly

2. **Client ID wrong**
   - Verify `VITE_WORKOS_CLIENT_ID` matches WorkOS Dashboard

---

## JWT Token Structure

WorkOS JWTs contain these claims:

```json
{
  "iss": "https://api.workos.com/user_management/client_01XXX",
  "sub": "user_01XXXXXXXXXXXXXXXXXX",
  "sid": "session_01XXXXXXXXXXXXXXXXXX",
  "jti": "01XXXXXXXXXXXXXXXXXX",
  "exp": 1234567890,
  "iat": 1234567590
}
```

**Note**: WorkOS JWTs do NOT include an `aud` (audience) claim. This is OAuth 2.0 style, not OIDC.

---

## Security Best Practices

1. **Never expose API keys in frontend**
   - `WORKOS_API_KEY` is server-only
   - Only `WORKOS_CLIENT_ID` should be in frontend env vars

2. **Validate on backend**
   - Always use `ctx.auth.getUserIdentity()` for authorization
   - Never trust frontend-only auth checks

3. **Use appropriate guards**
   - Create role-based guards (requireAdmin, requireUser, etc.)
   - Apply guards to all sensitive queries/mutations

4. **Handle token expiry**
   - Implement refresh token flow
   - Handle 401 responses gracefully

---

## Quick Reference

```typescript
// auth.config.ts - MUST have both providers
export default {
  providers: [
    { type: "customJwt", issuer: "https://api.workos.com/", applicationID: clientId, algorithm: "RS256", jwks: `https://api.workos.com/sso/jwks/${clientId}` },
    { type: "customJwt", issuer: `https://api.workos.com/user_management/${clientId}`, algorithm: "RS256", jwks: `https://api.workos.com/sso/jwks/${clientId}` },
  ],
};

// Frontend - wrap with providers
<AuthKitProvider clientId={...} redirectUri={...}>
  <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithAuthKit>
</AuthKitProvider>

// Backend - get authenticated user
const identity = await ctx.auth.getUserIdentity();
// identity.subject = WorkOS user ID
```

---

## Related Resources

- [Convex Auth Docs](https://docs.convex.dev/auth)
- [Convex AuthKit Docs](https://docs.convex.dev/auth/authkit)
- [WorkOS AuthKit Docs](https://workos.com/docs/user-management/authkit)
- [WorkOS API Reference](https://workos.com/docs/reference)
