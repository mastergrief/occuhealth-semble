# AUDIT-EXECUTE - Browser Test Execution & Synthesis

**Phase 2 of 2**: Execute the audit plan from `/audit-plan` via composer -> orchestrator -> browser agent loop.
**Input**: `$ARGUMENTS` — path to `pending-plans/audit-{timestamp}.json` (or "latest")
**Agents**: `composer` (init) -> `browser` (test) -> `orchestrator` (dispatch) — all `opus` model
**Prerequisite**: Run `/audit-plan` first OR provide $ARGUMENTS pointing to existing audit plan

**IMPORTANT**:
- Parent is dispatcher only — delegate ALL work to agents via `Task` tool
- Never run subagents in background — foreground and wait for completion
- Browser agents execute scenarios sequentially (shared browser state)

---

## WORKFLOW OVERVIEW

Composer -> Browser -> Orch -> Browser -> Orch -> Browser -> Orch -> ... -> Orch (complete)

1. **Composer**: Creates session, transforms protocols to dispatch queue, returns first scenario
2. **Browser Agent**: Executes scenario with 7-step protocol, returns result
3. **Orchestrator**: Updates state, checks protocol gates, returns next scenario (or COMPLETE)
4. **Repeat** until all protocols complete

---

## STEP 0: Load & Verify

### 0.1 Find the Audit Plan

```bash
# List available pending plans
npx tsx ORCHESTRATION/cli/orch.ts plan list-pending

# Load specific plan (or latest audit plan)
npx tsx ORCHESTRATION/cli/orch.ts plan load-pending {$ARGUMENTS or "latest"}
```

Read the plan file. Verify `type: "e2e-audit"`. If not an audit plan, inform user and stop.

### 0.2 Verify Dev Server Running

```bash
lsof -ti:5173 && echo "Frontend running" || echo "BLOCKED: Start dev server first"
```

If server not running, inform user and stop.

### 0.3 Read Credentials from .env.local

Read `.env.local` to resolve credential env vars from the plan into actual values.
**Never display raw credentials to the user** — only use them in browser agent prompts.

### 0.4 Present Execution Preview

```markdown
## Audit Execution: {plan.metadata.target}

### Plan Loaded
- Source: {plan file path}
- Type: e2e-audit
- Protocols: {N} protocols, {M} total scenarios
- Roles: {roles}

### Execution Order
| Protocol | Scenarios | Gate |
|----------|-----------|------|
| HAPPY_PATH | {N} | all_pass |
| VALIDATION | {N} | console_clean |
| EMPTY_STATE | {N} | console_clean |
| ERROR_RECOVERY | {N} | console_clean |
| PERMISSION | {N} | all_pass |

Proceeding with execution...
```

---

## STEP 1: Initialization (Composer Agent)

Spawn `composer` agent to create audit session:

```
Task(
  subagent_type="composer",
  model="opus",
  prompt="""
  Execute composer initialization for E2E audit.

  Audit Plan Path: {$ARGUMENTS or "latest"}

  Instructions:
  1. Read audit plan from context hub (verify type: "e2e-audit")
  2. Create new session via CLI
  3. Transform protocols to dispatch queue:
     - Flatten scenarios: HAPPY_PATH -> VALIDATION -> EMPTY_STATE -> ERROR_RECOVERY -> PERMISSION
     - Each scenario becomes a browser task
  4. Create protocol-aware state.json
  5. Return brief summary with first scenario
  """
)
```

**Expected Response**:
```
Session {sessionId} created.
5 protocols, {M} scenarios.
First: browser for "{scenario name}"
Scenario ID: HP-01
```

---

## STEP 2: Execution Loop

After composer returns, enter the browser -> orchestrate loop until COMPLETE.

### 2.1 Browser Agent Protocol

Every scenario follows the 7-step verification protocol:

```
Task(
  subagent_type="browser",
  model="opus",
  prompt="""
  Session: {sessionId}
  Scenario ID: {scenarioId}
  Protocol: {protocol}

  ## Scenario
  Name: {scenario.name}
  Role: {scenario.role}
  Route: {scenario.route}
  Steps: {scenario.steps}

  ## Credentials
  Email: {resolved_email}
  Password: {resolved_password}

  ## VDD Verification Protocol
  **Philosophy**
  - **Snapshot-first**: Never guess selectors — `take_snapshot` before every interaction.
  - **Real input only**: No programmatic injection. Use `click`, `fill`, `press_key`, etc
  - **Fresh data always**: Create test data manually via UI — never rely on existing state.
  - **Evidence chains**: Every assertion backed by snapshot or screenshot.
  - **Lazy debugging**: Console/network checks only on failure, not preemptively.
  **Sequence**
  | Phase | Steps | Tools | Gate |
  |-------|-------|-------|------|
  | **PREPARE** | Navigate → wait for content → snapshot → create fresh test data via UI | `navigate_page`, `wait_for`, `take_snapshot`, `click`, `fill` | App loaded, data exists |
  | **ACT** | Perform the user action being tested | `click`, `fill`, `drag`, `press_key` | Action executed |
  | **VERIFY** | Snapshot + screenshot → confirm UI reflects expected state | `take_snapshot`, `take_screenshot` | UI correct |
  | **PERSIST** | Reload → wait → snapshot → confirm state survived | `navigate_page type="reload"`, `wait_for`, `take_snapshot` | Data matches pre-reload |
  **Escalation (only on VERIFY or PERSIST failure)**
  VERIFY/PERSIST fails
      ├─ Step 1: Console errors?
      │   └─ list_console_messages types=["error"]
      ├─ Step 2: Backend mutation fired?
      │   └─ timeout 5 npx convex logs --history 10
      ├─ Step 3: Network failures?
      │   └─ list_network_requests resourceTypes=["xhr","fetch"]
      │
      ├─ Diagnosis: CODE issue → Explore agent → developer agent → re-test
      ├─ Diagnosis: DATA issue → data agent → developer agent → re-test
      └─ Diagnosis: FLAKY/timing → increase wait timeout, retry once

  ## Output Format
  - **Status**: PASS | FAIL | PARTIAL | BLOCKED
  - **UI Verification**: {actual vs expected}
  - **Console**: {clean | error details}
  - **Backend**: {Convex log match or mismatch}
  - **Persistence**: {persisted | not checked | failed}
  - **Screenshot**: {file path}
  - **Issue**: {if not PASS — description}
  """
)
```

### 2.2 Orchestrator

After EVERY browser agent completes, spawn orchestrator:

```
Task(
  subagent_type="orchestrator",
  model="opus",
  prompt="""
  Session: {sessionId}
  Previous Scenario: {scenarioId}
  Previous Result: {browser agent's response}

  Instructions:
  1. Read state.json and dispatch-queue.json
  2. Mark scenario complete/failed in protocol tracking
  3. If last scenario in protocol -> check protocol gate:
     - all_pass: protocol.failed === 0
     - console_clean: no console errors recorded
  4. Update state.json
  5. Return next scenario or protocol transition or COMPLETE
  """
)
```

**Expected Responses**:

*Next Scenario*:
```
Progress: {n}/{total} scenarios.
Protocol: {protocol}.
Next: browser for "{scenario name}"
Scenario ID: {scenarioId}
```

*Protocol Gate Passed*:
```
Protocol {protocol} gate PASSED.
Condition: {condition} ({pass details}).
Progress: {n}/{total} scenarios.
Next protocol: {next_protocol}
Scenario ID: {first_scenario_of_next_protocol}
```

*Protocol Gate Failed*:
```
Protocol {protocol} gate FAILED.
Condition: {condition}
Reason: {failed scenarios}
Action: Continue to next protocol | Stop
```

*Complete*:
```
COMPLETE.
Session: {sessionId}
{n}/{n} scenarios, {p}/{p} protocol gates.
Summary:
- HAPPY_PATH: {passed}/{total}
- VALIDATION: {passed}/{total}
- EMPTY_STATE: {passed}/{total}
- ERROR_RECOVERY: {passed}/{total}
- PERMISSION: {passed}/{total}
```

### 2.3 Progress Reporting

After each orchestrator return, parent prints progress:

```
[5/24] HAPPY_PATH/HP-05 complete
[6/24] HAPPY_PATH/HP-06 in progress
```

---

## STEP 3: Synthesis & Report

When orchestrator returns "COMPLETE", synthesize results.

### 3.1 Test Execution Matrix

| Scenario | Protocol | Status | UI | Console | Backend | Persistence | Evidence |
|----------|----------|--------|-----|---------|---------|-------------|----------|
| HP-01 | HAPPY_PATH | PASS | OK | Clean | Logged | Persisted | `HP-01.png` |
| VAL-01 | VALIDATION | PASS | Error shown | Clean | No mutation | N/A | `VAL-01.png` |

### 3.2 Protocol Results

| Protocol | Total | Passed | Failed | Pass Rate | Gate |
|----------|-------|--------|--------|-----------|------|
| HAPPY_PATH | 10 | 10 | 0 | 100% | PASS |
| VALIDATION | 5 | 5 | 0 | 100% | PASS |
| EMPTY_STATE | 3 | 2 | 1 | 67% | WARN |
| ERROR_RECOVERY | 2 | 2 | 0 | 100% | PASS |
| PERMISSION | 4 | 4 | 0 | 100% | PASS |

### 3.3 Improvement Matrices

**Functional Issues**:
| Priority | Issue | Scenario | Expected | Actual | Recommendation |
|----------|-------|----------|----------|--------|----------------|

**UX Issues**:
| Priority | Issue | Scenario | User Impact | Recommendation |
|----------|-------|----------|-------------|----------------|

**Data Integrity Issues**:
| Priority | Issue | Scenario | Risk | Recommendation |
|----------|-------|----------|------|----------------|

### 3.4 Three-Layer Health

| Layer | Clean | Issues | Health |
|-------|-------|--------|--------|
| UI Verification | ... | ... | ...% |
| Console | ... | ... | ...% |
| Backend | ... | ... | ...% |
| Persistence | ... | ... | ...% |

### 3.5 Save Report

```
mcp__serena__write_memory(
  memory_file_name="AUDIT_REPORT_{target}_{date}",
  content="full report markdown"
)
```

---

## EXECUTION FLOW

```
+----------------------------------------------------------+
|  STEP 0: LOAD & VERIFY                                    |
|  +-- Load audit plan (verify type: "e2e-audit")           |
|  +-- Verify dev server running                            |
|  +-- Resolve credentials from .env.local                  |
|  +-- Present execution preview                            |
|      v                                                    |
|                                                           |
|  STEP 1: INITIALIZATION (Composer)                        |
|  +-- Create session, transform protocols to queue         |
|      v Returns first scenario                             |
|                                                           |
|  STEP 2: EXECUTION LOOP                                   |
|  +--- Browser Agent (VDD Verification Protocol)           |
|  |    PREPARE -> ACT -> VERIFY -> PERSIST                 |
|  |    Escalation on failure only                          |
|  |                                                        |
|  |    v                                                   |
|  +--- Orchestrator                                        |
|  |    +-- Update protocol progress                        |
|  |    +-- Check protocol gate (if last in protocol)       |
|  |    +-- Return next scenario or COMPLETE                |
|  |    v                                                   |
|  +--- Progress: [n/total] status                          |
|       v Loop until COMPLETE                               |
|                                                           |
|  STEP 3: SYNTHESIS (Parent)                               |
|  +-- Test execution matrix                                |
|  +-- Protocol results summary                             |
|  +-- Improvement matrices (functional, UX, data)          |
|  +-- Three-layer health summary                           |
|  +-- Save to Serena memory                                |
+----------------------------------------------------------+
```

---

## CRITICAL RULES

1. **Load audit plan first** — Verify type: "e2e-audit"
2. **Do NOT run agents in background** — Foreground, wait for completion
3. **7-step verification per scenario** — UI + Console + Backend + Persistence
4. **Protocol gates at boundaries** — Check after last scenario in each protocol
5. **Sequential browser agents** — Shared browser state
6. **Progress after every orchestrator** — Print `[n/total]` status
7. **Screenshot evidence per scenario** — Save to scratchpad
8. **Never display raw credentials** — Only pass to browser agent prompts
9. **Composer initializes only** — Never re-run mid-execution
10. **Orchestrator after EVERY browser agent** — No skipping
11. **Synthesis is mandatory** — Generate all matrices, not just pass/fail
12. **Write to Serena memory** — Persist report for cross-session access
