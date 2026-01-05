# Landing Page Implementation Guide
**Sprint**: 02 of 03
**Index**: LANDING_PAGE_SPRINT_INDEX
**Depends On**: LANDING_PAGE_SPRINT_01_EVALUATION
**Next**: LANDING_PAGE_SPRINT_03_BROWSER_TESTING

---

## Priority 1: Compliance Messaging (Critical)

### Files to Modify

| File | Change |
|------|--------|
| `src/components/landing/HeroSection.tsx` | Replace "HIPAA Compliant Platform" badge → "GDPR Compliant" |
| `src/components/landing/FeaturesSection.tsx` | Change "HIPAA Compliant" feature → "GDPR Compliant" |
| `src/components/landing/Footer.tsx` | Replace "HIPAA Compliant" → "GDPR Compliant", "UK Data Protection Act" |

### Specific Changes

**HeroSection.tsx** - Badge text:
```tsx
// BEFORE
<Badge>HIPAA Compliant Platform</Badge>

// AFTER
<Badge>GDPR Compliant Platform</Badge>
```

**FeaturesSection.tsx** - Feature card:
```tsx
// BEFORE
{ icon: Shield, title: "HIPAA Compliant", description: "Enterprise-grade security with full regulatory compliance." }

// AFTER
{ icon: Shield, title: "GDPR Compliant", description: "UK data protection standards with enterprise-grade security." }
```

---

## Priority 2: User Journey ("How It Works" Section)

### New File: `src/components/landing/HowItWorksSection.tsx`

**Steps to display**:
1. Employer creates account & adds employees
2. Employer books appointment based on doctor availability
3. Doctor reviews submitted information
4. Secure video consultation
5. Doctor compiles report
6. Report delivered to employer portal

### Integration in `src/pages/LandingPage.tsx`

```tsx
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

// Add between FeaturesSection and TestimonialsSection
<HowItWorksSection />
```

---

## Priority 3: Feature Alignment

### FeaturesSection.tsx - Replace/Add Cards

| Remove | Add |
|--------|-----|
| "Multi-Provider Network" (US-centric) | "Employer Portal" - Booking & report access |
| - | "Doctor Portal" - Schedule & report management |
| - | "Flexible Scheduling" - Book based on availability |

---

## Priority 4: Pricing Section

### New File: `src/components/landing/PricingSection.tsx`

**Content** (Contact-only, no prices):
- One-off assessments → "Contact for pricing"
- Subscription packages → "Contact for pricing"
- Custom retainer packages → "Contact for pricing"
- CTA: "Get in Touch" button

### Integration

Add `id="pricing"` for nav anchor link to work.

---

## Priority 5: Content Fixes

### TestimonialsSection.tsx

```tsx
// BEFORE
"MedReport Pro reduced our screening time by 60%"

// AFTER
"OccuHealth reduced our screening time by 60%"
```

**All 3 testimonials** reference "MedReport Pro" - change to "OccuHealth".

### Geographic Language

| Location | Before | After |
|----------|--------|-------|
| HeroSection.tsx | "500+ healthcare providers" | "UK-wide network of providers" |
| FeaturesSection.tsx | "nationwide" | Remove or change to "UK-wide" |

### Non-functional Buttons

| Button | Action |
|--------|--------|
| "Watch Video" | Remove OR wire to demo video |
| "Schedule a Call" | Remove OR wire to Calendly/booking |

---

## File Summary

| File | Status | Changes |
|------|--------|---------|
| `src/components/landing/HeroSection.tsx` | MODIFY | GDPR badge, UK stats |
| `src/components/landing/FeaturesSection.tsx` | MODIFY | GDPR card, portal cards |
| `src/components/landing/TestimonialsSection.tsx` | MODIFY | Fix brand name (3 places) |
| `src/components/landing/CTASection.tsx` | MODIFY | Update messaging |
| `src/components/landing/Footer.tsx` | MODIFY | GDPR compliance |
| `src/pages/LandingPage.tsx` | MODIFY | Add new sections |
| `src/components/landing/PricingSection.tsx` | NEW | Contact-only pricing |
| `src/components/landing/HowItWorksSection.tsx` | NEW | User journey steps |

---

## Acceptance Criteria

- [ ] No "HIPAA" text anywhere on landing page
- [ ] "GDPR" appears in hero badge, features, footer
- [ ] "OccuHealth" in all testimonials (not "MedReport Pro")
- [ ] Pricing section exists and nav anchor works
- [ ] How It Works section explains employer/doctor flow
- [ ] No "nationwide" or US-centric language

---

→ Next: LANDING_PAGE_SPRINT_03_BROWSER_TESTING
