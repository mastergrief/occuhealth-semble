# Auth Dependencies - Quick Reference Card

## External Dependencies at a Glance

### NPM Packages
```
@workos-inc/node@^7.79.3         ← OAuth provider (PRIMARY)
@convex-dev/auth@^0.0.90         ← Auth framework (LEGACY)
convex@^1.31.2                   ← Backend runtime
react-router-dom@^7.11.0         ← Callback routing
```

### Environment Variables (Complete Set)

**Backend (process.env)**:
```
WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
WORKOS_API_KEY=sk_test_...                          [SECRET]
CONVEX_SITE_URL=https://giddy-lapwing-915.convex.site
CONVEX_DEPLOYMENT=dev:giddy-lapwing-915
```

**Frontend (import.meta.env.VITE_*)**:
```
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud
VITE_WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
```

## Auth Flow Architecture

```
User → WorkOS OAuth → Backend /auth/callback
                      ↓
                    Role Check (internal queries)
                      ↓
         Admin? / Employer? / Doctor?
           ↙        ↓          ↘
        /admin   /employer   /doctor
                      OR
              /register/choose-role (new user)
                      ↓
           localStorage[tokens] (frontend)
```

## Database Schema - Auth Tables

| Table | Purpose | Key Field | Created By |
|-------|---------|-----------|------------|
| `adminUsers` | Admin accounts (WorkOS) | `workosUserId` | /auth/callback |
| `employers` | Company accounts | `workosUserId` | EmployerRegistrationForm |
| `doctorSettings` | Doctor accounts | `workosUserId` | DoctorRegistrationForm |
| `users` | Convex Auth (unused) | — | authTables (legacy) |
| `credentials` | Password hashes (unused) | — | authTables (legacy) |

## HTTP Routes - Endpoint Map

| Path | Method | Handler | Purpose |
|------|--------|---------|---------|
| `/auth/login` | GET | WorkOS.getAuthorizationUrl() | OAuth redirect |
| `/auth/callback` | GET | authenticateWithCode() + role detection | OAuth callback |
| `/auth/password/*` | POST | Convex Auth (unused) | Legacy password auth |
| `/health` | GET | Status check | Health probe |

## Frontend Auth Contexts - Three Parallel

```
AdminAuthProvider
├─ Manages: userId, accessToken, refreshToken
├─ Storage: localStorage['workos_admin_auth']
└─ Hooks: useAdminAuth()

EmployerAuthProvider
├─ Manages: workosUserId, accessToken, refreshToken
├─ Storage: localStorage['workos_employer_auth']
└─ Hooks: useEmployerAuth()

DoctorAuthProvider
├─ Manages: workosUserId, accessToken, refreshToken
├─ Storage: localStorage['workos_doctor_auth']
└─ Hooks: useDoctorAuth()
```

## Token Flow - How Tokens Move

```
WorkOS Backend
    ↓ {user, accessToken, refreshToken}
Convex /auth/callback
    ↓ HTTP 302 redirect with params
Frontend /auth/callback component
    ↓ loginAsAdmin/Employer/Doctor()
localStorage['workos_*_auth']
    ↓ Persists across page reloads
Auth Context (useAdminAuth/useEmployerAuth/useDoctorAuth)
    ↓ Available to components
Role Portal (/admin, /employer, /doctor)
```

## Critical Security Notes

⚠️ **Tokens in localStorage**: Vulnerable to XSS (acceptable for dev/staging)
✅ **WORKOS_API_KEY backend-only**: Never exposed to frontend
❌ **No HTTP-only cookies**: No CSRF protection
❌ **No token refresh logic**: Assumes tokens persist for session

## File Dependencies Map

```
convex/http.ts (primary backend)
├── WorkOS SDK: @workos-inc/node
├── Uses: WORKOS_CLIENT_ID, WORKOS_API_KEY, CONVEX_SITE_URL
├── Exports: auth/callback → frontend with tokens
└── Queries: employers:getByWorkosId, doctorSettings:getByWorkosId, adminUsers:getByWorkosId

Frontend Auth Contexts (3x)
├── src/lib/admin-auth.tsx
├── src/lib/employer-auth.tsx
├── src/lib/doctor-auth.tsx
└── Storage: localStorage['workos_*_auth']

Router & Callbacks
├── src/App.tsx (route definitions)
├── src/components/auth/AdminAuthCallback.tsx (token handling)
├── src/pages/register/ChooseRole.tsx (role selection)
└── src/components/employer/EmployerRegistrationForm.tsx (registration)
```

## Deployment Checklist

- [ ] WORKOS_CLIENT_ID configured in .env.local
- [ ] WORKOS_API_KEY configured in .env.local (backend only)
- [ ] VITE_CONVEX_URL set to production Convex URL
- [ ] CONVEX_SITE_URL set to production Convex site URL
- [ ] WorkOS OAuth app configured with redirect URI: {CONVEX_SITE_URL}/auth/callback
- [ ] Schema migrations: adminUsers, employers, doctorSettings tables exist
- [ ] Test full flow: /auth/login → WorkOS → /auth/callback → role portal

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| WorkOS OAuth | ✅ Implemented | Primary auth method |
| Admin Auth Context | ✅ Complete | Ready for production |
| Employer Auth Context | ✅ Complete | Role detection + registration |
| Doctor Auth Context | ✅ Complete | Role detection + registration |
| Convex Auth (Password) | ✅ Configured | Not used (legacy) |
| Token Persistence | ✅ localStorage | Not HTTP-only cookies |
| Role-Based Routing | ✅ Implemented | Backend-driven redirect |
| Registration Flow | ✅ Complete | New user → /register/choose-role |
