# Browser-CLI Manual Testing Procedures
**Sprint**: 03 of 03
**Index**: LANDING_PAGE_SPRINT_INDEX
**Depends On**: LANDING_PAGE_SPRINT_02_IMPLEMENTATION
**Next**: Complete

---

## Pre-Test Setup

```bash
# 1. Verify dev server running
lsof -ti:5175 || npm run dev

# 2. Navigate to landing page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "navigate http://localhost:5175"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 1000"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
```

---

## Test Suite: T1 - Compliance Messaging

### T1.1: Hero Badge Verification

```bash
# Take snapshot of hero section
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T1.1-hero-badge.png"

# Verify GDPR text present (not HIPAA)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"GDPR\")'"
# Expected: true

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"HIPAA\")'"
# Expected: false
```

**Pass Criteria**: 
- ✅ "GDPR" found on page
- ✅ "HIPAA" NOT found on page

### T1.2: Footer Compliance Check

```bash
# Scroll to footer
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.querySelector(\"footer\").scrollIntoView()'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 500"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T1.2-footer-compliance.png"

# Check footer text
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "getElementText 'footer'"
```

**Pass Criteria**:
- ✅ "GDPR Compliant" in footer
- ✅ No "HIPAA" in footer

---

## Test Suite: T2 - Brand Consistency

### T2.1: Testimonials Brand Check

```bash
# Navigate to testimonials section
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "click 'a[href=\"#testimonials\"]'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 500"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T2.1-testimonials.png"

# Verify brand name
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"OccuHealth\")'"
# Expected: true

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"MedReport Pro\")'"
# Expected: false
```

**Pass Criteria**:
- ✅ "OccuHealth" found in testimonials
- ✅ "MedReport Pro" NOT found anywhere

---

## Test Suite: T3 - Navigation & Sections

### T3.1: Pricing Section Exists

```bash
# Click pricing nav link
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "click 'a[href=\"#pricing\"]'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 500"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T3.1-pricing-section.png"

# Verify pricing section rendered
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.querySelector(\"#pricing\") !== null'"
# Expected: true
```

**Pass Criteria**:
- ✅ #pricing section exists
- ✅ Scrolls to pricing on nav click
- ✅ Contact-only pricing displayed

### T3.2: How It Works Section Exists

```bash
# Look for How It Works section
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"How It Works\")'"
# Expected: true

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T3.2-how-it-works.png"
```

**Pass Criteria**:
- ✅ "How It Works" section visible
- ✅ Shows 6 workflow steps

---

## Test Suite: T4 - Feature Cards

### T4.1: Portal Features Present

```bash
# Navigate to features
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "click 'a[href=\"#features\"]'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 500"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T4.1-features.png"

# Check for portal features
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"Employer Portal\")'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"Doctor Portal\")'"
```

**Pass Criteria**:
- ✅ "Employer Portal" feature card
- ✅ "Doctor Portal" feature card
- ✅ "GDPR Compliant" feature card (not HIPAA)

---

## Test Suite: T5 - Geographic Language

### T5.1: No US-Centric Text

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"nationwide\")'"
# Expected: false

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"UK\") || document.body.innerText.includes(\"United Kingdom\")'"
# Expected: true
```

**Pass Criteria**:
- ✅ No "nationwide" (US term)
- ✅ "UK" or "UK-wide" present

---

## Test Suite: T6 - CTA Functionality

### T6.1: Login Button

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "snapshot"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "click 'text:Login'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 2000"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "screenshot T6.1-login-redirect.png"
```

**Pass Criteria**:
- ✅ Redirects to WorkOS auth

### T6.2: Non-functional Buttons Removed

```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "navigate http://localhost:5175"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "wait 1000"

# Check if non-functional buttons exist
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"Watch Video\")'"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts "evaluate 'document.body.innerText.includes(\"Schedule a Call\")'"
```

**Pass Criteria**:
- ✅ "Watch Video" removed OR functional
- ✅ "Schedule a Call" removed OR functional

---

## Full Regression Script

```bash
#!/bin/bash
# landing-page-regression.sh

CMD="npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts"

echo "=== Landing Page Regression Test ==="

# Setup
$CMD "navigate http://localhost:5175"
$CMD "wait 1500"

# T1: Compliance
echo "[T1] Compliance Messaging..."
$CMD "screenshot evidence/T1-hero.png"
GDPR=$($CMD "evaluate 'document.body.innerText.includes(\"GDPR\")'")
HIPAA=$($CMD "evaluate 'document.body.innerText.includes(\"HIPAA\")'")
echo "  GDPR found: $GDPR (expect true)"
echo "  HIPAA found: $HIPAA (expect false)"

# T2: Brand
echo "[T2] Brand Consistency..."
$CMD "click 'a[href=\"#testimonials\"]'"
$CMD "wait 500"
$CMD "screenshot evidence/T2-testimonials.png"
BRAND=$($CMD "evaluate 'document.body.innerText.includes(\"MedReport Pro\")'")
echo "  MedReport Pro found: $BRAND (expect false)"

# T3: Sections
echo "[T3] Required Sections..."
$CMD "click 'a[href=\"#pricing\"]'"
$CMD "wait 500"
$CMD "screenshot evidence/T3-pricing.png"
PRICING=$($CMD "evaluate 'document.querySelector(\"#pricing\") !== null'")
echo "  Pricing section exists: $PRICING (expect true)"

# T4: Features
echo "[T4] Feature Cards..."
$CMD "click 'a[href=\"#features\"]'"
$CMD "wait 500"
$CMD "screenshot evidence/T4-features.png"

# T5: Geographic
echo "[T5] Geographic Language..."
NATIONWIDE=$($CMD "evaluate 'document.body.innerText.includes(\"nationwide\")'")
echo "  'nationwide' found: $NATIONWIDE (expect false)"

echo "=== Tests Complete ==="
```

---

## Evidence Collection

All screenshots saved to:
- `T1.1-hero-badge.png` - Hero section
- `T1.2-footer-compliance.png` - Footer
- `T2.1-testimonials.png` - Testimonials
- `T3.1-pricing-section.png` - Pricing
- `T3.2-how-it-works.png` - How It Works
- `T4.1-features.png` - Features
- `T6.1-login-redirect.png` - Auth flow

---

## Test Summary Matrix

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| T1.1 | Hero GDPR badge | "GDPR" present, no "HIPAA" |
| T1.2 | Footer compliance | "GDPR Compliant" in footer |
| T2.1 | Testimonials brand | "OccuHealth", no "MedReport Pro" |
| T3.1 | Pricing section | #pricing exists, navigable |
| T3.2 | How It Works | Section with 6 steps |
| T4.1 | Portal features | Employer/Doctor Portal cards |
| T5.1 | Geographic text | No "nationwide", has "UK" |
| T6.1 | Login CTA | Redirects to WorkOS |
| T6.2 | Non-functional CTAs | Removed or wired up |

---

✓ Final Sprint
