# Remediation Roadmap

**Sprint**: 07 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: All previous sprints
**Next**: ✓ Final Sprint

---

## Phase Overview

| Phase | Timeline | Focus | Effort |
|-------|----------|-------|--------|
| **Phase 1** | Day 1 | P0 Critical Fixes | ~4 hours |
| **Phase 2** | Day 2-3 | P1 Security & Logout | ~6 hours |
| **Phase 3** | Week 2 | P2 Testing & Quality | ~8 hours |
| **Phase 4** | Week 3+ | P3 Polish & Hardening | ~4 hours |

---

## Phase 1: Critical Fixes (P0)

### Task 1.1: Fix AdminAuthCallback Role Detection

**File**: `src/components/auth/AdminAuthCallback.tsx`
**Lines**: 44-50 (replace entire block)
**Effort**: 1-2 hours

**Current Code**:
```typescript
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

**Fixed Code**:
```typescript
// Import hooks at top of file
const { loginAsAdmin } = useAdminAuth();
const { loginAsDoctor } = useDoctorAuth();
const { loginAsEmployer } = useEmployerAuth();

// Replace lines 44-50 with:
// Detect role from backend's redirectPath and call appropriate login
if (redirectPath?.startsWith('/admin')) {
  loginAsAdmin({
    accessToken,
    refreshToken: refreshToken || undefined,
    userId,
    sessionId: sessionId || undefined,
  });
} else if (redirectPath?.startsWith('/doctor')) {
  loginAsDoctor(userId, accessToken, refreshToken || undefined, sessionId || undefined);
} else if (redirectPath?.startsWith('/employer')) {
  loginAsEmployer(userId, accessToken, refreshToken || undefined, sessionId || undefined);
}
// else: new user going to /register/choose-role - no login needed yet
```

**Acceptance Criteria**:
- [ ] Doctor login stores token in `workos_doctor_auth`
- [ ] Employer login stores token in `workos_employer_auth`
- [ ] Admin login still works (stores in `workos_admin_auth`)
- [ ] New users go to choose-role without token storage

**Verification**:
```bash
# Browser agent test
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Provider Login"
# ... complete doctor login ...
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate "localStorage.getItem('workos_doctor_auth')"
# Should return token object, not null
```

---

### Task 1.2: Add Doctor Registration Route

**File**: `src/App.tsx`
**Location**: After line 78 (after employer registration route)
**Effort**: 2-3 hours

**Add Route**:
```typescript
<Route
  path="/register/doctor"
  element={
    <Suspense fallback={<SuspenseLoader />}>
      <WorkOSAuthProvider>
        <DoctorRegistrationForm />
      </WorkOSAuthProvider>
    </Suspense>
  }
/>
```

**Create Component**: `src/components/doctor/DoctorRegistrationForm.tsx`

**Template** (based on EmployerRegistrationForm.tsx):
```typescript
export function DoctorRegistrationForm() {
  const { loginAsDoctor } = useDoctorAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const accessToken = searchParams.get("accessToken");
  const workosUserId = searchParams.get("userId");
  const refreshToken = searchParams.get("refreshToken");
  const sessionId = searchParams.get("sessionId");

  // Form fields: licenseNumber, specialty, clinicName, phone
  // On submit: createDoctor mutation + loginAsDoctor + navigate to /doctor

  return (
    <form onSubmit={handleSubmit}>
      {/* License Number */}
      {/* Specialty Dropdown */}
      {/* Clinic Name */}
      {/* Contact Phone */}
      {/* Submit Button */}
    </form>
  );
}
```

**Acceptance Criteria**:
- [ ] `/register/doctor` route renders form
- [ ] Form captures: license, specialty, clinic, phone
- [ ] Submit creates doctor record in database
- [ ] After submit, user redirected to `/doctor/dashboard`
- [ ] Token stored in `workos_doctor_auth`

---

### Task 1.3: Update ChooseRole Navigation

**File**: `src/pages/register/ChooseRole.tsx`
**Verify**: Doctor card navigates to `/register/doctor` with tokens

**Check**:
```typescript
// Ensure this pattern exists for doctor:
navigate(`/register/doctor?accessToken=${accessToken}&userId=${userId}&...`);
```

---

## Phase 2: Security & Logout (P1)

### Task 2.1: Restrict CORS

**File**: `convex/http.ts`
**Lines**: 229-233
**Effort**: 30 minutes

**Current**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
```

**Fixed**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "http://localhost:5175",
  "Access-Control-Allow-Credentials": "true",
```

---

### Task 2.2: Add CSP Headers

**File**: `vite.config.ts` or server middleware
**Effort**: 1 hour

**Add to Vite config** (for dev):
```typescript
server: {
  headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

**For production**: Configure in hosting platform (Vercel, Netlify, etc.)

---

### Task 2.3: Fix Logout Flow

**Investigation needed**: Why does WorkOS show error?
**Effort**: 2-3 hours

**Debug Steps**:
1. Log the logout URL being generated
2. Check if sessionId is valid
3. Verify APP_URL matches WorkOS redirect whitelist
4. Check WorkOS dashboard for error logs

**Potential Fixes**:
- Ensure `APP_URL` environment variable is set correctly
- Verify sessionId is captured and stored during login
- Check WorkOS redirect URL configuration

---

## Phase 3: Testing & Quality (P2)

### Task 3.1: Install Unit Testing

**Effort**: 1 hour

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Create**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

---

### Task 3.2: Write Critical Unit Tests

**Effort**: 4-6 hours

**Priority Tests**:
1. `isTokenExpired.test.ts` - Token expiration logic
2. `login.test.ts` - Storage key selection
3. `useDoctorAuth.test.tsx` - Role checking
4. `AdminAuthCallback.test.tsx` - Role detection

---

### Task 3.3: Add ErrorBoundary to Auth Routes

**File**: `src/App.tsx`
**Effort**: 1 hour

Wrap auth routes:
```typescript
<Route path="/auth/callback" element={
  <ErrorBoundary fallback={<AuthErrorFallback />}>
    <AdminAuthCallback />
  </ErrorBoundary>
} />
```

---

## Phase 4: Polish (P3)

### Task 4.1: Standardize Hook Signatures

**Effort**: 2 hours

Change `loginAsAdmin` from object params to positional (or vice versa) for consistency.

### Task 4.2: Unify Field Naming

**Effort**: 2 hours

Change `userId` to `workosUserId` in admin storage for consistency.

### Task 4.3: Update Documentation

**Effort**: 2 hours

- Update NAV-MAP.md with accurate route status
- Add JSDoc to auth hooks
- Document the fix in README

---

## Verification Checklist

### After Phase 1

- [ ] Admin login → `/admin` ✅
- [ ] Doctor login → `/doctor/dashboard` ✅
- [ ] Employer login → `/employer/dashboard` ✅
- [ ] New user → `/register/choose-role` ✅
- [ ] Doctor registration form works ✅
- [ ] Tokens in correct localStorage keys ✅

### After Phase 2

- [ ] CORS restricted to APP_URL ✅
- [ ] CSP headers prevent XSS ✅
- [ ] Logout redirects cleanly ✅

### After Phase 3

- [ ] Unit tests pass ✅
- [ ] Test coverage > 50% for auth code ✅
- [ ] ErrorBoundaries on all auth routes ✅

### After Phase 4

- [ ] Hook signatures consistent ✅
- [ ] Field naming consistent ✅
- [ ] Documentation updated ✅

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking admin flow | Test admin after each change |
| WorkOS session issues | Log all WorkOS API calls |
| Storage migration | Clear localStorage instructions for existing users |
| Registration data loss | Test with new WorkOS users |

---

## Rollback Plan

If issues arise:
1. Revert AdminAuthCallback.tsx to always use `loginAsAdmin`
2. Remove new routes
3. Admin portal will continue working
4. Doctor/employer will remain broken (current state)

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Admin portal access | 95% | 100% |
| Doctor portal access | 0% | 100% |
| Employer portal access | 0% | 100% |
| Auth unit test coverage | 0% | 50%+ |
| Security vulnerabilities | 2 critical | 0 critical |

---

✓ Final Sprint - Remediation Roadmap Complete
