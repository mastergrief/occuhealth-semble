# WorkOS Auth Migration - Security Hardening

**Sprint**: 02 of 06
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: SPRINT_01_OVERVIEW
**Next**: WORKOS_AUTH_MIGRATION_SPRINT_03_LANDING

---

## Critical Vulnerabilities (MUST FIX)

### SEC-001: Tokens in URL Parameters (CVSS 9.1)

**Location**: `convex/http.ts:114-119`

**Current (VULNERABLE)**:
```typescript
const redirectUrl = new URL(`${appUrl}/auth/callback`);
redirectUrl.searchParams.set("accessToken", accessToken);
redirectUrl.searchParams.set("refreshToken", refreshToken);
redirectUrl.searchParams.set("userId", user.id);
return Response.redirect(redirectUrl.toString(), 302);
```

**Risk**: Tokens leak to browser history, server logs, referrer headers

**Fix (POST form auto-submit)**:
```typescript
// Replace Response.redirect with HTML form POST
const html = `<!DOCTYPE html>
<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="${appUrl}/auth/callback">
    <input type="hidden" name="accessToken" value="${accessToken}" />
    <input type="hidden" name="refreshToken" value="${refreshToken}" />
    <input type="hidden" name="userId" value="${user.id}" />
    <input type="hidden" name="redirectPath" value="${redirectPath}" />
  </form>
</body>
</html>`;
return new Response(html, {
  status: 200,
  headers: { "Content-Type": "text/html" }
});
```

**Frontend Change** (`AdminAuthCallback.tsx`):
```typescript
// Change from searchParams to POST body parsing
useEffect(() => {
  const form = document.querySelector('form');
  // For POST, tokens come via form submission, not URL
  // Or use a dedicated /auth/token endpoint
}, []);
```

---

### SEC-002: Missing OAuth State Parameter (CVSS 8.8)

**Location**: `convex/http.ts:27-47` (login) and `49-131` (callback)

**Current**: No state parameter validation (CSRF vulnerable)

**Fix - Login Route**:
```typescript
http.route({
  path: "/auth/login",
  method: "GET",
  handler: async (ctx, req) => {
    const workos = getWorkOS();
    const state = crypto.randomUUID();
    
    // Store state in Convex table (5-minute TTL)
    await ctx.runMutation(internal.oauthState.create, { 
      state, 
      expiresAt: Date.now() + 5 * 60 * 1000 
    });
    
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "authkit",
      redirectUri: `${process.env.CONVEX_SITE_URL}/auth/callback`,
      clientId: process.env.WORKOS_CLIENT_ID!,
      state, // Add state parameter
    });
    
    return Response.redirect(authorizationUrl, 302);
  },
});
```

**Fix - Callback Route**:
```typescript
// In /auth/callback handler
const state = url.searchParams.get("state");
if (!state) {
  return Response.redirect(`${appUrl}/login?error=missing_state`, 302);
}

// Validate state exists and not expired
const storedState = await ctx.runQuery(internal.oauthState.validate, { state });
if (!storedState) {
  return Response.redirect(`${appUrl}/login?error=invalid_state`, 302);
}

// Delete used state
await ctx.runMutation(internal.oauthState.delete, { state });
```

**New File**: `convex/oauthState.ts`
```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const create = internalMutation({
  args: { state: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.insert("oauthStates", args);
  },
});

export const validate = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!record || record.expiresAt < Date.now()) return null;
    return record;
  },
});

export const delete_ = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (record) await ctx.db.delete(record._id);
  },
});
```

**Schema Addition** (`convex/schema.ts`):
```typescript
oauthStates: defineTable({
  state: v.string(),
  expiresAt: v.number(),
}).index("by_state", ["state"]),
```

---

### SEC-003: Token Storage in localStorage (CVSS 8.9)

**Current**: All tokens stored in localStorage (XSS vulnerable)

**Mitigation Options**:

1. **Option A: HTTP-only Cookies** (recommended for production)
   - Requires backend Set-Cookie header
   - Frontend can't access tokens directly
   - CSRF protection via SameSite=Strict

2. **Option B: Keep localStorage + Content Security Policy**
   - Add strict CSP headers
   - Shorter token TTL (5 min vs 15 min)
   - Accept risk for MVP

**For This Sprint**: Implement Option B (faster, addresses 80% risk)

**Add CSP Headers** (`convex/http.ts`):
```typescript
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
```

---

## High Priority Fixes

### SEC-004: Missing Token Expiration Check

**Location**: `src/lib/*-auth.tsx`

**Add to all auth contexts**:
```typescript
// Add token expiration validation
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// In useEffect that loads from localStorage
useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setAuthState(parsed);
  }
  setIsLoading(false);
}, []);
```

---

## Acceptance Criteria

- [ ] SEC-001: Tokens no longer in URL (use POST or cookies)
- [ ] SEC-002: State parameter validated on callback
- [ ] SEC-003: CSP headers added OR HTTP-only cookies implemented
- [ ] SEC-004: Token expiration checked on load
- [ ] No tokens visible in browser history after login
- [ ] CSRF attack on /auth/callback returns error

---

## Testing Checklist

```bash
# Test state parameter
curl -I "https://giddy-lapwing-915.convex.site/auth/callback?code=test"
# Should return: error=missing_state

# Test expired state
curl -I "https://giddy-lapwing-915.convex.site/auth/callback?code=test&state=invalid"
# Should return: error=invalid_state

# Verify no tokens in URL after login
# Check browser history - should NOT contain accessToken
```

---

→ Next: WORKOS_AUTH_MIGRATION_SPRINT_03_LANDING
