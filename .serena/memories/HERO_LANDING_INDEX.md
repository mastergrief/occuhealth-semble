# Hero Landing Page - Sprint Index

**Created**: 2026-01-02
**Total Sprints**: 6
**Total Words**: ~3,300
**Scope**: Transform minimal dark login page into professional occupational health medical report provider hero landing page with light blue & white theme

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | [Foundation & Theme Setup](HERO_LANDING_SPRINT_01_FOUNDATION) | ~500 | Pending | None |
| 02 | [Layout Components](HERO_LANDING_SPRINT_02_LAYOUT) | ~600 | Pending | 01 |
| 03 | [Landing Page Sections](HERO_LANDING_SPRINT_03_SECTIONS) | ~700 | Pending | 02 |
| 04 | [Auth Component Refactor](HERO_LANDING_SPRINT_04_AUTH) | ~500 | Pending | 03 |
| 05 | [Integration & Polish](HERO_LANDING_SPRINT_05_INTEGRATION) | ~400 | Pending | 04 |
| 06 | [E2E Testing (Port 5175)](HERO_LANDING_SPRINT_06_E2E_TESTING) | ~600 | Pending | 05 |

---

## Reading Order

1. **HERO_LANDING_SPRINT_01_FOUNDATION** - Add medical blue theme colors, install shadcn components
2. **HERO_LANDING_SPRINT_02_LAYOUT** - Create NavigationBar, Footer, Container
3. **HERO_LANDING_SPRINT_03_SECTIONS** - Build HeroSection, FeaturesSection, TestimonialsSection, CTASection
4. **HERO_LANDING_SPRINT_04_AUTH** - Extract and improve SignInForm, SignOutButton, AuthModal
5. **HERO_LANDING_SPRINT_05_INTEGRATION** - Assemble all components in App.tsx
6. **HERO_LANDING_SPRINT_06_E2E_TESTING** - Comprehensive Browser-CLI tests on port 5175

---

## Topic Cross-Reference

### Theme & Styling
- Medical blue colors → Sprint 01
- Button variants → Sprint 01
- Dark mode → Sprint 01, 05

### Components
- Container → Sprint 02
- NavigationBar → Sprint 02
- Footer → Sprint 02
- HeroSection → Sprint 03
- FeaturesSection → Sprint 03
- TestimonialsSection → Sprint 03
- CTASection → Sprint 03
- SignInForm → Sprint 04
- SignOutButton → Sprint 04
- AuthModal → Sprint 04

### Authentication
- Form validation → Sprint 04
- Loading states → Sprint 04
- Error handling → Sprint 04
- Login/logout flow → Sprint 04, 05

### Testing
- Visual regression → Sprint 06
- Accessibility audit → Sprint 06
- Performance metrics → Sprint 06
- Auth flow tests → Sprint 06

---

## Color Scheme Reference

| Element | Light Mode | Dark Mode | CSS Variable |
|---------|-----------|-----------|--------------|
| Primary Blue | #0EA5E9 | #7DD3FC | `--medical-blue` |
| Light Blue BG | #E0F2FE | #1E3A5F | `--medical-blue-light` |
| Dark Blue | #0369A1 | #BAE6FD | `--medical-blue-dark` |
| Trust Green | #22C55E | #4ADE80 | `--trust-green` |

---

## File Changes Summary

| File | Action | Sprint |
|------|--------|--------|
| `src/index.css` | ADD theme colors | 01 |
| `src/components/ui/button.tsx` | ADD medical variant | 01 |
| `src/components/layout/Container.tsx` | CREATE | 02 |
| `src/components/layout/NavigationBar.tsx` | CREATE | 02 |
| `src/components/layout/Footer.tsx` | CREATE | 02 |
| `src/components/landing/HeroSection.tsx` | CREATE | 03 |
| `src/components/landing/FeaturesSection.tsx` | CREATE | 03 |
| `src/components/landing/TestimonialsSection.tsx` | CREATE | 03 |
| `src/components/landing/CTASection.tsx` | CREATE | 03 |
| `src/components/auth/SignInForm.tsx` | CREATE (extract) | 04 |
| `src/components/auth/SignOutButton.tsx` | CREATE (extract) | 04 |
| `src/components/auth/AuthModal.tsx` | CREATE | 04 |
| `src/App.tsx` | REPLACE | 05 |

---

## Estimated Timeline

| Sprint | Effort | Cumulative |
|--------|--------|------------|
| 01 | 1-2 hours | 2 hours |
| 02 | 2-3 hours | 5 hours |
| 03 | 3-4 hours | 9 hours |
| 04 | 2-3 hours | 12 hours |
| 05 | 1-2 hours | 14 hours |
| 06 | 2-3 hours | 17 hours |

**Total**: ~14-17 hours of implementation

---

## Prerequisites

- Node.js 18+
- npm/pnpm installed
- Convex CLI configured
- Browser-CLI available
- Test credentials in `.env.local`

---

## Quick Start Commands

```bash
# Sprint 01: Install components
npx shadcn@latest add input label dialog navigation-menu sheet avatar badge separator

# Sprint 02-05: Development
npm run dev

# Sprint 06: E2E Testing
VITE_PORT=5175 npm run dev:frontend
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
```

---

## Success Criteria

- [ ] All 6 sprints completed
- [ ] `npm run typecheck` passes
- [ ] `npm run dev` serves landing page
- [ ] Auth flow works end-to-end
- [ ] Responsive design verified
- [ ] E2E tests passing on port 5175
- [ ] Visual regression baselines saved