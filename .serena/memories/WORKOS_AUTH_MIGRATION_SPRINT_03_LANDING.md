# WorkOS Auth Migration - Landing Page Migration

**Sprint**: 03 of 06
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: SPRINT_01_OVERVIEW
**Next**: WORKOS_AUTH_MIGRATION_SPRINT_04_CONTEXT

---

## Objective

Replace Convex Auth modal on landing page with WorkOS AuthKit redirect.

**Current Flow**:
```
Landing Page → "Login" button → AuthModal → SignInForm (Convex Auth)
```

**Target Flow**:
```
Landing Page → "Login" button → /auth/login → WorkOS AuthKit
```

---

## File Changes

### 1. NavigationBar.tsx

**Location**: `src/components/layout/NavigationBar.tsx`
**Lines**: 43-50 (desktop), 73-80 (mobile)

**Current (lines 43-50)**:
```tsx
<AuthModal
  trigger={
    <Button variant="ghost" className="text-gray-600 hover:text-medical-600">
      Login
    </Button>
  }
  initialFlow="signIn"
/>
```

**After**:
```tsx
<Button 
  variant="ghost" 
  className="text-gray-600 hover:text-medical-600"
  asChild
>
  <a href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`}>
    Login
  </a>
</Button>
```

**Current (lines 73-80, mobile)**:
```tsx
<AuthModal
  trigger={
    <Button variant="ghost" className="w-full justify-start">
      Login
    </Button>
  }
  initialFlow="signIn"
/>
```

**After (mobile)**:
```tsx
<Button variant="ghost" className="w-full justify-start" asChild>
  <a href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`}>
    Login
  </a>
</Button>
```

**Remove Import**:
```diff
- import { AuthModal } from "@/components/auth";
```

---

### 2. HeroSection.tsx

**Location**: `src/components/landing/HeroSection.tsx`
**Lines**: ~35-45 (CTA buttons)

**Current**:
```tsx
<Button
  size="lg"
  className="bg-medical-600 hover:bg-medical-700"
  onClick={onDemoClick}  // Currently undefined/unused
>
  Get Started
</Button>
```

**After**:
```tsx
<Button
  size="lg"
  className="bg-medical-600 hover:bg-medical-700"
  asChild
>
  <a href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`}>
    Get Started
  </a>
</Button>
```

**Remove unused prop**:
```diff
- interface HeroSectionProps {
-   onDemoClick?: () => void;
- }
+ // No props needed - login URL is direct
```

---

### 3. App.tsx - Remove Floating Button

**Location**: `src/App.tsx`
**Lines**: 234-245

**Current**:
```tsx
{/* Floating Provider Login Button */}
<a
  href={`${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site")}/auth/login`}
  className="fixed bottom-6 right-6 z-50 ..."
>
  <Stethoscope className="mr-2 h-5 w-5" />
  Provider Login
</a>
```

**After**: DELETE ENTIRE BLOCK (login is now in nav bar)

---

### 4. Update auth/index.ts

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
// SignInForm and AuthModal removed - using WorkOS instead
```

---

## Environment Variable Pattern

The URL construction pattern used:
```typescript
`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`
```

**Why this works**:
- `VITE_CONVEX_URL` = `https://giddy-lapwing-915.convex.cloud`
- `.replace('.cloud', '.site')` = `https://giddy-lapwing-915.convex.site`
- `/auth/login` = WorkOS OAuth initiation route

**Alternative**: Add dedicated env var:
```env
VITE_AUTH_LOGIN_URL=https://giddy-lapwing-915.convex.site/auth/login
```

---

## Testing Checklist

### Manual Testing

1. **Landing Page Login Button**
   - [ ] Click "Login" in desktop nav → redirects to WorkOS
   - [ ] Click "Login" in mobile nav → redirects to WorkOS
   - [ ] Click "Get Started" in hero → redirects to WorkOS

2. **WorkOS Flow**
   - [ ] Enter credentials on WorkOS page
   - [ ] Submit → returns to /auth/callback
   - [ ] Role detected → routes to correct portal

3. **Role Routing**
   - [ ] Existing admin → /admin
   - [ ] Existing employer → /employer
   - [ ] Existing doctor → /doctor
   - [ ] New user → /register/choose-role

4. **Edge Cases**
   - [ ] Click login twice rapidly → single redirect
   - [ ] Browser back button during OAuth → graceful error
   - [ ] Invalid credentials → WorkOS error page

---

## Rollback Plan

If issues arise, revert by:
1. Restore `AuthModal` import in NavigationBar.tsx
2. Restore original button JSX
3. Keep floating button as backup login

The Convex Auth backend routes remain active (auth.addHttpRoutes) until Sprint 06 cleanup.

---

## Acceptance Criteria

- [ ] No AuthModal visible anywhere on landing page
- [ ] All login buttons redirect to WorkOS
- [ ] Floating "Provider Login" button removed
- [ ] Old SignInForm/AuthModal components unused (deletable)
- [ ] Login flow works for all 3 roles
- [ ] New user registration flow intact

---

→ Next: WORKOS_AUTH_MIGRATION_SPRINT_04_CONTEXT
