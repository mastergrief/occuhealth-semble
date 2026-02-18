# PLAN - Planning Agentic Execution & Browser Testing

**Phase 1 of 2**: Decompose SCAN output into a structured execution plan for `/EXECUTE` to consume.
**Input**: `$ARGUMENTS` — SCAN output with recommendations, or manual feature/bug description
**Output**: `pending-plans/plan-{timestamp}.json` in ORCHESTRATION context hub
**Agents**: 1x `Plan` agent (opus)
**Protocol**: VDD 2-phase — Develop → Test (Discovery only on browser failure)

**IMPORTANT** - Parent is dispatcher only! Delegate ALL work to agents via `Task` tool! 
-  `Plan` agent ALWAYS directly writes to context hub via `Bash`. Never write code! Never run subagents in background!

---

## **STEP 0: Scope & Purpose**

On submission of [$ARGUMENTS] — `AskUserQuestion` to clarify before planning:

```
AskUserQuestion:
  questions:
    - question: "What type of plan is this?"
      header: "Plan type"
      options:
        - label: "Feature implementation"
          description: "New functionality — schema, mutations, queries, UI components"
        - label: "Bug fix"
          description: "Fix broken behavior — identify root cause, implement fix, verify"
        - label: "Refactoring"
          description: "Restructure code without changing behavior — modular architecture, patterns"
        - label: "Security hardening"
          description: "Fix vulnerabilities, add validation, tighten access control"
      multiSelect: false

```

**Do NOT proceed until scope is confirmed!**

---

## **STEP 1: Plan Generation (1 Plan Agent — opus)**

Spawn `Plan` agent with `Task` tool. Agent receives [$ARGUMENTS] (SCAN output or description) and user preferences from STEP 0.

### Plan Agent Prompt Template

```
Task(
  subagent_type="Plan",
  model="opus",
  prompt="""
  Generate an execution plan from the analysis/recommendations below.

  ## Input
  {$ARGUMENTS — SCAN output or feature description}

  ## User Preferences
  Plan type: {planType}
  Scope: {scopeAreas}

  ## Calibration Context (if available)
  Before planning, check for execution calibration memory:
  ```bash
  # Check if calibration data exists from prior executions
  ```
  Use `mcp__serena__list_memories()` → if `EXECUTION_CALIBRATION_INDEX` exists, read it.
  Apply learnings: file cascade patterns, browser timeout adjustments, task sizing corrections.
  If no calibration data exists, proceed with default estimates.

  ## **Plan Structure Requirements**

  ### **VDD 2-Phase Structure (mandatory)**

  Phase 1: DEVELOP
  - Developer implements code changes AND any data migrations/seeds
  - SCAN already provides discovery context — no redundant discovery phase

  Phase 2: TEST
  - Browser verification with VDD Verification Protocol
  - On FAIL: Discovery activates (explore/data → developer → re-test)

  Phase order: develop → test (discovery only on failure)
  SCAN provides upfront context; discovery is failure recovery, not mandatory.

  ### Convex Ordering (mandatory for schema/backend changes)
  Phase order: schema → validators → mutations/queries → facade re-exports → frontend components → browser tests
  Aligns with VDD: backend phases (DEVELOP) → frontend phases (DEVELOP) → browser phases (TEST)
  Never create UI that calls mutations before those mutations exist.

  ### Task Sizing
  - 1 logical change per task (single concern)
  - 3-5 files max per task
  - Each task independently verifiable
  - Each task has clear acceptance criteria

  ### Phase Structure
  Each phase:
  - Name and description
  - Ordered list of tasks
  - Gate condition at phase boundary (what must pass before next phase)
  - Agent assignment per task: data | explore | developer | browser | orchestrator (for synthesis)

  ### Mandatory Browser Testing (VDD Phase 3)
  Every phase MUST include a browser task as the final task. No exceptions.

  Browser tasks verify:
  - Phase changes work as expected (new functionality)
  - No regressions from prior phases
  - Backend mutations logged (`timeout 5 npx convex logs --history 5` — default, not escalation-only)
  - Data persists correctly (reload verification)
  - No console errors introduced

  Even backend-only phases require browser verification:
  - Confirms data flows correctly to UI
  - Catches integration issues early
  - Validates mutations/queries work end-to-end

  Phase gate always includes `browser_pass` condition.
  Browser tasks accumulate: later phases include regression checks for earlier phases.

  ### Gate Conditions (phase boundaries)
  Every phase gate requires:
  - `typecheck`: Code compiles without errors (`npx tsc --noEmit`)
  - `browser_pass`: Browser verification succeeds

  Browser task is ALWAYS the final task of each phase.

  ### Gate Failure Handling
  When a gate fails:
  - `typecheck` fail → Spawn `Explore` agent to diagnose, then retry developer task
  - `browser_pass` fail → Spawn `Explore` agent to diagnose root cause, then `developer` to fix, then `browser` to re-verify

  ### Task Format
  Per task:
  - ID: {phase}.{task} (e.g., "1.1", "2.3")
  - Description: What to implement/fix
  - Agent: developer | browser (discovery agents only used in failure recovery)
  - Model: `opus` for all agent types
  - Files: Expected files to modify/create
  - Acceptance criteria: How to verify completion
  - Dependencies: Which tasks must complete first
  - PostTask: For developer tasks, `["typecheck"]` — blocking, must pass before task completes
  - parallel_group: Group ID (e.g., "A", "B") if parallelizable, `null` if sequential

  ### Parallel Group Assignment
  Tasks in the same phase with no cross-dependencies can run in parallel.
  Assignment rules:
  - No shared files: `A.files ∩ B.files = ∅`
  - No dependency chain: `A.id ∉ B.dependencies` and vice versa
  - Schema-first: Schema tasks always run before mutation/query tasks (never parallel)
  - Convex ordering respected: schema → mutations → facade is always sequential
  - **Browser NEVER parallel with developer**: Vite HMR triggers page reloads when developer agents save files, causing flaky snapshots and stale uids in browser agents. All developer tasks in a wave must complete before any browser task runs.
  Mark parallelizable tasks with same `parallel_group` ID. Non-parallelizable tasks get `null`.

  ### Browser Task Format (embedded in UI-impacting phases)
  Per browser task:
  - ID: {phase}.B (e.g., "3.B" for phase 3 browser task)
  - Description: What UI behavior to verify from THIS phase
  - Agent: browser
  - Protocol: VDD Verification Protocol (PREPARE → ACT → VERIFY → PERSIST, escalation on failure only)
  - Scenarios: List of test scenarios (navigate, interact, verify, e2e workflow)
  - Workflow: MANDATORY — Always create fresh test data via E2E interaction before verification (never use stale data)
  - Regression: Also verify prior phases still work (phases 1..N-1)
  - Acceptance: No console errors, expected elements visible, interactions succeed

  ### Developer Discovery Protocol (embedded in all developer tasks)
  Developer agents must report out-of-scope work they discover:
  - Do NOT implement discovered work (scope creep)
  - Return `discovered_work` array in output
  - Parent handles: trivial → inject task, structural → micro-replan

  ### Template Matching
  Read available templates:
  ```bash
  ls ORCHESTRATION/templates/
  ```
  Pick closest template for plan structure. If none match, use default phase/task decomposition.

  ## **Output**
  Write plan to context hub via CLI using heredoc (handles large JSON, special chars):
  ```bash
  npx tsx ORCHESTRATION/cli/orch.ts plan write-pending --stdin <<'EOF'
  {
    "title": "...",
    "type": "{planType}",
    "totalPhases": 2,
    "totalTasks": 5,
    "phases": [
      {
        "id": 1,
        "name": "Implementation",
        "gateCondition": "typecheck",
        "gateDescription": "Types pass before browser verification"
      },
      {
        "id": 2,
        "name": "Verification",
        "gateCondition": "browser_pass",
        "gateDescription": "Browser verification succeeds"
      }
    ],
    "tasks": [
      {
        "id": "1.1",
        "phase": 1,
        "phaseName": "Implementation",
        "description": "...",
        "agent": "developer",
        "files": ["..."],
        "acceptance": "...",
        "dependencies": [],
        "gate": false,
        "model": "opus",
        "postTask": ["typecheck"],
        "parallel_group": "A"
      },
      {
        "id": "2.B",
        "phase": 2,
        "phaseName": "Verification",
        "description": "Verify feature via browser",
        "agent": "browser",
        "acceptance": "No errors, expected behavior",
        "dependencies": ["1.1"],
        "gate": true,
        "gateCondition": "browser_pass",
        "model": "opus"
      }
    ],
    "gates": {
      "1": { "condition": "typecheck", "description": "All types must pass" },
      "2": { "condition": "browser_pass", "description": "Browser verification succeeds" }
    }
  }
  EOF
  ```

  Return ONLY a brief summary: phase count, task count, key phases.
  """
)
```

**Expected Response** (~50-100 tokens):
```
Plan written to: pending-plans/plan-{timestamp}.json
{N} phases, {M} tasks.
Key phases: {phase names}
```
**CRITICAL**: Response MUST include the exact file path on the first line. If missing, the plan was not written.

### **1.5 Validate Plan Written (Mandatory Gate)**

After Plan agent returns, parent validates the plan was actually written:

1. **Path check**: Extract file path from agent's first response line (`Plan written to: ...`)
   - If path missing → Re-spawn Plan agent with error: "Plan must be written to context hub via CLI. Return exact path."

2. **Content check**: Read the file and verify structure:
   ```bash
   npx tsx ORCHESTRATION/cli/orch.ts plan list-pending
   ```
   - Confirm new plan file exists with recent timestamp
   - Quick `Read` on the path — verify JSON contains `tasks` array and `phases` array
   - If file missing or malformed → Re-spawn Plan agent

**Do NOT proceed to STEP 2 until both checks pass.**

---

## **STEP 2: Present Plan Summary**

After `Plan` agent returns, present to user:

### Phase Overview
| Phase | Tasks | Gate Condition | Agent Types |
|-------|-------|---------------|-------------|
| 1. Implementation | N developer tasks | typecheck | developer |
| 2. Verification | 1 browser task | browser_pass | browser |
| 3. ON FAILURE | Discovery | loop back to Implementation | data & Explore
Note: Discovery (data/explore) only activates on browser failure — not planned upfront.

### Task List
| ID | Description | Agent | Dependencies | Acceptance Criteria |
|----|-------------|-------|-------------|-------------------|
| 1.1 | Implement feature X | developer | — | Typecheck passes |
| 1.2 | Add UI component | developer | 1.1 | Typecheck passes |
| 2.B | Verify feature via browser | browser | 1.2 | No errors, expected behavior |

### Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Schema migration | Data loss | Additive-only changes, no destructive ops |
| Cross-module coupling | Type errors | Typecheck gate at every phase |

---

**Plan saved to**: `pending-plans/plan-{timestamp}.json`
**Next**: Review plan, then run `/EXECUTE-VDD` to begin implementation.

---

## EXECUTION FLOW

```
┌──────────────────────────────────────────────────────────┐
│  STEP 0: CLARIFICATION                                    │
│  └── AskUserQuestion: plan type, scope                    │
│      ▼ [User confirms]                                    │
│                                                           │
│  STEP 1: PLAN GENERATION (1 Plan agent — opus)            │
│  └── Decompose into phases → tasks → gates                │
│      Per phase: append mandatory browser task at end      │
│      Write to context hub via CLI                         │
│      ▼                                                    │
│                                                           │
│  STEP 2: PRESENT & SAVE                                   │
│  ├── Phase overview table                                 │
│  ├── Task list table                                      │
│  ├── Risk assessment                                      │
│  └── Ready for /EXECUTE-VDD                                   │
│                                                           │
│  OUTPUT: pending-plans/plan-{timestamp}.json               │
└──────────────────────────────────────────────────────────┘
```

---

## CRITICAL RULES

1. **STEP 0 is mandatory** — Always clarify scope before planning
2. **Do NOT run agents in background** — Foreground, wait for completion
3. **Convex ordering enforced** — Schema → mutations → facade → frontend → tests
4. **Task sizing: 1 concern, 3-5 files** — No monolithic tasks
5. **Gate conditions at every phase boundary** — Typecheck minimum
6. **Never implement** — Planning only, no code changes
7. **Plan agent ALWAYS writes to context hub** — Via `npx tsx ORCHESTRATION/cli/orch.ts plan write-pending`
8. **End after presenting plan** — User reviews, then runs `/EXECUTE-VDD`
9. **Agent assignments are explicit** — Every task declares developer | browser | explore
10. **Acceptance criteria per task** — No ambiguous deliverables
11. **Browser testing MANDATORY at every phase gate** — `browser` agent follows VDD Verification Protocol, no exceptions 
