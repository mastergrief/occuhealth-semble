# Plan: Replace Convex Auth with WorkOS for All Users

**Created**: 2026-01-03
**Status**: Planned (not yet implemented)
**Priority**: High - Required for GDPR pivot consistency

---

## Problem

The GDPR pivot specifies WorkOS AuthKit for ALL users (employers, doctors, admins), but currently:

| Auth Method | Current State | Target State |
|-------------|---------------|--------------|
| Admin login | WorkOS ✅ | WorkOS ✅ |
| Employer login | Convex Auth ❌ | WorkOS |
| Doctor login | Convex Auth ❌ | WorkOS |
| Regular user signup | Convex Auth modal ❌ | WorkOS |

The landing page still shows the old `SignInForm.tsx` modal (email/password via Convex Auth) instead of redirecting to WorkOS.

---

## Current Auth Flow (Broken)

```
Landing Page
    │
    ├─ "Login" button → Opens AuthModal (Convex Auth) ❌
    │                   └─ Creates user in Convex `users` table
    │
    └─ "Provider Login" button → WorkOS AuthKit ✅
                                 └─ Routes to /register/choose-role or portal
```

---

## Target Auth Flow

```
Landing Page
    │
    ├─ "Login" / "Get Started" → WorkOS AuthKit
    │                            └─ /auth/callback
    │                                 └─ Role detection
    │                                      ├─ Employer → /employer
    │                                      ├─ Doctor → /doctor
    │                                      ├─ Admin → /admin
    │                                      └─ New user → /register/choose-role
    │
    └─ "Provider Login" (remove or rename to just "Login")
```

---

## Files to Modify

### 1. Remove Convex Auth Components

**Files to delete or deprecate:**
- `src/components/auth/SignInForm.tsx` - Old email/password form
- `src/components/auth/AuthModal.tsx` - Modal wrapper for SignInForm

**Or repurpose:** Keep for future patient self-service portal (if needed)

### 2. Update Landing Page Navigation

**File:** `src/components/layout/NavigationBar.tsx`

**Current:**
```tsx
<AuthModal trigger={<Button variant="ghost">Login</Button>} />
```

**Target:**
```tsx
<Button variant="ghost" asChild>
  <a href={`${import.meta.env.VITE_CONVEX_SITE_URL}/auth/login`}>Login</a>
</Button>
```

### 3. Update Hero Section CTAs

**File:** `src/components/landing/HeroSection.tsx`

Replace "Get Started" button to redirect to WorkOS login instead of opening Convex Auth modal.

### 4. Remove "Provider Login" Floating Button

**File:** `src/App.tsx` (LandingPage component)

Remove or rename the floating "Provider Login" button since main login will now use WorkOS.

### 5. Clean Up Convex Auth (Optional)

**File:** `convex/auth.ts`

Consider removing Password provider if no longer needed:
```typescript
// Remove or comment out:
// Password,
```

**File:** `convex/schema.ts`

The `authTables` spread can remain for session management, but password-based auth won't be used.

---

## Environment Variables

Already configured in `.env.local`:
```
WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
VITE_WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
WORKOS_API_KEY=sk_test_...
```

Need to ensure frontend can construct WorkOS login URL:
```
VITE_CONVEX_SITE_URL=https://giddy-lapwing-915.convex.site
```

---

## Implementation Steps

1. **Update NavigationBar.tsx** - Replace AuthModal with WorkOS login link
2. **Update HeroSection.tsx** - Update CTA buttons to use WorkOS
3. **Update App.tsx** - Remove floating "Provider Login" button
4. **Test login flow** - Verify new user → /register/choose-role
5. **Test existing users** - Verify role-based routing works
6. **Optional cleanup** - Remove unused Convex Auth components

---

## Testing Checklist

- [ ] Click "Login" on nav → redirects to WorkOS
- [ ] New user signs up → lands on /register/choose-role
- [ ] Existing employer → lands on /employer
- [ ] Existing doctor → lands on /doctor
- [ ] Existing admin → lands on /admin
- [ ] Sign out works from all portals
- [ ] No references to old Convex Auth modal remain

---

## Risk Mitigation

- **Existing Convex Auth users**: Won't be able to log in with old credentials
  - Mitigation: They'll need to sign up fresh via WorkOS (acceptable for dev/staging)
- **WorkOS rate limits**: Free tier supports 1M MAU
  - No concern for development

---

## Related Memories

- `OCCUHEALTH_GDPR_SPRINT_03_AUTH` - Original auth routing spec
- `OCCUHEALTH_GDPR_IMPLEMENTATION_COMPLETE` - Current implementation status
