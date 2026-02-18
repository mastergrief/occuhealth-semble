# VDD-EXECUTE - Agentic Planning, Execution, Testing & Iteration

**Input**: [$ARGUMENTS] - Feature/bug description, query, or following `/image` / `/image-enhance` analysis output

**Validation Driven Development (VDD) Protocol is a 4-phase agent pattern for full-stack implementation & iteration using the `Task` tool**

**Agent strategy**: `DISCOVERY` in parallel (2x `Explore` & 1x `data`) → `Plan` (includes sizing + testable assertions) → `developer` (1 for small, 2+ sequential for medium/large) → [`review` + `browser`] in parallel → Both Pass → continue with remaining tasks (No need to plan twice unless fresh discovery or new [$ARGUMENTS])
**Validation Failure Iteration**: Review FAIL or browser FAIL → `Explore` & `data` in parallel → `developer` → [`review` + `browser`] → repeat until both pass (**Iterative Loop**)

**IMPORTANT**: Phase 1 - Discovery: ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL agent prompts BEFORE emitting the block. Any text output between calls forces a round-trip, serializing them.

## **VDD Protocol (Validation Driven Development) - MANDATORY**
4-phase agent pattern for full-stack implementation using `Task` tool:

**Phase 1: DISCOVERY** → Agents: 2x `Explore` & 1x `data` (Parallel, Model `opus`)
ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL agent prompts BEFORE emitting the block:

### Agent 1: EXPLORE — Code Patterns & Implementation

**Task tool parameters:**
- `subagent_type`: `Explore`
- `model`: `opus`
- `description`: `Code patterns & implementation mapping`
- `prompt`:

> Perform VERY THOROUGH exploration (use comprehensive analysis across multiple locations and naming conventions) for: $ARGUMENTS
>
> MISSION: Map code patterns, file dependencies, and implementation approaches.
>
> CODE PATTERNS:
> 1. Find ALL files related to this feature/area
> 2. Map existing patterns used (hooks, utilities, components)
> 3. Document the data pipeline: backend query → frontend transform → UI render
> 4. Identify reusable code and existing abstractions
>
> FILE DEPENDENCIES:
> 5. Create import/dependency graph for affected files
> 6. Identify shared utilities and their consumers
> 7. Flag files approaching size thresholds (>400 lines concern, >800 must-split)
>
> IMPLEMENTATION APPROACH:
> 8. Identify entry points for changes
> 9. Map which symbols need modification vs creation
> 10. Document existing validation, error handling, and edge case patterns
> 11. Note any existing TODO/FIXME comments in the area
>
> OUTPUT: File list with line counts, dependency graph, pattern inventory, implementation entry points.

### Agent 2: EXPLORE — Architecture & Regression Risk

**Task tool parameters:**
- `subagent_type`: `Explore`
- `model`: `opus`
- `description`: `Architecture & regression risk analysis`
- `prompt`:

> Perform VERY THOROUGH exploration (use comprehensive analysis across multiple locations and naming conventions) for: $ARGUMENTS
>
> MISSION: Assess architectural impact, shared dependencies, and regression risks.
>
> ARCHITECTURE:
> 1. Map how this feature integrates with the broader system
> 2. Identify module boundaries crossed by the change
> 3. Document API contracts (backend functions, component props, hook interfaces)
> 4. Check for facade pattern compliance
>
> SHARED DEPENDENCIES:
> 5. Find ALL consumers of code that would be modified
> 6. Use find_referencing_symbols for key functions/components
> 7. Map shared state (contexts, stores) affected
> 8. Identify cross-feature data flows
>
> REGRESSION RISKS:
> 9. List features that could break from changes in this area
> 10. Identify untested integration points
> 11. Document assumptions other code makes about this area
> 12. Flag any recent changes (git log) that might conflict
>
> OUTPUT: Architecture impact diagram, consumer list, regression risk matrix, API contract inventory.

### Agent 3: DATA — Schema & Data Diagnosis

**Task tool parameters:**
- `subagent_type`: `data`
- `model`: `opus`
- `description`: `Data layer & schema diagnosis`
- `prompt`:

> Diagnose data layer for: $ARGUMENTS
>
> SCHEMA ANALYSIS:
> 1. Identify ALL tables/collections relevant to the feature
> 2. Document field types, indexes, and relationships
> 3. Check for schema mismatches or missing fields
> 4. Verify validators and default values
>
> DATA SAMPLING:
> 5. Sample existing data in relevant tables (npx convex data <table> --limit 5)
> 6. Identify data patterns, edge cases, empty states
> 7. Check for orphaned or inconsistent records
>
> MIGRATION & SEED STATUS:
> 8. Check if schema changes are needed
> 9. Identify test data availability
> 10. Document any data prerequisites
>
> OUTPUT: Schema map, data samples, migration needs, test data status.

**GATE**: Wait for all 3 agents. Do NOT proceed until all return.
**Synthesis**: Orchestrator combines all three findings into plan agent prompt.

---

**Phase 2: PLAN** → Agent: `Plan` (Model `opus`)

**Task tool parameters:**
- `subagent_type`: `Plan`
- `model`: `opus`
- `description`: `Implementation plan from discovery`
- `prompt`: Include synthesized DISCOVERY findings + $ARGUMENTS + the sizing directive below

Decomposes DISCOVERY findings into comprehensive implementation plan fitting VDD-Protocol.
- Receives: Data diagnosis + code context + architectural impact from Phase 1
- Output: Ordered task list with file targets, approach, and **testable assertions per developer step**

### Testable Assertions Directive (include in Plan agent prompt)

> **ASSERTIONS**: For each developer step, define concrete pass/fail criteria the developer can self-validate against BEFORE handing off. These also feed the Phase 4 review agent.
>
> **Per developer step**, output:
> ```
> STEP N ASSERTIONS:
> - [backend]: <verifiable statement, e.g. "npx convex run module:query '{}' returns records with field X">
> - [types]: <e.g. "typecheck passes with no new suppressions">
> - [data]: <e.g. "table X has index on field Y, sample record matches shape Z">
> - [frontend]: <e.g. "component renders with props X, hook returns expected shape">
> ```
>
> **Rules**:
> - Every assertion must be mechanically verifiable (command output, type shape, data sample) — no subjective criteria
> - Backend/data assertions validate each step independently — don't defer all validation to browser
> - These assertions become the review agent's checklist in Phase 4

### Sizing Directive (include in Plan agent prompt)

> **DEVELOPER SIZING**: Based on your analysis, classify this task and structure the develop phase:
>
> **SMALL** (1 developer agent): Single concern, ≤3 files modified, no schema changes, no cross-module impact.
> → Output a single task list for one developer agent.
>
> **MEDIUM** (2 sequential developer agents): Multiple concerns but linear dependency, 4-8 files, may include schema + code, or backend + frontend layers.
> → Split into 2 ordered developer steps. Each step must be independently type-safe (typecheck passes after each).
> → Label: `Step 1 of 2: [scope]`, `Step 2 of 2: [scope]`
>
> **LARGE** (3+ sequential developer agents): Cross-cutting changes, 8+ files, multiple modules, schema + backend + frontend + UI.
> → Split into 3+ ordered developer steps. Each step must be independently type-safe.
> → Label: `Step N of M: [scope]`
>
> **Output format**: At the top of your plan, emit:
> ```
> SIZING: SMALL | MEDIUM | LARGE
> DEVELOPER_STEPS: <N>
> ```
> Then provide the ordered task list grouped by developer step.

---

**Phase 3: DEVELOP** → Agent: `developer` (Model `opus`) — scaled by Plan sizing

The number of developer agents is determined by the Plan agent's `DEVELOPER_STEPS` output.

### SMALL (1 developer)

Single `developer` agent receives the full plan.

**Task tool parameters:**
- `subagent_type`: `developer`
- `model`: `opus`
- `description`: `Implement [feature/fix description]`
- `prompt`: Include full plan from Phase 2

### MEDIUM / LARGE (2+ sequential developers)

Spawn developer agents **one at a time, in order**. Each must complete and pass typecheck before the next is spawned. Pass prior step outcomes as context to subsequent steps.

**For each step N of M:**
- `subagent_type`: `developer`
- `model`: `opus`
- `description`: `Step N/M: [step scope]`
- `prompt`: Include Step N tasks from plan + outcomes from steps 1..(N-1)

**Sequencing rules:**
- Each developer step must leave the codebase in a type-safe state (typecheck passes)
- If step N fails typecheck, fix within that same agent — do NOT proceed to step N+1
- Pass a brief summary of what changed in prior steps as context to subsequent steps
- The orchestrator must NOT modify the plan between steps unless a step fails and requires re-planning

**Common split patterns:**
| Split | Step 1 | Step 2 | Step 3 |
|-------|--------|--------|--------|
| Schema + Feature | Schema/migration + backend functions | Frontend components + hooks | Polish + edge cases |
| Backend + Frontend | Convex mutations/queries | React components + state | Integration wiring |
| Refactor + Feature | Extract/refactor existing code | Implement new feature on refactored base | — |

Purpose: ALL modifications — code AND data (migrations, seeds)
- Sequence per step: DISCOVER → LOCATE → UNDERSTAND → EDIT (data ops + code) → VALIDATE
- During EDIT: Run migrations → seed data → write feature code → typecheck
- Receives: Plan from Phase 2 (scoped to current step)

---

**Phase 4: VALIDATE** → Agents: `Explore` (review) & `browser` (E2E) — **Parallel, Model `opus`**

Both agents spawn in a single `<function_calls>` block. Both must pass to proceed.

### Agent A: EXPLORE — Code Review

**Task tool parameters:**
- `subagent_type`: `Explore`
- `model`: `opus`
- `description`: `Code review against plan assertions`
- `prompt`:

> Perform VERY THOROUGH code review for: $ARGUMENTS
>
> You are the review gate. The developer has completed implementation. Your job is to verify correctness against the plan — NOT to suggest stylistic improvements.
>
> INPUTS:
> - Plan from Phase 2 (with testable assertions per step)
> - Discovery findings (regression risks, API contracts)
> - Developer step outcomes
>
> REVIEW CHECKLIST:
> 1. **Assertions**: Verify each step's testable assertions are satisfied. Run backend assertions where possible (`npx convex run`, `npx convex data`).
> 2. **Regression risks**: Check flagged risks from Discovery — were they addressed or avoided?
> 3. **API contracts**: Do modified functions maintain their contracts (args, return types, side-effects)?
> 4. **Logic correctness**: Read modified symbol bodies — does the logic match the plan's intent?
> 5. **Edge cases**: Are empty states, error paths, and boundary conditions handled?
>
> DO NOT flag: style preferences, naming opinions, missing comments, minor formatting.
> DO flag: logic errors, missed requirements, broken contracts, unhandled edge cases, data integrity risks.
>
> OUTPUT: `PASS` or `FAIL` with specific issues. Each issue must reference the assertion, file, and symbol it relates to.

### Agent B: BROWSER — E2E Test

**Task tool parameters:**
- `subagent_type`: `browser`
- `model`: `opus`
- `description`: `E2E test [feature/fix description]`
- `prompt`: Include test scenarios from plan

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

**VERIFY sub-step — backend**: `timeout 5 npx convex logs --history 5` runs by default after UI check (not escalation-only). Catches optimistic updates masking rejected mutations.

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

---

**Iteration**: DISCOVERY → PLAN → DEVELOP (1-N steps) → VALIDATE [review + browser] → (both pass: next task | either fail: loop)

**Rules**:
**IMPORTANT**: Parallel phases (Discovery, Validate): ALL `Task` invocations in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL prompts BEFORE emitting. Any text output between calls forces a round-trip, serializing them.
- Orchestrator (Parent) synthesizes all three Discovery outputs before spawning `Plan`
- `Plan` agent outputs `SIZING` + `DEVELOPER_STEPS` + **testable assertions per step** — spawned after DISCOVERY
- `developer` count is Plan-driven: 1 agent (SMALL), 2+ sequential agents (MEDIUM/LARGE)
- Sequential developers run **one at a time** — each must pass typecheck before the next spawns
- Prior step outcomes are forwarded as context to subsequent developer steps
- `developer` handles ALL modifications (migrations, seeds, code)
- Phase 4 VALIDATE: `review` (Explore) + `browser` spawn **in parallel** — both must pass
- Review PASS + browser PASS → proceed to next task
- Review FAIL (code issue) → new `Explore` → `developer` → re-validate
- Browser FAIL (code issue) → new `Explore` → `developer` → re-validate
- Browser FAIL (data issue) → new `data` → `developer` → re-validate
- Both FAIL → synthesize combined issues → `Explore` & `data` parallel → `developer` → re-validate
- Typecheck is blocking — never skip
- Three-layer verification: code review + frontend E2E + backend logs
- Never run subagents in background

