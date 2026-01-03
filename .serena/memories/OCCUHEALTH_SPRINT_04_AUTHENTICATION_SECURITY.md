# Authentication & Security

**Sprint**: 04 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_02_BACKEND_MODULES, OCCUHEALTH_SPRINT_03_FRONTEND_ARCHITECTURE
**Next**: OCCUHEALTH_SPRINT_05_GDPR_COMPLIANCE

---

## Authentication Architecture

### Overview

| Aspect | Implementation |
|--------|----------------|
| Provider | WorkOS AuthKit |
| Protocol | OAuth 2.0 + OIDC |
| Roles | admin, employer, doctor |
| Token Storage | localStorage (per-role keys) |
| Session Tracking | JWT sessionId extraction |

### Auth Flow Diagram

```
┌──────────┐    ┌───────────────┐    ┌──────────┐    ┌─────────────┐
│  User    │───▶│ /auth/login   │───▶│  WorkOS  │───▶│ /auth/      │
│  Click   │    │ (http.ts:27)  │    │ AuthKit  │    │ callback    │
└──────────┘    └───────────────┘    └──────────┘    └──────┬──────┘
                       │                                      │
                       ▼                                      ▼
              ┌─────────────────┐               ┌─────────────────────┐
              │ Generate CSRF   │               │ 1. Validate CSRF    │
              │ state (UUID)    │               │ 2. Exchange code    │
              │ Store: 5min TTL │               │ 3. Extract sessionId│
              └─────────────────┘               │ 4. Role detection   │
                                                │ 5. Redirect to      │
                                                │    frontend callback│
                                                └──────────┬──────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │ AdminAuthCallback   │
                                                │ 1. Read URL params  │
                                                │ 2. Store in local-  │
                                                │    Storage          │
                                                │ 3. Navigate to role │
                                                │    portal           │
                                                └─────────────────────┘
```

---

## Security Controls

### ✅ CSRF Protection (SEC-002)

**Implementation**: `convex/http.ts` + `convex/oauthState.ts`

```typescript
// Login route - Generate CSRF state
http.route({
  path: "/auth/login",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const state = crypto.randomUUID();  // Secure random
    await ctx.runMutation(internal.oauthState.create, {
      state,
      expiresAt: Date.now() + 5 * 60 * 1000,  // 5-minute TTL
    });
    // Include state in OAuth URL
    return Response.redirect(authorizationUrl + `&state=${state}`, 302);
  }),
});

// Callback - Validate CSRF state
const storedState = await ctx.runQuery(internal.oauthState.validate, { state });
if (!storedState) {
  return Response.redirect(`${appUrl}/login?error=invalid_state`, 302);
}
// Delete state to prevent replay
await ctx.runMutation(internal.oauthState.deleteState, { state });
```

### ✅ Token Exchange (Server-Side)

```typescript
// convex/http.ts:140-150
const { user, accessToken, refreshToken } =
  await workos.userManagement.authenticateWithCode({
    code,      // From OAuth callback
    clientId,  // From env
  });

// Extract session ID for logout tracking
const jwtPayload = JSON.parse(atob(accessToken.split(".")[1]));
const sessionId = jwtPayload.sid as string;
```

### ✅ Session Invalidation

```typescript
// convex/http.ts:66-94
http.route({
  path: "/auth/logout",
  method: "GET",
  handler: httpAction(async (_, request) => {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    
    const logoutUrl = workos.userManagement.getLogoutUrl({
      sessionId,
      returnTo: appUrl,
    });
    return Response.redirect(logoutUrl, 302);
  }),
});
```

---

## Security Assessment

### ✅ Secure Patterns

| Pattern | Location | Status |
|---------|----------|--------|
| CSRF state validation | http.ts:116-129 | ✅ Implemented |
| State TTL (5 min) | oauthState.ts:30 | ✅ Implemented |
| Replay prevention | http.ts:129 | ✅ State deleted after use |
| Server-side code exchange | http.ts:140 | ✅ Never client-side |
| Secrets in env vars | .gitignore, http.ts | ✅ Never in code |
| Token expiration check | workos-auth.tsx:84-91 | ✅ Implemented |

### ❌ Critical Vulnerabilities

| ID | Vulnerability | Location | Impact | Priority |
|----|---------------|----------|--------|----------|
| **V001** | No authorization on patient queries | patients.ts | Data breach | P0 |
| **V002** | Reports accessible by any employer | reports.ts | Cross-company leak | P0 |
| **V003** | Appointments queryable by date | appointments.ts:46 | Calendar enumeration | P1 |
| **V007** | Admin operations unauthenticated | employers.ts:111 | Privilege escalation | P0 |

### ⚠️ Medium Vulnerabilities

| ID | Vulnerability | Location | Impact | Priority |
|----|---------------|----------|--------|----------|
| **V009** | localStorage XSS vulnerable | workos-auth.tsx | Token theft | P2 |
| **V010** | No rate limiting on auth | http.ts | Brute force | P2 |
| **V011** | Patient lookup by email | patients.ts:31 | Email enumeration | P2 |

---

## Authorization Gap Analysis

### Current State (NO AUTHORIZATION)

```typescript
// patients.ts - VULNERABLE
export const list = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    // ❌ NO CHECK: Is caller the owner of this employerId?
    return ctx.db
      .query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();
  },
});
```

**Attack Scenario**:
```javascript
// Employer A is authenticated
// Attacker passes Employer B's ID:
useQuery(api.patients.list, { employerId: EMPLOYER_B_ID });
// ✅ Returns Employer B's patient data!
```

### Required Fix (AUTHORIZATION)

```typescript
// patients.ts - SECURE
export const list = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    // ✅ Step 1: Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    // ✅ Step 2: Verify ownership
    const employer = await ctx.db.get(employerId);
    if (!employer || employer.workosUserId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    
    // ✅ Step 3: Return data
    return ctx.db.query("patients")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();
  },
});
```

---

## Token Storage

### Storage Keys
```typescript
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

### Token Structure
```typescript
interface AuthTokens {
  workosUserId: string;
  accessToken: string;       // JWT with exp claim
  refreshToken?: string;     // For token refresh
  sessionId?: string;        // For logout tracking
}
```

### Cross-Tab Sync
```typescript
// workos-auth.tsx:144-183
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (Object.values(STORAGE_KEYS).includes(e.key || "")) {
      // Re-read auth state from localStorage
      loadAuthState();
    }
  };
  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}, []);
```

---

## Role Detection & Routing

```typescript
// convex/http.ts:153-180
// Check role tables in order
const employer = await ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id });
const doctor = await ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id });
const admin = await ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id });

// Determine redirect
if (admin) {
  await ctx.runMutation(internal.adminUsers.upsertAdminUser, { ... });
  redirectPath = "/admin";
} else if (employer) {
  redirectPath = "/employer";
} else if (doctor) {
  redirectPath = "/doctor";
} else {
  redirectPath = "/register/choose-role";  // New user
}
```

---

## Remediation Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0-1 | Add authorization to patients.list | 1 day | Critical |
| P0-2 | Add authorization to reports.listByEmployer | 1 day | Critical |
| P0-3 | Add authorization to appointments.listByEmployer | 1 day | Critical |
| P0-4 | Add admin-only check to employers.verify | 0.5 day | Critical |
| P1-1 | Create authorization helper module | 1 day | Foundation |
| P2-1 | Add rate limiting to /auth/login | 1 day | Security |
| P2-2 | Consider httpOnly cookies | 2 days | Hardening |

---

→ Next: OCCUHEALTH_SPRINT_05_GDPR_COMPLIANCE
