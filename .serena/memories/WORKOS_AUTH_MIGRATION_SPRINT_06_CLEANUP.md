# WorkOS Auth Migration - Cleanup & Documentation

**Sprint**: 06 of 06 (Final)
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: SPRINT_05_E2E (all tests passing)
**Next**: ✓ Complete

---

## Objective

Remove deprecated Convex Auth code and update documentation to reflect WorkOS-only authentication.

---

## Files to Delete

### Frontend Components (157 LOC removed)

| File | Lines | Reason |
|------|-------|--------|
| `src/components/auth/AuthModal.tsx` | 42 | Replaced by WorkOS redirect |
| `src/components/auth/SignInForm.tsx` | 115 | Replaced by WorkOS AuthKit UI |

**Command**:
```bash
rm src/components/auth/AuthModal.tsx
rm src/components/auth/SignInForm.tsx
```

### Legacy Auth Contexts (302 LOC removed - if unified)

| File | Lines | Reason |
|------|-------|--------|
| `src/lib/admin-auth.tsx` | 83 | Replaced by unified workos-auth.tsx |
| `src/lib/employer-auth.tsx` | 112 | Replaced by unified workos-auth.tsx |
| `src/lib/doctor-auth.tsx` | 107 | Replaced by unified workos-auth.tsx |

**Command** (only after Sprint 04 complete):
```bash
rm src/lib/admin-auth.tsx
rm src/lib/employer-auth.tsx
rm src/lib/doctor-auth.tsx
```

### Backend Convex Auth (14 LOC removed)

| File | Lines | Reason |
|------|-------|--------|
| `convex/auth.ts` | 6 | Password provider unused |
| `convex/auth.config.ts` | 8 | Auth config unused |

**Command**:
```bash
rm convex/auth.ts
rm convex/auth.config.ts
```

---

## Files to Modify

### 1. Remove Convex Auth Routes from http.ts

**Location**: `convex/http.ts:136`

**Current**:
```typescript
auth.addHttpRoutes(http);
```

**After**: DELETE THIS LINE

The `auth` import will also become unused - remove it.

### 2. Update auth/index.ts

**Location**: `src/components/auth/index.ts`

**Current**:
```typescript
export { SignInForm } from "./SignInForm"
export { SignOutButton } from "./SignOutButton"
export { AuthModal } from "./AuthModal"
export { AdminAuthCallback } from "./AdminAuthCallback"
```

**After**:
```typescript
export { SignOutButton } from "./SignOutButton"
export { AdminAuthCallback } from "./AdminAuthCallback"
```

### 3. Update SignOutButton for WorkOS

**Location**: `src/components/auth/SignOutButton.tsx`

**Current** (Convex Auth):
```typescript
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignOutButton({ ... }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  
  if (!isAuthenticated) return null;
  // ...
}
```

**After** (WorkOS):
```typescript
import { useWorkOSAuth } from "@/lib/workos-auth";

export function SignOutButton({ ... }) {
  const { isAuthenticated, logout } = useWorkOSAuth();
  
  if (!isAuthenticated) return null;
  
  return (
    <Button onClick={logout} variant={variant}>
      {showIcon && <LogOut className="h-4 w-4" />}
      {showIcon ? <span className="sr-only">Sign out</span> : "Sign out"}
    </Button>
  );
}
```

### 4. Remove @convex-dev/auth Dependency (Optional)

If Convex Auth is no longer used anywhere:

```bash
npm uninstall @convex-dev/auth
```

**Check first**: Ensure no imports remain:
```bash
grep -r "@convex-dev/auth" src/ convex/
```

---

## Documentation Updates

### 1. Update README.md

**Location**: `README.md`

**Current** (lines 10, 29-40):
```markdown
🔐 **Convex Auth** - Built-in authentication (Password provider)
...
The application uses Convex Auth with a Password provider for user authentication.
```

**After**:
```markdown
🔐 **WorkOS AuthKit** - OAuth-based enterprise authentication

## Authentication

This application uses WorkOS AuthKit for authentication, supporting:
- **Admin Portal** - Internal staff access at `/admin`
- **Employer Portal** - Company account management at `/employer`  
- **Doctor Portal** - Healthcare provider access at `/doctor`

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `WORKOS_API_KEY` | WorkOS API secret (backend only) | Yes |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client ID | Yes |
| `CONVEX_SITE_URL` | OAuth redirect URI base | Yes |
| `APP_URL` | Frontend redirect after auth | Optional |

### OAuth Flow

1. User clicks "Login" → Redirected to WorkOS AuthKit
2. User authenticates with WorkOS (email, SSO, etc.)
3. WorkOS redirects to `/auth/callback` with tokens
4. Backend detects user role (admin/employer/doctor)
5. Frontend stores tokens and routes to appropriate portal
```

### 2. Add AUTH.md Documentation

**Create**: `DOCUMENTS/AUTH.md`

```markdown
# Authentication Architecture

## Overview

OccuHealth uses WorkOS AuthKit for OAuth 2.0 authentication across all user types.

## User Roles

| Role | Portal | Storage Key | Detection |
|------|--------|-------------|-----------|
| Admin | /admin | workos_admin_auth | adminUsers table |
| Employer | /employer | workos_employer_auth | employers table |
| Doctor | /doctor | workos_doctor_auth | doctorSettings table |

## Flow Diagram

```
Landing Page → Login Button
       ↓
   /auth/login (Convex HTTP)
       ↓
   WorkOS AuthKit (external)
       ↓
   /auth/callback (Convex HTTP)
       ↓
   Role Detection (3 parallel queries)
       ↓
   ┌─────────────────────────────────┐
   │ Admin? → /admin                 │
   │ Employer? → /employer           │
   │ Doctor? → /doctor               │
   │ New User? → /register/choose-role│
   └─────────────────────────────────┘
```

## Token Management

- Tokens stored in localStorage per role
- Access token validated on each page load
- Expired tokens automatically cleared
- Multi-tab logout synchronization supported

## Security Considerations

- WORKOS_API_KEY is backend-only (never in frontend)
- OAuth state parameter prevents CSRF
- Tokens should be short-lived (configured in WorkOS)
- Consider HTTP-only cookies for production

## Troubleshooting

### "Missing authentication tokens"
User arrived at callback without proper OAuth flow. Redirect to /auth/login.

### "Invalid state"
CSRF protection triggered. User should restart login flow.

### Role not detected
User exists in WorkOS but not in any role table. Routes to registration.
```

### 3. Update .env.example

**Location**: `.env.example` (create if missing)

```env
# Convex Configuration
CONVEX_DEPLOYMENT=dev:your-deployment-slug
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# WorkOS Authentication (required)
WORKOS_API_KEY=sk_test_your_api_key
WORKOS_CLIENT_ID=client_your_client_id
CONVEX_SITE_URL=https://your-deployment.convex.site

# Frontend Redirect (optional, defaults to localhost:5175)
APP_URL=http://localhost:5175
```

---

## Verification Checklist

### Code Removal
- [ ] AuthModal.tsx deleted
- [ ] SignInForm.tsx deleted
- [ ] convex/auth.ts deleted
- [ ] convex/auth.config.ts deleted
- [ ] auth.addHttpRoutes() removed from http.ts
- [ ] @convex-dev/auth removed from package.json (if unused)

### File Updates
- [ ] auth/index.ts updated (2 exports only)
- [ ] SignOutButton.tsx uses WorkOS auth
- [ ] No remaining imports from deleted files

### Documentation
- [ ] README.md updated with WorkOS info
- [ ] DOCUMENTS/AUTH.md created
- [ ] .env.example includes all auth variables

### Final Verification
```bash
# Check for remaining Convex Auth references
grep -r "useAuthActions" src/
grep -r "@convex-dev/auth" src/ convex/
grep -r "AuthModal" src/
grep -r "SignInForm" src/

# Should return empty (no matches)
```

---

## Rollback Procedure

If issues arise after cleanup:

1. **Restore deleted files** from git:
   ```bash
   git checkout HEAD~1 -- src/components/auth/AuthModal.tsx
   git checkout HEAD~1 -- src/components/auth/SignInForm.tsx
   git checkout HEAD~1 -- convex/auth.ts
   ```

2. **Re-add Convex Auth routes** to http.ts:
   ```typescript
   import { auth } from "./auth";
   auth.addHttpRoutes(http);
   ```

3. **Reinstall dependency**:
   ```bash
   npm install @convex-dev/auth
   ```

---

## Total Code Removed

| Category | Files | Lines |
|----------|-------|-------|
| Frontend Components | 2 | 157 |
| Auth Contexts (if unified) | 3 | 302 |
| Backend Config | 2 | 14 |
| **Total** | **7** | **473 LOC** |

---

## Acceptance Criteria

- [ ] All deleted files removed from repo
- [ ] No broken imports (build succeeds)
- [ ] E2E tests still pass
- [ ] Documentation reflects WorkOS-only auth
- [ ] No console errors related to auth
- [ ] Login flow works end-to-end
- [ ] All 3 role portals accessible

---

✓ Final Sprint - Migration Complete
