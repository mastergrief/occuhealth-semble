# ORCH-EXECUTE - Orchestration Setup & Execution

**Purpose**: Execute orchestrated multi-agent workflows with lean parent context
**Input**: Pending plan from `/orch-plan` (or `$ARGUMENTS` = plan path)
**Mode**: Normal mode (NOT plan mode)
**Prerequisite**: Run `/orch-plan` first to generate pending plan

**CRITICAL RULES**:
- Parent is dispatcher only - delegate ALL work to agents via `task` tool
- Never write code directly
- Never run subagents in background (always foreground, wait for completion)
- Only small summaries returned to parent (minimal context pollution)

---

## WORKFLOW OVERVIEW

```
Composer → Work → Orch → Work → Orch → Work → Orch → ... → Orch (complete)
```

1. **Composer**: Creates session, decomposes plan, writes queue, returns first task
2. **Work Agent**: Executes task, writes results, returns brief outcome
3. **Orchestrator**: Reads state, updates progress, returns next task (or gate result)
4. **Repeat** until Orchestrator returns "COMPLETE"

---

## PHASE 1: INITIALIZATION

### 1.1 Load Pending Plan

```bash
# List available pending plans
npx tsx ORCHESTRATION/cli/orch.ts plan list-pending

# Load specific plan (or latest if no argument)
npx tsx ORCHESTRATION/cli/orch.ts plan load-pending [plan-timestamp.json]
```

### 1.2 Spawn Composer

```python
Task(
  subagent_type="composer",
  prompt="""
  Execute composer initialization.

  Pending Plan Path: {$ARGUMENTS or "latest"}

  Instructions:
  1. Read pending plan from context hub
  2. Create new session via CLI
  3. Decompose into phases/subtasks with agent assignments
  4. Write to context hub: plan.json, dispatch-queue.json, state.json
  5. Return ONLY a brief summary (see format below)
  """
)
```

**Expected Composer Response** (~50-100 tokens):
```
Session {sessionId} created.
{n} phases, {m} tasks.
First: {agent} for "{brief task description}"
```

---

## PHASE 2: EXECUTION LOOP

After Composer returns, enter the execution loop:

```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTION LOOP (repeat until "COMPLETE")                   │
│                                                             │
│  1. Parse Composer/Orch response for next agent + task      │
│  2. Spawn Work Agent with task                              │
│  3. Spawn Orchestrator to get next instruction              │
│  4. If Orch returns "COMPLETE" → exit loop                  │
│  5. Otherwise → repeat from step 1                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Spawn Work Agent

Based on previous response (Composer or Orch), spawn the indicated agent:

```python
# Agent type from previous response
Task(
  subagent_type="{agent from response}",  # explore, developer, browser, analyst, etc.
  prompt="""
  Session: {sessionId}
  Task ID: {taskId}

  Task: {task description from response}

  Instructions:
  1. Execute the task fully
  2. Write results to context hub or Serena memory as appropriate
  3. Return ONLY a brief summary (see format below)

  Context: Read relevant memories from context hub if needed.
  """
)
```

**Expected Work Agent Response** (~30-50 tokens):
```
Done. {Key outcome in 5-10 words}.
Wrote: {memory name or file path or "no output"}.
```

**On Failure**:
```
Failed. {Brief error description}.
Error: {specific error message}.
```

### 2.2 Spawn Orchestrator

After EVERY work agent completes, spawn Orchestrator:

```python
Task(
  subagent_type="orchestrator",
  prompt="""
  Session: {sessionId}
  Previous Task: {taskId}
  Previous Result: {work agent's response}

  Instructions:
  1. Read state.json and dispatch-queue.json from context hub
  2. Mark previous task complete (or failed)
  3. Check if gate condition applies (end of phase)
  4. Determine next task
  5. Update state.json
  6. Return ONLY a brief summary (see format below)
  """
)
```

**Expected Orchestrator Responses**:

*Next Task* (~40-60 tokens):
```
Progress: {n}/{total} tasks.
Phase {p}: {phase name}.
Next: {agent} for "{brief task description}"
Task ID: {taskId}
```

*Gate Check Passed* (~50-70 tokens):
```
Phase {p} gate PASSED.
Condition: {condition} ({details}).
Progress: {n}/{total} tasks.
Next: {agent} for "{brief task description}"
Task ID: {taskId}
```

*Gate Check Failed* (~60-80 tokens):
```
Phase {p} gate FAILED.
Condition: {condition}
Reason: {specific failure reason}
Fix: {agent} for "{fix description}"
Task ID: {taskId} (retry)
```

*Complete* (~40-60 tokens):
```
COMPLETE.
Session: {sessionId}
{n}/{n} tasks, {p}/{p} gates passed.
Key outcomes:
- {outcome 1}
- {outcome 2}
```

### 2.3 Loop Control

```python
# Pseudo-logic for parent
while True:
    # Get next instruction from last response (Composer or Orch)
    next_agent, next_task, task_id = parse_response(last_response)

    if next_agent == "COMPLETE":
        break

    # Spawn work agent
    work_result = Task(next_agent, task_prompt)

    # Spawn orchestrator
    last_response = Task("orchestrator", orch_prompt_with_work_result)
```

---

## AGENT SELECTION REFERENCE

| Task Type | Agent | Use When |
|-----------|-------|----------|
| Codebase analysis | `explore` | Understanding architecture, finding patterns |
| Implementation | `developer` | Writing code, refactoring, fixes |
| Type-safe edits | `developer` | Mutations requiring typecheck validation |
| UI/E2E testing | `browser` | Testing user flows, capturing evidence |
| Integration check | `analyst` | Verifying connections, mock detection |
| Documentation | `context7` | Fetching library docs |
| Database ops | `developer` | Convex schema, queries, mutations |

---

## FAILURE HANDLING

Orchestrator handles all failure recovery. No abort threshold - keep retrying.

| Failure Type | Orch Response | Parent Action |
|--------------|---------------|---------------|
| Task failed | "Fix: {agent} for {fix}" | Spawn indicated agent |
| Gate failed (typecheck) | "Fix: developer for {errors}" | Spawn developer |
| Gate failed (tests) | "Fix: browser for {test fix}" | Spawn browser |
| Gate failed (other) | "Fix: {agent} for {reason}" | Spawn indicated agent |

**Orch determines recovery** - parent just follows instructions.

---

## COMPLETION

When Orchestrator returns "COMPLETE":

```bash
# 1. Session already marked complete by Orch
# 2. Optionally view final state
npx tsx ORCHESTRATION/cli/orch.ts session status

# 3. Archive pending plan
npx tsx ORCHESTRATION/cli/orch.ts plan archive-pending

# 4. Optionally persist summary to Serena memory
mcp__serena__write_memory("SESSION_ORCH_{date}", "{orch final summary}")
```

---

## EXECUTION CHECKLIST

```
□ INITIALIZATION
  □ Pending plan loaded
  □ Composer spawned
  □ Session created (by Composer)
  □ Queue written (by Composer)
  □ First task identified

□ EXECUTION LOOP
  □ Work agent spawned with task
  □ Work agent returned summary
  □ Orchestrator spawned
  □ Orchestrator returned next instruction
  □ Repeat until COMPLETE

□ COMPLETION
  □ Orchestrator returned COMPLETE
  □ Pending plan archived
  □ Summary persisted (optional)
```

---

## EXAMPLE EXECUTION TRACE

```
Parent: Task(composer, "Initialize from pending plan")
Composer: "Session 20260120_12-30_abc. 2 phases, 5 tasks. First: explore for 'Analyze auth'"

Parent: Task(explore, "Analyze auth architecture")
Explore: "Done. Found 3 auth entry points. Wrote: AUTH_ANALYSIS memory."

Parent: Task(orchestrator, "Previous: task-1.1 Done")
Orch: "Progress: 1/5. Phase 1. Next: developer for 'Refactor token handling'. Task ID: task-1.2"

Parent: Task(developer, "Refactor token handling")
Developer: "Done. Refactored token refresh. Typecheck passes."

Parent: Task(orchestrator, "Previous: task-1.2 Done")
Orch: "Progress: 2/5. Phase 1 gate PASSED (typecheck: 0 errors). Next: browser for 'E2E auth test'. Task ID: task-2.1"

Parent: Task(browser, "E2E auth test")
Browser: "Done. Auth flow verified. Screenshot saved."

Parent: Task(orchestrator, "Previous: task-2.1 Done")
Orch: "Progress: 3/5. Phase 2. Next: browser for 'E2E token refresh'. Task ID: task-2.2"

Parent: Task(browser, "E2E token refresh test")
Browser: "Failed. Token refresh button not found."

Parent: Task(orchestrator, "Previous: task-2.2 Failed")
Orch: "Progress: 3/5. Phase 2 gate FAILED. Reason: E2E test failed. Fix: developer for 'Add refresh button to UI'. Task ID: task-2.2-fix"

Parent: Task(developer, "Add refresh button to UI")
Developer: "Done. Added refresh button. Typecheck passes."

Parent: Task(orchestrator, "Previous: task-2.2-fix Done")
Orch: "Progress: 3/5. Retry: browser for 'E2E token refresh'. Task ID: task-2.2"

Parent: Task(browser, "E2E token refresh test")
Browser: "Done. Token refresh verified."

Parent: Task(orchestrator, "Previous: task-2.2 Done")
Orch: "Progress: 4/5. Phase 2 gate PASSED. Next: developer for 'Update docs'. Task ID: task-3.1"

Parent: Task(developer, "Update docs")
Developer: "Done. README updated."

Parent: Task(orchestrator, "Previous: task-3.1 Done")
Orch: "COMPLETE. Session 20260120_12-30_abc. 5/5 tasks, 2/2 gates. Key outcomes: - Auth refactored - E2E verified"

Parent: Done. Archive pending plan.
```

---

## FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ /orch-execute                                                   │
│                                                                 │
│  ┌─────────┐                                                    │
│  │ Composer │──► "Session X. First: explore for 'Analyze auth'" │
│  └─────────┘         │                                          │
│                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ LOOP                                                      │   │
│  │   ┌──────────┐                                            │   │
│  │   │Work Agent│──► "Done. {outcome}. Wrote: {memory}"      │   │
│  │   └──────────┘         │                                  │   │
│  │                        ▼                                  │   │
│  │   ┌────────────┐                                          │   │
│  │   │Orchestrator│──► "Progress: n/m. Next: {agent}..."     │   │
│  │   └────────────┘    OR "COMPLETE"                         │   │
│  │         │                                                 │   │
│  │         ▼                                                 │   │
│  │   [COMPLETE?]───yes──► EXIT LOOP                          │   │
│  │         │no                                               │   │
│  │         └──────────► back to Work Agent                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                      │                                          │
│                      ▼                                          │
│  Archive pending plan, persist summary                          │
└─────────────────────────────────────────────────────────────────┘
```
