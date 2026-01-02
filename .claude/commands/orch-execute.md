# ORCH-EXECUTE - Orchestration Setup & Execution

**Purpose**: Phases 1 & 2 of orchestration - create session, decompose plan, execute with agents
**Input**: Reads `pending-plan.json` from `/orch-plan` (or specify `$ARGUMENTS` = plan path)
**Mode**: Normal mode (NOT plan mode)
**Prerequisite**: Run `/orch-plan` first to generate pending plan
**IMPORTANT**: 
- Parent is dispatcher only - delegate ALL implementation work to agents. Never write code directly. 
- Never run subagents in background! (Keep in foreground and wait for tasks to complete)

---

## PHASE 1: ORCHESTRATION SETUP

### 1.0 Load Pending Plan & Create Session

```bash
# List available pending plans
npx tsx ORCHESTRATION/cli/orch.ts plan list-pending

# Load specific plan (or latest if no argument)
npx tsx ORCHESTRATION/cli/orch.ts plan load-pending [plan-timestamp.json]

# Create new session
npx tsx ORCHESTRATION/cli/orch.ts session new

# Write prompt from loaded plan
npx tsx ORCHESTRATION/cli/orch.ts prompt write "{plan.description}"

# Link relevant memories (if any)
npx tsx ORCHESTRATION/cli/orch.ts memory link <MEMORY_NAME> --extract
```

**Session ID Format**: `YYYYMMDD_HH-MM_<uuid>`

### 1.1 Spawn Composer Agent

```python
Task(
  subagent_type="composer",
  prompt="""
  Session: {$SESSION_ID}

  Pending Plan:
  {loadedPlan}

  Task: Decompose into executable phases with:
  - Subtasks per phase
  - Agent assignments (developer/browser/analyst)
  - Dependencies between subtasks
  - Token estimates per subtask

  Write structured plan.json to session.
  """
)
```

#### 1.1a Optional: Template-Based Planning
```bash
npx tsx ORCHESTRATION/cli/orch.ts template list
npx tsx ORCHESTRATION/cli/orch.ts template show <template-id>
```

Templates: `feature-implementation`, `bug-investigation`, `refactoring`, `api-endpoint`, `database-migration`, `performance-optimization`, `security-audit`, `documentation-update`, `dependency-upgrade`

### 1.2 Spawn Orchestrator Agent

```python
Task(
  subagent_type="orchestrator",
  prompt="""
  Session: {$SESSION_ID}
  Plan: {composerOutput}

  Generate dispatch strategy for ALL phases:
  - Agent assignments per phase (parallel groups + sequential tasks)
  - Execution order within each phase
  - Gate conditions between phases
  - Token budget estimates
  - Handoff protocols (if token limit approached)

  Return: Structured dispatch strategy for ALL phases in the plan.
  """
)
```

---

## PHASE 2: EXECUTION

### 2.1 Execute Dispatch

Execute per orchestrator's dispatch strategy:

```python
# Select agent based on change type
Task("developer" | "browser" | "analyst", "{dispatchPrompt}")
```

**Agent Selection Matrix**:
| Change Type | Primary Agent | Follow-up |
|-------------|---------------|-----------|
| Schema/mutations/queries | `developer` | - |
| UI components | `developer` | `browser` |
| Complex refactoring | `analyst` → `developer` | `browser` |
| E2E validation only | `browser` | - |
| Architecture analysis | `analyst` | - |

### 2.2 E2E Validation (if UI changes)

```python
# Only if front-end changes were made
Task(
  subagent_type="browser",
  prompt="""
  E2E Validation for: {feature}

  Test Suite:
  1. Navigate to affected pages
  2. Verify UI renders correctly
  3. Test user interactions
  4. Capture evidence screenshots

  Report: Pass/fail with evidence.
  """
)
```

### 2.3 Gate Check & Advance

```bash
# Check gate conditions
npx tsx ORCHESTRATION/cli/orch.ts gate check <phase> --typecheck

# Gate Condition DSL options:
--condition "typecheck"
--condition "tests"
--condition "typecheck AND tests"
--condition "memory:ANALYSIS_*"
--condition "evidence:threshold:70"
--condition "(typecheck AND tests) OR evidence:threshold:80"

# On pass, advance to next phase
npx tsx ORCHESTRATION/cli/orch.ts gate advance <phase>
```

### 2.4 Iterate Phases

Repeat 2.1-2.3 for each phase until all phases complete.

### 2.5 Evidence Chain (Optional)

```bash
npx tsx ORCHESTRATION/cli/orch.ts trace create
npx tsx ORCHESTRATION/cli/orch.ts trace read
npx tsx ORCHESTRATION/cli/orch.ts trace validate  # 0-100 completeness score
```

---

## Failure Recovery

| Failure Type | Recovery | Max Retries |
|--------------|----------|-------------|
| Typecheck | `Task("developer", "Fix: {errors}")` → re-gate | 3 |
| Browser test | `Task("orchestrator", "Fix dispatch")` → re-test | 2 |
| Agent crash | `Task(agent, resume=<agent_id>)` | - |
| Abort threshold | 3 consecutive failures → `gate abort` | - |

```bash
# On abort, save partial progress
npx tsx ORCHESTRATION/cli/orch.ts gate abort
mcp__serena__write_memory("SESSION_PARTIAL_{date}", "{state}")
```

---

## Completion

```bash
# 1. Verify all gates passed
npx tsx ORCHESTRATION/cli/orch.ts gate status

# 2. Optional: View dashboard
npx tsx ORCHESTRATION/cli/orch.ts dashboard

# 3. Optional: Validate evidence chain
npx tsx ORCHESTRATION/cli/orch.ts trace validate

# 4. Complete session
npx tsx ORCHESTRATION/cli/orch.ts session complete

# 5. Archive pending plan (mark as executed)
npx tsx ORCHESTRATION/cli/orch.ts plan archive-pending

# 6. Persist summary to memory
mcp__serena__write_memory("SESSION_ORCH_{date}", "{summary}")
```

---

## Execution Checklist

```
□ PHASE 1: ORCHESTRATION SETUP
  □ 1.0 - Pending plan loaded from /orch-plan
  □ 1.0 - Session created: session new
  □ 1.0 - Prompt written from plan
  □ 1.0 - Memories linked (if applicable)
  □ 1.1 - Composer agent → structured plan.json
  □ 1.2 - Orchestrator agent → dispatch strategy

□ PHASE 2: EXECUTION
  □ 2.1 - Work agents dispatched (foreground, sequential)
  □ 2.2 - E2E validation (if UI changes)
  □ 2.3 - Gate checked with conditions
  □ 2.3 - Gate advanced
  □ 2.4 - Repeat for all phases
  □ 2.5 - Evidence chain tracked (optional)

□ COMPLETION
  □ All gates passed
  □ Typecheck passes
  □ E2E tests pass (if UI)
  □ Session completed
  □ Pending plan archived
  □ Memory written
```

---

**IMPORTANT**: 
- Parent is dispatcher only - delegate ALL implementation work to agents. Never write code directly. 
- Never run subagents in background! (Keep in foreground and wait for tasks to complete)
