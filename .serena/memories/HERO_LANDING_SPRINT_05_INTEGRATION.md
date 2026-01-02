# Integration & Polish
**Sprint**: 05 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: HERO_LANDING_SPRINT_04_AUTH
**Next**: HERO_LANDING_SPRINT_06_E2E_TESTING

---

## Objective
Integrate all components into App.tsx and polish the complete landing page.

---

## 1. Update App.tsx

**File**: `src/App.tsx`

Replace the entire file with:

```tsx
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { Button } from "@/components/ui/button"

// Layout components
import { NavigationBar, Footer } from "@/components/layout"

// Landing page sections
import { HeroSection, FeaturesSection, TestimonialsSection, CTASection } from "@/components/landing"

// Auth components
import { AuthModal, SignOutButton } from "@/components/auth"

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - always visible */}
      <Unauthenticated>
        <NavigationBar 
          onLoginClick={() => {}} // Modal handles this via trigger
          onDemoClick={() => {}}
        />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedNav />
      </Authenticated>
      
      {/* Main Content */}
      <main className="flex-1">
        <Unauthenticated>
          <LandingPage />
        </Unauthenticated>
        <Authenticated>
          <Dashboard />
        </Authenticated>
      </main>
      
      {/* Footer - always visible */}
      <Footer />
    </div>
  )
}

// Authenticated Navigation
function AuthenticatedNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <a href="/" className="font-semibold text-xl">MedReport Pro</a>
        <SignOutButton />
      </div>
    </header>
  )
}

// Landing Page (Unauthenticated)
function LandingPage() {
  return (
    <>
      <HeroSection onDemoClick={() => {}} />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection onDemoClick={() => {}} />
      
      {/* Login Modal - accessible from nav and CTAs */}
      <div className="fixed bottom-6 right-6 z-50">
        <AuthModal 
          trigger={
            <Button variant="medical" size="lg" className="shadow-lg">
              Provider Login
            </Button>
          }
          title="Provider Login"
        />
      </div>
    </>
  )
}

// Dashboard (Authenticated)
function Dashboard() {
  const { viewer, numbers } = useQuery(api.myFunctions.listNumbers, { count: 10 }) ?? {}
  const addNumber = useMutation(api.myFunctions.addNumber)
  
  if (viewer === undefined || numbers === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">Logged in as {viewer}</p>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Quick Stats (Demo)</h2>
        <div className="flex items-center gap-4">
          <Button 
            variant="medical"
            onClick={() => void addNumber({ value: Math.floor(Math.random() * 100) })}
          >
            Add Random Number
          </Button>
          <span className="text-muted-foreground">
            {numbers.length} numbers stored
          </span>
        </div>
        {numbers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {numbers.map((n, i) => (
              <span 
                key={i} 
                className="px-3 py-1 bg-medical-blue/10 text-medical-blue rounded-full text-sm"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 2. Update NavigationBar for Modal Integration

**File**: `src/components/layout/NavigationBar.tsx`

Update the Login button to use AuthModal:

```tsx
// Add import at top
import { AuthModal } from "@/components/auth"

// Replace the Login button in Desktop CTAs section:
<div className="hidden md:flex items-center gap-3">
  <AuthModal 
    trigger={<Button variant="ghost">Login</Button>}
    title="Provider Login"
  />
  <AuthModal 
    trigger={<Button variant="medical">Request Demo</Button>}
    title="Request Demo"
    initialFlow="signUp"
  />
</div>

// And in mobile menu:
<div className="flex flex-col gap-2 mt-4">
  <AuthModal 
    trigger={<Button variant="outline" className="w-full">Login</Button>}
  />
  <AuthModal 
    trigger={<Button variant="medical" className="w-full">Request Demo</Button>}
    initialFlow="signUp"
  />
</div>
```

---

## 3. Polish Checklist

### Visual Consistency
- [ ] All buttons using correct variants (medical, ghost, outline)
- [ ] Icons consistent size (h-4 w-4 or h-6 w-6)
- [ ] Spacing consistent (gap-4, gap-6, gap-8)
- [ ] Colors using theme variables (medical-blue, not hardcoded)

### Responsive Design
- [ ] Mobile nav collapses to Sheet
- [ ] Hero section stacks on mobile
- [ ] Features grid: 1 col mobile, 2 cols tablet, 3 cols desktop
- [ ] Footer columns stack on mobile

### Accessibility
- [ ] All interactive elements have focus rings
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA

### Dark Mode
- [ ] All sections work in dark mode
- [ ] Gradients adapt properly
- [ ] Text remains readable

---

## 4. Final File Structure

```
src/
├── App.tsx                           (~120 lines)
├── main.tsx                          (unchanged)
├── index.css                         (with medical theme)
├── components/
│   ├── ui/                           (shadcn primitives)
│   │   ├── button.tsx               (with medical variant)
│   │   ├── card.tsx
│   │   ├── input.tsx                (new)
│   │   ├── label.tsx                (new)
│   │   ├── dialog.tsx               (new)
│   │   ├── sheet.tsx                (new)
│   │   ├── avatar.tsx               (new)
│   │   ├── badge.tsx                (new)
│   │   └── separator.tsx            (new)
│   ├── layout/
│   │   ├── Container.tsx
│   │   ├── NavigationBar.tsx
│   │   ├── Footer.tsx
│   │   └── index.ts
│   ├── landing/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── CTASection.tsx
│   │   └── index.ts
│   └── auth/
│       ├── SignInForm.tsx
│       ├── SignOutButton.tsx
│       ├── AuthModal.tsx
│       └── index.ts
└── lib/
    └── utils.ts
```

---

## Acceptance Criteria

- [ ] Landing page shows all 4 sections (Hero, Features, Testimonials, CTA)
- [ ] NavigationBar appears on public pages
- [ ] AuthModal opens from nav and floating button
- [ ] Dashboard appears after authentication
- [ ] Sign out returns to landing page
- [ ] All responsive breakpoints work
- [ ] Dark mode toggles correctly
- [ ] `npm run typecheck` passes
- [ ] `npm run dev` serves on localhost:5173

---

## Evidence Verification

```bash
# Typecheck
npm run typecheck

# Start dev server
npm run dev

# Visual verification checklist:
# 1. Visit http://localhost:5173
# 2. Check hero gradient (light blue → white)
# 3. Click "Provider Login" → modal opens
# 4. Sign in → dashboard appears
# 5. Click "Sign out" → landing page returns
# 6. Resize browser → responsive design works
# 7. Toggle dark mode → colors adapt
```

---

→ Next: HERO_LANDING_SPRINT_06_E2E_TESTING