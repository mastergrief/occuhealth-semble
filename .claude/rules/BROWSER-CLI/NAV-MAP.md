# Nav-Map for nuanced app-specific interactions
**Application - Zenith Athlete**

## Pre-Saved States (Quick Start)

Skip authentication and navigation by restoring saved browser states:

| State | Description | Use Case |
|-------|-------------|----------|
| `authenticated` | Generic authenticated session | Quick authenticated testing |
| `authenticated-coach` | Coach login ready | ⭐ Most common - start tests as coach |
| `authenticated-coach-fresh` | Fresh coach session | Clean slate testing |
| `calendar-authenticated` | Calendar view ready | Calendar-specific tests |
| `homepage-loaded` | Homepage loaded | Landing page tests |
| `landing-page` | Fresh landing page | Unauthenticated tests |

**Quick start examples:**
```bash
# Start testing as authenticated coach (fastest)
restoreState authenticated-coach
snapshot


**State storage:** `BROWSER-CLI/states/<name>.json`

---

**Login Flow - Zenith Athlete**
- To start server `navigate localhost:5173`
- `snapshot` & `screenshot` to determine authenticated state
- IF not authenticated click `start your journey`, then click `login instead`
- Enter coaches credentials from `.env.local` (see `TEST_USER_NAME` and `TEST_PASSWORD`)

**Athlete/Coaches Training Calendar**
| Action | Target | Result |
|--------|--------|--------|
| `dblclick` | Workout card | Opens **Edit Workout** modal |
| Click | Empty date cell | **Selects** the date (blue highlight) |
| Click | Already-selected date | Opens **Quick Program** modal |
| `drag` | Workout card → date | Moves workout (CDP-based, persists to backend) |

**⚠️ CRITICAL: Quick Program Modal Pattern**
```bash
# ❌ WRONG - dblclick is too fast, won't trigger Quick Program
dblclick '[data-date="2025-12-11"]'

# ✅ CORRECT - Two separate clicks with delay
click '[data-date="2025-12-11"]'   # 1. Select date (turns blue)
wait 300                            # Small delay for state update
click '[data-date="2025-12-11"]'   # 2. Open Quick Program modal
```

**Interaction Patterns - Verified E2E**
- **Edit Workout Modal**: `dblclick` on workout card → modal opens with name, focus, duration, exercises
- **Quick Program Modal**: Two SEPARATE clicks (not dblclick!) with ~300ms delay between
- **Drag-and-Drop**: CDP-based `drag e52 e53` → triggers `calendarWorkouts:updateCalendarWorkout`
- **Date Selection**: Single click on `[data-date="YYYY-MM-DD"]` → blue highlight, updates `calendarSelections`

**Specific locations for AI-Features**
- Training anchors is located under Training calendar and has generate new block from existing anchors
- AI block suggestions is located in Training Blocks and generates a new block from scratch which is then imported to Training Calendar
- Analyse training with AI is located in AI Insights

**Selector Strategies for Calendar**
```bash
# Workout cards - use refs from snapshot
click e52                           # Single click workout card
dblclick e52                        # Double-click to open Edit Workout modal

# Date cells - use data-date attribute
click '[data-date="2025-12-11"]'    # Select date (turns blue)

# Open Quick Program modal (TWO CLICKS WITH DELAY)
click '[data-date="2025-12-11"]'    # 1. Select date
wait 300                            # 2. Wait for selection state
click '[data-date="2025-12-11"]'    # 3. Open Quick Program modal
snapshot                            # 4. Verify modal opened
```

**Console Signatures (Expected)**
- Workout card mounted: `DraggableWorkoutCard mounted: {draggableId: ...}`
- Drag detected: `Double-click detected: {draggableId: ...}`
- Update mutation: `[CONVEX M(calendarWorkouts:updateCalendarWorkout)]`
- Selection mutation: `[CONVEX M(calendarSelections:createSelection)]`

**Known Warnings (Non-blocking)**
- `Missing Description or aria-describedby for DialogContent` - Accessibility warning from Radix UI

---

## Training Block Markers (Anchors)

Training Block Markers allow coaches to create reusable training patterns from existing workouts.

**Location**: Training Calendar tab (coach view) → MarkerWeeklyView component

| Action | How | Result |
|--------|-----|--------|
| Create Marker | Select workouts → Click "Create Marker" | Opens CreateMarkerDialog |
| Edit Marker | Click marker in weekly view | Opens marker editor with exercises |
| Apply Marker | Click "Apply" on marker | Opens ApplyMarkerDialog → select athlete → deploy |
| Generate Block | Use "Generate Next Block" | AI generates continuation from anchor patterns |

**Marker Workflow**:
```bash
# 1. Navigate to Training Calendar as coach
restoreState authenticated-coach
navigate /training-calendar
snapshot

# 2. Create marker from existing workouts
# Select date range with workouts, click "Create Marker"
click '[data-testid="create-marker-button"]'
wait 500
snapshot  # Verify CreateMarkerDialog opened

# 3. Apply marker to athlete
click '[data-testid="apply-marker-button"]'
wait 300
# Select athlete from dropdown
click '[data-testid="athlete-select"]'
click 'text:Athlete Name'
click '[data-testid="confirm-apply"]'
```

**Components**:
- `MarkerWeeklyView/` - Main marker display (7 subcomponents)
- `ApplyMarkerDialog.tsx` - Athlete selection for deployment
- `CreateMarkerDialog.tsx` - Marker creation from workouts

---

## Error Handling & Recovery

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| State restore fails | Error message: "State not found" | `listStates` to verify, use manual login flow |
| Stale refs | "ref not found" or wrong element clicked | Take fresh `snapshot`, use new refs |
| Modal timeout | No modal after 1s | `wait 500`, retry click, check `console` for errors |
| Auth lost mid-session | Redirect to login page | `restoreState authenticated-coach` |
| Quick Program won't open | Modal doesn't appear after clicks | Ensure TWO separate clicks with `wait 300` between |
| Drag fails | Element doesn't move | Fresh `snapshot`, verify both source/target refs visible |
| Date not selectable | Click has no effect | Check date is in visible month, use `[data-date="YYYY-MM-DD"]` |
| Network mutation fails | Console shows CONVEX error | `network --filter=convex` to inspect, check backend logs |

**Timing Sensitivity Notes**:
- **300ms minimum**: Required between clicks for Quick Program modal (React state update)
- **Auto-retry**: Browser-cli retries clicks 3x with exponential backoff (500ms, 1s, 2s)
- **Ref staleness**: Refs expire on new snapshot; warns if refs >30s old

**Verification Checklist**:
```bash
# After critical actions, verify success:
snapshot                              # Check UI state changed
console                               # Check for React errors
network --filter=calendarWorkouts     # Verify backend mutation fired
```

---

## Advanced Commands Reference

Essential browser-cli commands for Zenith Athlete testing:

**Verification & Assertions**:
```bash
assert e5 visible                     # Check element visible
assert e5 text "Submit"               # Check element text
assertConsole --level=error           # Verify no console errors
assertNetwork calendarWorkouts        # Verify mutation occurred
```

**Network Inspection**:
```bash
network                               # List all requests
network --filter=convex               # Filter Convex API calls
network --status=400                  # Find failed requests
network --method=POST                 # Filter by method
```

**State Management**:
```bash
listStates                            # Show all saved states
saveState my-test-state               # Save current state
deleteState old-state                 # Remove saved state
```

**Evidence Collection**:
```bash
screenshot before-test.png            # Visual capture
snapshot --file=baseline              # Save snapshot to file
snapshot --full                       # Include element states (enabled/disabled/values)
snapshot --forms                      # Analyze form fields with quickFill suggestion
```

**Debug Commands**:
```bash
console                               # Show browser console (last 5 auto-shown)
clearConsole                          # Clear console buffer
evaluate 'document.title'             # Read-only JS inspection
getElementVisibility '[selector]'     # Check why element not visible
```

For complete command reference, see `browser-cli.md`.