# BROWSER-CLI E2E Testing

**Sprint**: 07 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_06_TESTING_INFRASTRUCTURE
**Next**: OCCUHEALTH_SPRINT_08_PERFORMANCE_OPTIMIZATION

---

## BROWSER-CLI Overview

**Location**: `/BROWSER-CLI/`
**Size**: 476 files, ~40MB
**Architecture**: TCP daemon (port 3456) + CLI commands
**Features**: 25+ testing features

The BROWSER-CLI is a comprehensive browser automation framework built on Playwright, designed for sophisticated E2E testing of the OccuHealth application.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER-CLI Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLI Command ──────▶ TCP Daemon ──────▶ Playwright Browser  │
│                      (port 3456)                            │
│                           │                                 │
│                           ▼                                 │
│              ┌─────────────────────────┐                    │
│              │    Browser Manager      │                    │
│              │  - Connection pooling   │                    │
│              │  - State persistence    │                    │
│              │  - Feature orchestration│                    │
│              └───────────┬─────────────┘                    │
│                          │                                  │
│          ┌───────────────┼───────────────┐                  │
│          ▼               ▼               ▼                  │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │ Snapshot   │  │ Core       │  │ Network    │           │
│   │ Feature    │  │ Actions    │  │ Mocking    │           │
│   │ (refs, a11y)│ │ (click,etc)│  │ (intercept)│           │
│   └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│   + 22 more features (drag, assertions, recording, etc.)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Commands

### Navigation & Timing

```bash
# Navigate to URL
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175

# Wait for duration
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# Wait for element
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts waitForSelector "role:button:Submit"

# Start browser and navigate (combines launch + navigate)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5175
```

### Snapshot & Inspection

```bash
# Take accessibility tree snapshot (generates refs)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Enhanced snapshot with element states
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'snapshot --full'

# Forms-only analysis with quickFill
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'snapshot --forms'

# Screenshot (auto-preview in iTerm2/Kitty)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot evidence.png

# Console logs (last 5 auto-shown on interaction)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console

# Network requests
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'network --filter=convex'
```

### Interaction

```bash
# Click by ref (from snapshot [ref=e5])
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e5

# Click by semantic selector
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click "role:button:Submit"'

# Double-click (for modals)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts dblclick e10

# Type into input
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'type e15 "hello@example.com"'

# Keyboard input
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'pressKey Enter'

# Drag and drop (CDP-based for dnd-kit)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'drag e52 e53'
```

### State Management

```bash
# Save browser state (cookies, localStorage, URL)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'saveState authenticated-coach'

# Restore saved state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'restoreState authenticated-coach'

# List available states
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listStates
```

---

## Pre-Saved States

**Location**: `BROWSER-CLI/states/`

| State | Description | Use Case |
|-------|-------------|----------|
| `authenticated` | Generic authenticated session | Quick authenticated testing |
| `authenticated-coach` | Coach login ready | ⭐ Most common |
| `authenticated-coach-fresh` | Fresh coach session | Clean slate testing |
| `calendar-authenticated` | Calendar view ready | Calendar-specific tests |
| `homepage-loaded` | Homepage loaded | Landing page tests |
| `landing-page` | Fresh landing page | Unauthenticated tests |

### Quick Start Example

```bash
# Skip login - restore pre-authenticated state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'restoreState authenticated-coach'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
```

---

## Selector Strategies

### Priority Order (Best to Worst)

1. **Element Refs** ⭐: `e123` from snapshot `[ref=e123]` tags
   - Most stable (survives styling changes)
   - Auto-generated from accessibility tree
   - ⚠️ Reset on each snapshot

2. **Semantic**: `role:button:Text`, `text:Submit`, `label:Email`
   - Human-readable, accessibility-based
   - More stable than CSS

3. **CSS** ❌: `.button`, `#submit`
   - Fragile (breaks on class changes)
   - Last resort only

### Examples

```bash
# Using ref from snapshot
click e5                           # Best - ref from snapshot

# Using semantic selector
click "role:button:Submit"         # Good - accessibility-based
click "text:Login"                 # Good - visible text

# Using CSS (avoid)
click ".submit-btn"                # Avoid - fragile
```

---

## OccuHealth-Specific Patterns

### Login Flow

```bash
# 1. Start at landing page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 2. If not authenticated, click login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click "text:start your journey"'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click "text:login instead"'

# 3. Enter credentials from .env.local
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'type "label:Email" "coach@test.com"'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'type "label:Password" "password123"'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click "role:button:Sign In"'
```

### Calendar Interactions

```bash
# Double-click workout card → opens Edit Workout modal
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts dblclick e52

# Quick Program modal (TWO CLICKS, not dblclick!)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click [data-date="2025-12-11"]'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'click [data-date="2025-12-11"]'

# Drag workout card to different date
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'drag e52 e53'
```

---

## Assertions & Validation

```bash
# Check element visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assert e5 visible'

# Check element text
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assert e5 text "Submit"'

# Check element enabled
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assert e5 enabled'

# Count elements
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assertCount button equals 5'

# Assert no console errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assertConsole --level=error'

# Assert network request occurred
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'assertNetwork calendarWorkouts'
```

---

## Network Mocking

```bash
# Enable mocking
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts setupNetworkMocking

# Mock a route with schema validation
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'mockRoute "/api/users" GET {"users":[]} 200 --schema=user-response'

# Block pattern
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'blockByPattern analytics'

# List active mocks
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listMocks

# Clear mocks
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts clearMocks
```

---

## Visual Regression Testing

```bash
# Save baseline
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'saveScreenshotBaseline dashboard-admin'

# Compare against baseline (generates diff report)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'compareScreenshots dashboard-admin'
# Output: diff-dashboard-admin.png, composite-dashboard-admin.png, report-dashboard-admin.html

# Snapshot structural comparison
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'saveSnapshotBaseline dashboard-structure'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'compareSnapshots dashboard-structure'
```

---

## A11y Auditing

```bash
# Run axe-core audit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts auditAccessibility

# Get violations (JSON format)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'getAccessibilityResults --format=json'

# Get summary
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'getAccessibilityResults --format=summary'
```

---

## Video Recording

```bash
# Start recording
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts 'startRecording test-run-001'

# ... perform actions ...

# Stop and save
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts stopRecording
# Output: BROWSER-CLI/recordings/test-run-001.webm

# List recordings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listRecordings
```

---

## Golden Testing Workflow

```bash
# 1. Navigate and wait
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/employer
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 2. SNAPSHOT (reveals structure, generates refs)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# Shows: button "Add Employee" [ref=e1], textbox "Search" [ref=e3]

# 3. ACT (use revealed refs)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click e1

# 4. WAIT for action to complete
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 5. VERIFY with new snapshot (<changed> markers)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 6. EVIDENCE
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot result.png
```

---

## Feature Inventory (25+)

| Category | Features |
|----------|----------|
| **Core** | navigate, wait, waitForSelector, start, close |
| **Capture** | snapshot, screenshot, console, network, changes |
| **Interaction** | click, dblclick, hover, drag, type, pressKey, selectOption, fillForm |
| **State** | saveState, restoreState, listStates, deleteState |
| **Visual** | saveScreenshotBaseline, compareScreenshots |
| **Structural** | saveSnapshotBaseline, compareSnapshots |
| **Network** | setupNetworkMocking, mockRoute, clearMocks, blockByPattern |
| **Assertions** | assert, assertCount, assertConsole, assertNetwork |
| **A11y** | auditAccessibility, getAccessibilityResults |
| **Recording** | startRecording, stopRecording, listRecordings |
| **Tabs** | tabs list, tabs new, tabs switch, tabs close |
| **Device** | setMobilePreset, listMobilePresets |
| **Performance** | capturePerformanceMetrics, assertPerformance |
| **DOM** | countElements, getElementVisibility, getComputedStyle |
| **Plugins** | loadPlugin, unloadPlugin, listPlugins |

---

## E2E Test Examples for OccuHealth

### Test: Admin Employer Verification

```bash
# Setup
restoreState authenticated-admin
navigate /admin/employers
wait 1000
snapshot

# Verify pending employer exists
assert "text:pending" visible

# Approve employer
click "role:button:Verify"
wait 500

# Verify success
snapshot
assertNetwork "employers:verify"
console  # Check for errors
```

### Test: Booking Flow

```bash
# Setup
restoreState authenticated-employer
navigate /employer/bookings
wait 1000
snapshot

# Step 1: Select employee
click e5  # Employee dropdown
click "text:John Doe"
snapshot

# Step 2: Select date
click e10  # Date picker
click "text:15"
wait 300

# Step 3: Select time slot
snapshot
click "role:button:09:00 AM"

# Step 4: Confirm booking
click "role:button:Confirm Booking"
wait 1000

# Verify success
assertNetwork "appointments:book"
assert "text:Booking confirmed" visible
```

### Test: GDPR Erasure Request

```bash
# Setup
restoreState authenticated-admin
navigate /admin/gdpr/erasure
wait 1000
snapshot

# Process pending request
click e3  # First pending request
click "role:button:Process"
wait 500

# Confirm erasure
snapshot
click "role:button:Confirm Erasure"
wait 1000

# Verify completion
assertNetwork "gdpr:processErasure"
assert "text:completed" visible
```

---

## Debugging

| Issue | Cause | Solution |
|-------|-------|----------|
| Selector not found | Element not rendered | `snapshot` first, wait, use refs |
| Stale refs | Refs reset per snapshot | Take fresh snapshot |
| Auth lost | Browser restarted | `restoreState authenticated` |
| API failure hidden | UI looks correct | `network --status=400` |
| Modal won't open | Wrong interaction | Use `dblclick` for edit modals |
| Quick Program fail | Used dblclick | Use TWO clicks with wait |

---

→ Next: OCCUHEALTH_SPRINT_08_PERFORMANCE_OPTIMIZATION
