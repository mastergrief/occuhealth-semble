# Security Audit: AI Integration with Patient Data

**Date**: 2026-01-08  
**Scope**: OpenAI API key management, report mutations, auth guards, GDPR compliance, audit logging

---

## CRITICAL FINDINGS

### 1. EXPOSED API KEYS IN .env.local (SEVERITY: CRITICAL)

**Status**: CRITICAL VULNERABILITY

The following secrets are exposed in `.env.local` (committed to repository):
- `OPENAI_API_KEY=sk-proj-[REDACTED]`
- `WORKOS_API_KEY=sk_test_[REDACTED]`

**Risk**: 
- Full OpenAI API key is in plaintext and tracked by git
- Anyone with repo access can call OpenAI API at the project's cost
- Potential data exfiltration if key is used maliciously
- WorkOS API key similarly exposed

**Evidence**: 
- `.env.local` has `OPENAI_API_KEY` and `WORKOS_API_KEY` in plaintext
- Git history shows no revocation of these keys (not rotated)

**Recommendation**: IMMEDIATE ACTION REQUIRED
1. Rotate both API keys immediately
2. Add `.env.local` to `.gitignore` (already done, but file is already committed)
3. Use `git filter-branch` or `BFG Repo-Cleaner` to purge from history
4. Implement environment-based secret management (Convex Environment Variables)

---

### 2. NO OPENAI LIBRARY IN PACKAGE.JSON (SEVERITY: MEDIUM)

**Status**: INCONSISTENCY DETECTED

The codebase has:
- `OPENAI_API_KEY` and `OPENAI_MODEL_SUGGESTIONS=gpt-5-mini` in `.env.local`
- Memory file `11_GPT5_MINI_INTEGRATION_GUIDE` with code examples
- **NO** `openai` dependency in `package.json`

**Analysis**:
- `package.json` has zero AI/LLM dependencies
- No code in backend (`convex/`) uses the API key
- No code in frontend (`src/`) references OpenAI
- Integration guide exists but is not implemented

**Implication**:
- API key is leaked but currently unused
- If implemented in future, must follow security patterns from memory guide
- Integration guide recommends proper auth checks before AI calls

---

## FINDINGS BY CATEGORY

### 3. REPORT MUTATIONS & AUTH GUARDS (SEVERITY: MEDIUM)

**Status**: PROPERLY IMPLEMENTED

**Findings**:
✅ `reports.ts` implements proper auth guards:
- `create()` - Requires `requireDoctorAccess()` (lines 149)
- `sendToEmployer()` - Requires `requireDoctorAccess()` (line 200)
- `getById()` - Requires `requireEmployerOwnership()` (line 28)
- `getByAppointment()` - Validates doctor OR employer ownership (lines 55-72)
- `listByEmployer()` - Requires `requireEmployerOwnership()` (line 89)
- `markViewed()` - Requires `requireEmployerOwnership()` (line 234)

✅ Auth module (`authModules/authorization.ts`):
- `getAuthenticatedUser()` - Extracts WorkOS identity safely
- `requireDoctorAccess()` - Validates doctor role with database lookup
- `requireEmployerOwnership()` - Verifies employer ownership
- `requireAdmin()` - Validates admin role

**Note**: No AI-generated content is stored in report mutations currently.

---

### 4. PATIENT PII IN AUDIT LOGS (SEVERITY: LOW-MEDIUM)

**Status**: PARTIALLY PROTECTED

**Findings**:
- Audit logging via `gdprModules/audit.ts` logs actions with metadata
- Sensitive fields are NOT included in audit details by default
- Example from `auditLogger.ts`:
  ```typescript
  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,        // employer|doctor|admin|system
    actorId,          // workosUserId (hashed or sanitized)
    resourceType,     // patient|report|appointment
    resourceId,       // Document ID
    details: { patientId, ...details }  // Generic details
  });
  ```

**Potential Risks**:
- `actorId` stores WorkOS user ID (not PII directly, but identifier)
- `patientId` is stored (document ID, not PII)
- Custom `details` object could contain PII if passed incorrectly
- No data masking/redaction in audit logs (only in erasure)

**Recommendation**: 
- Validate all custom details passed to audit logging
- Never include patient name, email, or medical data in audit details
- Consider audit log retention policy

---

### 5. GDPR ERASURE COMPLIANCE (SEVERITY: LOW)

**Status**: WELL IMPLEMENTED

**Findings**:
✅ `gdprModules/erasure.ts` properly redacts:
- Appointments: `reasonForAppointment` → `[REDACTED]`
- Reports: `summary`, `restrictions`, `followUpNotes` → `[REDACTED]`
- Clinical notes: `findings`, `diagnosis` → `[REDACTED]`
- Consents: Withdrawn and marked
- Patient: Soft-deleted with `deletedAt` timestamp

✅ Implementation properly:
- Requires admin authorization (lines 44, 84)
- Marks request as `in_progress` (line 95)
- Completes all data redaction before marking `completed`
- Prevents report listing for deleted patients (line 103 in `reports.ts`)

---

### 6. ENVIRONMENT VARIABLE EXPOSURE (SEVERITY: MEDIUM)

**Frontend Exposure** (Safe):
- `VITE_CONVEX_URL` - Frontend Convex deployment URL (public-safe)
- `VITE_WORKOS_CLIENT_ID` - WorkOS client ID (public-safe)
- **NOT exposed**: `OPENAI_API_KEY` ✅

**Backend Exposure** (Protected):
- `OPENAI_API_KEY` - Backend-only via `process.env` ✅
- `WORKOS_API_KEY` - Backend-only via `process.env` ✅
- Convex HTTP actions can access backend env vars safely

**Vite Config** (`vite.config.ts`):
- No explicit env var allowlist configured
- By default, Vite only exposes `VITE_*` prefixed vars to frontend
- This is correct and prevents accidental exposure

---

## DETAILED SECURITY CHECKLIST

| Requirement | Status | Notes |
|-------------|--------|-------|
| OPENAI_API_KEY in .env.local | ❌ FAIL | Exposed in plaintext, must rotate |
| OPENAI_API_KEY NOT in source code | ✅ PASS | No hardcoded keys in .ts/.tsx files |
| .env.local in .gitignore | ✅ PASS | But already committed to repo history |
| Report mutations have auth guards | ✅ PASS | All mutations require role verification |
| Doctor auth required for reports | ✅ PASS | `requireDoctorAccess()` enforced |
| Employer ownership verified | ✅ PASS | `requireEmployerOwnership()` enforced |
| Patient PII NOT in audit logs | ⚠️ PARTIAL | Actor/resource IDs logged (safe), avoid custom details |
| GDPR erasure redacts patient data | ✅ PASS | Reports, appointments, notes properly redacted |
| Audit logs require admin access | ✅ PASS | `getAuditLogs` requires `requireAdmin()` |
| AI features protected by auth | ✅ PASS | When implemented, memory guide recommends auth checks |
| Frontend cannot access API keys | ✅ PASS | No VITE_ prefixed secrets exposed |
| Backend actions use env vars safely | ✅ PASS | WorkOS, Convex routes use `process.env` |
| Rate limiting implemented | ⚠️ TODO | No rate limiting on report creation/mutations |
| Input validation on mutations | ✅ PASS | Zod validators on all mutation args |

---

## RANKED VULNERABILITIES

### P0 - CRITICAL (Immediate Action)
1. **OPENAI_API_KEY Exposed**: Rotate immediately, purge from git history
2. **WORKOS_API_KEY Exposed**: Rotate immediately, purge from git history

### P1 - HIGH
3. **No rate limiting**: Add rate limiting to report mutations and audit log queries
4. **Audit log custom details**: Validate that PII is never passed in details

### P2 - MEDIUM
5. **AI integration guide exists but unused**: When implementing GPT features, follow the security patterns in memory guide
6. **No input sanitization on text fields**: Validate `summary`, `restrictions`, `followUpNotes` don't contain malicious content

---

## RECOMMENDATIONS

### Immediate (Today)
1. Rotate `OPENAI_API_KEY` in OpenAI console
2. Rotate `WORKOS_API_KEY` in WorkOS dashboard
3. Use `git filter-branch` or `BFG Repo-Cleaner`:
   ```bash
   bfg --delete-files .env.local
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```
4. Verify keys are no longer in git history:
   ```bash
   git log -p -- .env.local | grep -i openai
   git log --all -p | grep "sk-proj" || echo "Clean"
   ```

### Short-term (This Sprint)
1. Implement Convex environment variables:
   - Move secrets to Convex deployment config
   - Access via `process.env` (already done)
   - No plaintext `.env.local` in repo

2. Add rate limiting:
   ```typescript
   const rateLimiter = new RateLimiter(ctx);
   await rateLimiter.checkLimit("report_creation", userId, 10, 3600);
   ```

3. Audit log validation:
   ```typescript
   // Ensure details don't contain PII
   const sanitize = (details: any) => {
     const blocked = ['firstName', 'lastName', 'email', 'phone', 'ssn', 'diagnosis'];
     for (const key of blocked) {
       if (key in details) throw new Error(`Cannot log ${key}`);
     }
   };
   ```

### Long-term (Next Quarter)
1. Implement secrets rotation policy
2. Add API key monitoring/alerting
3. Implement comprehensive audit log retention policy
4. Add SIEM integration for security monitoring

---

## COMPLIANCE NOTES

### GDPR Article 17 (Right to Erasure)
✅ Properly implemented with PII redaction, not deletion

### GDPR Article 28 (Data Processing Agreement)
✅ Convex handles backend infrastructure
⚠️ OpenAI data handling TBD when AI integration is implemented

### GDPR Article 32 (Security)
⚠️ Exposure of API keys violates security principle (must be fixed)
✅ Report data protected by auth guards
✅ Audit trails maintained

---

## SUMMARY

**Overall Security Posture**: MEDIUM (With Critical P0 Issues)

The application has **well-designed auth guards and GDPR compliance** for report handling, but the **exposed API keys create a critical vulnerability**. The unused OpenAI integration means the keys are leaked but not actively exploited. Once rotated and purged from history, the security posture will be STRONG.

**Next Steps**:
1. Rotate keys today
2. Purge from git history today
3. Implement rate limiting this sprint
4. Continue following security patterns in `11_GPT5_MINI_INTEGRATION_GUIDE` when implementing AI features
