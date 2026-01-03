# External Auth Dependencies & Integrations - Complete Mapping

**Created**: 2026-01-03
**Status**: Complete Discovery
**Scope**: WorkOS AuthKit + Convex Auth + Token Management

---

## EXECUTIVE SUMMARY

The system uses a **hybrid authentication approach**:
- **WorkOS AuthKit**: OAuth-based auth for admins, employers, doctors (primary)
- **Convex Auth (Password)**: Legacy password auth (still configured, not actively used)
- **Token Management**: LocalStorage-based client-side token persistence for WorkOS sessions
- **Database Integration**: Convex backend manages user records (adminUsers, employers, doctorSettings)

---

## 1. NPM DEPENDENCIES - AUTH ECOSYSTEM

### Production Dependencies

```json
{
  "@convex-dev/auth": "^0.0.90",
  "@workos-inc/node": "^7.79.3",
  "convex": "^1.31.2",
  "react": "^19.0.0",
  "react-router-dom": "^7.11.0"
}
```

| Package | Version | Role | Backend/Frontend |
|---------|---------|------|------------------|
| `@workos-inc/node` | ^7.79.3 | OAuth provider SDK | Backend only |
| `@convex-dev/auth` | ^0.0.90 | Auth framework | Both |
| `convex` | ^1.31.2 | Backend + React bindings | Both |
| `react-router-dom` | ^7.11.0 | Routing (callback handling) | Frontend |

**No other OAuth libraries**: No Clerk, Auth0, or NextAuth. WorkOS is standalone.

---

## 2. ENVIRONMENT VARIABLES - COMPLETE MANIFEST

### Backend (convex/) - Requires process.env

```bash
# WorkOS Configuration
WORKOS_CLIENT_ID=<your-client-id>
WORKOS_API_KEY=<your-api-key>

# Convex Configuration (auto-provided by Convex CLI)
CONVEX_SITE_URL=https://giddy-lapwing-915.convex.site  # Set by `convex dev`
CONVEX_DEPLOYMENT=dev:giddy-lapwing-915

# Convex Auth Domain (auth.config.ts)
# Pulls from: process.env.CONVEX_SITE_URL
```

### Frontend (src/) - Requires import.meta.env.VITE_*

```bash
# Vite-exposed variables
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud
VITE_WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N

# Note: WORKOS_API_KEY is NOT exposed to frontend (secure, backend-only)
```

### Environment Variable Usage Map

| Var | Used In | Backend/Frontend | Purpose |
|-----|---------|------------------|---------|
| `WORKOS_CLIENT_ID` | convex/http.ts | Backend | OAuth client identification |
| `WORKOS_API_KEY` | convex/http.ts | Backend | Server-to-server auth (never exposed) |
| `VITE_WORKOS_CLIENT_ID` | (Not yet used) | Frontend | Could be used for frontend SDK (not implemented) |
| `VITE_CONVEX_URL` | src/main.tsx | Frontend | Convex client initialization |
| `CONVEX_SITE_URL` | convex/http.ts, convex/auth.config.ts | Backend | OAuth redirect URI construction |
| `CONVEX_DEPLOYMENT` | CLI only | Backend | Convex deployment identifier |

---

## 3. WORKOS INTEGRATION - API ENDPOINTS & FLOW

### WorkOS SDK Initialization

**File**: `convex/http.ts:16-25`

```typescript
function getWorkOS() {
  const apiKey = process.env.WORKOS_API_KEY;
  const clientId = process.env.WORKOS_CLIENT_ID;

  if (!apiKey || !clientId) {
    throw new Error("WORKOS_API_KEY and WORKOS_CLIENT_ID must be configured");
  }

  return new WorkOS(apiKey, { clientId });
}
```

**Validation**: Throws if credentials missing (critical path).

### WorkOS OAuth Flow - HTTP Routes

#### Route 1: Login Redirect (`GET /auth/login`)

**File**: `convex/http.ts:27-47`

```
Request:  GET /auth/login
Action:   → Calls WorkOS.userManagement.getAuthorizationUrl()
Provider: "authkit"
Redirect: ${CONVEX_SITE_URL}/auth/callback
Response: HTTP 302 → Redirects to WorkOS hosted login page
```

**URL Construction**:
```
workos.userManagement.getAuthorizationUrl({
  provider: "authkit",
  redirectUri: `${process.env.CONVEX_SITE_URL}/auth/callback`,
  clientId: process.env.WORKOS_CLIENT_ID
})
```

**Result**: User sent to WorkOS login UI.

#### Route 2: OAuth Callback (`GET /auth/callback`)

**File**: `convex/http.ts:49-131`

**Request Parameters**:
```
?code=...          // OAuth authorization code
?error=...         // Error if auth failed
?error_description=...
```

**Processing Steps**:

1. **Extract OAuth Code** (lines 53-56)
   ```
   code = searchParams.get("code")
   error = searchParams.get("error")
   ```

2. **Exchange Code for Tokens** (lines 77-81)
   ```typescript
   const { user, accessToken, refreshToken } =
     await workos.userManagement.authenticateWithCode({
       code,
       clientId,
     });
   ```
   
   **Returns**:
   - `user`: WorkOS user object (id, email, firstName, lastName, profilePictureUrl)
   - `accessToken`: JWT for API calls
   - `refreshToken`: Token for refreshing access (optional)

3. **Role-Based Routing** (lines 84-98)
   ```typescript
   // Query Convex for existing user
   [employer, doctor, adminUser] = await Promise.all([
     ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
     ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
     ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
   ]);

   // Determine redirect
   if (employer) redirectPath = "/employer";
   else if (doctor) redirectPath = "/doctor";
   else if (adminUser) redirectPath = "/admin";
   else redirectPath = "/register/choose-role";  // New user
   ```

4. **Upsert Admin User** (lines 101-109, admin only)
   ```typescript
   if (adminUser) {
     await ctx.runMutation(internal.adminUsers.upsertAdminUser, {
       workosUserId: user.id,
       email: user.email,
       firstName: user.firstName,
       // ...
     });
   }
   ```

5. **Return Tokens via Frontend** (lines 111-121)
   ```
   Redirect: ${APP_URL}/auth/callback?
     accessToken=...
     &refreshToken=...
     &userId=...
     &redirectPath=/employer
   ```
   
   **Note**: Tokens passed via URL params to frontend (not via HTTP-only cookie).

---

## 4. CONVEX AUTH SETUP - LEGACY PASSWORD PROVIDER

### Configuration

**File**: `convex/auth.ts`

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

**Status**: ✅ Configured but NOT actively used (WorkOS is primary)

### HTTP Routes Registration

**File**: `convex/http.ts:136`

```typescript
auth.addHttpRoutes(http);
```

**Auto-generated Routes**:
```
POST /auth/password/signin
POST /auth/password/signup
GET  /auth/signout
GET  /auth/session
```

**Note**: These routes exist but frontend doesn't use them (WorkOS OAuth instead).

### Database Schema

**File**: `convex/schema.ts:15-19`

```typescript
export default defineSchema({
  ...authTables,  // Auto-generated by @convex-dev/auth
  // Contains: users, credentials tables
```

**Auto-created Tables**:
- `users`: Standard Convex Auth user records
- `credentials`: Password hashes (bcrypt)

**Current State**: Empty (no users created via password auth).

### Auth Config (Domain)

**File**: `convex/auth.config.ts`

```typescript
export const authConfig = {
  domain: process.env.CONVEX_SITE_URL,
};
```

**Purpose**: Sets auth cookie domain (not actively enforced for WorkOS flow).

---

## 5. FRONTEND AUTH CONTEXT PROVIDERS - ROLE-BASED

### Pattern: Three Parallel Auth Contexts

Each role (admin, employer, doctor) has independent auth context managing:
- WorkOS tokens (accessToken, refreshToken)
- User identity (workosUserId)
- Persistence (localStorage)

#### 5A. Admin Auth Context

**File**: `src/lib/admin-auth.tsx`

```typescript
interface AdminUser {
  userId: string;              // WorkOS user.id
  accessToken: string;         // OAuth token
  refreshToken?: string;       // Refresh token
}

const STORAGE_KEY = "workos_admin_auth";

// Hooks
useAdminAuth() → {
  adminUser,                   // AdminUser | null
  isAdminAuthenticated,        // boolean
  isLoading,                   // boolean
  loginAsAdmin(params),        // Function
  logoutAdmin()                // Function
}
```

**Persistence**: localStorage["workos_admin_auth"] = JSON.stringify(adminUser)

#### 5B. Employer Auth Context

**File**: `src/lib/employer-auth.tsx`

```typescript
interface Employer {
  _id: Id<"employers">;        // Convex document ID
  workosUserId: string;        // WorkOS ID
  email: string;
  companyName: string;
  status: "pending" | "verified" | "rejected";
  contactName: string;
}

const STORAGE_KEY = "workos_employer_auth";

// Hooks
useEmployerAuth() → {
  workosUserId,                // string | null
  accessToken,                 // string | null
  isAuthenticated,             // boolean
  employer,                    // Employer | null
  isVerified,                  // boolean (employer?.status === "verified")
  loginAsEmployer(),           // Function
  logoutEmployer()             // Function
}
```

**Note**: `employer` state initialized as null, queried separately via Convex useQuery.

#### 5C. Doctor Auth Context

**File**: `src/lib/doctor-auth.tsx`

```typescript
interface Doctor {
  _id: Id<"doctorSettings">;
  workosUserId: string;
  email: string;
  name: string;
  zoomPersonalLink: string;
}

const STORAGE_KEY = "workos_doctor_auth";

// Hooks
useDoctorAuth() → {
  workosUserId,                // string | null
  accessToken,                 // string | null
  isAuthenticated,             // boolean
  doctor,                      // Doctor | null
  loginAsDoctor(),             // Function
  logoutDoctor()               // Function
}
```

---

## 6. AUTH CALLBACK HANDLERS - FRONTEND

### Admin Auth Callback

**File**: `src/components/auth/AdminAuthCallback.tsx`

**Route**: `/auth/callback` (from convex/http.ts)

**Processing**:
1. Extract params: `accessToken`, `refreshToken`, `userId`, `error`
2. If error → Display error UI
3. If tokens exist → Call `loginAsAdmin()`
4. Redirect → `/admin`

**Component**: Loading spinner during token processing.

### Role Selection (New Users)

**File**: `src/pages/register/ChooseRole.tsx`

**Triggered**: When `ctx.runQuery` finds no matching employer/doctor/admin record.

**Flow**:
1. Display role selection card (Employer vs Doctor)
2. Pass tokens via URL params to registration form
3. Redirect → `/register/employer` or `/register/doctor`

**Token Passing**:
```typescript
const params = new URLSearchParams({
  accessToken,
  refreshToken,
  userId,
});
navigate(`/register/${role}?${params.toString()}`);
```

### Employer Registration

**File**: `src/components/employer/EmployerRegistrationForm.tsx`

**Receives**: `accessToken`, `refreshToken`, `userId` from URL params

**Action**: Creates `employers` record via Convex mutation:
```typescript
await createEmployer({
  workosUserId: userId,
  email: user.email,
  companyType,
  companyName,
  contactName,
  // ... address fields
});
```

**Result**: Entry in `employers` table → role detection on next login

---

## 7. CONVEX DATABASE FUNCTIONS - USER MANAGEMENT

### Admin Users

**File**: `convex/adminUsers.ts`

```typescript
// Internal: Called during OAuth callback
upsertAdminUser(ctx, {
  workosUserId,
  email,
  firstName,
  lastName,
  profilePictureUrl,
})
// Upsert on lastLoginAt

// Query: Used during role detection
getByWorkosId(ctx, { workosUserId })
// Returns: adminUsers record or null

// Public query
getByWorkosUserId(query, { workosUserId })
getByEmail(query, { email })
```

**Index**: `by_workos_user_id`, `by_email`

### Employers

**File**: `convex/employers.ts`

```typescript
// Internal: Used for role detection
getByWorkosId(ctx, { workosUserId })
// Returns: employers record or null

// Mutation: Called during registration
create(ctx, {
  workosUserId,
  email,
  companyType,
  companyName,
  // ... 8 more fields
})
// Returns: status="pending" by default

// Admin: Verify/Reject
verify(ctx, { employerId, adminUserId })
reject(ctx, { employerId, reason })

// Query for employer lookup
getByWorkosIdPublic()
```

**Indices**: `by_workos_user`, `by_status`, `by_email`

### Doctor Settings

**File**: `convex/doctorSettings.ts`

```typescript
// Internal: Used for role detection
getByWorkosId(ctx, { workosUserId })

// Mutation: Called during registration
create(ctx, {
  workosUserId,
  email,
  name,
  zoomPersonalLink,
})

// Query
getByWorkosUserId(query, { workosUserId })
```

**Index**: `by_workos_user`

---

## 8. HTTP ROUTING ARCHITECTURE

### Convex HTTP Routes

**File**: `convex/http.ts`

```
Root: httpRouter()

Routes:
├── GET  /auth/login              [WorkOS OAuth initiation]
├── GET  /auth/callback           [WorkOS OAuth callback]
├── POST /auth/password/signin    [Convex Auth - auto-added]
├── POST /auth/password/signup    [Convex Auth - auto-added]
├── GET  /auth/signout            [Convex Auth - auto-added]
├── GET  /health                  [Health check]
└── (Other webhook routes handled elsewhere)

Export: default http
```

### OAuth Redirect URIs

**Registered with WorkOS**:
```
https://giddy-lapwing-915.convex.site/auth/callback
```

**Frontend receives tokens**: Via URL params, NOT via HTTP-only cookie

---

## 9. FRONTEND APP ROUTING

**File**: `src/App.tsx`

```
Routes:
├── /auth/callback                 → AdminAuthCallback component
├── /register/choose-role          → ChooseRole component
├── /register/employer             → EmployerRegistrationForm component
├── /employer/*                    → EmployerAuthProvider + EmployerLayout
├── /doctor/*                      → DoctorAuthProvider + DoctorLayout
├── /admin/*                       → AdminLayout
└── /*                             → MainLayout (landing/home)
```

**Provider Hierarchy**:
```
AdminAuthProvider (global)
  ├─ EmployerAuthProvider (on /employer routes)
  ├─ DoctorAuthProvider (on /doctor routes)
  └─ ConvexReactClient
```

---

## 10. SECURITY CONSIDERATIONS

### Token Management

| Token Type | Storage | Backend Aware? | Expiration |
|-----------|---------|---|---|
| accessToken | localStorage | No | WorkOS default (~1 hour) |
| refreshToken | localStorage | No | WorkOS default (~7 days) |
| userId | localStorage | Yes (for queries) | Session |

**Risk**: Tokens in localStorage vulnerable to XSS. No HTTP-only cookies.
**Mitigation**: None currently (acceptable for development/staging).

### WORKOS_API_KEY Security

✅ Secure: Backend-only (convex/http.ts only)
❌ Not exposed to frontend

### Cross-Site Request Forgery (CSRF)

❌ Not protected: No CSRF tokens on `/auth/callback` route

### Cookie-based Session

- No HTTP-only cookies set
- Frontend session entirely token-based
- Logout = localStorage.removeItem()

---

## 11. DATA FLOW DIAGRAMS

### New User Registration Flow

```
WorkOS AuthKit
      ↓
/auth/callback (backend)
      ↓
Check: employer? doctor? admin? (internal queries)
      ↓
If NOT found:
  → Redirect /register/choose-role
      ↓
User selects role → /register/{employer|doctor}
      ↓
EmployerRegistrationForm / DoctorRegistrationForm
      ↓
create mutation in Convex
      ↓
Entry in employers/doctorSettings table
      ↓
Next login → Role detected → Redirect to portal
```

### Existing User Login Flow

```
WorkOS AuthKit
      ↓
/auth/callback (backend)
      ↓
Check: employer? → YES
       doctor? → YES
       admin? → YES
      ↓
Redirect with tokens:
/auth/callback?accessToken=...&userId=...&redirectPath=/employer
      ↓
Frontend (AdminAuthCallback or role layout)
      ↓
Store tokens in localStorage (context)
      ↓
Navigate to role portal
```

---

## 12. ERROR HANDLING

### OAuth Errors

**File**: `convex/http.ts:58-66`

```typescript
if (error) {
  // Error from WorkOS
  return Response.redirect(
    `${APP_URL}/login?error=${encodeURIComponent(errorDescription || error)}`,
    302
  );
}
```

**Frontend**: Displays error in AdminAuthCallback component

### Missing Tokens

**Backend**: Returns 400 if code missing
**Frontend**: Displays "Missing authentication tokens" error

### WorkOS Unavailable

**Backend**: Catch block returns 500
**Frontend**: Redirects to login with error param

---

## 13. DEPENDENCY GRAPH - VISUAL SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
├─────────────────────────────────────────────────────────────┤
│                     WorkOS (OAuth)                          │
│              https://workos.com/authkit                     │
│    ✓ User authentication & management                       │
│    ✓ Session handling                                       │
│    ✓ Profile data (email, name, picture)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ OAuth Code → Tokens
                       │
        ┌──────────────▼───────────────┐
        │  Convex HTTP Router          │
        │  (convex/http.ts)            │
        │ - /auth/login                │
        │ - /auth/callback             │
        └──────────────┬───────────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      ▼                ▼                ▼
  [Admin]        [Employer]       [Doctor]
  ┌──────┐      ┌──────────┐    ┌────────┐
  │Admin │      │Employer  │    │Doctor  │
  │Users │      │Settings  │    │Settings│
  └──────┘      └──────────┘    └────────┘
      │              │               │
      └──────────┬───┴───────────┬───┘
                 │               │
          ┌──────▼──────┬────────▼──────┐
          │  @convex-dev/auth (unused)  │
          │  - Password provider        │
          │  - authTables (users,creds) │
          └─────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  Frontend React App     │
          │ (src/)                  │
          │ - Auth Contexts         │
          │ - Role Detection        │
          │ - Portal Navigation     │
          └────────────────────────┘
```

---

## 14. CONFIGURATION CHECKLIST

### Required to Deploy

- [x] WORKOS_CLIENT_ID
- [x] WORKOS_API_KEY
- [x] VITE_CONVEX_URL
- [x] CONVEX_DEPLOYMENT (via CLI)
- [x] CONVEX_SITE_URL (auto-set by convex dev)

### Optional (Not Currently Used)

- [ ] VITE_WORKOS_CLIENT_ID (would enable frontend SDK)
- [ ] APP_URL (fallback to localhost:5175 in dev)

### Schema Tables Required

- [x] adminUsers
- [x] employers
- [x] doctorSettings
- [x] users (from authTables)
- [x] credentials (from authTables)

---

## 15. TESTING & VERIFICATION

### Verify WorkOS Integration

```bash
# Check credentials are loaded
grep -r "process.env.WORKOS" convex/

# Check env vars present
cat .env.local | grep WORKOS

# Test OAuth flow (dev)
1. Navigate: http://localhost:5175/
2. Click login link
3. Verify redirect to WorkOS login page
4. Complete auth → Check redirect to /auth/callback
5. Verify tokens in localStorage
6. Verify role-based redirect
```

### Check Token Persistence

```javascript
// In browser console
localStorage.getItem('workos_admin_auth')
localStorage.getItem('workos_employer_auth')
localStorage.getItem('workos_doctor_auth')
```

---

## 16. TROUBLESHOOTING REFERENCE

| Issue | Cause | Fix |
|-------|-------|-----|
| /auth/login returns 500 | Missing WORKOS_API_KEY | Set env var in .env.local |
| /auth/callback returns 400 | Missing code param | Check WorkOS OAuth app config |
| Tokens not stored | localStorage quota exceeded | Clear storage, reload |
| Role detection fails | workosUserId mismatch | Check adminUsers/employers query |
| Redirect loop at /register | User record not created | Complete registration form |

---

## KEY INSIGHTS

1. **Hybrid Auth**: WorkOS is primary (OAuth), Convex Auth is legacy (ignored)
2. **No Session Service**: Tokens manage entirely via localStorage
3. **Role-Based Routing**: Backend determines redirect path during callback
4. **Token Passing**: URL params (not cookies), frontend stores in localStorage
5. **New User UX**: /register/choose-role branching to role-specific forms
6. **Database Schema**: adminUsers/employers/doctorSettings are separate tables per role
7. **Internal Queries**: Role detection uses internal queries in callback handler
8. **No Refresh Logic**: Tokens assumed persistent, no refresh endpoint

---

## RELATED FILES - DEPENDENCY NETWORK

### Backend Files
- `convex/http.ts` - OAuth routes (primary)
- `convex/auth.ts` - Convex Auth (unused)
- `convex/adminUsers.ts` - Admin user queries/mutations
- `convex/employers.ts` - Employer CRUD + role detection
- `convex/doctorSettings.ts` - Doctor CRUD + role detection
- `convex/schema.ts` - Database schema

### Frontend Files
- `src/lib/admin-auth.tsx` - Admin auth context
- `src/lib/employer-auth.tsx` - Employer auth context
- `src/lib/doctor-auth.tsx` - Doctor auth context
- `src/components/auth/AdminAuthCallback.tsx` - OAuth callback handler
- `src/pages/register/ChooseRole.tsx` - Role selection
- `src/components/employer/EmployerRegistrationForm.tsx` - Employer registration
- `src/App.tsx` - Router + provider hierarchy

### Configuration Files
- `.env.local` - Environment variables
- `package.json` - Dependencies
- `convex/auth.config.ts` - Auth domain config
