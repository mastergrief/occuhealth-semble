# Foundation & Theme Setup
**Sprint**: 01 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: None
**Next**: HERO_LANDING_SPRINT_02_LAYOUT

---

## Objective
Establish the medical light blue & white color scheme and add required shadcn/ui components.

---

## 1. Add Medical Blue Theme Colors

**File**: `src/index.css`
**Location**: Add to `:root` section (after line 65)

```css
:root {
  /* EXISTING colors... */
  
  /* Medical Light Blue Accent (NEW) */
  --medical-blue: oklch(0.628 0.167 243.872);        /* #0ea5e9 sky-500 */
  --medical-blue-foreground: oklch(1 0 0);           /* white */
  --medical-blue-light: oklch(0.916 0.047 243.872);  /* #e0f2fe sky-100 */
  --medical-blue-dark: oklch(0.398 0.13 243.872);    /* #0369a1 sky-700 */
  
  /* Trust colors for medical branding */
  --trust-green: oklch(0.648 0.15 160);              /* Success/health */
  --trust-green-foreground: oklch(1 0 0);
}

.dark {
  /* Medical Light Blue in Dark Mode */
  --medical-blue: oklch(0.746 0.16 243.872);
  --medical-blue-foreground: oklch(0.145 0 0);
  --medical-blue-light: oklch(0.269 0.05 243.872);
  --medical-blue-dark: oklch(0.828 0.14 243.872);
}
```

**Add to `@theme inline` section (line 27-63):**
```css
@theme inline {
  /* EXISTING mappings... */
  
  --color-medical-blue: var(--medical-blue);
  --color-medical-blue-foreground: var(--medical-blue-foreground);
  --color-medical-blue-light: var(--medical-blue-light);
  --color-medical-blue-dark: var(--medical-blue-dark);
  --color-trust-green: var(--trust-green);
}
```

---

## 2. Install shadcn/ui Components

**Commands** (run in terminal):
```bash
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add dialog
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add separator
```

**Expected Result**: 8 new files in `src/components/ui/`

---

## 3. Add Medical Button Variant

**File**: `src/components/ui/button.tsx`
**Location**: Add to `buttonVariants` (line 11-22)

```typescript
const buttonVariants = cva(
  "...", // existing base
  {
    variants: {
      variant: {
        // existing variants...
        
        // NEW: Medical blue variants
        medical: 
          "bg-medical-blue text-medical-blue-foreground shadow-xs hover:bg-medical-blue-dark",
        "medical-outline":
          "border-medical-blue text-medical-blue hover:bg-medical-blue-light",
      },
      // ...rest
    }
  }
)
```

---

## 4. Create Directory Structure

```bash
mkdir -p src/components/layout
mkdir -p src/components/landing
mkdir -p src/components/auth
```

**Expected Structure**:
```
src/components/
├── ui/           # shadcn primitives (existing + new)
├── layout/       # NavigationBar, Footer, Container
├── landing/      # HeroSection, FeaturesSection, etc.
└── auth/         # SignInForm, SignOutButton, AuthModal
```

---

## Acceptance Criteria

- [ ] Medical blue colors visible in CSS variables
- [ ] All 8 shadcn components installed successfully
- [ ] Button component has `medical` and `medical-outline` variants
- [ ] Directory structure created
- [ ] `npm run typecheck` passes

---

## Evidence Verification

```bash
# Check CSS variables added
grep "medical-blue" src/index.css

# Check components installed
ls src/components/ui/

# Check button variant
grep "medical" src/components/ui/button.tsx

# Typecheck
npm run typecheck
```

---

→ Next: HERO_LANDING_SPRINT_02_LAYOUT