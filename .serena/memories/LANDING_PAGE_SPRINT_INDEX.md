# Landing Page Evaluation - Sprint Index

**Created**: 2026-01-05
**Total Sprints**: 3
**Total Words**: ~2,400
**Scope**: Landing page evaluation against UK GDPR occupational health platform criteria + browser-cli testing

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | LANDING_PAGE_SPRINT_01_EVALUATION | ~450 | Pending | None |
| 02 | LANDING_PAGE_SPRINT_02_IMPLEMENTATION | ~650 | Pending | 01 |
| 03 | LANDING_PAGE_SPRINT_03_BROWSER_TESTING | ~800 | Pending | 02 |

---

## Reading Order

1. **LANDING_PAGE_SPRINT_01_EVALUATION** - Gap analysis & findings
   - Current state vs intended functionality
   - Severity-ranked issues
   - Pass/fail criteria checklist

2. **LANDING_PAGE_SPRINT_02_IMPLEMENTATION** - Code changes guide
   - File-by-file modification list
   - Specific code snippets
   - New components required
   - Acceptance criteria

3. **LANDING_PAGE_SPRINT_03_BROWSER_TESTING** - Manual QA procedures
   - Browser-CLI test commands
   - 6 test suites (T1-T6)
   - Full regression script
   - Evidence collection

---

## Topic Cross-Reference

| Topic | Sprint(s) |
|-------|-----------|
| GDPR Compliance | 01, 02, 03 (T1) |
| Brand Consistency | 01, 02, 03 (T2) |
| Pricing Section | 01, 02, 03 (T3) |
| How It Works | 02, 03 (T3) |
| Feature Cards | 02, 03 (T4) |
| Geographic Language | 01, 02, 03 (T5) |
| CTA Functionality | 01, 02, 03 (T6) |
| Browser-CLI Commands | 03 |

---

## Key Files

| File | Action |
|------|--------|
| `src/components/landing/HeroSection.tsx` | MODIFY |
| `src/components/landing/FeaturesSection.tsx` | MODIFY |
| `src/components/landing/TestimonialsSection.tsx` | MODIFY |
| `src/components/landing/CTASection.tsx` | MODIFY |
| `src/components/landing/Footer.tsx` | MODIFY |
| `src/pages/LandingPage.tsx` | MODIFY |
| `src/components/landing/PricingSection.tsx` | NEW |
| `src/components/landing/HowItWorksSection.tsx` | NEW |

---

## Critical Findings Summary

| Issue | Severity | Sprint |
|-------|----------|--------|
| HIPAA instead of GDPR | 🔴 Critical | 01, 02 |
| No employer/doctor portal explanation | 🟠 High | 01, 02 |
| No pricing information | 🟠 High | 01, 02 |
| Wrong brand in testimonials | 🟡 Medium | 01, 02 |
| US-centric "nationwide" language | 🟡 Medium | 01, 02 |

---

## Execution Notes

- Sprint 01 is evaluation-only (no code changes)
- Sprint 02 provides implementation guidance
- Sprint 03 provides manual testing procedures using browser-cli
- All tests can be run as individual commands or via regression script
