# Remediation Roadmap: Auth System Fixes

**Sprint**: 07 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_03_SECURITY, AUTH_ANALYSIS_SPRINT_04_TESTING, AUTH_ANALYSIS_SPRINT_05_BROWSER_CLI, AUTH_ANALYSIS_SPRINT_06_DOCUMENTATION
**Next**: Complete

---

## Remediation Timeline

| Phase | Timeframe | Focus |
|-------|-----------|-------|
| **IMMEDIATE** | This Week | Critical security fixes |
| **SPRINT 1** | Week 2 | Core auth integration |
| **SPRINT 2** | Week 3 | Testing + documentation |
| **SPRINT 3** | Week 4 | Hardening + monitoring |

---

## IMMEDIATE (This Week)

### SEC-FIX-1: Add Guards to GDPR Mutations
**Priority**: P0 (CRITICAL)
**Effort**: 2-3 hours
**Files**: `convex/gdpr.ts`

```typescript
// ADD TO EACH FUNCTION:
import { requireAdmin, requireEmployerOwnership } from "./authModules";

export const processErasure = mutation({
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // ADD THIS
    // ... existing code
  },
});

export const createConsent = mutation({
  handler: async (ctx, args) => {
    await requireEmployerOwnership(ctx, args.collectedByEmployerId);  // ADD
    // ... existing code
  },
});

export const listErasureRequests = query({
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // ADD THIS
    // ... existing code
  },
});

// Similar for: withdrawConsent, requestErasure, getAuditLogs, getGDPRStats
```

### SEC-FIX-2: Make Admin Queries Private
**Priority**: P0 (HIGH)
**Effort**: 30 min
**Files**: `convex/adminUsers.ts`

```typescript
// CHANGE: export const getByWorkosUserId = query({
// TO: export const getByWorkosUserId = internalQuery({

import { internalQuery } from "./_generated/server";

export const getByWorkosUserId = internalQuery({
  // ... existing code
});

export const getByEmail = internalQuery({
  // ... existing code
});
```

### SEC-FIX-3: Update Plan Document
**Priority**: P1
**Effort**: 30 min
**Files**: `.serena/memories/PLAN_CONVEX_WORKOS_AUTH_INTEGRATION.md`

Add header:
```markdown
## ⚠️ STATUS: OUTDATED

This plan describes Option B (full Convex Auth integration).
Actual implementation uses Option A (WorkOS tokens only).

See: AUTH_ANALYSIS_INDEX for current architecture.
```

---

## SPRINT 1 (Week 2)

### CORE-1: Implement Convex Auth Integration
**Priority**: P1
**Effort**: 8 hours
**Files**: Multiple

1. **Create** `convex/auth.config.ts`:
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

2. **Update** `src/main.tsx`:
```typescript
import { ConvexProviderWithAuth } from "convex/react";

function ConvexAuthWrapper({ children }) {
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

3. **Add** `useConvexAuth()` to `src/lib/workos-auth.tsx`

### CORE-2: Add Token Refresh
**Priority**: P1
**Effort**: 4 hours
**Files**: `convex/http.ts`, `src/lib/workos-auth.tsx`

1. **Add** `/auth/refresh` endpoint:
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

2. **Add** frontend refresh logic with auto-refresh interval

### CORE-3: Migrate Token Storage
**Priority**: P2
**Effort**: 4 hours
**Files**: `src/lib/workos-auth.tsx`

Change from `localStorage` to `sessionStorage` + memory:
```typescript
// Store tokens in memory (survives navigation, not reload)
let tokenCache: AuthTokens | null = null;

// Back up to sessionStorage (survives reload, not tab close)
sessionStorage.setItem(STORAGE_KEYS[role], JSON.stringify(tokens));
```

---

## SPRINT 2 (Week 3)

### TEST-1: Add Unit Testing Framework
**Priority**: P2
**Effort**: 2 hours

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

Create `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true
  }
});
```

### TEST-2: Create Auth Hook Tests
**Priority**: P2
**Effort**: 4 hours
**Files**: `tests/unit/auth/*.test.ts`

- `isTokenExpired.test.ts`
- `useAdminAuth.test.ts`
- `useEmployerAuth.test.ts`
- `useDoctorAuth.test.ts`

### TEST-3: Create Guard Tests
**Priority**: P2
**Effort**: 3 hours
**Files**: `tests/unit/convex/authorization.test.ts`

### DOC-1: Create API Documentation
**Priority**: P2
**Effort**: 2 hours
**Files**: `DOCUMENTS/API.md`

### DOC-2: Add JSDoc to Auth Hooks
**Priority**: P3
**Effort**: 2 hours
**Files**: `src/lib/workos-auth.tsx`

---

## SPRINT 3 (Week 4)

### HARDEN-1: Clean URL History
**Priority**: P3
**Effort**: 1 hour
**Files**: `src/components/auth/AdminAuthCallback.tsx`

```typescript
// After extracting tokens, clean URL
window.history.replaceState({}, '', window.location.pathname);
```

### HARDEN-2: Add Rate Limiting
**Priority**: P3
**Effort**: 4 hours
**Files**: `convex/rateLimits.ts` (new)

### HARDEN-3: Add Auth Monitoring
**Priority**: P3
**Effort**: 2 hours

Log auth events to auditLogs:
- Login attempts
- Logout events
- Token refresh
- Guard failures

---

## Verification Checklist

### After IMMEDIATE Fixes
- [ ] `gdpr.processErasure` requires admin
- [ ] `gdpr.createConsent` requires employer ownership
- [ ] `gdpr.listErasureRequests` requires admin
- [ ] `adminUsers.getByWorkosUserId` is internal
- [ ] Plan document marked as outdated

### After SPRINT 1
- [ ] `ctx.auth.getUserIdentity()` returns user identity
- [ ] Token refresh works automatically
- [ ] Tokens stored in sessionStorage

### After SPRINT 2
- [ ] Unit tests pass for auth hooks
- [ ] Guard tests pass
- [ ] API documentation complete
- [ ] JSDoc coverage >80%

### After SPRINT 3
- [ ] URL history cleaned after auth
- [ ] Rate limiting active
- [ ] Auth events logged to audit

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Security Score | 4/10 | 8/10 |
| Test Coverage | 30% | 70% |
| Documentation | 57% | 80% |
| GDPR Compliance | FAIL | PASS |
| Guard Effectiveness | 0% (null) | 100% |

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| WorkOS JWT incompatible | Medium | Custom verification fallback |
| Token refresh race conditions | Low | Queue-based refresh |
| Breaking existing auth | Medium | Feature flag rollout |
| Performance overhead | Low | JWT verification is fast |

---

✓ Final Sprint - Remediation Roadmap Complete
