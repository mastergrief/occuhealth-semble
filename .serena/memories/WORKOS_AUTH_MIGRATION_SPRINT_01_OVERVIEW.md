# WorkOS Auth Migration - Overview & Architecture

**Sprint**: 01 of 06
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: None
**Next**: WORKOS_AUTH_MIGRATION_SPRINT_02_SECURITY

---

## Executive Summary

This sprint series documents the migration from Convex Auth to WorkOS AuthKit for all user types (employers, doctors, admins) in the OccuHealth medical platform.

**Current State**: WorkOS is 70% implemented
- ✅ Admin login via WorkOS (working)
- ✅ Employer/Doctor role detection (working)
- ✅ 3 auth context providers (working)
- ❌ Landing page still uses Convex Auth modal
- ❌ Security vulnerabilities in token handling

**Target State**: 100% WorkOS with security hardening + E2E tests

---

## Architecture Overview

```
Landing Page → /auth/login → WorkOS AuthKit → /auth/callback
                                                    ↓
                                          Role Detection (3x queries)
                                                    ↓
                              ┌─────────────────────┼─────────────────────┐
                              ↓                     ↓                     ↓
                         /admin              /employer              /doctor
                              ↓                     ↓                     ↓
                    AdminAuthProvider    EmployerAuthProvider    DoctorAuthProvider
                              ↓                     ↓                     ↓
                    localStorage:        localStorage:           localStorage:
                    workos_admin_auth    workos_employer_auth    workos_doctor_auth
```

---

## File Inventory (14 files, 1,026 LOC)

### Backend (convex/)
| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| http.ts | 159 | OAuth routes | MODIFY (security) |
| adminUsers.ts | 78 | Admin CRUD | KEEP |
| employers.ts | 139 | Employer CRUD | KEEP |
| doctorSettings.ts | 70 | Doctor CRUD | KEEP |
| auth.ts | 6 | Convex Auth config | DELETE |
| auth.config.ts | 8 | Auth domain | DELETE |

### Frontend Auth (src/lib/)
| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| admin-auth.tsx | 83 | Admin context | UNIFY |
| employer-auth.tsx | 112 | Employer context | UNIFY |
| doctor-auth.tsx | 107 | Doctor context | UNIFY |

### Frontend Components (src/components/auth/)
| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| AdminAuthCallback.tsx | 70 | OAuth handler | KEEP |
| AuthModal.tsx | 42 | Convex modal | DELETE |
| SignInForm.tsx | 115 | Convex form | DELETE |
| SignOutButton.tsx | 33 | Logout button | MODIFY |
| index.ts | 4 | Exports | MODIFY |

### Landing Page
| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| NavigationBar.tsx | 89 | Top nav | MODIFY |
| HeroSection.tsx | 78 | Hero CTA | MODIFY |

---

## Environment Variables

```env
# Backend Only (secure)
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_01KE...

# Frontend Accessible
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud

# Redirect Configuration
CONVEX_SITE_URL=https://giddy-lapwing-915.convex.site
APP_URL=http://localhost:5175  # Override for production
```

---

## Success Criteria

- [ ] All users authenticate via WorkOS (no Convex Auth modal)
- [ ] Security vulnerabilities addressed (state param, token handling)
- [ ] E2E tests pass for all auth flows
- [ ] README updated with WorkOS documentation
- [ ] Convex Auth files removed from codebase

---

→ Next: WORKOS_AUTH_MIGRATION_SPRINT_02_SECURITY
