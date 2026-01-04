# AUDIT-EXECUTE - Browser Test Execution & Synthesis

**Purpose**: Phase 3-4 of audit - execute tests via browser agents and synthesize results
**Input**: Reads `PENDING_AUDIT_*.md` from `/audit-plan` (or specify `$ARGUMENTS` = memory name)
**Mode**: Normal mode (NOT plan mode)
**Prerequisite**: Run `/audit-plan` first to generate pending audit plan
**Agents**: N browser agents (sequential) → Parent synthesis
**IMPORTANT**:
- Parent is dispatcher only - delegate ALL testing to browser agents
- Never run subagents in background! (Keep in foreground and wait for completion)

---

## STEP 0: LOAD PENDING AUDIT

### 0.1 List Available Audit Plans

```python
mcp__serena__list_memories()
# Look for PENDING_AUDIT_* entries
```

### 0.2 Load Audit Plan

```python
# Load specific plan (or latest PENDING_AUDIT_* if no argument)
audit_plan = mcp__serena__read_memory("PENDING_AUDIT_{name}_{timestamp}")
```

### 0.3 Parse Test Suites

Extract from audit plan:
- Test credentials (role, email, password)
- Test suites (Authentication, Navigation, per-tab tests)
- Individual test cases with browser-cli commands

---

## STEP 1: BROWSER AGENT EXECUTION (Sequential)

### 1.1 Launch Browser Agent per Test Suite

Execute test suites **sequentially** (not parallel) to maintain browser state:

```python
# Test Suite 1: Authentication
Task(
  subagent_type="browser",
  prompt="""
  AUDIT EXECUTION: Test Suite 1 - Authentication

  ## Test Plan
  {auth_test_suite_from_plan}

  ## Credentials
  - Email: {email}
  - Password: {password}

  ## Instructions
  1. Execute each test case in order
  2. Take snapshot after each major action
  3. Take screenshot at test completion
  4. Check console for errors after each action
  5. Check network for expected queries/mutations

  ## Output Format (per test)
  ```
  ### T1.X - {Test Name}
  **Status**: PASS | FAIL | PARTIAL | BLOCKED
  **Evidence**:
  - Screenshot: {path}
  - Console: {errors or "clean"}
  - Network: {relevant calls}
  **Issues**: {description if any}
  **Notes**: {observations}
  ```

  Execute ALL tests in this suite before returning.
  IMPORTANT: Save browser state after authentication for next suite.
  """
)

# Test Suite 2: Navigation (reuse auth state)
Task(
  subagent_type="browser",
  prompt="""
  AUDIT EXECUTION: Test Suite 2 - Navigation

  ## Prerequisites
  - Browser should be authenticated from Suite 1
  - If not authenticated, re-login first

  ## Test Plan
  {nav_test_suite_from_plan}

  ## Instructions
  [Same as Suite 1]

  ## Output Format
  [Same as Suite 1]
  """
)

# Test Suite 3-N: Feature Tests (continue sequential)
# ... one browser agent per test suite ...
```

### 1.2 Collect Results

After each browser agent completes:
- Capture test results (pass/fail/partial/blocked)
- Capture evidence (screenshots, console, network)
- Capture issues found
- Capture observations

---

## STEP 2: SYNTHESIS (Parent)

### 2.1 Aggregate All Results

Combine results from all browser agents:

```python
results = {
  "auth": browser_agent_1_results,
  "nav": browser_agent_2_results,
  "feature_1": browser_agent_3_results,
  # ...
}
```

### 2.2 Build Feature Status Matrix

| Feature | Page | Status | Issues |
|---------|------|--------|--------|
| Login | Auth | ✅/⚠️/❌ | {brief} |
| Logout | Auth | ✅/⚠️/❌ | {brief} |
| Dashboard load | /role/dashboard | ✅/⚠️/❌ | {brief} |
| ... | ... | ... | ... |

### 2.3 Categorize Issues

**Critical (Blocking)**:
- Feature completely broken
- Auth failures
- Data loss scenarios

**Major (Degraded Experience)**:
- Feature partially working
- UI errors visible
- Slow performance

**Minor (Polish)**:
- Console warnings
- Missing empty states
- UI inconsistencies

### 2.4 Generate Recommendations

**Immediate (Fix Now)**:
- Critical issues
- Security concerns

**Short-term (This Sprint)**:
- Major issues
- UX improvements

**Backlog**:
- Minor issues
- Nice-to-haves

### 2.5 Write Final Report

```python
mcp__serena__write_memory(
  "AUDIT_REPORT_{target}_{timestamp}",
  f"""
# AUDIT REPORT: {target}
Generated: {timestamp}
Duration: {total_time}

## Executive Summary
- **Total Tests**: {N}
- **Passed**: {X} ({X/N * 100}%)
- **Failed**: {Y}
- **Partial**: {Z}
- **Blocked**: {W}

## Feature Status Matrix

{feature_matrix_table}

## Detailed Results

### Authentication
{auth_results}

### Navigation
{nav_results}

### {Feature 1}
{feature_1_results}

...

## Issues Found

### Critical
{critical_issues_table}

### Major
{major_issues_table}

### Minor
{minor_issues_table}

## Missing/Incomplete Features

{missing_features_table}

## Recommendations

### Immediate (Fix Now)
{immediate_recommendations}

### Short-term
{short_term_recommendations}

### Backlog
{backlog_recommendations}

## Evidence

### Screenshots
{screenshot_paths}

### Console Logs
{notable_console_output}

## Test Coverage

{tests_run_list}

## Untested Areas

{untested_areas}
"""
)
```

### 2.6 Archive Pending Plan

```python
# Rename pending plan to mark as executed
mcp__serena__edit_memory(
  "PENDING_AUDIT_{name}_{timestamp}",
  needle="# AUDIT TEST PLAN",
  repl="# AUDIT TEST PLAN [EXECUTED {now}]",
  mode="literal"
)
```

---

## EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: LOAD PENDING AUDIT                                     │
│  ├── List memories: PENDING_AUDIT_*                             │
│  └── Load and parse test plan                                   │
│      ▼                                                          │
│                                                                 │
│  STEP 1: BROWSER EXECUTION (Sequential browser agents)          │
│  ├── Agent 1: Authentication tests                              │
│  │   ▼ [GATE: Wait, collect results]                            │
│  ├── Agent 2: Navigation tests                                  │
│  │   ▼ [GATE: Wait, collect results]                            │
│  ├── Agent 3: Feature Tab 1 tests                               │
│  │   ▼ [GATE: Wait, collect results]                            │
│  ├── Agent N: Feature Tab N tests                               │
│  │   ▼ [GATE: Wait, collect results]                            │
│                                                                 │
│  STEP 2: SYNTHESIS (Parent)                                     │
│  ├── Aggregate results                                          │
│  ├── Build feature matrix                                       │
│  ├── Categorize issues (critical/major/minor)                   │
│  ├── Generate recommendations                                   │
│  ├── Write AUDIT_REPORT_* memory                                │
│  └── Archive pending plan                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## EXECUTION CHECKLIST

```
□ STEP 0: LOAD PENDING AUDIT
  □ Listed available PENDING_AUDIT_* memories
  □ Loaded correct audit plan
  □ Parsed test suites and cases

□ STEP 1: BROWSER EXECUTION
  □ Browser agent 1: Authentication (foreground, wait)
  □ Browser agent 2: Navigation (foreground, wait)
  □ Browser agent 3-N: Features (foreground, sequential)
  □ All results collected

□ STEP 2: SYNTHESIS
  □ Results aggregated
  □ Feature matrix built
  □ Issues categorized
  □ Recommendations generated
  □ AUDIT_REPORT_* written to memory
  □ Pending plan archived
```

---

## FAILURE RECOVERY

| Failure Type | Recovery | Action |
|--------------|----------|--------|
| Browser won't start | Check dev server | `lsof -ti:5175` then `npm run dev` |
| Auth fails | Verify credentials | Check .env.local, re-run auth suite |
| Test timeout | Increase timeout | Resume from failed test |
| Element not found | Selector changed | Update plan, re-run suite |
| 3+ consecutive fails | Abort suite | Move to next suite, note blocked |

```python
# On critical failure, save partial progress
if consecutive_failures >= 3:
  mcp__serena__write_memory(
    "AUDIT_PARTIAL_{target}_{timestamp}",
    partial_results
  )
  # Continue with remaining suites
```

---

## STATUS LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Working as expected |
| ⚠️ | Partially working / issues found |
| ❌ | Not working / broken |
| 🚧 | Missing / not implemented |
| ⬜ | Not tested (blocked) |

---

## CRITICAL RULES

1. **Load plan first** - Don't execute without `/audit-plan` output
2. **Sequential browser agents** - One at a time to maintain state
3. **Do NOT run agents in background** - Foreground, wait for completion
4. **Collect evidence** - Screenshots, console, network per test
5. **Synthesize as parent** - Don't just concatenate, analyze
6. **Write single report** - One comprehensive memory, not fragments
7. **Archive pending plan** - Mark as executed when done

---

## EXAMPLE USAGE

```bash
# Execute most recent pending audit
/audit-execute

# Execute specific pending audit
/audit-execute PENDING_AUDIT_doctor_portal_20260104

# After completion, view report
mcp__serena__read_memory("AUDIT_REPORT_doctor_portal_20260104")
```

---

## RELATED MEMORIES

After execution, these memories will exist:
- `PENDING_AUDIT_*` - Original test plan (marked as executed)
- `AUDIT_REPORT_*` - Comprehensive results report

Reference for test design:
- `DOCTOR_PORTAL_BROWSER_AUDIT_PLAN.md` - Example test cases
- `NAV-MAP.md` - Route/selector reference
