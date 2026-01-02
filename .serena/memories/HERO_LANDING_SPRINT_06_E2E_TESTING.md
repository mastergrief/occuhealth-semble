# E2E Testing with Browser-CLI
**Sprint**: 06 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: HERO_LANDING_SPRINT_05_INTEGRATION
**Next**: Complete

---

## Objective
Create comprehensive E2E tests for the hero landing page using Browser-CLI on port 5175.

---

## 1. Test Environment Setup

### Start Development Server on Port 5175

```bash
# In terminal 1: Start Convex backend
npm run dev:backend

# In terminal 2: Start frontend on port 5175
VITE_PORT=5175 npm run dev:frontend
# Or: npx vite --port 5175

# In terminal 3: Start Browser-CLI manager (auto-starts with first command)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts status
```

### Verify Server Running
```bash
# Browser-CLI command
navigate http://localhost:5175
snapshot
screenshot landing-initial.png
```

---

## 2. Landing Page Tests

### Test 2.1: Hero Section Visibility

```bash
# Navigate and capture
navigate http://localhost:5175
wait 1000
snapshot

# Verify hero elements
assert "text:Occupational Health Reports" visible
assert "text:Simplified" visible
assert "text:HIPAA Compliant Platform" visible
assert "role:button:Request Demo" visible
assert "role:button:Watch Video" visible

# Verify stats
assert "text:24h" visible
assert "text:99.9%" visible
assert "text:500+" visible

# Screenshot for evidence
screenshot tests/hero-section.png
```

### Test 2.2: Navigation Bar

```bash
navigate http://localhost:5175
wait 1000
snapshot

# Verify nav elements
assert "text:MedReport Pro" visible
assert "text:Features" visible
assert "text:Testimonials" visible
assert "text:Pricing" visible
assert "role:button:Login" visible
assert "role:button:Request Demo" visible

# Test navigation scroll
click "text:Features"
wait 500
snapshot
screenshot tests/nav-features.png
```

### Test 2.3: Features Section

```bash
navigate http://localhost:5175
wait 500

# Scroll to features
evaluate 'document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })'
wait 1000
snapshot

# Verify feature cards
assert "text:Pre-Employment Assessments" visible
assert "text:Health Surveillance" visible
assert "text:24-Hour Turnaround" visible
assert "text:HIPAA Compliant" visible
assert "text:Multi-Provider Network" visible
assert "text:Digital Reports" visible

screenshot tests/features-section.png
```

### Test 2.4: Testimonials Section

```bash
navigate http://localhost:5175

# Scroll to testimonials
evaluate 'document.querySelector("#testimonials")?.scrollIntoView({ behavior: "smooth" })'
wait 1000
snapshot

# Verify testimonials
assert "text:Dr. Sarah Chen" visible
assert "text:TechCorp Industries" visible
assert "text:reduced our screening time by 60%" visible

screenshot tests/testimonials-section.png
```

### Test 2.5: Footer

```bash
navigate http://localhost:5175

# Scroll to footer
evaluate 'window.scrollTo(0, document.body.scrollHeight)'
wait 1000
snapshot

# Verify footer elements
assert "text:HIPAA Compliant" visible
assert "text:Privacy Policy" visible
assert "text:Terms of Service" visible
assert "text:© 2026 MedReport Pro" visible

screenshot tests/footer.png
```

---

## 3. Authentication Flow Tests

### Test 3.1: Open Auth Modal

```bash
navigate http://localhost:5175
wait 1000
snapshot

# Click Login button
click "role:button:Login"
wait 500
snapshot

# Verify modal opened
assert "role:dialog" visible
assert "text:Welcome Back" visible
assert "label:Email" visible
assert "label:Password" visible
assert "role:button:Sign In" visible
assert "text:Don't have an account?" visible

screenshot tests/auth-modal-open.png
```

### Test 3.2: Auth Modal Form Validation

```bash
# Continue from modal open state
# Try submit with empty fields
click "role:button:Sign In"
wait 300
snapshot

# HTML5 validation should prevent submission
# Type invalid email
type "label:Email" "not-an-email"
click "role:button:Sign In"
wait 300
snapshot

# Clear and type valid email
type "label:Email" ""
type "label:Email" "test@example.com"

# Try with short password
type "label:Password" "short"
click "role:button:Sign In"
wait 300
snapshot

screenshot tests/auth-validation.png
```

### Test 3.3: Successful Login Flow

```bash
navigate http://localhost:5175
wait 1000

# Open login modal
click "role:button:Login"
wait 500

# Use test credentials (from .env.local)
type "label:Email" "platinum@zenith-athlete.com"
type "label:Password" "testpassword123"

# Submit
click "role:button:Sign In"
wait 2000
snapshot

# Verify authenticated state
assert "text:Welcome back!" visible
assert "role:button:Sign out" visible

screenshot tests/auth-success.png
```

### Test 3.4: Sign Out Flow

```bash
# Continue from authenticated state
click "role:button:Sign out"
wait 1000
snapshot

# Verify returned to landing
assert "text:Occupational Health Reports" visible
assert "role:button:Login" visible

screenshot tests/signout-success.png
```

---

## 4. Responsive Design Tests

### Test 4.1: Mobile Viewport

```bash
navigate http://localhost:5175

# Set mobile viewport
resize 375 812
wait 500
snapshot

# Verify mobile nav (hamburger menu)
assert "role:button" visible  # Menu icon
click "role:button"  # Open sheet
wait 300
snapshot

# Verify sheet content
assert "text:Features" visible
assert "text:Login" visible

screenshot tests/mobile-nav.png

# Reset viewport
resize 1920 1080
```

### Test 4.2: Tablet Viewport

```bash
navigate http://localhost:5175

resize 768 1024
wait 500
snapshot

# Verify layout adapts
screenshot tests/tablet-layout.png

resize 1920 1080
```

---

## 5. Visual Regression Tests

### Save Baselines

```bash
navigate http://localhost:5175
wait 1000

# Save screenshot baselines
saveScreenshotBaseline landing-hero
evaluate 'document.querySelector("#features")?.scrollIntoView()'
wait 500
saveScreenshotBaseline landing-features
evaluate 'document.querySelector("#testimonials")?.scrollIntoView()'
wait 500
saveScreenshotBaseline landing-testimonials

# Save snapshot baselines
navigate http://localhost:5175
wait 1000
saveSnapshotBaseline landing-structure
```

### Run Regression Checks

```bash
navigate http://localhost:5175
wait 1000

# Compare screenshots
compareScreenshots landing-hero
compareScreenshots landing-features
compareScreenshots landing-testimonials

# Compare DOM structure
compareSnapshots landing-structure
```

---

## 6. Accessibility Audit

```bash
navigate http://localhost:5175
wait 1000

# Run accessibility audit
auditAccessibility

# Get results
getAccessibilityResults --format=summary

# Expected: No critical violations
# Acceptable: Minor warnings for decorative elements
```

---

## 7. Performance Check

```bash
navigate http://localhost:5175
wait 2000

# Capture performance metrics
capturePerformanceMetrics
getPerformanceMetrics

# Expected targets:
# - LCP < 2500ms
# - TTFB < 800ms
# - loadTime < 3000ms
```

---

## 8. Complete Test Script

**File**: `BROWSER-CLI/tests/landing-page.test.sh`

```bash
#!/bin/bash
# Landing Page E2E Test Suite
# Run: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts exec < landing-page.test.sh

echo "=== Landing Page E2E Tests ==="
echo "Server: http://localhost:5175"

# Setup
navigate http://localhost:5175
wait 2000
snapshot

# Test 1: Hero Section
echo "Test 1: Hero Section"
assert "text:Occupational Health Reports" visible
assert "role:button:Request Demo" visible
screenshot tests/01-hero.png

# Test 2: Navigation
echo "Test 2: Navigation"
assert "text:MedReport Pro" visible
assert "text:Features" visible
click "text:Features"
wait 500

# Test 3: Features
echo "Test 3: Features Section"
assert "text:Pre-Employment Assessments" visible
screenshot tests/03-features.png

# Test 4: Auth Modal
echo "Test 4: Auth Modal"
navigate http://localhost:5175
wait 1000
click "role:button:Login"
wait 500
assert "role:dialog" visible
screenshot tests/04-auth-modal.png

# Test 5: Accessibility
echo "Test 5: Accessibility Audit"
navigate http://localhost:5175
wait 1000
auditAccessibility
getAccessibilityResults --format=summary

# Test 6: Performance
echo "Test 6: Performance Metrics"
capturePerformanceMetrics
getPerformanceMetrics

echo "=== Tests Complete ==="
```

---

## Acceptance Criteria

- [ ] All landing page sections render correctly
- [ ] Navigation links scroll to sections
- [ ] Auth modal opens and closes properly
- [ ] Form validation works (required, minLength)
- [ ] Login flow completes successfully
- [ ] Sign out returns to landing page
- [ ] Mobile responsive design works
- [ ] Accessibility audit passes (no critical violations)
- [ ] Performance metrics within targets
- [ ] Visual regression baselines saved

---

## Evidence Collection

```bash
# Create test output directory
mkdir -p BROWSER-CLI/tests/landing-page

# Run full test suite
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
# ... (run all tests above)

# Collect evidence
ls -la BROWSER-CLI/tests/landing-page/
# Expected: hero.png, features.png, auth-modal.png, mobile-nav.png, etc.
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Server not found | Port 5175 not running | `VITE_PORT=5175 npm run dev:frontend` |
| Element not found | Selector mismatch | `snapshot` to see current refs |
| Auth fails | Wrong credentials | Check `.env.local` for test credentials |
| Modal won't close | Focus trap | `pressKey Escape` |
| Slow tests | Network latency | Increase `wait` durations |

---

✓ Final Sprint