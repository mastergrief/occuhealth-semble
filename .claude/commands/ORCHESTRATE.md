# ORCHESTRATE - Multi-Agent Workflow Coordination

**Load `orchestrate` skill with `Skills` tool for full reference documentation**

## Split Commands (Recommended)

The orchestration workflow is split into two commands for better control:

| Command | Phase | Purpose |
|---------|-------|---------|
| `/orch-plan` | Phase 0 | Discovery & Design → outputs `pending-plan.json` |
| `/orch-execute` | Phases 1-2 | Reads plan → Session → Composer → Orchestrator → Execution |

**Typical Flow**:
```
1. User: /orch-plan "add workout templates feature"
2. [3 Explore agents → Plan agent → pending-plan.json]
3. [User reviews plan, optionally edits]
4. User: /orch-execute
5. [Session → Composer → Orchestrator → Work Agents → Gates]
```

**Benefits**:
- Natural review breakpoint between design and implementation
- User can edit plan before execution
- Clear separation of concerns
- No awkward ExitPlanMode mid-workflow

---

## Quick Reference

### /orch-plan (Phase 0)
- **Mode**: Plan mode (shift+tab+tab)
- **Agents**: 3 Explore → Plan
- **Output**: `pending-plans/plan-<timestamp>.json`
- **Ends with**: Plan summary presented to user

### /orch-execute (Phases 1-2)
- **Mode**: Normal mode
- **Input**: Reads pending plan from `/orch-plan`
- **Agents**: Composer → Orchestrator → Work Agents
- **Output**: Completed implementation with gates passed

---

## Full Protocol Reference (Legacy Single-Command)

The sections below document the complete protocol for reference. For typical use, prefer the split commands above.

---

## PHASE 0: DISCOVERY & DESIGN (Plan Mode Active)

> **Note**: Use `/orch-plan` command instead for cleaner workflow.

**Mode**: Plan mode active (shift+tab+tab) - Only discovery and design in this phase

### 0.1 Launch 3 Explore Agents (SINGLE message, foreground)

```python
# Agent 1 - UI Discovery
Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover UI files for {$ARGUMENTS}. Return: components, hooks, pages with line counts."
)

# Agent 2 - API Discovery
Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover API files for {$ARGUMENTS}. Return: Convex functions, mutations, queries."
)

# Agent 3 - DB Discovery
Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover DB context for {$ARGUMENTS}. Return: schema tables, relationships, indexes."
)
```

### 0.2 Collect Scout Results
```python
# Results returned directly from foreground Task calls
ui_scout = explore1_result
api_scout = explore2_result
db_scout = explore3_result
```

### 0.3 Launch Plan Agent
```python
Task(
  subagent_type="Plan",
  prompt="""
  IMPLEMENTATION DESIGN: {$ARGUMENTS}

  Scout Results: {ui_scout, api_scout, db_scout}

  Design:
  1. Implementation approach
  2. Critical files to modify
  3. Phase breakdown for composer
  4. Risk assessment

  Return: Structured design for composer agent.
  """
)
```

### 0.4 Write Plan File for User Review
- Write Plan agent's design to plan file
- Include critical files, approach, and phase breakdown
- User reviews design before proceeding

### 0.5 Exit Plan Mode (CRITICAL BOUNDARY)
- Present design summary to user for approval
- **Action**: `ExitPlanMode` tool call
- **Constraint**: MUST call before Phase 1. Session/composer/orchestrator BLOCKED in plan mode.
- **Gating**: User approval required before proceeding

**Output**: Design document approved → `ExitPlanMode` called → proceed to Orchestration Setup

---

## PHASE 1: ORCHESTRATION SETUP (After ExitPlanMode)

### 1.0 Create Session & Write Prompt

**Session ID Format**: `YYYYMMDD_HH-MM_<uuid>` (e.g., `20251225_15-30_abc123`)

```bash
# Session must exist BEFORE composer can read prompt
npx tsx ORCHESTRATION/cli/orch.ts session new
npx tsx ORCHESTRATION/cli/orch.ts prompt write "$ARGUMENTS"
npx tsx ORCHESTRATION/cli/orch.ts memory link <PLAN_*>  # if relevant memory exists
npx tsx ORCHESTRATION/cli/orch.ts memory link <MEMORY_NAME> --extract  # with traceability extraction
```

### 1.1 Spawn Composer Agent
```python
# Composer reads prompt from session, writes structured plan
Task(
  subagent_type="composer",
  prompt="Session: $SESSION. Design: {planAgentOutput}. Decompose into phases."
)
```

#### 1.1a Optional: Template-Based Planning
Available templates: `feature-implementation`, `bug-investigation`, `refactoring`, `api-endpoint`, `database-migration`, `performance-optimization`, `security-audit`, `documentation-update`, `dependency-upgrade`

```bash
npx tsx ORCHESTRATION/cli/orch.ts template list           # List all templates
npx tsx ORCHESTRATION/cli/orch.ts template show <id>      # Show template details
npx tsx ORCHESTRATION/cli/orch.ts template validate <id>  # Validate template structure
```

Composer can instantiate: `"Use template feature-implementation with {{feature_name}}=UserProfile"`

### 1.2 Spawn Orchestrator Agent
```python
# Orchestrator reads plan from session, generates dispatch strategy
Task(
  subagent_type="orchestrator",
  prompt="Session: $SESSION. Plan: {composerOutput}. Return phase-1 dispatch"
)
```

**Output**: Structured plan.json in context hub, dispatch strategy ready → proceed to Execution

---

## PHASE 2: EXECUTION

### 2.1 Execute Dispatch
Execute dispatch using **Agent Selection Matrix** below:
```python
Task("developer"|"browser"|"analyst", "{dispatchPrompt}")
```

### 2.2 E2E Validation (if UI changes)
IF front-end change → spawn `browser` agent for E2E tests, ELSE skip

### 2.3 Gate Check & Advance
```bash
npx tsx ORCHESTRATION/cli/orch.ts gate check <phase> --typecheck
npx tsx ORCHESTRATION/cli/orch.ts gate advance <phase>  # on pass
```

**Gate Condition DSL** (full syntax):
```bash
# Simple checks
--condition "typecheck"                    # npm run typecheck must pass
--condition "tests"                        # npm test must pass

# Boolean operators
--condition "typecheck AND tests"          # Both must pass
--condition "tests OR memory:SKIP_TESTS"   # Either passes
--condition "NOT memory:BLOCKED_*"         # Negation

# Grouped conditions
--condition "(typecheck AND tests) OR evidence:threshold:80"

# Memory glob patterns
--condition "memory:ANALYSIS_*"            # Linked memory matching pattern

# Traceability requirements
--condition "traceability:analyzed_symbols,entry_points,data_flow_map"

# Evidence completeness threshold (0-100)
--condition "evidence:threshold:70"

# Complex example
--condition "memory:IMPL_* AND (tests OR evidence:threshold:70)"
```

### 2.4 Iterate
Repeat steps 2.1-2.3 for each phase until all phases complete

### 2.5 Evidence Chain Tracking (Optional)
Track artifacts from analysis → implementation → validation:
```bash
npx tsx ORCHESTRATION/cli/orch.ts trace create    # Start evidence chain
npx tsx ORCHESTRATION/cli/orch.ts trace read      # View chain status
npx tsx ORCHESTRATION/cli/orch.ts trace list      # List all traces
npx tsx ORCHESTRATION/cli/orch.ts trace validate  # Check completeness score (0-100)
```

Evidence chain links: requirements → analyzed symbols → modified files → test results

---

## Agent Selection Matrix

| Change Type | Primary Agent | Follow-up | Parallel? |
|-------------|---------------|-----------|-----------|
| Schema/mutations/queries | `developer` | - | No |
| UI components | `developer` | `browser` | Yes (after dev) |
| Complex refactoring | `analyst` → `developer` | `browser` (if UI) | Sequential |
| E2E validation only | `browser` | - | No (sequential) |
| Architecture analysis | `analyst` | - | No |

---

## Parallel Dispatch Rules

### Decision Matrix

| Scenario | Strategy | Message Pattern |
|----------|----------|-----------------|
| Independent discovery | Sequential foreground | 3 Task calls in SINGLE message (foreground) |
| Sequential pipeline | Chain blocking | Task → result → Task |
| Same-phase work | Sequential foreground | N Tasks foreground → results |
| Cross-phase dependency | Gate then proceed | Gate check → advance → next phase |
| E2E validation | Sequential browser | Single browser agent with test suite |

### Batching Patterns

**Pattern A: Fan-out Exploration (Discovery)**
```python
# SINGLE message - all 3 in foreground (wait for each)
ui_result = Task("Explore", "UI...")
api_result = Task("Explore", "API...")
db_result = Task("Explore", "DB...")

# Results returned directly from foreground calls
```

**Pattern B: Sequential Pipeline (Setup → Execute)**
```python
# Plan mode
design = Task("Plan", scout_results)           # blocking
# ExitPlanMode happens here
# Execution mode
session = orch_session_new()                   # blocking
plan = Task("composer", design)                # blocking
dispatch = Task("orchestrator", plan)          # blocking
# Now execute dispatch instructions
```

**Pattern C: Sequential Work + Gate (Phase Execution)**
```python
# Sequential implementation (foreground)
dev1_result = Task("developer", subtask1)
dev2_result = Task("developer", subtask2)

# Gate check after all complete
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck
npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1
```

**Pattern D: Sequential E2E (Validation)**
```python
# Single browser agent handles full test suite
Task("browser", """
  Test suite for calendar feature:
  1. Navigate to /calendar
  2. Verify workout cards render
  3. Test drag-and-drop functionality
  4. Capture evidence screenshots
""")
```

### Anti-Patterns (AVOID)

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Running agents in background | Token waste, lost context | Always use foreground (blocking) |
| Parallel across phases | Gate violations | Complete phase → gate → next |
| Composer in plan mode | Blocked by restrictions | Session/composer after ExitPlanMode |
| Skipping TaskOutput collection | Results never used | Foreground calls return directly |

---

## Failure Recovery Protocol

**Typecheck Failures**
```
Task("developer", "Fix type errors: {errors}") → re-gate (max 3 retries)
```

**Browser Test Failures**
```
Task("orchestrator", "Fix dispatch: {errors}") → Task("developer", "{fix}") → re-test (max 2 retries)
```

**Agent Timeout/Crash**
```
Task(agent, resume=<agent_id>) → continues from last checkpoint
```

**Abort Threshold**
- 3 consecutive failures at same phase → `npx tsx ORCHESTRATION/cli/orch.ts gate abort`
- Save partial progress: `mcp__serena__write_memory("SESSION_PARTIAL_$DATE", "{state}")`

---

## E2E Testing

> **Note**: Parallel E2E testing (multiple browser instances) was deprecated Dec 2025 due to overhead complexity. Use sequential browser testing instead.

**Standard Setup**:
```bash
# Single dev server
npm run dev  # Default port 5173
```

**Browser Agent Pattern**:
```python
# Sequential E2E tests
Task("browser", "Navigate to /calendar, verify workout cards render correctly")
```

**Data Setup**: If test data doesn't exist, browser agent must create it via app workflows before testing.

---

## Context Hub Integration

**Session Files**: `ORCHESTRATION/context-hub/sessions/$SESSION_ID/`
| File | Purpose |
|------|---------|
| `prompt.md` | Original request/arguments |
| `plan.md` | Decomposed plan from composer agent |
| `progress.json` | Phase status, gate results |
| `dispatch-log.md` | Agent dispatches and outputs |

**Link Memories**: `npx tsx ORCHESTRATION/cli/orch.ts memory link <MEMORY_NAME>`

---

## Completion

After all phases complete:
```bash
# 1. Verify all gates passed
npx tsx ORCHESTRATION/cli/orch.ts gate status

# 2. Optional: View dashboard status
npx tsx ORCHESTRATION/cli/orch.ts dashboard

# 3. Optional: Check evidence completeness
npx tsx ORCHESTRATION/cli/orch.ts trace validate

# 4. Complete session
npx tsx ORCHESTRATION/cli/orch.ts session complete

# 5. Persist to memory
mcp__serena__write_memory("SESSION_ORCH_$DATE", "{summary}")
```

---

## Execution Checklist

```
□ PHASE 0: DISCOVERY & DESIGN (Plan Mode Active)
  □ 0.1 - 3 Explore agents launched in SINGLE message (foreground)
  □ 0.2 - Results collected from all 3 scouts
  □ 0.3 - Plan agent launched with scout results → design received
  □ 0.4 - Design written to plan file for user review
  □ 0.5 - Design presented to user → ExitPlanMode

□ PHASE 1: ORCHESTRATION SETUP (After ExitPlanMode)
  □ 1.0 - Session created: session new
  □ 1.0 - Prompt written: prompt write
  □ 1.0 - Memories linked (if applicable)
  □ 1.1 - Composer agent spawned → structured plan.json written
  □ 1.1a - Template used (optional)
  □ 1.2 - Orchestrator agent spawned → dispatch strategy received

□ PHASE 2: EXECUTION
  □ 2.1 - Work agents spawned per dispatch (foreground, sequential)
  □ 2.1 - Results collected directly
  □ 2.2 - Browser agents for E2E (if UI changes)
  □ 2.3 - Gate checked with condition DSL
  □ 2.3 - Gate advanced
  □ 2.4 - Repeat for remaining phases
  □ 2.5 - Evidence chain tracked (optional)

□ COMPLETION
  □ All gates passed
  □ Typecheck passes
  □ E2E tests pass (if UI changes)
  □ Dashboard reviewed (optional)
  □ Evidence validated (optional)
  □ Session complete
  □ Memory written with summary
```

---

**IMPORTANT**: Parent is dispatcher only - delegate ALL implementation work to agents. Never write code directly.
