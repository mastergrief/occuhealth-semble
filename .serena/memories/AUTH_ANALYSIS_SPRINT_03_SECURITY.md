# Security Assessment: Auth Vulnerabilities

**Sprint**: 03 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_02_ARCHITECTURE
**Next**: AUTH_ANALYSIS_SPRINT_04_TESTING

---

## Security Score: 4/10 🔴

---

## What's Secure ✅

### CSRF Protection
- State generated with `crypto.randomUUID()` (cryptographically secure)
- Stored in `oauthStates` table with 5-min TTL
- Validated before token exchange
- Deleted after use (replay prevention)
- **Location**: `convex/http.ts:36-41`, `convex/oauthState.ts`

### Secrets Handling
- `WORKOS_API_KEY` server-side only (never exposed to frontend)
- `VITE_` prefix used correctly for frontend-safe vars
- No hardcoded credentials in source

### Session Logout
- SessionId extracted from JWT `sid` claim
- WorkOS session properly invalidated on logout
- localStorage cleared on frontend

---

## Critical Vulnerabilities ⛔

### SEC-009 to SEC-013: Unguarded GDPR Mutations
**Severity**: CRITICAL
**File**: `convex/gdpr.ts`

| Function | Line | Issue |
|----------|------|-------|
| `createConsent()` | 50 | NO authorization - anyone can forge consents |
| `withdrawConsent()` | 73 | NO authorization - anyone can revoke consents |
| `requestErasure()` | 95 | NO authorization - anyone can request erasure |
| `processErasure()` | 142 | NO `requireAdmin()` - anyone can delete data |
| `listErasureRequests()` | 118 | NO authorization - anyone can enumerate |

**Attack**: Doctor logs in → calls `processErasure()` → deletes patient records

### SEC-002: XSS Token Theft
**Severity**: CRITICAL
**File**: `src/lib/workos-auth.tsx:202`

```typescript
// VULNERABLE: Any XSS can steal tokens
localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
```

**Attack**: Malicious npm package → `localStorage.getItem()` → full account compromise

### SEC-001: Tokens in URL (Browser History)
**Severity**: HIGH
**File**: `convex/http.ts:184-193`

Tokens passed via URL params, visible in:
- Browser history
- Developer tools
- Proxy logs (shared WiFi)

---

## High Severity Issues

### SEC-014/015: Unguarded GDPR Queries
**File**: `convex/gdpr.ts`

| Function | Issue |
|----------|-------|
| `getAuditLogs()` | NO `requireAdmin()` - anyone reads all admin actions |
| `getGDPRStats()` | NO authorization - privacy enumeration |
| `getConsentsByPatient()` | NO check - cross-patient privacy breach |

### SEC-016: Public Admin Queries
**File**: `convex/adminUsers.ts`

| Function | Issue |
|----------|-------|
| `getByWorkosUserId()` | PUBLIC - admin enumeration |
| `getByEmail()` | PUBLIC - admin enumeration |

---

## CVSS Scores

| Vulnerability | CVSS | Attack Vector |
|---------------|------|---------------|
| Consent Spoofing | 9.1 | Authenticated → forge consent records |
| Erasure Abuse | 8.9 | Authenticated → unauthorized data destruction |
| XSS Token Theft | 9.3 | XSS → full account compromise |
| Privacy Enumeration | 7.5 | Authenticated → enumerate all patients |
| Audit Log Disclosure | 7.3 | Authenticated → read all admin actions |

---

## Compliance Violations

### GDPR
- **Article 32**: FAIL - No access controls on sensitive endpoints
- **Article 35**: FAIL - Any role can enumerate patients/consents
- **Article 5(e)**: FAIL - Unauthorized users can process erasures
- **Article 7**: FAIL - Any role can withdraw consents

### HIPAA (if applicable)
- Access Controls: FAIL
- Audit Controls: FAIL (logs readable by non-admins)
- Encryption: PARTIAL (HTTPS but XSS-vulnerable localStorage)

---

## Attack Scenarios

### Scenario 1: Consent Spoofing
```
1. Employer logs in legitimately
2. Calls gdpr.createConsent() with arbitrary patientEmail
3. Bypass consent requirements
4. GDPR violation + legal liability
```

### Scenario 2: Data Destruction
```
1. Doctor logs in
2. Calls gdpr.requestErasure() for employer's patient
3. Calls gdpr.processErasure() to destroy records
4. Audit trail shows wrong actor
5. Data unrecoverable
```

### Scenario 3: XSS Token Theft
```
1. Compromised npm package or DOM injection
2. Script reads localStorage.getItem("workos_admin_auth")
3. Attacker has accessToken, refreshToken, sessionId
4. Full admin impersonation
5. Logout doesn't help (token still valid)
```

---

## Immediate Fixes Required

### GDPR Mutations (1-2 hours each)
```typescript
// convex/gdpr.ts - ADD GUARDS

export const processErasure = mutation({
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // ADD THIS LINE
    // ... rest of handler
  },
});

export const createConsent = mutation({
  handler: async (ctx, args) => {
    await requireEmployerOwnership(ctx, args.collectedByEmployerId);  // ADD
    // ... rest of handler
  },
});
```

### Token Storage (4 hours)
```typescript
// Migrate from localStorage to sessionStorage + memory
// sessionStorage clears on tab close
// Memory-only tokens survive page navigation but not reload
```

---

→ Next: AUTH_ANALYSIS_SPRINT_04_TESTING
