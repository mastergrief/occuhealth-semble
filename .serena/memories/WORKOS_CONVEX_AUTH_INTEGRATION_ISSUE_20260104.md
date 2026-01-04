# WorkOS + Convex Auth Integration Issue

**Date**: 2026-01-04
**Status**: 🔴 BLOCKED - Requires Investigation
**Priority**: P1 - Blocks admin authentication

---

## Executive Summary

WorkOS JWT tokens are not being accepted by Convex's `customJwt` auth provider, causing `ctx.auth.getUserIdentity()` to return `null` despite valid tokens and correct configuration.

---

## What Works ✅

| Component | Status | Evidence |
|-----------|--------|----------|
| WorkOS user creation | ✅ | `testadmin@occuhealth.com` created via API |
| WorkOS authentication | ✅ | OAuth flow completes, tokens returned |
| Frontend token storage | ✅ | localStorage stores tokens correctly |
| adminUsers table | ✅ | User exists with correct workosUserId |
| auth.config.ts deployed | ✅ | `npx convex dev --once` succeeds |
| JWKS endpoint | ✅ | Returns valid RSA public key |
| JWT format | ✅ | Valid RS256, correct issuer, not expired |

---

## What Fails 🔴

| Component | Status | Issue |
|-----------|--------|-------|
| `ctx.auth.getUserIdentity()` | 🔴 | Returns `null` with valid JWT |
| `verifyAdmin` query | 🔴 | Returns `null` (depends on ctx.auth) |
| Admin dashboard access | 🔴 | Shows "Admin Access Required" |

---

## Technical Details

### JWT Claims (Decoded)

```json
{
  "iss": "https://api.workos.com/user_management/client_01KE1KAC3CZXZWTRQ34PEMNR5N",
  "sub": "user_01KE2KZFNT7A3HRQJ980NKCHQV",
  "sid": "session_01KE30WCTFRW6PG14RBC8BTRZT",
  "jti": "01KE4XFRMQSRMB25G5ZAGK6PK6",
  "exp": 1767544485,
  "iat": 1767544185
}
```

**Note**: No `aud` (audience) claim - WorkOS uses OAuth 2.0 style, not OIDC.

### JWT Header

```json
{
  "alg": "RS256",
  "kid": "sso_oidc_key_pair_01KE1KABRW5MC8RN6PW4ZD9QJX"
}
```

### Convex Auth Config (`convex/auth.config.ts`)

```typescript
export default {
  providers: [
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${process.env.WORKOS_CLIENT_ID}`,
      jwks: `https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`,
      algorithm: "RS256",
      // No applicationID - WorkOS JWTs don't have aud claim
    },
  ],
};
```

### JWKS Endpoint

- **URL**: `https://api.workos.com/sso/jwks/client_01KE1KAC3CZXZWTRQ34PEMNR5N`
- **Status**: ✅ Returns valid JWKS
- **Kid Match**: ✅ `sso_oidc_key_pair_01KE1KABRW5MC8RN6PW4ZD9QJX` present

---

## Verification Performed

1. **Issuer match**: JWT `iss` === config `issuer` ✅
2. **Algorithm match**: JWT `alg` === config `algorithm` (RS256) ✅
3. **Key availability**: JWKS contains matching `kid` ✅
4. **Token expiry**: `exp` > current time ✅
5. **Token structure**: Valid 3-part JWT ✅

---

## Possible Root Causes

### 1. JWKS Caching Issue
Convex may be caching JWKS from previous config attempts. Try waiting or forcing refresh.

### 2. Missing Required Claims
Convex `customJwt` may require claims not present in WorkOS tokens (e.g., `aud`).

### 3. Environment Variable Resolution
`process.env.WORKOS_CLIENT_ID` in auth.config.ts may not resolve correctly at Convex runtime.

### 4. JWKS URL Format
Convex may expect JWKS at standard path (`/.well-known/jwks.json`) despite custom URL config.

### 5. Signature Verification Failure
RSA signature verification may fail silently without logging.

---

## Workaround Options

### Option A: Bypass ctx.auth (Quick Fix)

Modify `verifyAdmin` to accept workosUserId as argument instead of using ctx.auth:

```typescript
// Before: Uses ctx.auth.getUserIdentity()
export const verifyAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // ...
  },
});

// After: Accept workosUserId directly
export const verifyAdminByWorkosId = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});
```

**Risk**: Reduces security - anyone can query any admin by workosUserId.

### Option B: Use Internal Query + HTTP Action

Create HTTP action that validates JWT manually:

```typescript
http.route({
  path: "/api/verify-admin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { accessToken } = await request.json();
    // Manual JWT verification using jose library
    // Then query adminUsers
  }),
});
```

### Option C: Custom Token Exchange

Backend exchanges WorkOS token for custom Convex-compatible JWT:

```typescript
// http.ts callback generates custom JWT
const customJwt = await signJwt({
  iss: "https://your-domain.com",
  sub: user.id,
  aud: "convex-app",
  exp: Math.floor(Date.now() / 1000) + 3600,
});
```

---

## Files Modified During Investigation

| File | Change |
|------|--------|
| `convex/auth.config.ts` | Updated to use customJwt with WorkOS URLs |
| `src/pages/AdminLayout.tsx` | Fixed hooks order bug, added debug logging |
| `src/components/auth/AdminAuthCallback.tsx` | Added debug logging |
| `.env.local` | Added TEST_ADMIN credentials |

---

## Test Account Created

| Field | Value |
|-------|-------|
| Email | `testadmin@occuhealth.com` |
| Password | `(TestPass1234` |
| WorkOS User ID | `user_01KE4VZAPHYY71HZ0XWWWVK936` |
| Convex Admin ID | `kn7c3sg4n8r71kr907n8grnngs7yj048` |

**Also in adminUsers**: `user_01KE2KZFNT7A3HRQJ980NKCHQV` (existing session user)

---

## Next Steps to Resolve

1. **Contact Convex Support**
   - Ask about customJwt compatibility with WorkOS
   - Ask if missing `aud` claim causes silent rejection

2. **Try Hardcoded JWKS**
   - Use data URI instead of URL: `jwks: "data:application/json;base64,..."`
   - Eliminates JWKS fetch issues

3. **Add Convex Debug Logging**
   - Check Convex dashboard for auth errors
   - Enable verbose logging if available

4. **Test with Different JWT**
   - Generate test JWT with all OIDC claims
   - Verify Convex accepts standard JWTs

5. **Implement Workaround**
   - If investigation stalls, implement Option B (HTTP action)
   - Document as technical debt

---

## Related Memories

- `AUTH_ANALYSIS_INDEX` - Full auth system analysis
- `SESSION_AUTH_REMEDIATION_20260104` - Previous auth fixes
- `05_WORKOS_API_PROGRAMMATIC_ACCESS` - WorkOS API reference

---

## Cleanup Required

Once issue resolved, remove debug code:

```typescript
// AdminLayout.tsx - Remove console.log statements
// AdminAuthCallback.tsx - Remove console.log statements
// AdminLayout.tsx - Re-enable token clearing logic
```

---

## Browser-CLI Test Commands

```bash
# Fresh login test
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts close
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e6  # Login
sleep 6
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_admin_auth')"
```

---

**Last Updated**: 2026-01-04 16:33 UTC
