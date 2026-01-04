# Plan: Convex + WorkOS Auth Integration (Option B)

**Created**: 2026-01-04
**Status**: PLANNED
**Priority**: HIGH
**Prerequisite**: Auth E2E Bug Fixes completed

---

## Problem Statement

The OccuHealth app has an architectural gap between frontend and backend authentication:

1. **Frontend**: Uses WorkOS OAuth, stores tokens in localStorage
2. **Backend**: Uses `ctx.auth.getUserIdentity()` which expects Convex Auth integration
3. **Result**: Backend guards (`requireAdmin`, `requireEmployerOwnership`, `requireDoctorAccess`) always fail with `UNAUTHENTICATED`

### Current Architecture (Broken)
```
WorkOS OAuth → localStorage tokens → WorkOSAuthProvider
                                          ↓
ConvexProvider (no auth) → queries → ctx.auth.getUserIdentity() = null
                                          ↓
                                    UNAUTHENTICATED error
```

### Target Architecture (Fixed)
```
WorkOS OAuth → JWT tokens → ConvexProviderWithAuth
                                    ↓
              Convex client sends token → ctx.auth.getUserIdentity() = user
                                    ↓
                              Authorization passes ✓
```

---

## Implementation Plan

### Phase 1: Backend - Configure Convex Auth with WorkOS JWT

#### 1.1 Create `convex/auth.config.ts`
```typescript
export default {
  providers: [
    {
      domain: "https://api.workos.com",
      applicationID: process.env.WORKOS_CLIENT_ID,
    },
  ],
};
```

#### 1.2 Alternative: Custom JWT Verification
If WorkOS JWT format isn't compatible with Convex's built-in providers, create a custom HTTP action to verify tokens:

```typescript
// convex/http.ts - Add token verification endpoint
http.route({
  path: "/auth/verify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { accessToken } = await request.json();
    
    // Verify JWT with WorkOS
    const workos = getWorkOS();
    try {
      const payload = await workos.userManagement.getUser(accessToken);
      return new Response(JSON.stringify({ valid: true, userId: payload.id }));
    } catch {
      return new Response(JSON.stringify({ valid: false }), { status: 401 });
    }
  }),
});
```

### Phase 2: Frontend - Integrate Auth with Convex Client

#### 2.1 Update `src/main.tsx`
```typescript
import { ConvexProviderWithAuth } from "convex/react";
import { useWorkOSAuth } from "./lib/workos-auth";

function ConvexAuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useWorkOSAuth();
  
  return (
    <ConvexProviderWithAuth
      client={convex}
      useAuth={() => ({
        isLoading,
        isAuthenticated: !!accessToken,
        fetchAccessToken: async () => accessToken,
      })}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}
```

#### 2.2 Update `src/lib/workos-auth.tsx`
Add a hook that exposes the current access token for Convex:

```typescript
export function useConvexAuth() {
  const auth = useWorkOSAuth();
  
  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        // TODO: Implement token refresh using refreshToken
        return null;
      }
      return auth.tokens?.accessToken ?? null;
    },
  };
}
```

### Phase 3: Token Refresh Implementation

#### 3.1 Add Refresh Endpoint to `convex/http.ts`
```typescript
http.route({
  path: "/auth/refresh",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { refreshToken } = await request.json();
    
    const workos = getWorkOS();
    const result = await workos.userManagement.authenticateWithRefreshToken({
      clientId: process.env.WORKOS_CLIENT_ID!,
      refreshToken,
    });
    
    return new Response(JSON.stringify({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }));
  }),
});
```

#### 3.2 Update Frontend Token Refresh
```typescript
// In workos-auth.tsx
const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch(`${CONVEX_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  
  if (!response.ok) {
    throw new Error("Token refresh failed");
  }
  
  return response.json();
};
```

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `convex/auth.config.ts` | Create - Configure WorkOS as auth provider | P1 |
| `src/main.tsx` | Replace ConvexProvider with ConvexProviderWithAuth | P1 |
| `src/lib/workos-auth.tsx` | Add useConvexAuth hook, token refresh | P1 |
| `convex/http.ts` | Add /auth/refresh endpoint | P2 |
| `convex/authModules/authorization.ts` | No changes needed | - |

---

## Migration Strategy

### Step 1: Parallel Implementation
- Keep existing localStorage auth working
- Add Convex auth integration alongside
- Backend guards already use `ctx.auth.getUserIdentity()`

### Step 2: Gradual Rollout
- Test with admin portal first (most affected)
- Verify employer/doctor portals continue working
- Monitor for auth errors in logs

### Step 3: Cleanup
- Remove redundant localStorage checks once Convex auth works
- Consolidate auth state management

---

## Testing Checklist

- [ ] Admin login → `ctx.auth.getUserIdentity()` returns user
- [ ] Admin queries (listPending, etc.) succeed without UNAUTHENTICATED
- [ ] Employer queries continue working
- [ ] Doctor queries continue working
- [ ] Token refresh works when access token expires
- [ ] Logout clears Convex auth state
- [ ] Multi-tab sync works with Convex auth

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WorkOS JWT format incompatible | Medium | High | Use custom verification endpoint |
| Token refresh race conditions | Low | Medium | Implement token refresh queue |
| Breaking existing auth flow | Medium | High | Feature flag for gradual rollout |
| Performance overhead | Low | Low | JWT verification is fast |

---

## Alternative: Quick Fix (Option A)

If full integration is too complex, the quick fix is to pass `workosUserId` as a query argument:

```typescript
// Change admin queries to accept workosUserId
export const listPending = query({
  args: { workosUserId: v.string() },
  handler: async (ctx, args) => {
    // Verify admin by workosUserId instead of ctx.auth
    const admin = await ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", q => q.eq("workosUserId", args.workosUserId))
      .first();
    
    if (!admin) throw new ConvexError({ code: "UNAUTHORIZED" });
    
    // ... rest of query
  },
});
```

**Pros**: Quick, minimal changes
**Cons**: Less secure (workosUserId can be spoofed), requires changing all protected queries

---

## Recommendation

**Start with Option A (Quick Fix)** for immediate functionality, then implement **Option B (Full Integration)** for production-grade security.

---

## Related Memories
- AUTH_E2E_BUGFIX_SESSION_20260104
- AUTH_E2E_INDEX
- AUTH_E2E_SPRINT_05_SECURITY_ASSESSMENT
