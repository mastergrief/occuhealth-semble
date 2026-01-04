# AUDIT-EXECUTE - Browser Test Execution & Synthesis

**Purpose**: Phase 3-4 of audit - execute tests via browser agents and synthesize results
**Input**: Reads pending plan from `/audit-plan` via AUDIT CLI (or specify `$ARGUMENTS` = plan name)
**Mode**: Normal mode (NOT plan mode)
**Prerequisite**: Run `/audit-plan` first to generate pending plan
**Agents**: N browser agents (sequential) → Parent synthesis
**IMPORTANT**:
- Parent is dispatcher only - delegate ALL testing to browser agents
- Never run subagents in background! (Keep in foreground and wait for completion)

---

## STEP 0: LOAD PENDING AUDIT

### 0.1 List Available Audit Plans

```bash
npx tsx AUDIT/cli/audit.ts plan list-pending --json
```

### 0.2 Load Audit Plan

```bash
# Load specific plan (or latest if no argument)
npx tsx AUDIT/cli/audit.ts plan load-pending [plan-name] --json
```

### 0.3 Parse Test Suites

Extract from loaded plan:
- `credentials` - auth method and test users
- `baseUrl` - application URL
- `suites[]` - test suites with individual tests
- `suites[].tests[]` - test cases with browser-cli commands

### 0.4 Start Test Suite

```bash
# Start tracking test execution
npx tsx AUDIT/cli/audit.ts suite start "{planTarget}"
```

---

## STEP 1: BROWSER AGENT EXECUTION (Sequential)

### 1.1 Launch Browser Agent per Test Suite

Execute test suites **sequentially** (not parallel) to maintain browser state:

```python
# Test Suite 1: Authentication (if present in plan)
Task(
  subagent_type="browser",
  prompt="""
  AUDIT EXECUTION: Test Suite - {suite.name}

  ## Plan Details
  - Target: {plan.target}
  - Base URL: {plan.baseUrl}
  - Suite ID: {suite.id}

  ## Credentials
  - Method: {plan.credentials.method}
  - Users: {plan.credentials.users}

  ## Tests to Execute
  {suite.tests as formatted list}

  ## Instructions
  1. Execute each test case in order
  2. Take snapshot after each major action
  3. Take screenshot at test completion
  4. Check console for errors after each action
  5. Check network for expected queries/mutations

  ## Browser-CLI Commands to Use
  - navigate <url>
  - snapshot / snapshot --full / snapshot --forms
  - click <selector> / dblclick <selector>
  - type <selector> "text"
  - wait <ms>
  - screenshot <name>.png
  - console / clearConsole
  - network --filter=<pattern>

  ## Output Format (per test)
  ```
  ### {test.id} - {test.name}
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
```

### 1.2 Record Test Results

After each test completes:

```bash
# Record individual test results
npx tsx AUDIT/cli/audit.ts test record {testId} {PASS|FAIL|PARTIAL|BLOCKED} "{evidence}" "{notes}"
```

### 1.3 Continue with Next Suite

```python
# Test Suite 2: Navigation (reuse auth state)
Task(
  subagent_type="browser",
  prompt="""
  AUDIT EXECUTION: Test Suite - {suite.name}

  ## Prerequisites
  - Browser should be authenticated from previous suite
  - If not authenticated, re-login first using credentials

  ## Tests to Execute
  {suite.tests}

  ## Instructions
  [Same as Suite 1]

  ## Output Format
  [Same as Suite 1]
  """
)

# Continue for all remaining suites...
```

### 1.4 Collect All Results

After each browser agent completes:
- Parse test results (PASS/FAIL/PARTIAL/BLOCKED)
- Collect evidence (screenshots, console logs, network)
- Note issues found and observations

---

## STEP 2: SYNTHESIS (Parent)

### 2.1 Complete Test Suite

```bash
npx tsx AUDIT/cli/audit.ts suite complete
```

### 2.2 Get Test Summary

```bash
npx tsx AUDIT/cli/audit.ts test summary --json
```

### 2.3 Generate Report

```bash
npx tsx AUDIT/cli/audit.ts report generate --json
```

### 2.4 Export Report

```bash
# Export as markdown (default)
npx tsx AUDIT/cli/audit.ts report export --format=md

# Or as HTML for visual review
npx tsx AUDIT/cli/audit.ts report export --format=html
```

### 2.5 Categorize Issues

From browser agent results, categorize by severity:

**Critical (Blocking)**:
- Feature completely broken
- Auth failures
- Data loss scenarios
- Security vulnerabilities

**Major (Degraded Experience)**:
- Feature partially working
- UI errors visible
- Slow performance
- Missing functionality

**Minor (Polish)**:
- Console warnings
- Missing empty states
- UI inconsistencies
- Accessibility issues

### 2.6 Generate Recommendations

**Immediate (Fix Now)**:
- Critical issues
- Security concerns
- Data integrity problems

**Short-term (This Sprint)**:
- Major issues
- UX improvements
- Performance fixes

**Backlog**:
- Minor issues
- Nice-to-haves
- Technical debt

### 2.7 Archive Pending Plan

```bash
npx tsx AUDIT/cli/audit.ts plan archive-pending
```

### 2.8 Write Comprehensive Report to Serena Memory

```python
# Persist comprehensive report for cross-session access
mcp__serena__write_memory(
  memory_file_name="AUDIT_REPORT_{target}_{timestamp}",
  content=f"""
# AUDIT REPORT: {target}

**Generated**: {timestamp}
**Duration**: {duration}
**Scope**: {scope}
**Approach**: {approach}

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | {total} |
| Passed | {pass_count} ({pass_rate}%) |
| Failed | {fail_count} |
| Partial | {partial_count} |
| Blocked | {blocked_count} |

## Feature Status Matrix

{feature_matrix_table}

## Detailed Results

### Suite: {suite_1_name}
{suite_1_results}

### Suite: {suite_2_name}
{suite_2_results}

...

## Issues Found

### Critical
{critical_issues_with_evidence}

### Major
{major_issues_with_evidence}

### Minor
{minor_issues_list}

## Recommendations

### Immediate (Fix Now)
{immediate_recommendations}

### Short-term (This Sprint)
{short_term_recommendations}

### Backlog
{backlog_recommendations}

## Evidence Inventory

| Test ID | Screenshot | Console | Network |
|---------|------------|---------|---------|
{evidence_table}

## Test Coverage

### Tested
{tested_features_list}

### Untested / Blocked
{untested_features_list}

## Metadata

- **Plan Used**: {plan_path}
- **Template**: {template_id}
- **Credentials**: {credentials_method}
- **Base URL**: {base_url}
"""
)
```

**Memory Location**: `.serena/memories/AUDIT_REPORT_{target}_{timestamp}.md`

### 2.9 Present Final Report

Display to user:

```markdown
# AUDIT REPORT: {target}

**Generated**: {timestamp}
**Duration**: {total_time}
**Report Path**: `AUDIT/reports/report-{timestamp}.md`

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | {N} |
| Passed | {X} ({X/N * 100}%) |
| Failed | {Y} |
| Partial | {Z} |
| Blocked | {W} |

## Feature Status Matrix

| Feature | Status | Issues |
|---------|--------|--------|
| Login | ✅/⚠️/❌ | {brief} |
| Navigation | ✅/⚠️/❌ | {brief} |
| {Feature 1} | ✅/⚠️/❌ | {brief} |
| ... | ... | ... |

## Issues Found

### Critical ({count})
{critical_issues_list}

### Major ({count})
{major_issues_list}

### Minor ({count})
{minor_issues_list}

## Recommendations

### Immediate
{immediate_recommendations}

### Short-term
{short_term_recommendations}

### Backlog
{backlog_recommendations}

## Evidence

Screenshots saved to: `BROWSER-CLI/screenshots/`
Full report: `AUDIT/reports/report-{timestamp}.md`
```

---

## EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: LOAD PENDING AUDIT                                     │
│  ├── List pending plans via CLI                                 │
│  ├── Load and parse plan JSON                                   │
│  └── Start test suite tracking                                  │
│      ▼                                                          │
│                                                                 │
│  STEP 1: BROWSER EXECUTION (Sequential browser agents)          │
│  ├── Agent 1: First suite (auth if present)                     │
│  │   ▼ [GATE: Wait, record results]                             │
│  ├── Agent 2: Second suite                                      │
│  │   ▼ [GATE: Wait, record results]                             │
│  ├── Agent N: Remaining suites                                  │
│  │   ▼ [GATE: Wait, record results]                             │
│                                                                 │
│  STEP 2: SYNTHESIS (Parent)                                     │
│  ├── Complete test suite                                        │
│  ├── Generate report via CLI                                    │
│  ├── Export report (md/html)                                    │
│  ├── Categorize issues (critical/major/minor)                   │
│  ├── Generate recommendations                                   │
│  ├── Archive pending plan                                       │
│  ├── Write comprehensive report to Serena memory                │
│  └── Present final report to user                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## EXECUTION CHECKLIST

```
□ STEP 0: LOAD PENDING AUDIT
  □ Listed available pending plans via CLI
  □ Loaded correct audit plan
  □ Parsed suites and tests
  □ Started test suite tracking

□ STEP 1: BROWSER EXECUTION
  □ Browser agent per suite (foreground, sequential)
  □ Test results recorded via CLI
  □ Evidence collected (screenshots, console, network)
  □ All suites completed

□ STEP 2: SYNTHESIS
  □ Test suite marked complete
  □ Report generated via CLI
  □ Report exported (md/html)
  □ Issues categorized
  □ Recommendations generated
  □ Pending plan archived
  □ Comprehensive report written to Serena memory
  □ Final report presented to user
```

---

## FAILURE RECOVERY

| Failure Type | Recovery | Action |
|--------------|----------|--------|
| Browser won't start | Check dev server | Verify server running, restart if needed |
| Auth fails | Verify credentials | Check env file, re-attempt with correct creds |
| Test timeout | Increase timeout | Add longer waits, resume from failed test |
| Element not found | Selector changed | Update selector in plan, re-run test |
| 3+ consecutive fails | Abort suite | Move to next suite, note blocked tests |

```bash
# On critical failure, record blocked status
npx tsx AUDIT/cli/audit.ts test record {testId} BLOCKED "error-screenshot.png" "Reason: {error}"

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
4. **Record results via CLI** - Use `test record` for each test
5. **Collect evidence** - Screenshots, console, network per test
6. **Synthesize as parent** - Don't just concatenate, analyze
7. **Export report** - Generate artifact for review
8. **Archive pending plan** - Mark as executed when done

---

## CLI REFERENCE

```bash
# Suite Management
npx tsx AUDIT/cli/audit.ts suite start "target-name"
npx tsx AUDIT/cli/audit.ts suite status
npx tsx AUDIT/cli/audit.ts suite complete

# Test Recording
npx tsx AUDIT/cli/audit.ts test record AUTH-01 PASS "screenshot.png" "Login successful"
npx tsx AUDIT/cli/audit.ts test record NAV-01 FAIL "error.png" "404 on /settings"
npx tsx AUDIT/cli/audit.ts test list
npx tsx AUDIT/cli/audit.ts test summary --json

# Reporting
npx tsx AUDIT/cli/audit.ts report generate
npx tsx AUDIT/cli/audit.ts report export --format=md
npx tsx AUDIT/cli/audit.ts report export --format=html

# Plan Management
npx tsx AUDIT/cli/audit.ts plan archive-pending
```

---

## EXAMPLE USAGE

```bash
# Execute most recent pending audit
/audit-execute

# Execute specific pending audit
/audit-execute plan-2026-01-04T10-30-00

# After completion, reports are in:
# - AUDIT/reports/report-{timestamp}.md
# - AUDIT/reports/report-{timestamp}.html
```

---

## OUTPUT LOCATIONS

After execution, these files will exist:

**CLI State**:
- `AUDIT/context-hub/current-suite.json` - Current suite state
- `AUDIT/context-hub/pending-plans/` - Original plan (archived)
- `AUDIT/context-hub/archived-plans/` - Executed plans

**Reports**:
- `AUDIT/reports/suite-{name}-{timestamp}.json` - Raw suite data
- `AUDIT/reports/report-{timestamp}.md` - Markdown report
- `AUDIT/reports/report-{timestamp}.html` - HTML report

**Serena Memory** (cross-session persistence):
- `.serena/memories/AUDIT_REPORT_{target}_{timestamp}.md` - Comprehensive report
- Accessible via `mcp__serena__read_memory("AUDIT_REPORT_...")`
- Listed via `mcp__serena__list_memories()`

**Evidence**:
- `BROWSER-CLI/screenshots/` - Test screenshots
- Browser console logs in test results

---

**IMPORTANT**: This command requires a pending plan from `/audit-plan`. The browser agents execute the tests, and the parent synthesizes results into an actionable report.
