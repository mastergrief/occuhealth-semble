# Auth Bugs - Pickup Document

**Date**: 2026-01-04
**Status**: In Progress - Needs continuation

---

## What Was Fixed ✅

### 1. AdminAuthCallback Role Detection (COMPLETED)
**File**: `src/components/auth/AdminAuthCallback.tsx`
- Added `useDoctorAuth`, `useEmployerAuth` imports
- Role-based login logic now calls correct function based on `redirectPath`:
  - `/admin` → `loginAsAdmin()`
  - `/doctor` → `loginAsDoctor()`
  - `/employer` → `loginAsEmployer()`

### 2. DoctorRegistrationForm (COMPLETED)
**Files Created**:
- `src/components/doctor/DoctorRegistrationForm.tsx`
- `src/components/doctor/index.ts`

### 3. Doctor Registration Route (COMPLETED)
**File**: `src/App.tsx`
- Added lazy import and `/register/doctor` route

### 4. ChooseRole Logout Button (COMPLETED)
**File**: `src/pages/register/ChooseRole.tsx`
- Added "Sign out / Use different account" button at bottom

---

## Outstanding Bugs 🐛

### BUG-003: WorkOS Logout Error (HIGH PRIORITY)
**Symptom**: Clicking "Sign Out" in admin dashboard shows WorkOS error page:
- "Error - Something went wrong"
- "Couldn't sign in. If you are not sure what happened, please contact your organization admin."

**Root Cause**: The `returnTo` URL in WorkOS logout isn't whitelisted in WorkOS dashboard.

**Location**: `convex/http.ts` lines 81-88
```typescript
const logoutUrl = workos.userManagement.getLogoutUrl({
  sessionId,
  returnTo: appUrl,  // This URL must be whitelisted in WorkOS
});
```

**Fix Options**:
1. **WorkOS Dashboard**: Add `http://localhost:5175` to allowed redirect URLs
2. **Code Workaround**: Skip WorkOS logout, just clear localStorage and redirect home

**Files to Modify**:
- `src/pages/AdminLayout.tsx` - `handleLogout()` function (line 55-66)
- `src/pages/DoctorLayout.tsx` - similar logout function
- `src/pages/EmployerLayout.tsx` - similar logout function

**Quick Fix** (skip WorkOS, just clear local state):
```typescript
const handleLogout = () => {
  logoutAdmin();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "/";  // Don't call WorkOS logout
};
```

---

### UX Issue: Admin Login Flow Confusion
**Symptom**: User clicks "Sign in as Admin", authenticates with WorkOS using wrong email (not in adminUsers table), gets redirected to choose-role page instead of error message.

**Expected Behavior**: Show "You are not authorized as admin" message.

**Current Behavior**: Silently redirects to choose-role.

**Fix Location**: `src/components/auth/AdminAuthCallback.tsx`
- After login, if `redirectPath` is `/register/choose-role` but user came from `/admin`, show admin-not-authorized error instead of redirecting.

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `testadmin@occuhealth.com` | `(TestPass1234` |
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` |

---

## Files Modified in This Session

1. `src/components/auth/AdminAuthCallback.tsx` - Role detection fix
2. `src/components/doctor/DoctorRegistrationForm.tsx` - NEW
3. `src/components/doctor/index.ts` - NEW
4. `src/App.tsx` - Added doctor registration route
5. `src/pages/register/ChooseRole.tsx` - Added logout button

---

## Next Steps

1. **Fix WorkOS logout** - Either configure WorkOS dashboard OR implement code workaround
2. **Better admin auth error** - Show proper message when non-admin tries admin login
3. **Test full flows** - Doctor login, employer login, new user registration

---

## Related Memories

- `AUTH_REMEDIATION_INDEX` - Full sprint documentation
- `AUTH_REMEDIATION_EXECUTION_20260104` - Execution summary
