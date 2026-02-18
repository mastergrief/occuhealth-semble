# EXECUTE - Agentic Execution & Browser Testing

**Phase 2 of 2**: Execute the plan from `/PLAN` following VDD protocol (Develop → Test → iterate).
**Input**: `$ARGUMENTS` — path to `pending-plans/plan-{timestamp}.json` (or "latest")
**Agents**: `composer` (init) → `developer`/`browser` (work/test) → `orchestrator` (dispatch) — all `opus` model
**Prerequisite**: Run `/PLAN` first OR provide $ARGUMENTS pointing to existing plan file
**Protocol**: VDD — see CLAUDE.md `#VDD Protocol` for pattern overview

**IMPORTANT**:
- Parent is dispatcher only — delegate ALL work to agents via `Task` tool
- Never run subagents in background — foreground and wait for completion
- Never write code directly — only spawn agents
- Only small summaries returned to parent (minimal context pollution)

---

## **WORKFLOW OVERVIEW**
Composer → Developer(s) → Orchestrator → Browser → Orchestrator → loop

1. **Composer**: Creates session, loads plan, creates dispatch queue
2. **Developer**: Implements task(s) — parallel if same `parallel_group`, sequential otherwise
3. **Orchestrator**: Routes next agent after EVERY work agent (no exceptions)
4. **Browser**: Verifies (mandatory per phase, VDD Verification Protocol)
5. **On browser FAIL**: Discovery activates (`Explore` & `data` parallel → `developer` → re-test)
6. **Circuit breaker**: 2x same-task failure → adaptive replan or user escalation
7. **Repeat** until COMPLETE

**HMR Constraint**: Browser agents NEVER run parallel with developer agents. Vite HMR triggers page reloads when developers save files, causing flaky snapshots and stale uids. Sequence: all developer tasks in wave complete → group typecheck → then browser.

```
Composer → Developer(s) → Group Typecheck → Orchestrator → Browser → Orchestrator
                                                  │                        │
                                             Next task              PASS → next task
                                             Gate check             FAIL → discovery loop
                                             Replan (if needed)     2x fail → Replan (2.4.2)
```

## **STEP 0: Load & Verify**
### **0.1 Find the Plan**

```bash
# List available pending plans
npx tsx ORCHESTRATION/cli/orch.ts plan list-pending
# Load specific plan (or latest if no argument)
npx tsx ORCHESTRATION/cli/orch.ts plan load-pending {$ARGUMENTS or "latest"}
```

Read the plan file. If no plan exists, inform user to run `/PLAN` first and stop.

### **0.2 Present Execution Preview**

```markdown
## Execution Preview: {plan.title}

### VDD Compliance Check
For each phase, verify browser task exists:
- Phase missing browser task → Warning: "Phase {N} has no browser task — VDD requires browser verification per phase"
- All phases have browser task → "VDD compliant: all phases have browser verification"

### Plan Loaded
- Source: {plan file path}
- Type: {plan.type}
- Phases: {N} phases, {M} total tasks
- Gates: {gate conditions summary}

### Execution Order
| Phase | Tasks | Gate | Agent Types |
|-------|-------|------|-------------|
| 1. {name} | {N} | {gate} | developer |
| 2. {name} | {N} | {gate} | developer, browser |

Proceeding with execution...
```

No AskUserQuestion — plan was already approved via `/PLAN`.

---

## **STEP 1: Initialization (Composer Agent)**
Spawn `composer` agent to create session and decompose plan into dispatch queue:

```
Task(
  subagent_type="composer",
  model="opus",
  prompt="""
  Execute composer initialization.

  Pending Plan Path: {$ARGUMENTS or "latest"}

  ```bash
  # List available pending plans
  npx tsx ORCHESTRATION/cli/orch.ts plan list-pending
  # Load specific plan
  npx tsx ORCHESTRATION/cli/orch.ts plan load-pending {path}
  ```

  Instructions:
  1. Read pending plan from context hub
  2. Create new session via CLI
  3. Decompose into phases/subtasks with agent assignments
  4. Write to context hub: plan.json, dispatch-queue.json, state.json
  5. Return ONLY a brief summary (see format below)
  """
)
```

**Expected Response** (~50-100 tokens):
Session {sessionId} created.
{N} phases, {M} tasks.
First: {agent} for "{brief task description}"
Task ID: {taskId}
```

---

### **1.5 Pre-Task Validation (Before Every Work Agent)**
Before spawning developer or browser agent, orchestrator validates prerequisites:

| Check | Command | Required For | Recovery |
|-------|---------|--------------|----------|
| Convex sync | `timeout 5 npx convex status` | mutation tasks | Wait for sync |
| Dependencies | completedTasks includes task.dependencies | all tasks | Skip to next eligible |
| Prior evidence | Handoff/screenshot exists | dependent tasks | Re-run prior task |

**Validation Flow:**
```
Before work agent spawn:
  1. If mutation task → Check Convex sync
     - Pending? → Wait 10s, retry
  2. Check task.dependencies ⊆ completedTasks
     - Missing? → Skip to next eligible task
  3. If has prior evidence requirement → Verify artifact exists
     - Missing? → Re-queue prior task
```

**Note:** Dev server check not needed — Chrome DevTools MCP connects to running browser.

---

## **STEP 2: Execution Loop**
After `composer` returns, enter the work → `orchestrator` loop until COMPLETE.
`orchestrator` handles ALL transitions — PASS, FAIL, gate checks, replanning. No inline dispatch.

```
while True:
    Parse last response for: status, next_agent, taskId, task description
    if status == "COMPLETE": break

    # --- WORK PHASE ---
    if next is parallel_group (developer-only):
      Spawn all group developer tasks simultaneously (2.1a)
      Run group-level typecheck
    elif next is browser:
      # HMR CONSTRAINT: Only spawn browser AFTER all dev tasks in wave complete
      Spawn single browser agent (2.2)
    else:
      Spawn single work agent (2.1)

    # --- DISPATCH PHASE (always orchestrator) ---
    Spawn orchestrator (2.3)

    Print progress (2.5)
```

### **2.1 Developer Agent Protocol**
Every `developer` task follows this mandatory sequence:

```
Task(
  subagent_type="developer",
  model="opus",
  prompt="""
  Session: {sessionId}
  Task ID: {taskId}
  Task: {task description}
  Acceptance Criteria: {acceptance criteria from plan}

  ## Mandatory Sequence
  1. READ: Use Serena symbolic tools to read relevant code
  2. IMPLEMENT: Make changes using Serena editing tools
  3. TYPECHECK: Run `npx tsc --noEmit` — this is a BLOCKING gate
  4. FIX: If typecheck fails, fix errors and re-run (max 2 retries)
  4b. POSTTASK: If task has `postTask` array in plan, execute each command as blocking gate
  5. REPORT: Return files changed, typecheck status, outcome

  ## Discovery Protocol
  If you encounter work outside your task scope:
  - Do NOT implement it (scope creep)
  - Report it in `discovered_work` array
  - Continue with your assigned task only

  ## Output Format
  - **Status**: PASS | FAIL | CONTEXT_EXHAUSTED
  - **Files changed**: {list}
  - **Typecheck**: PASS (clean) | PASS (after {N} fix) | FAIL ({error summary})
  - **PostTask**: {if present: PASS | FAIL with details}
  - **Outcome**: {what was implemented in 5-10 words}
  - **Discovered work**: {array of out-of-scope items found, or empty}
  - **Issue**: {if FAIL — what blocked completion}
  """
)
```

**On typecheck failure after 2 retries**: Agent returns FAIL with error details for escalation.
### **2.1a Parallel Developer Execution**
When plan assigns tasks to the same `parallel_group`, spawn all simultaneously:

```
# Tasks 1.1 (group A) and 1.4+1.5 (group B) have no cross-dependencies
# Spawn in single message:
Task(developer, "task 1.1: schema changes")       # group A
Task(developer, "task 1.4: dashboard component")   # group B
Task(developer, "task 1.5: analytics hook")         # group B

# Wait for all to complete

# Group-level typecheck (catches cross-task type issues)
npx tsc --noEmit

# If any task FAIL → sequential retry of failed tasks only
# If group typecheck fails → Explore diagnoses, developer fixes
```

**Safety rules**:
- Same `parallel_group` = no shared files, no dependency chain
- Schema tasks are NEVER parallel with mutation/query tasks
- **Browser NEVER parallel with developer**: Vite HMR triggers page reloads when developer agents save files, causing flaky snapshots and stale uids. All developer tasks in a wave must complete + group typecheck pass before any browser task spawns.
- Group-level typecheck runs after all members complete
- If one member fails, others' results are still valid (no rollback)
- Failed members retry sequentially after group completes

### **2.1b Data Agent Protocol (Failure Recovery Only)**
`data` agent only spawns when browser test fails with data issues:

```
Task(
  subagent_type="data",
  model="opus",
  prompt="""
  Session: {sessionId}
  Task ID: {taskId}
  Browser failure context: {what failed and why}

  ## Mandatory Workflow
  SCHEMA → SAMPLE → MIGRATIONS → GAP ANALYSIS → REPORT

  1. SCHEMA: Read convex/schema.ts, understand expected state
  2. SAMPLE: `npx convex data <table> --limit 5` for relevant tables
  3. MIGRATIONS: Find pending migrations, check if run
  4. GAP ANALYSIS: Compare expected vs actual
  5. REPORT: Status (READY/NEEDS_WORK/BLOCKED) + developer task list

  ## Output Format
  - **Status**: READY | NEEDS_WORK | BLOCKED
  - **Tables analyzed**: {list}
  - **Migrations pending**: {list or "none"}
  - **Developer actions**: {numbered list of what dev needs to do}
  - **Test data available**: {yes/no per workflow}
  - **Blockers**: {list or "none"}
  """
)
```

### **2.2 Browser Agent Protocol (VDD Phase 3: TEST)**

Every `browser` task follows the VDD Verification Protocol:

```
Task(
  subagent_type="browser",
  model="opus",
  prompt="""
  Session: {sessionId}
  Task ID: {taskId}
  Task: {test scenario description}
  Expected behavior: {acceptance criteria}

  ## VDD Verification Protocol
  For EACH scenario, follow 4 phases:

  **PREPARE**
     - navigate_page to route
     - wait_for expected content (timeout 5000)
     - take_snapshot (record initial state)
     - Create fresh test data via UI (click, fill, drag) — never rely on existing state

  **ACT**
     - Execute the user action being tested using uids from snapshot
     - take_snapshot between multi-step interactions
     - Never reuse stale uids

  **VERIFY**
     - take_snapshot after action
     - Compare against expected UI state
     - take_screenshot filePath="{scratchpad}/execute-evidence/{taskId}.png"
     - Backend sub-step (default, not escalation-only): `timeout 5 npx convex logs --history 5` — confirm mutation logged

  **PERSIST** (mutation scenarios only)
     - navigate_page type="reload"
     - wait_for expected content
     - take_snapshot — compare against pre-reload state

  **ESCALATION** (only on VERIFY or PERSIST failure)
     - Console: list_console_messages types=["error"]
     - Backend: timeout 5 npx convex logs --history 10
     - Network: list_network_requests resourceTypes=["xhr","fetch"]
     - Diagnosis: CODE issue → Explore → developer → re-test
     - Diagnosis: DATA issue → data → developer → re-test
     - Diagnosis: FLAKY/timing → increase wait timeout, retry once

  ## Important
  - Always take_snapshot BEFORE interacting (fresh uids)
  - If element not found: take fresh snapshot, retry once, then BLOCKED
  - AI features need extended timeout (10000ms)

  ## Output Format
  - **Status**: PASS | FAIL | PARTIAL | BLOCKED
  - **UI Verification**: {snapshot comparison}
  - **Console**: {clean | error details}
  - **Backend**: {Convex log match or mismatch}
  - **Persistence**: {persisted | not checked | failed}
  - **Screenshot**: {file path}
  - **Issue**: {if not PASS — description}
  """
)
```

### **2.3 Orchestrator (Stateless Dispatcher)**
After EVERY work agent completes, spawn `orchestrator`:

```
Task(
  subagent_type="orchestrator",
  model="opus",
  prompt="""
  Session: {sessionId}
  Previous Task: {taskId}
  Previous Result: {agent response}

  Instructions:
  1. Read state.json and dispatch-queue.json from context hub
  2. Mark task complete or failed
  3. Check gate conditions:
     - typecheck: Was `npx tsc --noEmit` clean?
     - browser_pass: Did all browser scenarios pass?
  4. Determine next action based on result:
     - Browser PASS → next task from queue
     - Browser FAIL (code issue) → spawn explore for diagnosis
     - Browser FAIL (data issue) → spawn data for diagnosis
     - Discovery complete → spawn developer for fix
     - All tasks done → COMPLETE
  5. Update state.json
  6. Return brief instruction
  """
)
```

**Expected Responses**:
*Next Task*:
```
Progress: {n}/{total} tasks.
Phase {p}: {phase name}.
Next: {agent} for "{brief task description}"
Task ID: {taskId}
```

*Gate Passed*:
```
Phase {p} gate PASSED. Condition: {condition}.
Progress: {n}/{total} tasks.
Next: {agent} for "{brief task description}"
Task ID: {taskId}
```

*Browser Failed - Route to Discovery*:
```
Browser FAIL on task {taskId}.
Failure type: {code | data}
Next: {explore | data} for "{diagnose failure}"
Task ID: {taskId} (discovery)
```

*Discovery Complete - Route to Fix*:
```
Discovery complete.
Diagnosis: {summary of issue}
Next: developer for "{fix description}"
Task ID: {taskId} (fix)
```

*Gate Failed*:
```
Phase {p} gate FAILED. Condition: {condition}
Reason: {specific failure}
Fix: {agent} for "{fix description}"
Task ID: {taskId} (retry)
```

*Loop Continuation (Developer context exhausted)*:
```
Developer CONTEXT_EXHAUSTED on task {taskId}.
State written to context hub.
Next: Explore for "{diagnose typecheck failures}"
Task ID: {taskId} (loop)
```

*Loop Continuation (Browser verification failed)*:
```
Browser FAIL on task {taskId}.
Verification: {which step failed}
Next: Explore for "{diagnose verification failure}"
Task ID: {taskId} (loop)
```

*Complete*:
```
COMPLETE.
Session: {sessionId}
{n}/{n} tasks, {p}/{p} gates passed.
Key outcomes:
- {outcome 1}
- {outcome 2}
```

### **2.4 Failure Recovery (Discovery on Browser Fail)**
Discovery agents (`Explore` & `data`) ONLY activate when `browser` tests fail.
**Browser PASS**:
```
Browser PASS → Orchestrator → Next task from queue
```

**Browser FAIL - Code Issue**:
```
Browser FAIL (console error, React error, undefined)
    ↓
Orchestrator routes to Explore
    ↓
Explore diagnoses code issue
    ↓
Orchestrator routes to Developer
    ↓
Developer fixes
    ↓
Orchestrator routes to Browser (re-test)
```

**Browser FAIL - Data Issue**:
```
Browser FAIL (empty table, missing records, schema mismatch)
    ↓
Orchestrator routes to data
    ↓
data diagnoses data issue
    ↓
Orchestrator routes to Developer
    ↓
Developer fixes (migrations/seeds)
    ↓
Orchestrator routes to Browser (re-test)
```

**Failure Type Detection**:
| Pattern in Browser Response | Type | Route To |
|----------------------------|------|----------|
| "console errors", "React error", "TypeError" | Code | Explore |
| "No records", "empty", "0 results" | Data | data |
| "migration", "schema", "field missing" | Data | data |
| "undefined is not", "null reference" | Code | Explore |
| "Backend: mismatch" | Analyze context | data or Explore |
**Orchestrator Role (Stateless Dispatcher)**:
- Reads state from context hub after EVERY agent completes
- Analyzes failure type to route to correct agent
- Returns brief instruction to parent: "spawn {agent} for {reason}"
- Never makes decisions without reading current state
- Sits between EVERY agent transition
**Loop Termination**:
- Browser PASS → next task from queue
- All tasks complete → COMPLETE
- No manual intervention — system self-corrects

### **2.4.1 Task-Level Micro-Gates**
Apply automatic gates based on task category (from plan metadata or inferred):
| Task Category | Auto-Gate | Check Method | Pass Criteria |
|---------------|-----------|--------------|---------------|
| schema | `convex_sync` | `npx convex status` | Deployment synced |
| component | `typecheck + no_console` | Typecheck + browser console | Both clean |
| mutation | `typecheck + mutation_logged` | Typecheck + Convex logs | Mutation appears |
| query | `typecheck` | `npx tsc --noEmit` | Exit code 0 |
| ui-readonly | `no_console` | Browser console | No errors |
| ai-feature | `typecheck + response_valid` | Typecheck + AI response | Valid JSON returned |
**Category Detection:**
If task has `taskCategory` in plan metadata → Use specified category
Else infer from description:
- Contains "schema", "table", "field" → schema
- Contains "component", "page", "form" → component
- Contains "mutation", "create", "update", "delete" → mutation
- Contains "query", "get", "list", "fetch" → query
- Contains "view", "display", "show" → ui-readonly
- Contains "ai", "generate", "suggest" → ai-feature

### **2.4.2 Adaptive Replanning**
Mid-execution plan adjustment when reality diverges from plan. Three trigger conditions:
**Trigger 1 — Developer Discovered Work**
```
Developer returns discovered_work: ["Need validator for field X", "Facade re-export missing"]
  → If trivial (1 file, clear fix): inject task into queue after current task
  → If structural (multi-file, unclear scope): spawn Plan agent for micro-replan
```
**Trigger 2 — Repeated Browser Failure (Circuit Breaker)**
```
Same task fails browser 2x with different fixes attempted
  → Spawn Plan agent (opus) to revise remaining tasks
  → Can: split task, reorder, add prerequisites
  → Max 3 discovery loops per task before marking BLOCKED and moving to next
```
**Trigger 3 — Scope Explosion**
```
Developer returns files_changed count > plan estimate * 1.5
  → Flag: "Task {id} touched {N} files (planned {M}). Remaining tasks may need adjustment."
  → Optional: spawn Plan agent to validate remaining tasks
```
**Micro-Replan Agent** (only adjusts remaining tasks, never completed ones):
```
Task(
  subagent_type="Plan",
  model="opus",
  prompt="""
  Micro-replan: adjust remaining tasks based on execution reality.
  Completed: {completed tasks + outcomes}
  Issue: {trigger context}
  Remaining: {unstarted tasks}

  Instructions:
  1. Assess if remaining tasks are still valid
  2. Output adjusted task list (add/remove/reorder/split)
  3. Write updated queue to context hub
  4. Return brief diff: what changed and why
  """
)
```

### **2.5 Progress Reporting**
After each orchestrator return, parent prints progress:

```
[3/12] ✅ Phase 1 — "Add validation to schema" complete
[4/12] 🔄 Phase 2 — "Update mutation handlers" in progress
```

Status icons: ✅ complete | 🔄 in progress | ❌ failed | ⏭️ skipped | 🚧 blocked

---

## **STEP 3: Completion Report**
When orchestrator returns "COMPLETE":

```bash
# Archive pending plan
npx tsx ORCHESTRATION/cli/orch.ts plan archive-pending
# View final session state
npx tsx ORCHESTRATION/cli/orch.ts session status
```

### **3.1 Planned vs Achieved Matrix**
| Task ID | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 1.1 | Add schema fields | ✅ PASS | typecheck clean |
| 1.2 | Update mutations | ✅ PASS | typecheck clean |
| 2.1 | Build form component | ✅ PASS | typecheck clean |
| 3.1 | Verify form submission | ✅ PASS | screenshot: `3.1.png` |
| 3.2 | Verify empty state | ⚠️ PARTIAL | No empty state component |

### **3.2 Files Modified**
| File | Lines Changed | Task |
|------|--------------|------|
| convex/schema.ts | +12 | 1.1 |
| src/components/Form.tsx | +85 | 2.1 |

### **3.3 Gate Results**
| Phase | Gate | Result |
|-------|------|--------|
| 1. Schema | typecheck | ✅ PASS |
| 2. Frontend | typecheck + console_clean | ✅ PASS |
| 3. Browser tests | browser_pass | ⚠️ 4/5 passed |

### **3.4 Browser Test Results (if applicable)**
| Scenario | Status | UI | Console | Backend | Persistence |
|----------|--------|-----|---------|---------|-------------|
| Form submit | PASS | OK | Clean | Mutation logged | Persisted |
| Empty state | PARTIAL | Blank | Clean | Query OK | N/A |

### **3.5 Evidence Chain Summary**
| Source Task | Target Task | Link Type | Evidence |
|-------------|-------------|-----------|----------|
| 1.1 analysis | 1.2 schema | analysis_to_code | memory: ANALYSIS_* |
| 1.2 schema | 2.1 component | code_change | typecheck pass |
| 2.1 component | 3.1 form test | code_to_test | handoff: developer-handoff.json |
| 3.1 form test | - | verification | screenshot: 3.1.png |

**Traceability:** Every code change links to verification evidence.
**Coverage:** {N}/{M} code changes have browser verification.

### **3.6 Improvement Recommendations**
| Priority | Issue | Impact | Recommendation |
|----------|-------|--------|----------------|
| HIGH | ... | ... | ... |
| MEDIUM | ... | ... | ... |
| LOW | ... | ... | ... |

### **3.7 Save Report**
```
mcp__serena__write_memory(
  memory_file_name="EXECUTE_REPORT_{plan.title}_{date}",
  content="full report markdown"
)
```

### **3.8 Execution Telemetry & Calibration Feedback**
Capture execution signal for future SCAN/PLAN accuracy. Write/update calibration memory:

```
mcp__serena__write_memory(
  memory_file_name="EXECUTION_CALIBRATION_INDEX",
  content="""
  # Execution Calibration Data
  Updated: {date} | Executions analyzed: {count}

  ## File Cascade Patterns
  - Schema changes: avg {N} cascading files (validators, facade, types)
  - Mutation changes: avg {N} cascading files (facade re-exports)
  - {module}: always requires {related files}

  ## Browser Testing Patterns
  - Drag-drop: needs {N}s wait after drag before snapshot
  - AI features: {N}s timeout (adjust if insufficient)
  - Form submission: reliable at {N}s timeout

  ## Task Sizing Accuracy
  - "1 concern, 3-5 files" rule: accurate {N}% of the time
  - {category} tasks: underestimated {N}% (common cascade: {files})

  ## Common Missed Dependencies
  - {pattern 1}: missed in {N}/{M} plans
  - {pattern 2}: missed in {N}/{M} plans

  ## Failure Patterns
  - {failure type}: {root cause} → {fix pattern} ({frequency})
  """
)
```

**Telemetry data points** (collected during execution):
| Metric | Source | Purpose |
|--------|--------|---------|
| `tasks_planned` vs `tasks_executed` | Plan + completion | Sizing accuracy |
| `files_predicted` vs `files_changed` | Plan + developer output | Cascade detection |
| `retries_per_task` | Orchestrator state | Difficulty calibration |
| `failure_type` + `root_cause` | Browser + explore output | Pattern recognition |
| `replan_triggers` | Adaptive replan events | Plan quality signal |

**Accumulation**: If `EXECUTION_CALIBRATION_INDEX` exists, merge new data with existing (don't overwrite).
Future SCAN/PLAN agents read this memory to apply learnings automatically.

---

## **EXECUTION FLOW**

```
┌──────────────────────────────────────────────────────────┐
│  STEP 0: LOAD & VERIFY                                     │
│  ├── Load plan from context hub                            │
│  └── Present execution preview                             │
│      ▼                                                     │
│                                                            │
│  STEP 1: INITIALIZATION (Composer)                         │
│  └── Create session, load plan, write queue                │
│      ▼ Returns first task (or parallel group)              │
│                                                            │
│  STEP 2: EXECUTION LOOP                                    │
│  ┌─── Developer(s) (single or parallel group)              │
│  │    └── Implement → typecheck (BLOCKING)                 │
│  │    └── Report discovered_work (if any)                  │
│  │    ▼                                                    │
│  ├─── Group Typecheck (npx tsc --noEmit)                   │
│  │    ▼                                                    │
│  ├─── Orchestrator                                         │
│  │    └── Read hub → route next (dev or browser)           │
│  │    └── discovered_work → ADAPTIVE REPLAN (2.4.2)        │
│  │    ▼                                                    │
│  ├─── Browser (ONLY after all devs complete — HMR safe)    │
│  │    ▼                                                    │
│  ├─── Orchestrator                                         │
│  │    ├── PASS → next task from queue                      │
│  │    └── FAIL → discovery loop                            │
│  │    └── 2x FAIL same task → circuit breaker → replan     │
│  │    ▼                                                    │
│  ├─── [On Fail] Discovery → Developer fix → Browser retest │
│  │    ▼                                                    │
│  └─── Progress: [n/total] status                           │
│       ▼ Loop until COMPLETE                                │
│                                                            │
│  STEP 3: COMPLETION REPORT                                 │
│  ├── Planned vs achieved matrix                            │
│  ├── Files modified + gate results                         │
│  ├── Browser test results + evidence chain                 │
│  ├── Improvement recommendations                           │
│  ├── Save report to Serena memory                          │
│  └── Write/update EXECUTION_CALIBRATION_INDEX              │
└──────────────────────────────────────────────────────────┘
```

---

## **IMPORTANT RULES**
1. **Load plan first** — Never execute without `/PLAN` output
2. **Do NOT run agents in background** — Foreground, wait for completion
3. **Typecheck is BLOCKING** — Developer agents must pass `npx tsc --noEmit` before reporting success
4. **VDD Verification Protocol** — PREPARE → ACT → VERIFY → PERSIST per scenario, escalation on failure only
5. **Progress after every orchestrator** — Parent prints `[n/total]` status line
6. **Evidence collection** — Screenshots to scratchpad, typecheck output recorded
7. **Composer initializes only** — Never re-run composer mid-execution
8. **Orchestrator after EVERY work agent** — No skipping the dispatch cycle
9. **Completion report is mandatory** — Planned vs achieved, not just "done"
10. **Convex backend verification via Bash** — `timeout 10 npx convex logs`, not browser console
11. **Fresh snapshots before every interaction** — Never reuse stale uids
12. **Pre-task validation mandatory** — Check server/sync/deps before spawning work agent
13. **Task category gates** — Apply micro-gates based on task type
14. **Evidence chain required** — Link code changes to verification artifacts
15. **PREPARE phase creates fresh data** — Always create test data via UI in PREPARE, never use stale data
16. **Gate failure requires diagnosis** — Code issues → Explore; Data issues → data agent
17. **Discovery on browser failure only** — explore/data agents only spawn when browser tests fail
18. **SCAN provides upfront context** — No mandatory discovery phase; SCAN already did discovery
19. **Failure routing** — Code issues → Explore, Data issues → data agent
20. **Self-correcting loops with circuit breaker** — Max 3 discovery loops per task, then mark BLOCKED and continue
21. **Context exhaustion** — Write state to hub, diagnostic agent investigates, fresh agent continues
22. **Orchestrator is stateless** — Always reads context hub before deciding next agent; never assumes state
23. **Parallel groups** — Tasks with same `parallel_group` spawn simultaneously in single message (developer-only)
24. **Adaptive replanning** — Discovered work, repeated failures, or scope explosion trigger micro-replan
25. **Browser NEVER parallel with developer** — Vite HMR reloads page during dev saves → flaky snapshots. Complete all dev tasks + group typecheck before browser.
26. **Calibration feedback** — Every execution writes telemetry to `EXECUTION_CALIBRATION_INDEX` memory
27. **Developer discovery protocol** — Developers report out-of-scope work, never implement it themselves
- `composer` agent ALWAYS loads plan & initialises orchestration
- `orchestrator` agent ALWAYS gets instructions from context hub
- `data` agent ALWAYS uses model `opus` (diagnostic only)
- `developer` work agent ALWAYS uses model `opus`
- `browser` test agent ALWAYS uses model `opus`
- `Explore` agent ALWAYS uses model `opus`, thoroughness level `very thorough`