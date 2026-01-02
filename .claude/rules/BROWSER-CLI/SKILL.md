
#**Browser-cli**
- First check if dev servers already active: `lsof -ti:5173`, `lsof -ti:5173`
- If not `npm run dev`
- If servers active and browser not responding kill process in wsl and restart browser manager
- For app-specific navigational nuances read `.claude\rules\BROWSER-CLI\NAV-MAP.md`
- For all Browser-cli commands `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts <command>`)
**Architecture** (25 features + 2 modular dirs, TCP daemon port 3456, ~15,000 TypeScript lines):
- Auto-start manager + browser on first command (MCP-like behavior)
- Persistent auth state (`BROWSER-CLI/browser-state.json`), named states in `BROWSER-CLI/states/<name>.json`
- Returns Playwright code for EVERY command (transparency)
- Rolling buffers: 100 console messages, 1000 network requests
- Auto-retry: Click/type retry 3x with exponential backoff (500ms → 1s → 2s)
  - Retryable: timeout, not visible, not enabled, target closed, detached from frame
**Core Testing Loop**: Observation → Interaction → Verification → Evidence
1. **Observe** - `snapshot` reveals structure, generates refs, tracks changes → `screenshot` for visual proof
2. **Interact** - `click`/`dblclick`/`pressKey`/`drag`/`type`/`hover` etc for REAL user input (NEVER programmatic value injection)
3. **Verify** - `snapshot` shows `<changed>` markers, `console` for errors, `network` for API calls
4. **Evidence** - `screenshot`, `snapshot --file`, logs for audit trail
**Essential Commands**
```bash
# Navigation & Timing
navigate <url> [--waitUntil=X]  # Go to page (X: load|domcontentloaded|networkidle, default: load)
wait <ms>                   # Wait duration
waitForSelector <selector> [--state=X] [--timeout=ms]  # X: attached|detached|visible|hidden
start <url>             # Start browser and navigate to URL (combines launch + navigate)
# Capture & Inspection
snapshot [--file=name]      # Accessibility tree + refs + <changed> markers
snapshot --full             # Enhanced: element state + forms + accessibility tree
snapshot --forms            # Forms-only: field analysis with quickFill commands
saveSnapshotBaseline <name> # Save structural baseline for comparison
compareSnapshots <name>     # Detect structural changes vs baseline
listBaselines               # List all snapshot baselines
screenshot <path>           # Visual capture (PNG, auto-preview in iTerm2/Kitty terminals)
console                     # Browser console (last 5 auto-shown on click/type)
clearConsole                # Clear console buffer
network [--filter=pattern]  # HTTP requests (--method, --status, --limit)
networkClear                # Clear network request buffer
changes                     # Get changed element refs from last snapshot
# Interaction (priority: refs > semantic > CSS)
click e5                    # Element ref from snapshot [ref=e5]
click "role:button:Submit"  # Semantic selector (accessibility-based)
dblclick e10                # Double-click workout card to open Edit Workout modal
dblclick "role:button:Edit" # Double-click via semantic selector
hover e3                    # Hover over element
hover "text:Learn More"     # Hover via semantic selector
waitForSelector e5 [--state=visible]  # Wait for ref with state option
drag e1 e2                  # Drag e1 to e2 (uses CDP for dnd-kit compatibility)
drag --cdp "css1" "css2"    # Drag using CSS selectors directly (for unnamed elements)
type e15 "text"             # Type into input by ref
type "label:Email" "a@b.c"  # Type into input by semantic selector
waitForSelector "role:dialog" [--state=visible]  # Wait via semantic selector
pressKey Enter              # Keyboard input (special keys)
pressKey 5                  # Keyboard input (digit/letter)
selectOption <selector> <value>  # Select dropdown option
fillForm '{"sel":"val",...}'     # Fill multiple form fields at once
uploadFile <selector> <path>     # Upload file(s) to file input
evaluate <code>             # JavaScript (READ-ONLY inspection, NOT for input)
# State & Workflow
saveState <name>            # Save cookies/localStorage/sessionStorage/URL
restoreState <name>         # Restore saved state (skip auth flows)
listStates                  # List all saved states
deleteState <name>          # Delete saved state
exec 'cmd1 && cmd2'         # Chain commands (single quotes required)
# Visual Regression Testing
saveScreenshotBaseline <name>    # Save visual baseline (pixel comparison)
compareScreenshots <name>        # Pixel-level diff with HTML report generation
  # Outputs: diff-{name}.png, composite-{name}.png (3-panel), report-{name}.html
listScreenshotBaselines          # List all screenshot baselines
# Network Mocking & Schema Validation
setupNetworkMocking              # Enable request interception
mockRoute <url> <method> <json> [status] [--schema=name]  # Mock with AJV validation
  # Auto-validates against schema before creating mock
  # Schemas auto-loaded from BROWSER-CLI/schemas/
  # Built-in: user-response, workout-response, error-response
clearMocks                       # Clear all network mocks
listMocks                        # List active network mocks
listSchemas                      # List available schemas
validateMock <schema> <json>     # Validate without creating mock (dry-run)
loadSchema <name> <path>         # Load custom JSON Schema file
# Performance & Debugging
capturePerformanceMetrics        # Web Vitals + navigation timing
  # Captures: LCP, TTFB, loadTime, domContentLoaded, domInteractive, domComplete, totalTime
getPerformanceMetrics            # Get latest captured metrics with timestamps
resize <width> <height>          # Viewport resize
status --verbose                 # Manager status (port, uptime, features)
close                            # Close the browser and cleanup resources
setHeadless <true|false>         # Toggle headless mode (requires browser restart)
# Assertions & Validation (take fresh snapshot first!)
assert e5 visible               # Check element visible (use ref from latest snapshot)
assert e5 text "Submit"         # Check element text matches
assert e5 enabled               # Check element is enabled
assertCount button equals 5     # Count elements matching selector
assertConsole [--level=error]       # Assert no console errors/warnings
assertNetwork <pattern> [--method] [--status]  # Assert request occurred
assertPerformance <metric> <op> <value>  # Metric: LCP|TTFB|CLS (e.g., LCP lt 2500)
getAssertionResults                 # Get all assertion results
clearAssertionResults               # Clear assertion history
# Accessibility (A11y) Auditing
auditAccessibility [--include=rules] [--exclude=rules]  # Run axe-core audit
getAccessibilityResults [--format=json|summary]         # Get audit violations
# Tab Management (pattern: tabs <action>)
tabs                    # List all open tabs (alias: tabs list)
tabs list               # List all open tabs
tabs new [url]          # Open new tab
tabs switch <index>     # Switch to tab by index
tabs close [index]      # Close tab (default: current)
# Device Emulation
setMobilePreset <name>  # iPhone 12, iPad Pro, Galaxy S21, etc.
listMobilePresets       # List available device presets
resetMobilePreset       # Return to desktop viewport
# Video Recording
startRecording <name>   # Start session recording
stopRecording           # Stop and save to BROWSER-CLI/recordings/
getRecordingStatus      # Check if recording active
listRecordings          # List saved recordings
# HAR Export (HTTP Archive)
startHAR                # Begin HAR capture
exportHAR <filename>    # Save to BROWSER-CLI/har-exports/
getHARData              # Get current HAR object
# Content Extraction
getPageHTML             # Full page HTML
getPageText             # Page text content only
getElementHTML <sel>    # Element HTML by selector
getElementText <sel>    # Element text by selector
# Event & Dialog Handling
getEventLog             # Get browser events (dialogs, popups, errors)
clearEventLog           # Clear event buffer
waitForEvent <type>     # Wait for event: dialog|popup|error
acceptDialog [text]     # Accept alert/confirm/prompt (optional input for prompts)
dismissDialog           # Dismiss dialog (cancel/close)
# DOM Inspection
countElements <selector>           # Count matching elements
getElementVisibility <selector>    # Check visibility + reasons
getComputedStyle <sel> <property>  # Get CSS computed value
getOverlayingElements <selector>   # Check if covered by overlay
# Plugins
loadPlugin <path>       # Load plugin from .ts file
unloadPlugin <name>     # Unload plugin by name
listPlugins             # List loaded plugins with commands
# Test Orchestration
orchestrate <prompt>    # AI-driven test generation from natural language
getOrchestrationStatus  # Get execution status
abortOrchestration      # Stop current orchestration
# Flaky Test Detection
runTestMultipleTimes <cmd> <n>  # Run command N times, analyze flakiness
analyzeFlakiness                # Get flakiness report (pass rate, avg duration)
# Buffer Management
getConsoleBufferStats           # Get console buffer stats (size, overflow)
setConsoleBufferCapacity <n>    # Change console buffer size (default: 100)
getNetworkBufferStats           # Get network buffer stats
setNetworkBufferCapacity <n>    # Change network buffer size (default: 1000)
getEventBufferStats             # Get event buffer stats
setEventBufferCapacity <n>      # Change event buffer size (default: 500)
# Network Mocking (Advanced)
abortRoute <url> <method>       # Abort matching requests
blockByPattern <pattern>        # Block URLs matching pattern
modifyRequestHeaders <json>     # Override request headers
modifyResponseHeaders <json>    # Override response headers
getMockHistory                  # Get intercepted request history
disableMock                     # Temporarily disable mocking
enableMock                      # Re-enable mocking
listAborts                      # List abort rules
# Advanced Keyboard
pressKeyCombo <keys>    # Press multiple keys: Ctrl+Shift+P
holdKey <key> <ms>      # Hold key for duration
tapKey <key> <n>        # Tap key N times
```
**Selector Strategies** (best to worst):
1. **Element Refs** ⭐: `e123` from snapshot `[ref=e123]` tags
   - Most stable (survives styling changes)
   - Auto-generated from accessibility tree
   - Child refs: `e5a`, `e5b` for nested semantic children (img, paragraph, heading, generic only)
   - ⚠️ Reset on each snapshot (not persistent)
   - **CSS selector fallback**: Refs capture CSS selectors during snapshot for unnamed elements
     - Priority: data-testid → data-date (with parent) → aria-label → id → unique classes → parent path → nth-of-type
2. **Semantic** ✅: `role:button:Text`, `text:Submit`, `label:Email`
   - Human-readable, accessibility-based
   - More stable than CSS
3. **CSS** ❌: `.button`, `#submit`
   - Fragile (breaks on class changes)
   - Last resort only
**Critical Rules**
- **ALWAYS snapshot first** → reveals structure, generates refs, establishes baseline
- **Use refs over CSS** → stable across styling changes, auto-generated
- **Code transparency** → Every command shows Playwright code executed (```js blocks)
- **REAL user interactions ONLY** → NEVER `evaluate` with `inp.value="X"` or `dispatchEvent()` for input
  - ❌ WRONG: `evaluate 'input.value="5"; input.dispatchEvent(new Event("input"))'`
  - ✅ CORRECT: `evaluate '...find input...focus(); return "focused"'` then `pressKey 5`
  - **Why**: Programmatic value injection bypasses React onChange handlers, misses bugs
- **Check console after interactions** → React errors only visible there (auto-shown last 5)
- **Verify backend** → frontend may look correct but API failed (`network --filter=convex`)
- **Save states for complex flows** → skip repetitive auth/navigation (`saveState`/`restoreState`)
- **Take baselines before changes** → enable regression detection (`saveSnapshotBaseline`, `saveScreenshotBaseline`)
- **Refs reset per snapshot** → Always take fresh snapshot before using refs
- **Fresh refs for assertions** → Take snapshot immediately before `assert` commands (refs expire on new snapshot)
- **Exec quoting** → Use single quotes: `exec 'wait 100 && snapshot'` not `exec "wait 100 && snapshot"`
- **Context-aware errors** → All errors include recovery suggestions (9 patterns: connection, timeout, selector, click, ref, evaluate, file, validation, navigation)
**Advanced Techniques**:
- **Number inputs**: Auto-detected by `type` command, uses value set + event dispatch (no manual pressKey needed)
- **Drag mechanics**: CDP-based with grip icon detection (SVG/IMG), 20 interpolated steps, fallback to left edge
  - **Unnamed elements**: Uses CSS selector fallback (captured during snapshot) for reliable drag on calendar cells, etc.
- **Element State Enrichment** (`snapshot --full`): Captures per-element state during snapshot:
  - `state`: enabled | disabled | readonly | loading
  - `visible`: computed from bounding box + CSS
  - `value`, `placeholder`, `required`: input field properties
  - `checked`: checkbox/radio state
  - `validationError`: HTML5 validation or aria-invalid message
  - `options`, `selectedOption`, `expanded`: select/combobox state
  - Output groups: `Disabled (N)`, `Readonly (N)`, `Invalid (N)`, `With Values (N)`
- **Form Analysis** (`snapshot --forms` or `snapshot --full`): Auto-detects forms and fields:
  - Maps refs to form fields with labels
  - Tracks: required (`*`), filled (`✓`), empty (`○`), invalid (`✗`)
  - Detects submit button with enabled/disabled state
  - Generates **quickFill**: `type e3 "Email" && type e5 "Password" && click e7`
  - Use quickFill to auto-complete required empty fields
- **Snapshot Fallback**: When `ariaSnapshot()` fails (Radix Dialog portals), auto-uses DOM fallback
  - `[FALLBACK]` marker indicates fallback mode active
- **READ-ONLY inspection** via `evaluate`:
  - **Focus field**: `evaluate '(()=>{ const inputs = Array.from(document.querySelectorAll("input")); for(let inp of inputs) { if(inp.parentElement?.textContent?.includes("Sets")) { inp.focus(); return "focused Sets field"; }} return "not found"; })()'`
  - **Find & click**: `evaluate '(()=>{ const all = document.querySelectorAll("*"); for(let el of all) { for(let attr of el.attributes || []) { if(attr.value?.includes("target-identifier")) { el.click(); return "clicked"; }}} return "not found"; })()'`
  - **Text search**: `evaluate 'Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Text"))?.click()'`
  - **Computed styles**: `evaluate 'JSON.stringify(window.getComputedStyle(document.querySelector(".modal")))'`
  - **Value inspection**: `evaluate 'document.querySelector("input[type=number]")?.value'`
  - **Element dimensions**: `evaluate 'JSON.stringify(document.querySelector(".modal").getBoundingClientRect())'`
- **Feature Lifecycle Hooks**: All features extend `BaseFeature` with optional lifecycle methods:
  - `setup()`: Called on feature init (e.g., attach console/network listeners)
  - `cleanup()`: Called on browser close (e.g., clear mocks, save state)
  - **Setup hooks**: `ConsoleCaptureFeature` (console listener), `NetworkCaptureFeature` (request/response listeners), `EventListenerFeature` (dialog/popup/error handlers)
  - **Cleanup hooks**: `NetworkMockingFeature` (clear mocks), `NetworkCaptureFeature` (cleanup interval), `VideoRecordingFeature` (stop recording), `OrchestrationFeature` (abort), `PluginsFeature` (unload all)
- **Dependency Injection**: Features requiring other features use setter injection:
  - `DragFeature.setSnapshotFeature(snapshotFeature)` → required for ref resolution
  - `SnapshotFeature.setStateTracking(stateTrackingFeature)` → enables `<changed>` markers
  - `SnapshotFeature.setPluginsFeature(pluginsFeature)` → plugin snapshot hooks
  - `CoreActionsFeature.setPluginsFeature(pluginsFeature)` → plugin action hooks
  - `MultiCommandFeature.setCommandExecutor(fn)` → provides command routing for `exec`
  - `FlakyDetectionFeature.setCommandExecutor(fn)` → command execution for flaky tests
  - `AssertionsFeature.setConsoleCaptureFeature()` → console assertion data source
  - `AssertionsFeature.setNetworkCaptureFeature()` → network assertion data source
  - `AssertionsFeature.setPerformanceMetricsFeature()` → performance assertion data source
  - `HARExportFeature.setNetworkCaptureFeature()` → HAR data source
  - `VideoRecordingFeature.setContext()` → browser context for recording
  - `PluginsFeature.setBrowserContext()` → plugin context access
  - BrowserManager wires dependencies after feature construction
- **Ref Lifecycle Management**: Automatic ref versioning and staleness detection
  - `RefVersionManager`: Tracks snapshot versions, validates ref freshness (warns if refs > 30s old)
  - `RefStabilityTracker`: Tracks ref stability across snapshots, computes stability scores
  - Refs include `snapshotId`, `generatedAt`, `cssValidated` metadata for debugging
- **Plugin Hooks**: Triggered during command lifecycle (for plugin authors)
  - `beforeCommand(cmd, args)` → Before command execution
  - `afterCommand(cmd, result)` → After successful execution
  - `onError(cmd, error)` → On command failure
  - `onNavigate(url)` → After page navigation
  - `onSnapshot(tree)` → After snapshot capture
- **Evaluate Security**: Blocked patterns prevent value injection
  - **Blocked**: `.value=`, `dispatchEvent`, `setAttribute("value")` → forces real user input
  - **Allowed**: Read-only inspection, `getBoundingClientRect`, `getComputedStyle`, `textContent`
**App-Specific Interactions**
**Login Flow - Zenith Athlete**
- To start server `navigate localhost:5173`
- `snapshot` & `screenshot` to determine authenticated state
- IF not authenticated click `start your journey`, then click `login instead` 
- Do not bypass auth by `navigate localhost:5173/dashboard` etc this is blocking and will not work
- Enter coaches credentials from `.env.local`
**Athlete/Coaches Training Calendar**
- `dblclick` workout card → opens **Edit Workout** modal
- **Quick Program modal** (⚠️ NOT dblclick!): `click` date → `wait 300` → `click` same date
- Drag workout card to date → moves workout (CDP-based, persists to backend)
- Use `[data-date="YYYY-MM-DD"]` selector for date cells
```bash
# Quick Program modal - TWO CLICKS with delay
click '[data-date="2025-12-11"]'   # 1. Select date (turns blue)
wait 300                            # 2. Wait for state
click '[data-date="2025-12-11"]'   # 3. Opens Quick Program modal
```
**Debugging**
| Issue | Cause | Solution |
|-------|-------|----------|
| Selector not found | Element not rendered | `snapshot` first, `wait 500-1000`, use revealed refs |
| Don't know page state | Skipped snapshot | ALWAYS snapshot after navigate/modal open |
| Text selector fails | Playwright-specific syntax | Use `evaluate` with JavaScript filter |
| Stale refs | Refs reset per snapshot | Take fresh snapshot, use new refs |
| Auth lost | Browser restarted | `restoreState authenticated` |
| API failure hidden | UI looks correct | `network --status=400`, check backend logs |
| Workout card won't open | Single-clicked workout card | Double-click workout card to open Edit modal |
| Quick Program won't open | Used dblclick on date | Use TWO separate clicks with `wait 300` between |
| Manager not running | TCP connection failed | Auto-starts (wait 2s) or manual: `npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts &` |
| Navigation timeout | Page load slow | Check URL, increase timeout, try `waitForSelector` |
| Element not interactable | Covered by overlay | `snapshot`, scroll to element, check z-index |
| JavaScript error | evaluate syntax error | Use arrow functions: `evaluate '() => document.title'` |
| Screenshot dimensions mismatch | Viewport changed between baseline and test | Use same `resize` before both captures |
| Snapshot shows `[FALLBACK]` | ariaSnapshot() failed (Radix portal) | Automatic fallback used, element refs still work |
| Form field ref is `?N` | Field not in accessibility tree | Use CSS selector directly or add aria-label |
| Element state not shown | Missing `--full` flag | Use `snapshot --full` for state enrichment |
| quickFill not generated | No required empty fields | Form already filled or no required fields detected |
| Drag fails on unnamed element | CSS selector not captured | Take fresh snapshot, verify element visible |
| Assertion fails | Wrong selector or state | Use `snapshot --full` to see element state |
| Assert ref fails with Tailwind | CSS selector contained `/` (FIXED) | CSS.escape() now handles Tailwind patterns (peer/, group/, [var(...)], @container/) |
| A11y audit empty | No violations found | Page is accessible or rules excluded |
| Plugin load fails | Invalid plugin structure | Check plugin exports BrowserCLIPlugin interface |
| Recording not saving | stopRecording not called | Always call stopRecording before close |
| HAR export empty | startHAR not called | Call startHAR before navigation |
**Convex Logs**
- **Backend**: `npx convex logs --history 30` → `[CONVEX M(mutations:functionName)]`
- **Frontend**: `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console` → console.log/error/warn
- **Limitation**: Browser console does NOT capture Convex backend logs
**Golden Testing Workflow**
```bash
# Navigate → Wait → SNAPSHOT (see structure) → Act → Wait → Verify → Evidence
navigate /calendar
wait 1000
snapshot                # Reveals: button "Add Workout" [ref=e1], textbox "Sets" [ref=e3]
click e1                # Act on what you saw
wait 500
snapshot                # Verify with <changed> markers
screenshot result.png   # Visual proof
```
**Feature Architecture** (25 feature classes + 2 modular directories):
- **Modular Features**: `coreActionsModules/` (8 files), `snapshotModules/` (9 files)
- **Core (always loaded)**: CoreActions, Snapshot, ConsoleCapture, StateTracking, SemanticSelectors, Assertions, Plugins, Drag, BrowserState, VisualRegression, SnapshotComparison, Tabs, DOMInspection, MultiCommand
- **Lazy (on-demand)**: NetworkCapture, NetworkMocking, PerformanceMetrics, ContentCapture, EventListener, DeviceEmulation, VideoRecording, HARExport, A11yAudit, FlakyDetection, Orchestration
- **Command Routing**: `click e5` → SnapshotFeature.clickByRef | `click "role:X"` → SemanticSelectors.clickBySemantic | `click .css` → CoreActions.click
- **snapshotModules/**: SnapshotFeature.ts (facade), capture.ts, forms.ts, formatters.ts, interactions.ts, ref-stability.ts, ref-version.ts, types.ts, index.ts
- **coreActionsModules/**: CoreActionsFeature.ts (facade), navigation.ts, interaction.ts, keyboard.ts, input.ts, utilities.ts, types.ts, index.ts

**Implementation Status**
| Category | Commands | Status |
|----------|----------|--------|
| Navigation & Timing | navigate, wait, waitForSelector, start | Implemented |
| Capture & Inspection | snapshot, screenshot, console, network, changes | Implemented |
| Interaction | click, dblclick, hover, drag, type, pressKey, selectOption, fillForm, uploadFile, evaluate | Implemented |
| State & Workflow | saveState, restoreState, listStates, deleteState, exec | Implemented |
| Visual Regression | saveScreenshotBaseline, compareScreenshots, listScreenshotBaselines | Implemented |
| Snapshot Comparison | saveSnapshotBaseline, compareSnapshots, listBaselines | Implemented |
| Network Mocking | setupNetworkMocking, mockRoute, clearMocks, listMocks, abortRoute, blockByPattern | Implemented |
| Schema Validation | listSchemas, validateMock, loadSchema | Implemented |
| Performance | capturePerformanceMetrics, getPerformanceMetrics, resize, close, setHeadless | Implemented |
| Assertions | assert, assertCount, assertConsole, assertNetwork, assertPerformance | Implemented |
| A11y Auditing | auditAccessibility, getAccessibilityResults | Implemented |
| Tab Management | tabs list, tabs new, tabs switch, tabs close | Implemented |
| Device Emulation | setMobilePreset, listMobilePresets, resetMobilePreset | Implemented |
| Video Recording | startRecording, stopRecording, getRecordingStatus, listRecordings | Implemented |
| HAR Export | startHAR, exportHAR, getHARData | Implemented |
| Content Extraction | getPageHTML, getPageText, getElementHTML, getElementText | Implemented |
| Event Handling | getEventLog, clearEventLog, waitForEvent, acceptDialog, dismissDialog | Implemented |
| DOM Inspection | countElements, getElementVisibility, getComputedStyle, getOverlayingElements | Implemented |
| Plugins | loadPlugin, unloadPlugin, listPlugins | Implemented |
| Orchestration | orchestrate, getOrchestrationStatus, abortOrchestration | Implemented |
| Flaky Detection | runTestMultipleTimes, analyzeFlakiness | Implemented |
| Buffer Management | get/setConsoleBufferStats, get/setNetworkBufferStats, get/setEventBufferStats | Implemented |
| Advanced Keyboard | pressKeyCombo, holdKey, tapKey | Implemented |