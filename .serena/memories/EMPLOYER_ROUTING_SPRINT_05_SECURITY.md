# Security & GDPR Compliance

**Sprint**: 05 of 06
**Index**: EMPLOYER_ROUTING_INDEX
**Depends On**: EMPLOYER_ROUTING_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: EMPLOYER_ROUTING_SPRINT_06_RECOMMENDATIONS

---

## Security Assessment Summary

**Overall Risk Level**: MEDIUM (acceptable with mitigations)

| Control | Status | Evidence |
|---------|--------|----------|
| Frontend Auth Guards | ✅ PASS | All layouts check `isAuthenticated` |
| Token Storage | ✅ PASS | localStorage, role-specific keys |
| JWT Validation | ✅ PASS | Backend RS256 JWKS validation |
| Authorization Guards | ✅ PASS | requireAdmin/Doctor/Employer on all protected functions |
| GDPR Routes | ✅ PASS | All admin routes have `requireAdmin(ctx)` |

---

## Auth Guard Implementation

### Employer Portal Guard

```typescript
// EmployerLayout.tsx:42-44
if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

### Doctor Portal Guard

```typescript
// DoctorLayout.tsx:81-83
if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

### Admin Portal Guard (Stricter)

```typescript
// AdminLayout.tsx:88-104
// Dual verification: localStorage AND database
if (!isAdminAuthenticated || dbAdmin === null) {
  return <AdminAccessRequired />;
}
```

---

## Token Storage Architecture

**Storage Keys** (`lib/workos-auth.tsx:66-70`):
```typescript
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

**Security Benefits**:
- localStorage (not cookies) → prevents CSRF
- Role-specific keys → prevents cross-role token substitution
- Token expiration check on load

---

## Vulnerabilities Identified

### VULN-01: CORS Allows All Origins (MEDIUM)

**File**: `convex/http.ts:229-232`
```typescript
"Access-Control-Allow-Origin": "*",
```

**Risk**: Cross-origin token refresh possible
**Fix**: Restrict to `process.env.APP_URL`

### VULN-02: Tokens in URL Parameters (LOW-MEDIUM)

**File**: `convex/http.ts:184-193`

OAuth callback passes tokens via URL search params.

**Risk**: Tokens in browser history, server logs
**Mitigation**: Tokens consumed immediately, short-lived

### VULN-03: GET Logout (LOW)

**File**: `convex/http.ts:66-94`

```typescript
http.route({
  path: "/auth/logout",
  method: "GET",  // ← CSRF vulnerable
  ...
});
```

**Risk**: Image tags can trigger logout (DoS)
**Fix**: Change to POST-only

---

## GDPR Compliance Verification

### Protected Admin Routes

| Function | Auth Guard | File:Line |
|----------|-----------|-----------|
| getGDPRStats | `requireAdmin(ctx)` | gdpr.ts:305 |
| getAuditLogs | `requireAdmin(ctx)` | gdpr.ts:267 |
| listErasureRequests | `requireAdmin(ctx)` | gdpr.ts:145 |
| processErasure | `requireAdmin(ctx)` | gdpr.ts:175 |

### Protected Employer Routes

| Function | Auth Guard | File:Line |
|----------|-----------|-----------|
| createConsent | `requireEmployerOwnership` | gdpr.ts:71 |
| withdrawConsent | `requireEmployerOwnership` | gdpr.ts:90 |
| getConsentsByPatient | `requireEmployerOwnership` | gdpr.ts:108 |

### Erasure Implementation

Data redacted on erasure (`gdpr.ts:168-257`):
- ✓ Appointment notes
- ✓ Report content
- ✓ Clinical notes
- ✓ All consents withdrawn
- ✓ Patient soft-deleted

---

## Logout Flow

**Steps**:
1. Frontend clears WorkOS auth tokens from localStorage
2. Frontend clears all storage
3. Frontend redirects to `/auth/logout`
4. Backend calls `workos.userManagement.getLogoutUrl()`
5. WorkOS clears session cookie
6. User redirected to home

---

## Remediation Priorities

### Priority 1 (Deploy within 1 week)

**1.1 Restrict CORS**
```typescript
// convex/http.ts:229
"Access-Control-Allow-Origin": process.env.APP_URL,
```

### Priority 2 (Deploy within 1 month)

**2.1 Change logout to POST**
```typescript
method: "POST",  // Instead of "GET"
```

### Priority 3 (Next sprint)

**3.1 Add rate limiting to /auth/refresh**
**3.2 Add token rotation on refresh**

---

## Security Best Practices Observed

✓ Defense-in-depth: Frontend + backend + database checks
✓ Role-based access control: Distinct auth contexts
✓ Audit logging: All actions logged via `gdpr.logAction()`
✓ Token expiration: Frontend checks JWT exp claim
✓ OAuth 2.0 standard: Proper flow via WorkOS
✓ Stateless JWT: No session table

---

→ Next: EMPLOYER_ROUTING_SPRINT_06_RECOMMENDATIONS
