# Remediation Roadmap

**Sprint**: 07 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: All Previous Sprints  
**Next**: Complete ✓

---

## Priority Overview

| Phase | Focus | Timeline | Blocking |
|-------|-------|----------|----------|
| Phase 1 | Fix Critical Bugs | Immediate | YES |
| Phase 2 | Security Hardening | Before Prod | YES |
| Phase 3 | Test Coverage | Ongoing | NO |
| Phase 4 | Performance | Optional | NO |

---

## Phase 1: Fix Critical Bugs (IMMEDIATE)

### 1.1 BUG-001: Token Loss (CRITICAL)

**Files to Modify:**
```
src/components/auth/AdminAuthCallback.tsx:53
src/pages/register/ChooseRole.tsx:16-21
src/components/employer/EmployerRegistrationForm.tsx
src/lib/workos-auth.tsx
```

**Fix Strategy:**
```typescript
// AdminAuthCallback.tsx - Preserve URL params
const params = new URLSearchParams();
params.set('accessToken', accessToken);
params.set('userId', userId);
params.set('sessionId', sessionId);
navigate(`${redirectPath}?${params.toString()}`, { replace: true });
```

```typescript
// ChooseRole.tsx - Validate before proceeding
const accessToken = searchParams.get("accessToken");
if (!accessToken) {
  setError("Missing authentication tokens");
  navigate("/login?error=missing_tokens");
  return;
}
```

**Acceptance Criteria:**
- [ ] Tokens pass through registration flow
- [ ] Empty tokens rejected with error
- [ ] Users created with valid workosUserId

---

### 1.2 BUG-003: Session Persistence (HIGH)

**Files to Modify:**
```
src/lib/workos-auth.tsx (lines 309-346, 352-387)
src/components/auth/SignOutButton.tsx
src/pages/EmployerLayout.tsx
src/pages/DoctorLayout.tsx
```

**Fix Strategy:**
```typescript
// workos-auth.tsx - Add sessionId to Employer/Doctor hooks
export function useEmployerAuth(): {
  // ... existing fields
  sessionId: string | null;  // ADD THIS
} {
  return {
    // ... existing returns
    sessionId: auth.role === "employer" 
      ? (auth.tokens?.sessionId ?? null) 
      : null,
  };
}
```

```typescript
// EmployerLayout.tsx - Match AdminLayout pattern
const handleLogout = () => {
  logoutEmployer();
  localStorage.clear();
  sessionStorage.clear();
  if (sessionId) {
    window.location.href = `${CONVEX_URL}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";
  }
};
```

**Acceptance Criteria:**
- [ ] sessionId exposed in Employer/Doctor hooks
- [ ] Logout calls /auth/logout?sessionId=...
- [ ] WorkOS session properly terminated

---

### 1.3 BUG-002: Admin UI Access (MEDIUM)

**Files to Modify:**
```
src/pages/AdminLayout.tsx
src/lib/workos-auth.tsx
```

**Fix Strategy:**
```typescript
// AdminLayout.tsx - Query DB before rendering
const { adminUser, sessionId, isLoading } = useAdminAuth();
const workosUserId = adminUser?.userId;

// Query adminUsers table
const dbAdmin = useQuery(
  api.adminUsers.getByWorkosUserId, 
  workosUserId ? { workosUserId } : "skip"
);

// Block UI if not in database
if (!isLoading && !dbAdmin) {
  return <Navigate to="/" replace />;
}
```

**Acceptance Criteria:**
- [ ] Non-admins redirected before UI renders
- [ ] Admin status verified against database
- [ ] Existing admin users unaffected

---

## Phase 2: Security Hardening (Before Production)

### 2.1 Add Audit Logging

**Create New File:** `convex/authEvents.ts`
```typescript
export const logAuthEvent = mutation({
  args: {
    workosUserId: v.string(),
    eventType: v.union(
      v.literal("login"),
      v.literal("logout"),
      v.literal("failed_login")
    ),
    metadata: v.optional(v.object({
      ip: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("authEvents", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

### 2.2 Add Rate Limiting

**Modify:** `convex/http.ts`
```typescript
// Track login attempts
const attempts = await ctx.runQuery(internal.rateLimit.getAttempts, {
  key: clientIP,
  window: 15 * 60 * 1000, // 15 minutes
});

if (attempts >= 3) {
  return new Response("Too many attempts", { status: 429 });
}
```

### 2.3 Add Error Handling to JWT Parse

**Modify:** `convex/http.ts:147-148`
```typescript
let sessionId: string | undefined;
try {
  const jwtPayload = JSON.parse(atob(accessToken.split(".")[1]));
  sessionId = jwtPayload.sid as string;
} catch (e) {
  console.error("Failed to parse JWT:", e);
  // Continue without sessionId - logout will fallback gracefully
}
```

---

## Phase 3: Test Coverage (Ongoing)

### 3.1 Setup Vitest
```bash
npm install -D vitest @testing-library/react jsdom
```

### 3.2 Priority Test Files
```
tests/unit/
├── isTokenExpired.test.ts      # Priority 1
├── workos-auth-provider.test.ts # Priority 2
├── authorization-guards.test.ts # Priority 3
└── oauth-state.test.ts         # Priority 4
```

### 3.3 E2E Bug Regression Tests
```
tests/e2e/auth/
├── bug-001-token-loss.spec.ts
├── bug-002-admin-access.spec.ts
└── bug-003-session-persist.spec.ts
```

---

## Phase 4: Performance Optimization (Optional)

### 4.1 Parallel State Deletion
```typescript
// http.ts - Current: sequential, Optimized: parallel
const [, authResult] = await Promise.all([
  ctx.runMutation(internal.oauthState.deleteState, { state }),
  workos.userManagement.authenticateWithCode({ code, clientId })
]);
```
**Savings:** ~50ms per login

### 4.2 Unified User Table
Consider migrating to single `users` table with role column for faster role detection.
**Savings:** ~66% reduction in role detection time

---

## Implementation Checklist

### Immediate (This Week)
- [ ] Fix BUG-001: Token preservation in AdminAuthCallback
- [ ] Fix BUG-001: Token validation in ChooseRole
- [ ] Fix BUG-003: Add sessionId to Employer/Doctor hooks
- [ ] Fix BUG-003: Update EmployerLayout logout
- [ ] Fix BUG-003: Update DoctorLayout logout
- [ ] Fix BUG-002: Add DB verification in AdminLayout

### Before Production
- [ ] Add audit logging table and mutations
- [ ] Add rate limiting to /auth/login
- [ ] Add error handling to JWT parsing
- [ ] Add unit tests for isTokenExpired()
- [ ] Add E2E regression tests for all 3 bugs

### Long-Term
- [ ] Consider httpOnly cookies
- [ ] Implement token refresh
- [ ] Add security ESLint rules
- [ ] Consider unified user table

---

## Verification Commands

### Test Bug Fixes with Browser-CLI
```bash
# After BUG-001 fix
navigate localhost:5175
click "text:Provider Login"
# Complete WorkOS login
wait 2000
evaluate 'new URLSearchParams(location.search).get("accessToken")'
# Should NOT be empty

# After BUG-003 fix
restoreState authenticated-employer
navigate /employer/dashboard
click "text:Sign Out"
navigate localhost:5175
click "text:Provider Login"
# Should show WorkOS login form (not skip to choose-role)
```

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Registration Success Rate | 0% | 100% |
| Logout Completeness | 33% (Admin only) | 100% |
| Admin UI Security | Partial | Full |
| Unit Test Coverage | 0% | >80% |
| E2E Bug Coverage | 0/3 | 3/3 |

---

✓ Final Sprint - Remediation Roadmap Complete
