# Role Detection & Routing Flow Analysis - Auth Callback

**Investigation Date**: 2026-01-04  
**Task**: Map role detection and routing flow on auth callback  
**Scope**: Complete flow from WorkOS callback to portal routing  
**Status**: COMPLETE

---

## Executive Summary

The auth callback flow **CORRECTLY detects user roles** from the database and **routes appropriately**. However, there is a **critical integration gap** in the frontend:

- The backend (`convex/http.ts`) correctly identifies existing users and returns `redirectPath` in URL
- The frontend callback handler (`src/components/auth/AdminAuthCallback.tsx`) **ignores the role detection** and always routes to admin login
- Existing doctors/employers are forced through `/register/choose-role` instead of their portals
- The DoctorRegistrationForm component is **missing entirely**

---

## COMPLETE FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS LOGIN                                             │
│    Location: src/App.tsx line 181-182                            │
│    Action: window.location.href = "/auth/login"                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. BACKEND: /auth/login ROUTE                                    │
│    Location: convex/http.ts lines 26-63                          │
│    Handler: httpAction                                           │
│    Output: Redirects to WorkOS AuthKit with OAuth params         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. WORKOS AUTHKIT                                                │
│    User enters credentials                                       │
│    OAuth callback with authorization code                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. BACKEND: /auth/callback ROUTE ⭐ ROLE DETECTION HERE          │
│    Location: convex/http.ts lines 96-202                         │
│    Handler: httpAction                                           │
│                                                                  │
│    Actions:                                                      │
│    a) Validate CSRF state (lines 116-129)                        │
│    b) Exchange code for tokens (lines 140-144)                   │
│    c) Extract sessionId from JWT (lines 147-150)                 │
│    d) QUERY DATABASE FOR EXISTING ROLE (lines 152-157):          │
│       ├─ await internal.employers.getByWorkosId()                │
│       ├─ await internal.doctorSettings.getByWorkosId()           │
│       └─ await internal.adminUsers.getByWorkosId()               │
│    e) DETERMINE REDIRECT PATH (lines 159-167):                   │
│       ├─ if employer exists → redirectPath = "/employer"         │
│       ├─ else if doctor exists → redirectPath = "/doctor"        │
│       ├─ else if adminUser exists → redirectPath = "/admin"      │
│       └─ else → redirectPath = "/register/choose-role"           │
│    f) Upsert admin user if detected (lines 170-178)              │
│    g) Build callback URL with all params (lines 184-191)         │
│       ├─ accessToken=...                                         │
│       ├─ refreshToken=...                                        │
│       ├─ userId=...                                              │
│       ├─ sessionId=...                                           │
│       └─ redirectPath=... ⭐ CRITICAL: set correctly             │
│    h) Redirect to frontend callback (line 193)                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. FRONTEND: /auth/callback COMPONENT ❌ BUG HERE                 │
│    Location: src/components/auth/AdminAuthCallback.tsx           │
│    Component: AdminAuthCallback()                                │
│                                                                  │
│    Current Implementation (WRONG):                               │
│    - Reads redirectPath from URL (line 28)                       │
│    - Reads accessToken, userId, etc (lines 23-27)                │
│    - Calls loginAsAdmin() (lines 45-50)                          │
│    - Navigates to: redirectPath OR "/admin" (line 62)            │
│                                                                  │
│    THE BUG:                                                      │
│    - Always calls loginAsAdmin() regardless of role              │
│    - For doctors: loginAsAdmin({...})                            │
│    - For employers: loginAsAdmin({...})                          │
│    - Stores tokens in workos_admin_auth localStorage key         │
│    - Doctor/employer auth hooks check workos_doctor_auth /      │
│      workos_employer_auth keys (which are never set)             │
│    - Result: even though redirectPath is correct, tokens         │
│      are in wrong localStorage key                               │
│    - Portal auth guards check wrong key → denies access          │
│                                                                  │
│    Line 62 Analysis:                                             │
│    navigate(redirectPath || "/admin", { replace: true });        │
│    - IF redirectPath = "/doctor" (from backend)                  │
│    - Navigate to /doctor works...                                │
│    - BUT tokens are in workos_admin_auth                         │
│    - Doctor portal checks workos_doctor_auth                     │
│    - Auth check fails → redirects to landing                     │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. FRONTEND: AUTH CONTEXT & ROLE-SPECIFIC HOOKS                  │
│    Location: src/lib/workos-auth.tsx                             │
│                                                                  │
│    WorkOSAuthProvider (lines 162-303):                           │
│    - Unified auth provider for all roles                         │
│    - Loads from localStorage (lines 171-206)                     │
│    - Checks all role keys: workos_admin_auth,                    │
│      workos_employer_auth, workos_doctor_auth                    │
│    - Sets state.role based on which key contains data            │
│    - Provides unified login() function (lines 250-274)           │
│                                                                  │
│    Role-Specific Hooks (lines 320-461):                          │
│    - useAdminAuth() (lines 325-369)                              │
│      └─ Checks: auth.role === "admin" && auth.isAuthenticated    │
│      └─ Stores: userId (not workosUserId for backward compat)    │
│    - useEmployerAuth() (lines 375-416)                           │
│      └─ Checks: auth.role === "employer" && auth.isAuthenticated │
│      └─ Stores: workosUserId                                     │
│    - useDoctorAuth() (lines 422-461)                             │
│      └─ Checks: auth.role === "doctor" && auth.isAuthenticated   │
│      └─ Stores: workosUserId                                     │
│                                                                  │
│    Storage Key Mapping (lines 66-70):                            │
│    ```                                                           │
│    STORAGE_KEYS: Record<UserRole, string> = {                    │
│      admin: "workos_admin_auth",                                 │
│      employer: "workos_employer_auth",                           │
│      doctor: "workos_doctor_auth",                               │
│    };                                                            │
│    ```                                                           │
│    THE FIX IS HERE: AdminAuthCallback must call role-             │
│    appropriate login() method, not always loginAsAdmin()         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. PORTAL ACCESS: LAYOUT AUTH CHECKS                             │
│    Location: src/pages/DoctorLayout.tsx, EmployerLayout.tsx      │
│                                                                  │
│    DoctorLayout auth check (should be in file):                  │
│    - useAuth: useDoctorAuth()                                    │
│    - Check: const { isAuthenticated } = useDoctorAuth()          │
│    - If not authenticated: <Navigate to="/" replace />           │
│    - useDoctorAuth checks: auth.role === "doctor"                │
│    - Doctor tokens must be in workos_doctor_auth key             │
│                                                                  │
│    AdminAuthCallback bug flow:                                   │
│    1. Doctor logs in                                             │
│    2. Backend correctly detects doctor → redirectPath="/doctor"  │
│    3. Frontend calls loginAsAdmin() (WRONG!)                     │
│    4. Stores in workos_admin_auth (WRONG!)                       │
│    5. Navigate to /doctor → DoctorLayout loads                   │
│    6. useDoctorAuth() checks auth.role === "doctor"              │
│    7. auth.role = "admin" (because workos_admin_auth found)      │
│    8. isAuthenticated = false (admin !== doctor)                 │
│    9. Redirects to landing page                                  │
│    10. User never sees the "choose-role" (except on first load)  │
│                                                                  │
│    WAIT: Why do E2E tests show /register/choose-role?            │
│    Answer: AdminAuthCallback navigates to redirectPath/register  │
│    if redirectPath starts with "/register" (lines 53-60)         │
│    For NEW users with no role:                                   │
│    - redirectPath = "/register/choose-role"                      │
│    - Navigate to /register/choose-role → ChooseRole component    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. REGISTRATION PAGES                                            │
│    Location: src/pages/register/                                 │
│                                                                  │
│    ChooseRole.tsx (exists) ✓                                      │
│    - Displays employer/doctor role cards                         │
│    - Routes to /register/employer or /register/doctor            │
│    - No database check for existing users                        │
│    - Should NOT show for existing users                          │
│                                                                  │
│    EmployerRegistrationForm.tsx (exists) ✓                        │
│    - 3-step form (company details → address → GDPR consent)      │
│    - Creates employer record in database                         │
│    - Calls loginAsEmployer() (CORRECT)                           │
│    - Routes to /employer on completion                           │
│                                                                  │
│    DoctorRegistrationForm.tsx (MISSING) ❌                        │
│    - Should be src/components/doctor/DoctorRegistrationForm.tsx  │
│    - Should be wired in src/App.tsx route                        │
│    - Currently: no component exists                              │
│    - Currently: no route in App.tsx for /register/doctor         │
│    - E2E test: shows "Quick Stats (Demo)" placeholder            │
│      (this is the MainLayout Dashboard component from App.tsx)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## ROOT CAUSE: The Missing `redirectPath` Usage

### Backend Correctly Determines Role

**File**: `convex/http.ts` lines 152-167

```typescript
// Check role-based routing - which table does this user belong to?
const [employer, doctor, adminUser] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
]);

// Determine redirect path based on role
let redirectPath = "/register/choose-role";  // default: new user
if (employer) {
  redirectPath = "/employer";                 // existing employer
} else if (doctor) {
  redirectPath = "/doctor";                   // existing doctor
} else if (adminUser) {
  redirectPath = "/admin";                    // existing admin
}
```

**Status**: ✅ CORRECT - Backend queries database and sets correct `redirectPath`

---

### Frontend Ignores `redirectPath` Role Determination

**File**: `src/components/auth/AdminAuthCallback.tsx` lines 44-62

```typescript
// BUG: Always calls loginAsAdmin() regardless of redirectPath
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});

// Navigates to redirectPath, but tokens are in WRONG key
if (redirectPath?.startsWith("/register")) {
  const params = new URLSearchParams({...});
  navigate(`${redirectPath}?${params.toString()}`, { replace: true });
} else {
  navigate(redirectPath || "/admin", { replace: true });
}
```

**Status**: ❌ BUG - Always calls `loginAsAdmin()`, ignoring role from `redirectPath`

---

## Key Database Query Functions (Verification)

### employers.ts - Line 13-21
```typescript
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("employers")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});
```
**Returns**: Employer record if exists, null if not

---

### doctorSettings.ts - Line 10-18
```typescript
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("doctorSettings")
      .withIndex("by_workos_user", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});
```
**Returns**: Doctor record if exists, null if not

---

### adminUsers.ts - Line 49-57
```typescript
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db
      .query("adminUsers")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", workosUserId))
      .first();
  },
});
```
**Returns**: Admin user record if exists, null if not

---

## Token Storage Architecture

### Unified Provider (workos-auth.tsx)

**WorkOSAuthProvider** (lines 162-303):
- Loads from ALL role-specific localStorage keys on mount
- First found key wins and sets `state.role`
- Implements `login(role, tokens)` which stores in appropriate key

**Login Method** (lines 250-274):
```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  const storageKey = STORAGE_KEYS[role];  // Selects correct key based on role
  localStorage.setItem(storageKey, JSON.stringify(storageData));
  setState({
    isAuthenticated: true,
    role,  // ← role is tracked in state
    ...
  });
}, []);
```

**The Fix**: AdminAuthCallback must call role-appropriate login:
- For doctors: `auth.login("doctor", tokens)`
- For employers: `auth.login("employer", tokens)`
- For admins: `auth.login("admin", tokens)`

---

## Why Existing E2E Tests Show `/register/choose-role`

The E2E tests log in as doctors/employers but see `/register/choose-role` because:

1. ✅ Backend correctly detects existing user and sets `redirectPath = "/doctor"`
2. ❌ Frontend always calls `loginAsAdmin()` → stores in `workos_admin_auth`
3. ✅ Frontend navigates to `/doctor/dashboard` (correct path)
4. ❌ DoctorLayout auth check finds `workos_admin_auth` → sets `role = "admin"`
5. ❌ `useDoctorAuth()` checks: `role === "doctor"` → FALSE
6. ❌ Redirects to landing page with `isAuthenticated = false`
7. 📍 Landing page shows authenticated nav (because useWorkOSAuth finds admin token)
8. 📍 Shows "Quick Stats (Demo)" dashboard (MainLayout Dashboard component)
9. 📍 Next login attempt redirects to `/auth/login` again
10. 📍 On 2nd login, somehow routes to `/register/choose-role` (needs verification)

**Hypothesis**: On 2nd attempt, user is considered "new" because doctor record lookup fails? Need to verify if:
- Token is lost between navigation attempts
- AdminAuthCallback processes multiple times
- Session state gets corrupted

---

## Missing Component

### DoctorRegistrationForm

**Missing File**: `src/components/doctor/DoctorRegistrationForm.tsx`

**Should be similar to**: `src/components/employer/EmployerRegistrationForm.tsx`

**Expected Implementation**:
1. 3-step form for doctor profile
2. Fields: license number, specialty, clinic info, contact, zoom link
3. Creates `doctorSettings` record in database
4. Calls `loginAsDoctor(workosUserId, accessToken, refreshToken, sessionId)`
5. Redirects to `/doctor/dashboard`

**Current Status**:
- No component exists
- Route `/register/doctor` not wired in `App.tsx`
- When accessed: shows MainLayout Dashboard (wrong component)

---

## App.tsx Routing Configuration

**File**: `src/App.tsx` lines 64-113

```typescript
export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AdminAuthCallback />} />  // ← BUG HERE
      
      {/* Registration routes */}
      <Route path="/register/choose-role" element={<ChooseRole />} />
      <Route path="/register/employer" element={<EmployerRegistrationForm />} />
      {/* MISSING: /register/doctor route */}
      
      {/* Portals with auth providers */}
      <Route path="/employer/*" element={<EmployerAuthProvider>...</EmployerAuthProvider>} />
      <Route path="/doctor/*" element={<DoctorAuthProvider>...</DoctorAuthProvider>} />
      <Route path="/admin/*" element={<AdminLayout />} />
      
      {/* Catch-all landing page */}
      <Route path="/*" element={<MainLayout />} />  // ← Shows when doctor navigates
    </Routes>
  );
}
```

---

## Summary of Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| **AdminAuthCallback always calls `loginAsAdmin()`** | Critical | `src/components/auth/AdminAuthCallback.tsx:45` | All non-admin users get wrong localStorage key |
| **DoctorRegistrationForm missing** | Critical | `src/components/doctor/DoctorRegistrationForm.tsx` | New doctors cannot register |
| **No `/register/doctor` route** | Critical | `src/App.tsx:74-78` | New doctors see wrong component |
| **ChooseRole doesn't check for existing users** | Medium | `src/pages/register/ChooseRole.tsx` | Existing users unnecessarily shown role selection |
| **No guidance in AdminAuthCallback** | Medium | `src/components/auth/AdminAuthCallback.tsx` | Code shows intent to support all roles but implementation is admin-only |

---

## Fixing Strategy

### Fix 1: Use Role Detection from Backend (Priority: CRITICAL)

**Location**: `src/components/auth/AdminAuthCallback.tsx` lines 40-63

**Current Code**:
```typescript
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
```

**Required Fix**:
```typescript
// Parse redirectPath to determine role
const role = redirectPath === "/admin" ? "admin"
           : redirectPath === "/doctor" ? "doctor"
           : redirectPath === "/employer" ? "employer"
           : redirectPath?.startsWith("/register") ? "new-user"
           : "unknown";

// Call role-appropriate login
if (role === "admin") {
  loginAsAdmin({ userId, accessToken, refreshToken, sessionId });
} else if (role === "doctor") {
  loginAsDoctor(userId, accessToken, refreshToken, sessionId);
} else if (role === "employer") {
  loginAsEmployer(userId, accessToken, refreshToken, sessionId);
} else if (role === "new-user") {
  // For new users, don't store auth yet - pass through to registration
  // Navigation handles the rest
}
```

**Note**: Need to import `useDoctorAuth` and `useEmployerAuth` hooks

---

### Fix 2: Create DoctorRegistrationForm (Priority: CRITICAL)

**Location**: Create `src/components/doctor/DoctorRegistrationForm.tsx`

**Template**: Copy from `src/components/employer/EmployerRegistrationForm.tsx` and adapt

**Key Changes**:
- Form fields: license, specialty, clinic, contact, zoom link
- Create `doctorSettings` record instead of `employers`
- Call `loginAsDoctor()` on completion
- Redirect to `/doctor/dashboard`

---

### Fix 3: Wire DoctorRegistrationForm Route (Priority: CRITICAL)

**Location**: `src/App.tsx` line 74-78

**Add**:
```typescript
const DoctorRegistrationForm = lazy(() =>
  import("./components/doctor/DoctorRegistrationForm").then(m => ({ default: m.DoctorRegistrationForm }))
);

// In Routes:
<Route path="/register/doctor" element={
  <Suspense fallback={<PageLoader />}>
    <DoctorRegistrationForm />
  </Suspense>
} />
```

---

### Fix 4: Add Existing User Check to ChooseRole (Priority: MEDIUM)

**Location**: `src/pages/register/ChooseRole.tsx` lines 1-50

**Add Query**:
```typescript
// Check if user already exists in database
const userId = searchParams.get("userId");
const employer = useQuery(api.employers.getByWorkosIdPublic, { workosUserId: userId });
const doctor = useQuery(api.doctorSettings.getByWorkosId, { workosUserId: userId });

// Redirect if already registered
useEffect(() => {
  if (employer) navigate("/employer");
  if (doctor) navigate("/doctor");
}, [employer, doctor]);

// Show choose-role only if genuinely new
if (!employer && !doctor) {
  // Show role selection
}
```

**Challenge**: Need public query version of doctor lookup (currently internal only)

---

## Verification Checklist

After implementing fixes:

1. **Doctor Login Test**:
   - [ ] Doctor logs in via WorkOS
   - [ ] Callback detects doctor in database
   - [ ] `loginAsDoctor()` called with correct params
   - [ ] Token stored in `workos_doctor_auth` key
   - [ ] Redirected to `/doctor/dashboard`
   - [ ] Doctor portal loads without redirect

2. **Employer Login Test**:
   - [ ] Similar to doctor but for employer
   - [ ] Token in `workos_employer_auth`
   - [ ] Redirected to `/employer/dashboard`

3. **New User Registration**:
   - [ ] User logs in with new WorkOS account
   - [ ] Callback detects no existing records
   - [ ] Redirected to `/register/choose-role`
   - [ ] User selects role (doctor or employer)
   - [ ] Routed to appropriate registration form
   - [ ] Registration form creates database record
   - [ ] Redirected to appropriate portal
   - [ ] Portal loads correctly

4. **Admin Login** (Should still work):
   - [ ] Admin logs in
   - [ ] Callback detects admin in database
   - [ ] Token stored in `workos_admin_auth`
   - [ ] Redirected to `/admin`

---

## Conclusion

The role detection system is **working correctly at the backend level**. The bug is a **frontend integration failure** where:

1. The backend correctly identifies existing users and their roles
2. The frontend always stores tokens as "admin" regardless of actual role
3. Portal auth checks fail because they check the wrong localStorage key
4. Missing doctor registration component prevents new doctor onboarding

**The fix is straightforward**: Use the role information from the backend's `redirectPath` parameter to call the correct role-specific login function instead of always calling `loginAsAdmin()`.

