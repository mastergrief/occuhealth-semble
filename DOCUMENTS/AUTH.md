# Authentication Architecture

## Overview

OccuHealth uses WorkOS AuthKit for OAuth 2.0 authentication across all user types.

## User Roles

| Role | Portal | Storage Key | Detection Query |
|------|--------|-------------|-----------------|
| Admin | /admin | workos_admin_auth | adminUsers.getByWorkosId |
| Employer | /employer | workos_employer_auth | employers.getByWorkosId |
| Doctor | /doctor | workos_doctor_auth | doctorSettings.getByWorkosId |

## Auth Flow Diagram

```
Landing Page -> /auth/login -> WorkOS AuthKit -> /auth/callback
                                                      |
                                            Role Detection (parallel)
                                                      |
                        +---------------+---------------+---------------+
                        |               |               |               |
                     /admin        /employer        /doctor        /register
                   (Admin)       (Employer)       (Doctor)     (New User)
```

## Security Features

### CSRF Protection (SEC-002)
- State parameter generated on `/auth/login`
- State validated and deleted on `/auth/callback`
- Prevents cross-site request forgery attacks

### Token Security (SEC-001)
- Tokens passed via sessionStorage, not URL params
- Prevents token leakage to browser history/logs

### Token Expiration (SEC-004)
- JWT expiration checked on auth context load
- Expired tokens automatically cleared

## Token Storage

Tokens stored in localStorage per role:
- `workos_admin_auth`: `{ userId, accessToken, refreshToken }`
- `workos_employer_auth`: `{ workosUserId, accessToken, refreshToken }`
- `workos_doctor_auth`: `{ workosUserId, accessToken, refreshToken }`

## Key Files

| File | Purpose |
|------|---------|
| `convex/http.ts` | OAuth routes (/auth/login, /auth/callback) |
| `convex/oauthState.ts` | CSRF state management |
| `src/lib/workos-auth.tsx` | Unified auth context provider |
| `src/components/auth/AdminAuthCallback.tsx` | OAuth callback handler |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `WORKOS_API_KEY` | WorkOS API secret (backend only) | Yes |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client ID | Yes |
| `VITE_WORKOS_CLIENT_ID` | WorkOS client ID (frontend) | Yes |
| `CONVEX_SITE_URL` | OAuth redirect URI base | Yes |
| `APP_URL` | Frontend redirect after auth | Optional |

## OAuth Flow Details

### 1. Login Initiation (`/auth/login`)

```
1. Generate random state token (CSRF protection)
2. Store state in oauthState table with TTL
3. Build WorkOS authorization URL with:
   - client_id
   - redirect_uri: {CONVEX_SITE_URL}/auth/callback
   - state parameter
4. Redirect user to WorkOS
```

### 2. Callback Processing (`/auth/callback`)

```
1. Validate state parameter against oauthState table
2. Delete used state (single-use)
3. Exchange authorization code for tokens
4. Query all role tables in parallel:
   - adminUsers.getByWorkosId
   - employers.getByWorkosId
   - doctorSettings.getByWorkosId
5. Determine redirect based on role detection
6. Pass tokens via sessionStorage bridge
7. Redirect to appropriate portal
```

### 3. Frontend Token Handling

```
1. AdminAuthCallback receives redirect
2. Read tokens from sessionStorage
3. Clear sessionStorage (security)
4. Store in localStorage per role
5. Initialize auth context
6. Navigate to authenticated routes
```

## Role Detection Logic

Priority order when multiple roles match:
1. Admin (highest priority)
2. Doctor
3. Employer
4. New user (no role found) -> `/register/choose-role`

## Logout Flow

Each portal implements logout:
1. Clear localStorage key for role
2. Clear auth context state
3. Redirect to landing page

## Troubleshooting

### "Missing authentication tokens"
User arrived at callback without OAuth flow. Redirect to `/auth/login`.

### "Invalid state" / "Missing state"
CSRF protection triggered. User should restart login flow.

### Role not detected
User exists in WorkOS but not in any role table. Routes to `/register/choose-role`.

### Token expired
Token expiration checked on load. User will be logged out automatically.

### "Login required" message persists
Check that localStorage has the correct key for the portal being accessed.

## Testing Auth Flows

### Manual Testing
1. Navigate to landing page
2. Click "Login" button
3. Complete WorkOS authentication
4. Verify redirect to correct portal based on role

### E2E Testing (Playwright)
```bash
npm run test:e2e:auth
```

Tests cover:
- Login flow completion
- Role-based routing
- Token persistence
- Logout functionality
- CSRF protection
- Token expiration handling

## Migration Notes

This application was migrated from Convex Auth to WorkOS AuthKit. Key changes:
- Removed `@convex-dev/auth` package dependency
- Removed `convex/auth.ts` and `convex/auth.config.ts`
- Removed `AuthModal` and `SignInForm` components
- Added WorkOS OAuth routes in `convex/http.ts`
- Added CSRF state management in `convex/oauthState.ts`
- Updated all auth contexts to use WorkOS tokens
