# VDD-LITE - Lightweight Agentic Execution (No Plan Phase)

**Input**: [$ARGUMENTS] - Feature/bug description, query, or following `/image` / `/image-enhance` analysis output

**VDD-LITE is a 3-phase agent pattern that skips the Plan phase for faster iteration on well-scoped tasks.**

**Agent strategy**: `DISCOVERY` In parallel (1x `Explore` & 1x `data`) → Orchestrator synthesizes → `developer` → `browser` → Tests Pass → done
**Test Failure Iteration**: `Explore` & `data` In parallel → `developer` → `browser` → repeat until all tests pass (**Iterative Loop**)

---

## **Phase 1: DISCOVERY** → Agents: 1x `Explore` & 1x `data` (Parallel, Model `opus`)

ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL agent prompts BEFORE emitting the block.

### Agent 1: EXPLORE — Code Patterns, Implementation, Architecture & Regression Risk

**Task tool parameters:**
- `subagent_type`: `Explore`
- `model`: `opus`
- `description`: `Code patterns, implementation mapping, architecture & regression risk analysis `
- `prompt`:

> Perform VERY THOROUGH exploration (use comprehensive analysis across multiple locations and naming conventions) for: $ARGUMENTS
>
> MISSION: Map code patterns, file dependencies, implementation approaches, architecture & regression risk analysis.
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
> OUTPUT: File list with line counts, dependency graph, pattern inventory, implementation entry points, architecture impact diagram, consumer list, regression risk matrix, API contract inventory


### Agent 2: DATA — Schema & Data Diagnosis

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

**GATE**: Wait for both agents to complete. Do NOT proceed until both return.
**Synthesis**: Orchestrator combines both findings directly into developer task prompt (NO Plan agent).

---

## **Phase 2: DEVELOP** → Agent: `developer` (Model `opus`)

**Task tool parameters:**
- `subagent_type`: `developer`
- `model`: `opus`
- `description`: `Implement [feature/fix description]`
- `prompt`: Include synthesized DISCOVERY findings + $ARGUMENTS + ordered task list assembled by orchestrator

The orchestrator builds the developer prompt by:
1. Summarizing Explore findings (files to modify, patterns to follow, regression risks)
2. Including Data diagnosis (schema state, migration needs, test data)
3. Writing a clear ordered task list derived from the discovery outputs
4. Specifying acceptance criteria

Purpose: ALL modifications — code AND data (migrations, seeds)
- Sequence: DISCOVER → LOCATE → UNDERSTAND → EDIT (data ops + code) → VALIDATE
- During EDIT: Run migrations → seed data → write feature code → typecheck
- Typecheck is BLOCKING — must pass before phase completes

---

## **Phase 3: TEST** → Agent: `browser` (Model `opus`)

**Task tool parameters:**
- `subagent_type`: `browser`
- `model`: `opus`
- `description`: `E2E test [feature/fix description]`
- `prompt`: Include test scenarios derived from $ARGUMENTS and developer output

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

**Iteration**: DISCOVERY → DEVELOP → TEST → (pass: done | fail: loop)

**Rules**:
**IMPORTANT**: Phase 1 - Discovery: ALL `Task` invocations in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL prompts BEFORE emitting.
- Orchestrator synthesizes discovery outputs into developer task list directly — NO Plan agent
- `Explore` & `data` agents use `model: opus`
- `developer` handles ALL modifications (migrations, seeds, code)
- `browser` pass → done
- `browser` fail (code issue) → new `Explore` → `developer` → `browser`
- `browser` fail (data issue) → new `data` → `developer` → `browser`
- Typecheck is blocking — never skip
- Two-layer verification: frontend + backend
- Never run subagents in background
