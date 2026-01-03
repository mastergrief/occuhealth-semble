# Auth Dependencies - Complete Visual Diagram

## External Services Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKOS.COM                              │
│                    OAuth 2.0 Provider                           │
│                                                                 │
│  • User Management API                                          │
│  • getAuthorizationUrl() → hosted login page                    │
│  • authenticateWithCode() → {user, accessToken, refreshToken}  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ 1. GET /auth/login
                     │    (redirect to WorkOS login)
                     │
                     │ 2. User authenticates at WorkOS
                     │
                     │ 3. GET /auth/callback?code=...
                     │    (WorkOS sends authorization code)
                     │
        ┌────────────▼──────────────┐
        │                           │
        │  CONVEX BACKEND           │
        │  (convex/http.ts)         │
        │                           │
        │  http.route({             │
        │    path: /auth/login      │──→ getAuthorizationUrl()
        │    path: /auth/callback   │──→ authenticateWithCode()
        │  })                       │
        │                           │
        │  Role Detection:          │
        │  • getByWorkosId()        │
        │    (employers table)      │
        │  • getByWorkosId()        │
        │    (doctorSettings)       │
        │  • getByWorkosId()        │
        │    (adminUsers)           │
        │                           │
        │  Redirect: /auth/callback │
        │    ?accessToken=...       │
        │    &userId=...            │
        │    &redirectPath=/...     │
        └────────────┬──────────────┘
                     │
                     │ HTTP 302
                     │
        ┌────────────▼──────────────┐
        │                           │
        │  FRONTEND REACT APP       │
        │  (src/pages)              │
        │                           │
        │  Routes:                  │
        │  • /auth/callback         │──→ AdminAuthCallback.tsx
        │  • /register/...          │──→ ChooseRole.tsx
        │  • /admin/*               │──→ AdminLayout
        │  • /employer/*            │──→ EmployerLayout
        │  • /doctor/*              │──→ DoctorLayout
        │                           │
        │  Auth Contexts:           │
        │  • AdminAuthProvider      │
        │  • EmployerAuthProvider   │
        │  • DoctorAuthProvider     │
        │                           │
        │  Token Storage:           │
        │  localStorage['workos_*'] │
        └───────────────────────────┘
```

## Package Dependency Tree

```
occuhealth (package.json)
│
├─ @workos-inc/node@7.79.3 (OAuth SDK)
│  │
│  └─ UserManagement SDK
│     ├─ getAuthorizationUrl()
│     └─ authenticateWithCode()
│
├─ @convex-dev/auth@0.0.90 (Auth Framework)
│  │
│  ├─ Password provider (unused)
│  │  ├─ signIn/signUp mutations
│  │  └─ authTables schema
│  │
│  ├─ Authenticated/Unauthenticated components (unused for new auth)
│  └─ useAuthActions/useConvexAuth hooks (unused)
│
├─ convex@1.31.2 (Backend Runtime)
│  ├─ httpRouter() → defines /auth/* routes
│  ├─ httpAction() → executes WorkOS SDK
│  ├─ query/mutation/action → database operations
│  └─ internalQuery/internalMutation → role detection
│
├─ react@19.0.0 (Frontend)
│  ├─ createContext/useContext → Auth contexts
│  ├─ useState/useEffect → Auth state + persistence
│  └─ ReactNode → Component composition
│
└─ react-router-dom@7.11.0 (Routing)
   ├─ Routes → app structure
   ├─ Route → individual pages
   ├─ useSearchParams → OAuth params extraction
   └─ useNavigate → post-auth navigation
```

## Data Flow - OAuth Callback Processing

```
┌──────────────────────┐
│  Backend receives:   │
│  GET /auth/callback  │
│  ?code=...           │
│  &state=...          │
└──────────┬───────────┘
           │
           ▼
    ┌─────────────────────────────────────────┐
    │ workos.userManagement.authenticateWithCode()   │
    │   Input: { code, clientId }              │
    └─────────────────────────────────────────┘
           │
           ▼ Returns
    ┌─────────────────────────────────────────┐
    │ {                                       │
    │   user: {                               │
    │     id: "user_...",         ← workosUserId
    │     email: "...",                       │
    │     firstName: "...",                   │
    │     lastName: "...",                    │
    │     profilePictureUrl: "..."            │
    │   },                                    │
    │   accessToken: "eyJ...",                │
    │   refreshToken: "..."                   │
    │ }                                       │
    └──────────────┬────────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────────┐
    │ ROLE DETECTION (3x parallel queries)    │
    │                                         │
    │ 1. employers                            │
    │    .withIndex("by_workos_user")         │
    │    .eq(user.id)                         │
    │    → Employer? YES/NO                   │
    │                                         │
    │ 2. doctorSettings                       │
    │    .withIndex("by_workos_user")         │
    │    .eq(user.id)                         │
    │    → Doctor? YES/NO                     │
    │                                         │
    │ 3. adminUsers                           │
    │    .withIndex("by_workos_user_id")      │
    │    .eq(user.id)                         │
    │    → Admin? YES/NO                      │
    └──────────────┬────────────────────────┘
                   │
                   ▼ Determine redirect path
    ┌─────────────────────────────────────────┐
    │ if (employer)                           │
    │   redirectPath = "/employer"            │
    │ else if (doctor)                        │
    │   redirectPath = "/doctor"              │
    │ else if (adminUser)                     │
    │   redirectPath = "/admin"               │
    │   // UPSERT admin user (lastLoginAt)    │
    │ else                                    │
    │   redirectPath = "/register/choose-role"│
    │                                         │
    │ // If admin: upsertAdminUser()          │
    │ //   Updates lastLoginAt timestamp      │
    └──────────────┬────────────────────────┘
                   │
                   ▼ Build frontend callback URL
    ┌─────────────────────────────────────────┐
    │ Response.redirect(                      │
    │   `${APP_URL}/auth/callback?            │
    │    accessToken=${accessToken}           │
    │    &refreshToken=${refreshToken}        │
    │    &userId=${user.id}                   │
    │    &redirectPath=${redirectPath}`       │
    │ )                                       │
    └──────────────┬────────────────────────┘
                   │
                   ▼ HTTP 302
         Browser redirects to frontend
                   │
        ┌──────────▼──────────┐
        │ Frontend receives   │
        │ /auth/callback      │
        │ ?accessToken=...    │
        │ &refreshToken=...   │
        │ &userId=...         │
        │ &redirectPath=...   │
        └──────────┬──────────┘
                   │
              React component:
      AdminAuthCallback.tsx extracts params
                   │
                   ▼
      loginAsAdmin({
        userId,
        accessToken,
        refreshToken
      })
                   │
                   ▼
      localStorage['workos_admin_auth'] = {...}
                   │
                   ▼
      navigate(redirectPath)
```

## Database Schema - Auth Tables Relationship

```
┌────────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                            │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ADMIN USERS TABLE                                      │   │
│  │ ─────────────────────────────────────────────────────  │   │
│  │ _id: Id                                                │   │
│  │ workosUserId: string ← From WorkOS (indexed)           │   │
│  │ email: string                                          │   │
│  │ firstName: optional                                    │   │
│  │ lastName: optional                                    │   │
│  │ profilePictureUrl: optional                           │   │
│  │ lastLoginAt: number                                   │   │
│  │ createdAt: number                                     │   │
│  │                                                        │   │
│  │ Operations:                                            │   │
│  │ ├─ upsertAdminUser() [internal mutation]              │   │
│  │ ├─ getByWorkosId() [internal query] ← Role detection  │   │
│  │ ├─ getByWorkosUserId() [public query]                 │   │
│  │ └─ getByEmail() [public query]                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                      Part of /admin route                      │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ EMPLOYERS TABLE                                        │   │
│  │ ─────────────────────────────────────────────────────  │   │
│  │ _id: Id                                                │   │
│  │ workosUserId: string ← From WorkOS (indexed)           │   │
│  │ email: string                                          │   │
│  │ companyType: "employer" | "insurer"                   │   │
│  │ companyName: string                                    │   │
│  │ companyRegistrationNumber: optional                   │   │
│  │ contactName: string                                    │   │
│  │ contactPhone: optional                                │   │
│  │ addressLine1: string                                   │   │
│  │ addressLine2: optional                                │   │
│  │ city: string                                           │   │
│  │ postcode: string                                       │   │
│  │ status: "pending" | "verified" | "rejected"           │   │
│  │ verifiedAt: optional                                  │   │
│  │ verifiedBy: optional ← id("adminUsers")               │   │
│  │ rejectionReason: optional                             │   │
│  │ createdAt: number                                     │   │
│  │ updatedAt: number                                     │   │
│  │                                                        │   │
│  │ Operations:                                            │   │
│  │ ├─ getByWorkosId() [internal query] ← Role detection  │   │
│  │ ├─ create() [mutation] ← From registration            │   │
│  │ ├─ update() [mutation]                                │   │
│  │ ├─ listPending() [query]                              │   │
│  │ ├─ listAll() [query]                                  │   │
│  │ ├─ verify() [mutation] ← Admin approval               │   │
│  │ └─ reject() [mutation] ← Admin rejection              │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                      Part of /employer route                   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ DOCTOR SETTINGS TABLE                                 │   │
│  │ ─────────────────────────────────────────────────────  │   │
│  │ _id: Id                                                │   │
│  │ workosUserId: string ← From WorkOS (indexed)           │   │
│  │ email: string                                          │   │
│  │ name: string                                           │   │
│  │ zoomPersonalLink: string                               │   │
│  │ createdAt: number                                     │   │
│  │                                                        │   │
│  │ Operations:                                            │   │
│  │ ├─ getByWorkosId() [internal query] ← Role detection  │   │
│  │ ├─ create() [mutation] ← From registration            │   │
│  │ ├─ update() [mutation]                                │   │
│  │ └─ getByWorkosUserId() [public query]                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                      Part of /doctor route                     │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ USERS TABLE (Convex Auth - UNUSED)                    │   │
│  │ ─────────────────────────────────────────────────────  │   │
│  │ _id: Id                                                │   │
│  │ email: string                                          │   │
│  │ isEmailVerified: boolean                              │   │
│  │                                                        │   │
│  │ Status: LEGACY - Password provider not used           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ CREDENTIALS TABLE (Convex Auth - UNUSED)              │   │
│  │ ─────────────────────────────────────────────────────  │   │
│  │ _id: Id                                                │   │
│  │ userId: Id<"users">                                    │   │
│  │ providerId: "password"                                 │   │
│  │ providerAccountId: string                             │   │
│  │ password_hash: string (bcrypt)                        │   │
│  │                                                        │   │
│  │ Status: LEGACY - Password auth not used               │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Frontend Token & Context Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER STORAGE                           │
│                                                              │
│  localStorage {                                              │
│    workos_admin_auth: {                                      │
│      userId: "user_...",                                     │
│      accessToken: "eyJ...",                                  │
│      refreshToken: "..."                                     │
│    },                                                        │
│    workos_employer_auth: {                                   │
│      workosUserId: "user_...",                               │
│      accessToken: "eyJ...",                                  │
│      refreshToken: "..."                                     │
│    },                                                        │
│    workos_doctor_auth: {                                     │
│      workosUserId: "user_...",                               │
│      accessToken: "eyJ...",                                  │
│      refreshToken: "..."                                     │
│    }                                                         │
│  }                                                           │
└───────────────┬────────────────────────────────────────────┘
                │
                ▼ On app load
┌──────────────────────────────────────────────────────────────┐
│               AUTH CONTEXT PROVIDERS                         │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │ AdminAuthProvider                  │                     │
│  │ ─────────────────────────────────  │                     │
│  │ useEffect: Load from localStorage  │                     │
│  │ ├─ setAdminUser(parsed)            │                     │
│  │ ├─ setIsLoading(false)             │                     │
│  │ └─ Provide hooks:                  │                     │
│  │    ├─ useAdminAuth()               │                     │
│  │    └─ loginAsAdmin()               │                     │
│  │        logoutAdmin()               │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │ EmployerAuthProvider               │                     │
│  │ ─────────────────────────────────  │                     │
│  │ useEffect: Load from localStorage  │                     │
│  │ ├─ setAuthState(parsed)            │                     │
│  │ ├─ setIsLoading(false)             │                     │
│  │ └─ Provide hooks:                  │                     │
│  │    ├─ useEmployerAuth()            │                     │
│  │    ├─ loginAsEmployer()            │                     │
│  │    └─ logoutEmployer()             │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  ┌────────────────────────────────────┐                     │
│  │ DoctorAuthProvider                 │                     │
│  │ ─────────────────────────────────  │                     │
│  │ useEffect: Load from localStorage  │                     │
│  │ ├─ setAuthState(parsed)            │                     │
│  │ ├─ setIsLoading(false)             │                     │
│  │ └─ Provide hooks:                  │                     │
│  │    ├─ useDoctorAuth()              │                     │
│  │    ├─ loginAsDoctor()              │                     │
│  │    └─ logoutDoctor()               │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                │
                ▼ Components subscribe
┌──────────────────────────────────────────────────────────────┐
│                  CONSUMING COMPONENTS                        │
│                                                              │
│  ├─ AdminLayout        (useAdminAuth)                        │
│  ├─ EmployerLayout     (useEmployerAuth)                     │
│  ├─ DoctorLayout       (useDoctorAuth)                       │
│  ├─ AdminAuthCallback  (loginAsAdmin)                        │
│  ├─ EmployerDashboard  (useEmployerAuth)                     │
│  └─ DoctorDashboard    (useDoctorAuth)                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Environment Variable Usage - Where They Flow

```
.env.local
   │
   ├─ WORKOS_CLIENT_ID
   │  │
   │  ├─ Backend: convex/http.ts:24 → getWorkOS()
   │  │  ├─ Used in /auth/login (line 33)
   │  │  └─ Used in /auth/callback (line 74)
   │  │
   │  └─ Frontend: (VITE_WORKOS_CLIENT_ID)
   │     └─ Not currently used (available for future frontend SDK)
   │
   ├─ WORKOS_API_KEY
   │  │
   │  └─ Backend only: convex/http.ts:17
   │     └─ new WorkOS(apiKey) authentication
   │
   ├─ VITE_CONVEX_URL
   │  │
   │  └─ Frontend: src/main.tsx:10
   │     └─ ConvexReactClient initialization
   │
   ├─ CONVEX_SITE_URL (auto-set by convex dev)
   │  │
   │  ├─ Backend: convex/http.ts:37, 61, 112, 124
   │  │  └─ OAuth redirect URI: ${CONVEX_SITE_URL}/auth/callback
   │  │
   │  └─ Backend: convex/auth.config.ts:5
   │     └─ Auth cookie domain configuration
   │
   └─ CONVEX_DEPLOYMENT
      │
      └─ CLI only: convex deploy / convex dev
         └─ Deployment identifier
```

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ SECURE BOUNDARY (Backend Only)                             │
│                                                            │
│  • WORKOS_API_KEY (never exposed to frontend)             │
│  • Token verification (backend validates before use)      │
│  • Role detection (backend determines redirect)           │
│  • Admin user upsert (backend updates lastLoginAt)        │
│                                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                    HTTP API boundary
                          │
┌─────────────────────────────────────────────────────────────┐
│ EXPOSED TO FRONTEND (Via URL Params)                       │
│                                                            │
│  ⚠️ accessToken (in localStorage, vulnerable to XSS)       │
│  ⚠️ refreshToken (in localStorage, vulnerable to XSS)      │
│  ⚠️ userId (public, stored in localStorage)               │
│                                                            │
│ Mitigation: None (acceptable for dev/staging)             │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Failure & Recovery Points

```
┌──────────────────────────────────────────────────────────────┐
│ FAILURE POINT 1: Missing WorkOS Credentials                 │
├──────────────────────────────────────────────────────────────┤
│ Location: convex/http.ts:20-22                              │
│ Error: "WORKOS_API_KEY and WORKOS_CLIENT_ID must be config" │
│ Recovery: Set env vars, restart convex dev                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FAILURE POINT 2: OAuth Code Exchange Fails                  │
├──────────────────────────────────────────────────────────────┤
│ Location: convex/http.ts:77-81                              │
│ Error: WorkOS API error (wrong code, expired, etc)         │
│ Recovery: Catch → Redirect to login?error=...               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FAILURE POINT 3: Missing Authorization Code                 │
├──────────────────────────────────────────────────────────────┤
│ Location: convex/http.ts:68-70                              │
│ Error: 400 Bad Request                                       │
│ Recovery: WorkOS not calling callback correctly              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FAILURE POINT 4: Role Detection Queries Fail                │
├──────────────────────────────────────────────────────────────┤
│ Location: convex/http.ts:84-88                              │
│ Error: Database error                                        │
│ Recovery: Check employers/doctorSettings/adminUsers exist    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FAILURE POINT 5: localStorage Full                           │
├──────────────────────────────────────────────────────────────┤
│ Location: Frontend auth contexts (localStorage.setItem)      │
│ Error: Token not persisted                                   │
│ Recovery: Clear browser storage, logout/login again          │
└──────────────────────────────────────────────────────────────┘
```
