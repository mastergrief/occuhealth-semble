# Complete Auth & Login System File Inventory
**Discovery Date**: 2026-01-03  
**Status**: Complete discovery mission  
**Scope**: All authentication, authorization, login, logout, session management files

---

## EXECUTIVE SUMMARY

The OccuHealth system implements a **unified WorkOS OAuth authentication** with **three role-based portals** (Admin, Employer, Doctor). The architecture consolidates legacy separate auth contexts into a single `WorkOSAuthProvider` managing tokens and role state, while maintaining backward compatibility through role-specific hooks.

**Total Auth-Related Files**: 27 files  
**Total Lines of Code (Auth Only)**: ~2,500 lines  
**Primary Dependencies**: @workos-inc/node (7.79.3), @convex-dev/auth (0.0.90), convex (1.31.2)

---

## FILE INVENTORY BY CATEGORY

### A. BACKEND AUTHENTICATION - CONVEX (4 files, 580 lines)

#### 1. **convex/http.ts** - PRIMARY OAuth Router
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/http.ts`
- **Lines**: 225
- **Size**: ~7.0K
- **Purpose**: Core OAuth flow handler (login, callback, logout)
- **Key Functions**:
  - `getWorkOS()` (lines 15-24): Initialize WorkOS SDK with credentials
  - `GET /auth/login` (lines 26-63): Initiate OAuth flow with CSRF state generation
  - `GET /auth/logout` (lines 65-94): Proper WorkOS session logout with sessionId
  - `GET /auth/callback` (lines 96-202): OAuth callback handler with role detection
- **Key Features**:
  - SEC-002: CSRF state validation (5-minute TTL)
  - Session ID extraction from JWT payload
  - Role-based routing (admin/employer/doctor detection)
  - Cross-origin auth via URL parameters
  - Error handling with user-friendly redirects
- **Dependencies**:
  - @workos-inc/node for OAuth
  - internal.oauthState for CSRF protection
  - internal.employers, internal.doctorSettings, internal.adminUsers for role queries

#### 2. **convex/authModules/authorization.ts** - Authorization Helper
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/authModules/authorization.ts`
- **Lines**: 207
- **Size**: ~5.5K
- **Purpose**: Permission checking for mutations/queries
- **Key Functions**:
  - `getAuthenticatedUser()` (lines 58-75): Extract WorkOS identity from Convex auth
  - `requireEmployerOwnership()` (lines 93-123): Verify employer access
  - `requireDoctorAccess()` (lines 139-164): Verify doctor registration
  - `requireAdmin()` (lines 180-207): Verify admin status
- **Key Types**:
  - `AuthenticatedUser`: Contains workosUserId and identity metadata
  - `AuthErrorCode`: Structured error types (UNAUTHENTICATED, UNAUTHORIZED, etc.)
- **Pattern**: All functions throw ConvexError on permission failure
- **Used By**: All protected mutations and queries

#### 3. **convex/oauthState.ts** - CSRF Protection
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/oauthState.ts`
- **Lines**: 53
- **Size**: ~1.3K
- **Purpose**: OAuth state token management (prevent CSRF attacks)
- **Key Functions**:
  - `create()` (lines 8-16): Store state with 5-minute expiration
  - `validate()` (lines 22-35): Check state validity and expiration
  - `deleteState()` (lines 41-53): Remove state after use (prevent replay)
- **Database**: Stored in `oauthStates` table with index `by_state`
- **Lifecycle**: Created at /auth/login → validated at /auth/callback → deleted after validation

#### 4. **convex/authModules/index.ts** - Module Facade
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/authModules/index.ts`
- **Lines**: 22
- **Size**: ~0.6K
- **Purpose**: Re-export authorization helpers
- **Exports**: getAuthenticatedUser, requireEmployerOwnership, requireDoctorAccess, requireAdmin

---

### B. FRONTEND AUTH STATE MANAGEMENT (1 file, 404 lines)

#### 5. **src/lib/workos-auth.tsx** - Unified Auth Provider & Hooks
- **Path**: `/home/gabe/projects/convex-medical-starter/src/lib/workos-auth.tsx`
- **Lines**: 404
- **Size**: ~12K
- **Purpose**: Centralized auth state management for all three roles (consolidated system)
- **Architecture**:
  ```
  WorkOSAuthProvider (root context)
    ├─ useWorkOSAuth() (generic hook)
    ├─ useAdminAuth() (backward compatible)
    ├─ useEmployerAuth() (backward compatible)
    ├─ useDoctorAuth() (backward compatible)
    └─ EmployerAuthProvider / DoctorAuthProvider (aliases)
  ```
- **Key Components**:

  **Types** (lines 16-60):
  - `UserRole`: "admin" | "employer" | "doctor"
  - `AuthTokens`: workosUserId, accessToken, refreshToken, sessionId
  - `WorkOSAuthState`: isAuthenticated, isLoading, tokens, role
  - Legacy types: AdminUser, Employer, Doctor (for backward compatibility)

  **Context Management** (lines 97-238):
  - Single `WorkOSAuthContext` managing all three roles
  - `WorkOSAuthProvider`: Initialize from localStorage on mount
  - Multi-tab sync via StorageEvent listener (lines 144-183)
  - `login(role, tokens)`: Store tokens with role-specific formatting
  - `logout()`: Clear localStorage and reset state

  **Token Validation** (lines 84-91):
  - `isTokenExpired()`: Decode JWT and check exp claim
  - Auto-cleanup of expired tokens

  **Backward-Compatible Hooks** (lines 253-388):
  - `useAdminAuth()` (lines 260-304): Returns AdminUser | null, sessionId
  - `useEmployerAuth()` (lines 310-347): Returns workosUserId, accessToken
  - `useDoctorAuth()` (lines 353-388): Returns workosUserId, accessToken

  **Provider Aliases** (lines 391-404):
  - `EmployerAuthProvider = WorkOSAuthProvider`
  - `DoctorAuthProvider = WorkOSAuthProvider`

- **Storage Keys**:
  - Admin: `workos_admin_auth`
  - Employer: `workos_employer_auth`
  - Doctor: `workos_doctor_auth`
- **Critical Notes**:
  - Handles legacy field normalization (userId → workosUserId for admin)
  - Token expiration checked on load
  - Multi-tab sync keeps all tabs in sync

---

### C. AUTH COMPONENTS (3 files, 114 lines)

#### 6. **src/components/auth/AdminAuthCallback.tsx** - OAuth Callback Handler
- **Path**: `/home/gabe/projects/convex-medical-starter/src/components/auth/AdminAuthCallback.tsx`
- **Lines**: 81
- **Size**: ~2.4K
- **Purpose**: Process OAuth callback and route to role portal
- **Flow**:
  1. Extract tokens from URL parameters (accessToken, refreshToken, userId, sessionId, redirectPath)
  2. Check for OAuth errors from WorkOS
  3. Validate tokens present
  4. Call `loginAsAdmin()` to store in context
  5. Navigate to role-specific path or /admin
- **Key Features**:
  - Double-processing prevention using `processedRef`
  - Error handling with user-friendly message
  - Loading spinner during processing
  - Fallback redirect to admin dashboard

#### 7. **src/components/auth/SignOutButton.tsx** - Logout Component
- **Path**: `/home/gabe/projects/convex-medical-starter/src/components/auth/SignOutButton.tsx`
- **Lines**: 30
- **Size**: ~0.8K
- **Purpose**: Simple logout button component
- **Props**:
  - `showIcon?: boolean` (default: true)
  - `variant?: "ghost" | "outline" | "destructive"` (default: "ghost")
  - `className?: string`
- **Behavior**: Calls `logout()` from context, only renders if authenticated
- **Used By**: Various navbar/header components

#### 8. **src/components/auth/index.ts** - Module Facade
- **Path**: `/home/gabe/projects/convex-medical-starter/src/components/auth/index.ts`
- **Lines**: 3
- **Size**: ~0.1K
- **Purpose**: Re-export auth components
- **Exports**: AdminAuthCallback, SignOutButton

---

### D. REGISTRATION & ONBOARDING (2 files, 413 lines)

#### 9. **src/pages/register/ChooseRole.tsx** - Role Selection
- **Path**: `/home/gabe/projects/convex-medical-starter/src/pages/register/ChooseRole.tsx`
- **Lines**: 82
- **Size**: ~2.4K
- **Purpose**: First-time user role selection (Employer vs Doctor)
- **Triggered When**: User authenticates but has no existing role record
- **Flow**:
  1. Display role selection UI (Employer / Doctor cards)
  2. Extract tokens from URL params
  3. Navigate to role-specific registration form with tokens in query params
- **Route**: `/register/choose-role`

#### 10. **src/components/employer/EmployerRegistrationForm.tsx** - Employer Signup
- **Path**: `/home/gabe/projects/convex-medical-starter/src/components/employer/EmployerRegistrationForm.tsx`
- **Lines**: 331
- **Size**: ~9.8K
- **Purpose**: Multi-step employer registration with GDPR consents
- **Flow**:
  1. Extract workosUserId, accessToken, refreshToken from URL params
  2. Step 1: Collect company details (name, type, registration number, address)
  3. Step 2: Contact information (name, phone, email)
  4. Step 3: GDPR consent checkboxes (data processing, health data, employer sharing)
  5. Submit: Create employers record + 3 GDPR consent records
  6. Store tokens in context via `loginAsEmployer()`
- **Key Data**:
  - CompanyType: "employer" | "insurer"
  - Status: "pending" (default) → "verified" or "rejected" (admin approval)
  - Address fields: line1, line2, city, postcode
- **GDPR Integration**: Creates consent records in `gdpr` table for audit trail

---

### E. LAYOUT & ROUTING (4 files, 337 lines)

#### 11. **src/App.tsx** - Main Router & Provider Hierarchy
- **Path**: `/home/gabe/projects/convex-medical-starter/src/App.tsx`
- **Lines**: 252
- **Size**: ~7.5K
- **Key Sections**:
  - Imports: SignOutButton, AdminAuthCallback, WorkOSAuthProvider
  - Route definitions (lines 65-107):
    - `/auth/callback` → AdminAuthCallback
    - `/register/choose-role` → ChooseRole
    - `/register/employer` → EmployerRegistrationForm
    - `/employer/*` → EmployerLayout (with EmployerAuthProvider)
    - `/doctor/*` → DoctorLayout (with DoctorAuthProvider)
    - `/admin/*` → AdminLayout
  - Provider hierarchy: WorkOSAuthProvider wraps entire app
  - Auth state check (lines 122-139): Routes to Dashboard or LandingPage

#### 12. **src/pages/AdminLayout.tsx** - Admin Portal
- **Path**: `/home/gabe/projects/convex-medical-starter/src/pages/AdminLayout.tsx`
- **Lines**: 117
- **Size**: ~3.4K
- **Purpose**: Admin dashboard layout with auth guard
- **Features**:
  - Uses `useAdminAuth()` for auth check
  - Protected routes: EmployerVerification, AuditLogs, ErasureRequests, GDPRDashboard
  - Logout button in header
  - Role-based access control

#### 13. **src/pages/EmployerLayout.tsx** - Employer Portal
- **Path**: `/home/gabe/projects/convex-medical-starter/src/pages/EmployerLayout.tsx`
- **Lines**: 131
- **Size**: ~3.9K
- **Purpose**: Employer dashboard layout
- **Protected Routes**: Dashboard, Reports, Employees, Bookings, Settings
- **Features**:
  - Status check: Redirects unverified employers
  - Conditional content based on verification status

#### 14. **src/pages/DoctorLayout.tsx** - Doctor Portal
- **Path**: `/home/gabe/projects/convex-medical-starter/src/pages/DoctorLayout.tsx`
- **Lines**: 89
- **Size**: ~2.6K
- **Purpose**: Doctor dashboard layout
- **Protected Routes**: Dashboard, Schedule, Appointments, Reports, Settings

---

### F. DATABASE & BUSINESS LOGIC (3 files, 303 lines)

#### 15. **convex/adminUsers.ts** - Admin User Management
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/adminUsers.ts`
- **Lines**: 78
- **Size**: ~2.3K
- **Key Functions**:
  - `upsertAdminUser()`: Create or update admin on first login (internal)
  - `getByWorkosId()`: Lookup admin by WorkOS ID (internal, used in callback)
  - `getByWorkosUserId()`: Public query for admin lookup
  - `getByEmail()`: Lookup by email
- **Schema**: workosUserId, email, firstName, lastName, profilePictureUrl, lastLoginAt
- **Used In**: OAuth callback for role detection, admin portals

#### 16. **convex/employers.ts** - Employer Management
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/employers.ts`
- **Lines**: 155
- **Size**: ~4.6K
- **Key Functions**:
  - `create()`: Create employer record during registration
  - `getByWorkosId()`: Lookup employer by WorkOS ID (internal, role detection)
  - `verify()`: Admin approval workflow
  - `reject()`: Admin rejection workflow
  - `getByWorkosIdPublic()`: Public query
  - `getByStatus()`: Query by status (pending, verified, rejected)
- **Status Flow**: pending → verified OR rejected
- **Schema**: workosUserId, email, companyName, companyType, status, contactName, address fields
- **Indices**: by_workos_user, by_status, by_email

#### 17. **convex/doctorSettings.ts** - Doctor Account Setup
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/doctorSettings.ts`
- **Lines**: 70
- **Size**: ~2.1K
- **Key Functions**:
  - `create()`: Create doctor record during registration
  - `getByWorkosId()`: Lookup doctor (internal, role detection)
  - `getByWorkosUserId()`: Public query
  - `update()`: Update doctor settings
- **Schema**: workosUserId, email, name, zoomPersonalLink
- **Index**: by_workos_user

---

### G. TESTING (3 files, 328 lines)

#### 18. **tests/e2e/auth/login.spec.ts** - Login E2E Tests
- **Path**: `/home/gabe/projects/convex-medical-starter/tests/e2e/auth/login.spec.ts`
- **Lines**: 85
- **Size**: ~2.5K
- **Purpose**: Test login flow via WorkOS OAuth
- **Test Cases**:
  - Valid admin login
  - Employer login with verification check
  - Doctor login
  - Error handling

#### 19. **tests/e2e/auth/logout.spec.ts** - Logout E2E Tests
- **Path**: `/home/gabe/projects/convex-medical-starter/tests/e2e/auth/logout.spec.ts`
- **Lines**: 99
- **Size**: ~2.9K
- **Purpose**: Test logout flow and session cleanup
- **Test Cases**:
  - Admin logout
  - Employer logout
  - Doctor logout
  - localStorage cleanup verification

#### 20. **tests/e2e/auth/role-routing.spec.ts** - Role-Based Routing Tests
- **Path**: `/home/gabe/projects/convex-medical-starter/tests/e2e/auth/role-routing.spec.ts`
- **Lines**: 91 (inferred from test pattern)
- **Size**: ~2.7K
- **Purpose**: Verify role detection and routing behavior
- **Test Cases**:
  - Admin redirects to /admin
  - Employer redirects to /employer
  - Doctor redirects to /doctor
  - New user redirects to /register/choose-role

#### 21. **tests/e2e/fixtures/auth.fixture.ts** - Test Utilities
- **Path**: `/home/gabe/projects/convex-medical-starter/tests/e2e/fixtures/auth.fixture.ts`
- **Lines**: 53
- **Size**: ~1.6K
- **Purpose**: Shared auth test helpers
- **Helpers**:
  - `setupAuthenticatedSession()`: Prepare test session with tokens
  - `loginWithTestCredentials()`: WorkOS login simulation
  - `generateTestTokens()`: Create valid JWT tokens for testing

---

### H. SCHEMA & DATABASE (1 file reference)

#### 22. **convex/schema.ts** - Database Schema
- **Path**: `/home/gabe/projects/convex-medical-starter/convex/schema.ts`
- **Auth Tables Defined**:
  - `adminUsers`: workosUserId (index), email (index), firstName, lastName, profilePictureUrl, lastLoginAt
  - `employers`: workosUserId (index), email (index), companyName, companyType, status (index), address fields
  - `doctorSettings`: workosUserId (index), email, name, zoomPersonalLink
  - `oauthStates`: state (index), expiresAt
- **Related Tables**:
  - `gdprConsents`: collectedByEmployerId (FK), patientEmail, consentType
  - `patients`: employerId (FK), doctorId (FK)
  - `appointments`: employerId (FK), doctorId (FK), patientId (FK)

---

### I. CONFIGURATION & ENVIRONMENT

#### 23. **Package Dependencies** (in package.json)
- `@workos-inc/node@^7.79.3`: OAuth SDK (backend only)
- `@convex-dev/auth@^0.0.90`: Auth framework (legacy, configured but not used)
- `convex@^1.31.2`: Backend runtime

#### 24. **.env.local** - Credentials
- `WORKOS_CLIENT_ID`: OAuth client identifier
- `WORKOS_API_KEY`: Server-to-server auth (backend only, NEVER exposed)
- `VITE_CONVEX_URL`: Frontend Convex deployment URL
- `VITE_WORKOS_CLIENT_ID`: Frontend OAuth client (optional, not currently used)
- `CONVEX_SITE_URL`: Backend Convex site (auto-set by `convex dev`)

---

### J. AUXILIARY FILES (4 files)

#### 25. **BROWSER-CLI/tests/security/tcp-auth.test.ts** - Security Tests
- **Path**: `/home/gabe/projects/convex-medical-starter/BROWSER-CLI/tests/security/tcp-auth.test.ts`
- **Lines**: 85
- **Size**: ~6.0K
- **Purpose**: TCP daemon authentication and security tests

#### 26. **BROWSER-CLI/states/** - Saved Browser States
- Test states for quick auth verification:
  - `authenticated.json`: Generic auth state
  - `authenticated-coach.json`: Coach role pre-saved
  - `authenticated-coach-fresh.json`: Fresh coach session
  - `calendar-authenticated.json`: Calendar view ready
- **Usage**: `restoreState authenticated-coach` skips login flow

#### 27. **src/main.tsx** - App Initialization
- **Lines**: ~50 (auth-related)
- **Purpose**: Initialize Convex client and WorkOSAuthProvider

---

## AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────┐
│    User at localhost:5175           │
└──────────────┬──────────────────────┘
               │ Click "Sign In"
               ▼
┌──────────────────────────────────────┐
│  GET /auth/login                     │
│  (convex/http.ts:26-63)              │
│  - Generate CSRF state               │
│  - Store state with 5min TTL         │
│  - Redirect to WorkOS                │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌─────────────┐
        │  WorkOS     │ (OAuth provider)
        │  AuthKit    │
        └──────┬──────┘
               │ User completes auth
               │ Sends auth code
               ▼
┌──────────────────────────────────────┐
│  GET /auth/callback                  │
│  (convex/http.ts:96-202)             │
│  Parameters:                         │
│  - code=...        (OAuth code)      │
│  - state=...       (CSRF token)      │
└──────────────┬──────────────────────┘
               │
               ├─ Validate state (SEC-002)
               │  Query oauthStates table
               │  Check expiration
               │  Delete state (prevent replay)
               │
               ├─ Exchange code for tokens
               │  workos.userManagement.authenticateWithCode()
               │  Returns: user, accessToken, refreshToken
               │
               ├─ Extract sessionId from JWT
               │
               ├─ Role Detection (Query trio):
               │  ├─ Query employers by workosUserId
               │  ├─ Query doctorSettings by workosUserId
               │  └─ Query adminUsers by workosUserId
               │
               ├─ Determine Redirect:
               │  ├─ If employer exists → /employer
               │  ├─ If doctor exists → /doctor
               │  ├─ If admin exists → /admin
               │  └─ Else → /register/choose-role
               │
               ├─ Upsert admin record (if admin)
               │
               └─ Redirect to frontend with tokens
                  ?accessToken=...
                  &refreshToken=...
                  &userId=...
                  &sessionId=...
                  &redirectPath=...
               ▼
┌──────────────────────────────────────┐
│  GET /auth/callback (frontend)       │
│  (src/components/auth/...)           │
│  - AdminAuthCallback component       │
│  - Extracts tokens from URL          │
│  - Calls loginAsAdmin()              │
│  - Stores in localStorage            │
│  - Navigates to role portal          │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Role Portal  │
        │ (/admin)     │
        │ (/employer)  │
        │ (/doctor)    │
        └──────────────┘
```

---

## AUTHENTICATION STATE FLOW

```
Initial Load
    │
    ├─ WorkOSAuthProvider (src/lib/workos-auth.tsx)
    │   └─ Load localStorage by role key
    │       ├─ "workos_admin_auth"
    │       ├─ "workos_employer_auth"
    │       └─ "workos_doctor_auth"
    │
    ├─ Check token expiration
    │   └─ Decode JWT, check exp claim
    │
    ├─ Setup StorageEvent listener
    │   └─ Sync auth state across tabs
    │
    └─ Set isLoading=false, expose context
        ├─ useWorkOSAuth() - Generic access
        ├─ useAdminAuth() - Admin specific
        ├─ useEmployerAuth() - Employer specific
        └─ useDoctorAuth() - Doctor specific

Login Action
    │
    ├─ Call login(role, tokens)
    │   ├─ Format tokens by role:
    │   │  ├─ Admin: { userId, accessToken, refreshToken, sessionId }
    │   │  └─ Other: { workosUserId, accessToken, refreshToken, sessionId }
    │   │
    │   ├─ Store in localStorage[STORAGE_KEYS[role]]
    │   └─ Update context state

Logout Action
    │
    ├─ Remove from localStorage[STORAGE_KEYS[role]]
    ├─ Clear context state
    └─ Redirect to /

Multi-Tab Sync
    │
    └─ StorageEvent listener
        ├─ If another tab logs in: Load and sync
        ├─ If another tab logs out: Clear state
        └─ Update all tabs instantly
```

---

## SECURITY FEATURES & GAPS

### Implemented (✅)

1. **CSRF Protection (SEC-002)**
   - State tokens generated at /auth/login
   - 5-minute TTL
   - Validated at /auth/callback
   - Deleted after use (replay prevention)

2. **Server-Side API Key Protection**
   - WORKOS_API_KEY never exposed to frontend
   - Only used in convex/http.ts backend routes

3. **Session ID Extraction**
   - Extracted from JWT `sid` claim
   - Passed to logout endpoint for proper WorkOS session termination

4. **Token Expiration Checks**
   - Frontend: Decode JWT and validate exp claim on load
   - Auto-cleanup of expired tokens

5. **Role-Based Access Control**
   - Backend authorization helpers:
     - `requireEmployerOwnership()`: Verify employer ownership
     - `requireDoctorAccess()`: Check doctor registration
     - `requireAdmin()`: Check admin status
   - All protected mutations/queries use these guards

### Not Implemented (❌)

1. **Token Refresh Logic**
   - Tokens assumed persistent
   - No refresh endpoint (tokens expire, user must re-login)
   - refreshToken received but not used

2. **HTTP-Only Cookies**
   - Tokens stored in localStorage (XSS vulnerable)
   - No CSRF cookies (acceptable for SPA with modern JWT)

3. **Rate Limiting**
   - No rate limit on /auth/login or /auth/callback
   - Vulnerable to brute-force auth attempts

4. **Audit Logging**
   - No login/logout events logged
   - No failed auth attempt tracking

---

## DEPENDENCY GRAPH

```
@workos-inc/node (v7.79.3)
    └─ Used in: convex/http.ts only
       ├─ WorkOS SDK initialization
       ├─ getAuthorizationUrl() for login redirect
       ├─ authenticateWithCode() for token exchange
       └─ getLogoutUrl() for session termination

@convex-dev/auth (v0.0.90)
    └─ Configured in: convex/auth.ts
       ├─ Password provider (unused)
       ├─ authTables (users, credentials) - empty
       └─ NOT used in production flow

convex (v1.31.2)
    └─ Backend: httpRouter, httpAction, mutations, queries
    └─ Frontend: useMutation, useQuery, useAction

react-router-dom (v7.11.0)
    └─ Route definitions and navigation
    └─ URL parameter extraction in callbacks

React Context API
    └─ src/lib/workos-auth.tsx
       └─ WorkOSAuthProvider + useWorkOSAuth()
```

---

## STORAGE & PERSISTENCE

### localStorage (Client-Side)

| Key | Role | Value Type | TTL |
|-----|------|-----------|-----|
| `workos_admin_auth` | Admin | JSON: {userId, accessToken, refreshToken, sessionId} | Until logout |
| `workos_employer_auth` | Employer | JSON: {workosUserId, accessToken, refreshToken, sessionId} | Until logout |
| `workos_doctor_auth` | Doctor | JSON: {workosUserId, accessToken, refreshToken, sessionId} | Until logout |

### Convex Database (Server-Side)

| Table | Purpose | TTL | Keys |
|-------|---------|-----|------|
| `oauthStates` | CSRF tokens | 5 minutes | state (indexed) |
| `adminUsers` | Admin accounts | Permanent | workosUserId (indexed), email (indexed) |
| `employers` | Employer accounts | Permanent | workosUserId (indexed), status (indexed) |
| `doctorSettings` | Doctor accounts | Permanent | workosUserId (indexed) |

---

## ERROR HANDLING

### OAuth Errors (Server-Side)

| Error | Cause | Response |
|-------|-------|----------|
| Missing WORKOS_API_KEY | Not configured | HTTP 500: "WorkOS not configured" |
| OAuth error from WorkOS | User denied, provider issue | HTTP 302 to /login?error=... |
| Missing code parameter | No OAuth code | HTTP 400: "Missing authorization code" |
| Invalid state | CSRF validation failed | HTTP 302 to /login?error=invalid_state |
| Expired state | State >5 minutes old | HTTP 302 to /login?error=invalid_state |
| WorkOS API failure | Network/API error | HTTP 302 to /login?error=Authentication failed |

### Frontend Errors

| Error | Handling |
|-------|----------|
| Missing tokens | Show "Missing authentication tokens" |
| OAuth error param in URL | Display error message to user |
| Token expired | Auto-cleanup, redirect to login |
| Failed mutation | Show error toast, retry |

---

## CONFIGURATION CHECKLIST

### Required Before Deploy

- [ ] WORKOS_CLIENT_ID set in .env.local
- [ ] WORKOS_API_KEY set in .env.local (backend only)
- [ ] CONVEX_SITE_URL set correctly (auto-set by convex dev)
- [ ] VITE_CONVEX_URL set to correct deployment
- [ ] WorkOS OAuth app configured with redirect URI
- [ ] Database schema migrations applied (adminUsers, employers, doctorSettings, oauthStates)
- [ ] Test full flow: login → callback → role detection → portal

### Verified Files

- ✅ convex/http.ts: OAuth routes configured
- ✅ convex/authModules/authorization.ts: Permission checks implemented
- ✅ src/lib/workos-auth.tsx: Token persistence and multi-tab sync
- ✅ src/components/auth/AdminAuthCallback.tsx: Callback handler ready
- ✅ Convex schema: All auth tables defined
- ✅ Routes in App.tsx: /auth/callback, /register/choose-role mapped

---

## STATISTICS

| Metric | Count |
|--------|-------|
| Total Auth Files | 27 |
| Backend Files (Convex) | 4 |
| Frontend Components | 3 |
| Auth Context Providers | 1 |
| Database Modules | 3 |
| Layout Files | 4 |
| Test Files | 3 |
| Configuration Files | 3 |
| Auxiliary Files | 4 |
| **Total Lines of Code (Auth)** | ~2,500 |
| **Largest File** | src/lib/workos-auth.tsx (404 lines) |
| **Smallest File** | src/components/auth/index.ts (3 lines) |
| **Database Tables** | 4 auth-related + 8 business tables |
| **Distinct Errors** | 5+ types (UNAUTHENTICATED, UNAUTHORIZED, etc.) |

---

## KEY INSIGHTS

1. **Unified Auth System**: Single WorkOSAuthProvider manages all three roles (admin, employer, doctor) with role-specific hooks for backward compatibility

2. **OAuth First**: WorkOS is primary auth; Convex Auth (password) is configured but unused

3. **CSRF Protection**: SEC-002 implements state tokens with 5-minute expiration and replay attack prevention

4. **Role-Based Routing**: Backend determines redirect path during OAuth callback based on which table user exists in

5. **Token Passing**: Tokens passed via URL parameters (not cookies) due to cross-origin OAuth callback requirements

6. **Multi-Tab Sync**: StorageEvent listener keeps auth state synchronized across browser tabs

7. **No Token Refresh**: Tokens assumed persistent; no refresh endpoint means user must re-login after expiration

8. **Frontend-Agnostic Auth**: Context only manages tokens; employer/doctor data fetched separately via Convex queries

9. **GDPR Integration**: Registration form creates consent records in gdpr table for audit trail

10. **Status Workflow**: Employers start in "pending" state; admins can verify or reject before access granted

---

## RELATED DOCUMENTATION

- See memory: `AUTH_DEPENDENCY_QUICK_REFERENCE` for quick lookup
- See memory: `AUTH_EXTERNAL_DEPENDENCIES_COMPLETE_MAP` for detailed dependency analysis
- See memory: `DB_SCHEMA_CONTEXT_FOR_WORKOS_MIGRATION` for database design rationale
