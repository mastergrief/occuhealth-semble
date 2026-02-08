# Chrome DevTools MCP - Direct Browser Automation

Direct browser automation using Chrome DevTools Protocol via MCP tools.

## Core Workflow

**Snapshot → Identify → Interact → Verify**

```
1. take_snapshot          # Get uid refs for all elements
2. Identify target uid    # From snapshot output
3. click/fill/drag etc    # Interact using uid
4. take_snapshot          # Verify state changed
```

---

## Tool Reference

### Navigation & Page Management

#### `navigate_page`
Navigate by URL, history, or reload.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum | | `url`, `back`, `forward`, `reload` |
| `url` | string | (if type=url) | Target URL |
| `timeout` | integer | | Max wait ms (0 = default) |
| `ignoreCache` | boolean | | Ignore cache on reload |

```
navigate_page url="https://example.com"
navigate_page type="back"
navigate_page type="reload" ignoreCache=true
```

#### `new_page`
Create new browser tab with URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✓ | URL to load |
| `timeout` | integer | | Max wait ms |

#### `list_pages`
Get all open pages/tabs. *No parameters.*

#### `select_page`
Set active page for subsequent commands.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | number | ✓ | ID from list_pages |
| `bringToFront` | boolean | | Focus and raise window |

#### `close_page`
Close a page (cannot close last page).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | number | ✓ | ID from list_pages |

#### `resize_page`
Set page viewport dimensions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `width` | number | ✓ | Width in pixels |
| `height` | number | ✓ | Height in pixels |

---

### Capture & Observation

#### `take_snapshot`
Text snapshot from accessibility tree with uid refs. **Primary observation tool** - prefer over screenshots.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | Save to file path |
| `verbose` | boolean | Full a11y tree info (default: false) |

**Output format:**
```
uid=1_5 button "Submit"
uid=1_8 textbox "Email" value="user@example.com"
uid=1_12 link "Dashboard" roledescription="draggable"
```

#### `take_screenshot`
Visual capture of page or element.

| Parameter | Type | Description |
|-----------|------|-------------|
| `uid` | string | Element uid (omit for viewport) |
| `fullPage` | boolean | Full page vs viewport (incompatible with uid) |
| `filePath` | string | Save path |
| `format` | enum | `png` (default), `jpeg`, `webp` |
| `quality` | number | 0-100 for JPEG/WebP |

---

### Interaction

#### `click`
Click or double-click element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uid` | string | ✓ | Element uid from snapshot |
| `dblClick` | boolean | | Double-click (default: false) |

#### `hover`
Mouse hover over element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uid` | string | ✓ | Element uid |

#### `fill`
Type into input/textarea or select dropdown option.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uid` | string | ✓ | Element uid |
| `value` | string | ✓ | Text to type or option to select |

#### `fill_form`
Fill multiple form fields at once.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `elements` | array | ✓ | `[{uid: "1_5", value: "text"}, ...]` |

```
fill_form elements=[{"uid":"1_5","value":"user@example.com"},{"uid":"1_8","value":"password123"}]
```

### Spinbutton/Number Input Workaround

The `fill` tool appends text to existing input values. For number inputs (spinbuttons), this causes concatenation issues (e.g., existing "10" + fill "20" = "1020").

**Workaround 1 - Clear Before Fill (Recommended):**
```
click uid="X"                    # Focus the input
press_key key="Control+A"        # Select all text
fill uid="X" value="20"          # Fill replaces selected text
```

**Workaround 2 - JavaScript Select:**
```
evaluate_script function="(el) => el.select()" args=[{"uid":"X"}]
fill uid="X" value="20"
```

**Workaround 3 - Direct Value Set:**
```
evaluate_script function="(el) => { el.value = '20'; el.dispatchEvent(new Event('input', {bubbles:true})); }" args=[{"uid":"X"}]
```

**Note:** Most Zenith number inputs auto-select on focus, mitigating this issue. Use workarounds for inputs that don't auto-select.

#### `drag`
Drag element to another element. Simulates real mouse events (`mousedown → mousemove → mouseup`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_uid` | string | ✓ | Source element uid |
| `to_uid` | string | ✓ | Target element uid |

#### `press_key`
Keyboard input for shortcuts, navigation, special keys.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | ✓ | Key or combination |

**Modifiers:** Control, Shift, Alt, Meta

```
press_key key="Enter"
press_key key="Control+A"
press_key key="Control+Shift+R"
press_key key="Escape"
```

#### `upload_file`
Upload file through file input.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uid` | string | ✓ | File input or trigger element |
| `filePath` | string | ✓ | Local file path |

#### `handle_dialog`
Respond to browser dialogs (alert, confirm, prompt).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | enum | ✓ | `accept` or `dismiss` |
| `promptText` | string | | Text for prompt dialogs |

---

### Waiting

#### `wait_for`
Wait for text to appear on page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ✓ | Text to wait for |
| `timeout` | integer | | Max wait ms (0 = default) |

```
wait_for text="Loading complete" timeout=10000
```

---

### Console & Network

#### `list_console_messages`
Get browser console output.

| Parameter | Type | Description |
|-----------|------|-------------|
| `types` | array | Filter: `log`, `debug`, `info`, `error`, `warn`, `dir`, `dirxml`, `table`, `trace`, `clear`, `startGroup`, `startGroupCollapsed`, `endGroup`, `assert`, `profile`, `profileEnd`, `count`, `timeEnd`, `verbose`, `issue` |
| `pageIdx` | integer | Pagination page (0-based) |
| `pageSize` | integer | Results per page |
| `includePreservedMessages` | boolean | Include from last 3 navigations |

```
list_console_messages types=["error","warn"] pageSize=20
```

#### `get_console_message`
Get specific message details.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `msgid` | number | ✓ | Message ID from list |

#### `list_network_requests`
Get HTTP requests since navigation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `resourceTypes` | array | Filter: `document`, `stylesheet`, `image`, `media`, `font`, `script`, `texttrack`, `xhr`, `fetch`, `prefetch`, `eventsource`, `websocket`, `manifest`, `signedexchange`, `ping`, `cspviolationreport`, `preflight`, `fedcm`, `other` |
| `pageIdx` | integer | Pagination page |
| `pageSize` | integer | Results per page |
| `includePreservedRequests` | boolean | Include from last 3 navigations |

```
list_network_requests resourceTypes=["xhr","fetch"] pageSize=50
```

#### `get_network_request`
Get request/response details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `reqid` | number | Request ID (omit for DevTools selection) |

---

### Performance

#### `performance_start_trace`
Start recording performance trace. Reports Core Web Vitals (LCP, CLS, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reload` | boolean | ✓ | Auto-reload page when starting |
| `autoStop` | boolean | ✓ | Auto-stop recording |
| `filePath` | string | | Save trace file (`.json` or `.json.gz`) |

#### `performance_stop_trace`
Stop active trace recording.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | Save trace file |

#### `performance_analyze_insight`
Deep-dive into specific performance insight.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `insightSetId` | string | ✓ | ID from trace results |
| `insightName` | string | ✓ | e.g., `DocumentLatency`, `LCPBreakdown` |

---

### Emulation

#### `emulate`
Simulate device conditions.

| Parameter | Type | Description |
|-----------|------|-------------|
| `cpuThrottlingRate` | number | 1-20 (1 = no throttling) |
| `geolocation` | object/null | `{latitude: -90..90, longitude: -180..180}` or null |
| `networkConditions` | enum | `No emulation`, `Offline`, `Slow 3G`, `Fast 3G`, `Slow 4G`, `Fast 4G` |

```
emulate cpuThrottlingRate=4 networkConditions="Slow 3G"
emulate geolocation={"latitude":40.7128,"longitude":-74.0060}
emulate geolocation=null  # Clear override
```

---

### JavaScript Execution

#### `evaluate_script`
Run JavaScript in page context. Return value must be JSON-serializable.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `function` | string | ✓ | JS function declaration |
| `args` | array | | Element refs: `[{uid: "1_5"}]` |

```
# No arguments
evaluate_script function="() => document.title"
evaluate_script function="() => window.innerWidth"

# With element argument
evaluate_script function="(el) => el.innerText" args=[{"uid":"1_5"}]

# Async function
evaluate_script function="async () => { const r = await fetch('/api/status'); return r.json(); }"
```

---

## Patterns & Techniques

### Identifying Elements in Snapshots

**Common attributes:**
```
uid=X button "Button Text"                    # Button with label
uid=X textbox "Label" value="current"         # Input with value
uid=X link "Link Text"                        # Anchor
uid=X checkbox checked=true                   # Checkbox state
uid=X combobox expanded=false                 # Dropdown
uid=X roledescription="draggable"             # Drag-enabled element
```

### Async Content Loading

**Wait for text:**
```
click uid="1_5"
wait_for text="Content loaded" timeout=10000
take_snapshot
```

**Poll with JS:**
```
evaluate_script function="() => document.querySelector('.loading') === null"
```

### Tab/SPA Navigation

Some SPAs reset tab state on reload:
```
1. navigate_page type="reload"
2. Click tab/nav element again
3. wait_for expected content
4. take_snapshot
```

### Multi-Tab Workflows

```
list_pages                                    # Get page IDs
new_page url="https://example.com/other"      # Open new tab
list_pages                                    # Note new pageId
select_page pageId=2                          # Switch to new tab
take_snapshot
select_page pageId=1                          # Back to original
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| uid not found | Stale snapshot | Take fresh `take_snapshot` |
| Click no effect | Element not interactable | Check if hidden, disabled, or covered |
| Drag fails | Ambiguous uid or wrong target | Verify both uids in snapshot |
| fill not working | Wrong element type | Use on input/textarea/select only |
| wait_for timeout | Text not appearing | Check spelling, increase timeout |
| evaluate_script error | Non-serializable return | Ensure return value is JSON-safe |

---

## Convex Integration

### Verifying Backend Mutations

Browser console does NOT capture Convex mutation logs. Use Convex CLI:

```bash
# Check recent backend activity
timeout 5 npx convex logs --history 10

# Broader context for debugging
timeout 5 npx convex logs --history 30
```

### Console Signature Patterns

Convex logs follow this format:
```
[CONVEX M(module:functionName)] args -> result    # Mutation
[CONVEX Q(module:queryName)] args -> result       # Query
[CONVEX A(module:actionName)] args -> result      # Action
```

**Common modules to watch:**
| Module | Operations |
|--------|------------|
| `calendarWorkouts` | Workout CRUD, drag/drop moves |
| `workoutLogs` | Set logging, exercise swap |
| `assessments` | Pre/post workout assessments |
| `coachAthleteRelationships` | Invite, remove athlete |
| `exercises` | Exercise library CRUD |
| `ai` / `blockSuggestions` | AI-generated content |

### Drag-Drop Verification Pattern

After drag operation, verify both UI and backend:

```
1. drag from_uid="X" to_uid="Y"
2. take_snapshot                              # UI updated?
3. list_console_messages types=["error"]      # Frontend errors?
4. timeout 10 npx convex logs --history 5                # Backend mutation fired?
```

**Expected Convex log for calendar drag:**
```
[CONVEX M(calendarWorkouts:updateCalendarWorkout)] updatedFields: ['date']
```

### Frontend Debug Logs (dnd-kit)

Check browser console for drag lifecycle:
```
list_console_messages types=["log"] pageSize=20
```

**Expected patterns:**
```
[DnD Debug] dragStart: {draggableId: "..."}
[DnD Debug] dragEnd: {source: {...}, destination: {...}}
🎯 DRAG END FIRED {...}
```

### Two-Layer Verification

| Layer | Tool | What to Check |
|-------|------|---------------|
| Frontend | `list_console_messages` | React errors, DnD lifecycle logs |
| Backend | `timeout 5 npx convex logs` | Mutation success/failure, args |

### Convex + MCP Workflow Example

```
# 1. Setup
navigate_page url="http://localhost:5173/training-calendar"
wait_for text="My Training" timeout=5000
take_snapshot

# 2. Interact (drag workout to new date)
drag from_uid="17_97" to_uid="17_114"

# 3. Verify frontend
take_snapshot                                 # UI changed?
list_console_messages types=["error"]         # No React errors?

# 4. Verify backend (in terminal)
timeout 5 npx convex logs --history 15
# Look for: [CONVEX M(calendarWorkouts:updateCalendarWorkout)]

# 5. Persistence check
navigate_page type="reload"
wait_for text="My Training" timeout=5000
take_snapshot                                 # Workout still in new position?
```

### AI Feature Timeouts

Convex actions calling external AI APIs need longer waits:

| Feature | Expected Wait | Verification |
|---------|---------------|--------------|
| AI Block Suggestions | 5-8s | `wait_for text="Apply Suggestion"` |
| AI Training Insights | 5s | `wait_for text="Recommendations"` |
| Generate Next Block | 5s | `wait_for text="Create Block"` |

```
click uid="1_5"                               # Trigger AI generation
wait_for text="Apply Suggestion" timeout=10000
take_snapshot
```
