# Security Assessment

**Sprint**: 05 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: AUTH_E2E_SPRINT_03_ARCHITECTURE  
**Next**: AUTH_E2E_SPRINT_06_TESTING_GAPS

---

## Security Posture: MEDIUM-LOW (Dev) / MEDIUM (Prod)

---

## Protected ✅

### 1. CSRF Protection (SEC-002)
```
State Token Lifecycle:
1. Generate: crypto.randomUUID()
2. Store: oauthStates table (5-min TTL)
3. Validate: Check exists + not expired
4. Delete: After use (replay prevention)
```

**Evidence**: `convex/http.ts:43-60`, `convex/oauthState.ts`

### 2. API Key Isolation
```
WORKOS_API_KEY:
├─ Storage: process.env (backend only)
├─ Frontend: NEVER exposed via VITE_*
├─ Usage: convex/http.ts only (lines 16, 82)
└─ Validation: Throws if missing (line 19-20)
```

### 3. Role Escalation Prevention
```
Role determined by TABLE MEMBERSHIP, not JWT claims:
├─ Admin: Must exist in adminUsers table
├─ Employer: Must exist in employers table
├─ Doctor: Must exist in doctorSettings table
└─ Attacker can't forge role via localStorage
```

### 4. Backend Authorization
```
All mutations protected by guards:
├─ requireAdmin() → adminUsers lookup
├─ requireEmployerOwnership() → ownership check
├─ requireDoctorAccess() → doctorSettings lookup
└─ All throw ConvexError on failure
```

---

## Vulnerable ⚠️

### 1. Tokens in localStorage (XSS Risk)
```
Risk Level: HIGH for production
├─ All tokens stored in localStorage
├─ XSS attack can steal tokens
├─ Should use httpOnly cookies
└─ Impact: Session hijacking if XSS exists
```

### 2. No Rate Limiting
```
Risk Level: MEDIUM
├─ /auth/login: No limit
├─ /auth/callback: No limit
├─ Brute force attacks possible
└─ Recommendation: 3 attempts / 15 min
```

### 3. No Audit Logging
```
Risk Level: MEDIUM
├─ Login events not logged
├─ Logout events not logged
├─ Failed auth attempts not tracked
└─ No forensic trail for incidents
```

### 4. Token Refresh Missing
```
Risk Level: MEDIUM
├─ refreshToken stored but never used
├─ Users must re-login after expiry
├─ No silent refresh mechanism
└─ Poor UX for long sessions
```

---

## Vulnerability Inventory

### 🔴 HIGH Priority (Fix Before Production)

| ID | Issue | Impact | Remediation |
|----|-------|--------|-------------|
| VUL-001 | localStorage tokens | Session theft via XSS | httpOnly cookies |
| VUL-002 | No token refresh | Poor UX, forced re-login | Implement refresh endpoint |
| VUL-003 | No audit logs | No incident forensics | Create loginEvents table |

### 🟠 MEDIUM Priority

| ID | Issue | Impact | Remediation |
|----|-------|--------|-------------|
| VUL-004 | No rate limiting | Brute force attacks | 3 attempts / 15 min |
| VUL-005 | sessionId extraction no try/catch | Silent failures | Add error handling |
| VUL-006 | Input validation minimal | Invalid data | Format checks |

### 🟡 LOW Priority

| ID | Issue | Impact | Remediation |
|----|-------|--------|-------------|
| VUL-007 | State token TTL 5 min | Tight window | Increase to 10 min |
| VUL-008 | VITE_WORKOS_CLIENT_ID unused | Dead code | Document or remove |

---

## Threat Model

### External Attackers
```
✅ CSRF Attack:        PROTECTED (state token)
✅ Token Replay:       PROTECTED (state deleted after use)
✅ OAuth Injection:    PROTECTED (WorkOS handles)
⚠️ Brute Force Login: UNPROTECTED (no rate limit)
✅ Man-in-Middle:      PROTECTED (HTTPS required)
```

### Internal Attackers (Compromised Frontend)
```
⚠️ Token Theft (XSS): VULNERABLE (localStorage)
✅ Role Escalation:    PROTECTED (server-side checks)
✅ API Key Theft:      PROTECTED (backend-only)
✅ Session Hijacking:  PROTECTED (workosUserId validation)
```

### Insiders
```
⚠️ Password Reset:    PROTECTED (WorkOS handles)
⚠️ Data Deletion:     UNPROTECTED (no audit log)
✅ Data Modification:  PROTECTED (user ID validation)
```

---

## Compliance Assessment

### GDPR Readiness
| Requirement | Status |
|-------------|--------|
| User identity traceable | ✅ workosUserId |
| Data deletion possible | ✅ By workosUserId |
| Audit logs for access | ⚠️ MISSING |
| Deletion timestamps | ⚠️ MISSING |

### HIPAA Readiness (If Handling PHI)
| Requirement | Status |
|-------------|--------|
| Encrypted at rest | ⚠️ NOT IMPLEMENTED |
| Audit logging | ⚠️ MISSING |
| httpOnly cookies | ⚠️ NOT IMPLEMENTED |
| Access controls | ✅ IMPLEMENTED |

---

## Security Checklist

### Before Production
- [ ] VUL-001: Migrate to httpOnly cookies
- [ ] VUL-002: Implement token refresh
- [ ] VUL-003: Add audit logging
- [ ] VUL-004: Add rate limiting
- [ ] VUL-005: Add sessionId error handling

### Before HIPAA/GDPR
- [ ] Encrypted session storage
- [ ] Complete audit trail
- [ ] Data retention policies
- [ ] Deletion verification logs

---

→ Next: AUTH_E2E_SPRINT_06_TESTING_GAPS
