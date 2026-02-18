# DISCOVER - VDD Phase 1 Discovery & Solutions Matrix

**Input**: [$ARGUMENTS] - Feature/bug description, query, or area to investigate

**Discovery-only protocol**: 3 parallel agents (2x `Explore` + 1x `data`, all `opus`) → Orchestrator synthesizes into Solutions Matrix. No code changes, no browser testing — analysis and recommendations only. All agents set to thoroughness level `very thorough`.

**IMPORTANT**: Always delegate to subagents via `Task` tool. Never `Edit` or `Write` code. Analysis & presentation only

**IMPORTANT**: STEP 1 - Discovery: ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL agent prompts BEFORE emitting the block. Any text output between calls forces a round-trip, serializing them.

---

## **STEP 1: DISCOVERY (3 agents, parallel, opus)**

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

---

## **STEP 2: SOLUTIONS MATRIX (Orchestrator synthesis)**

After all 3 agents return, synthesize findings into this structured output:

```
## Solutions Matrix: [$ARGUMENTS]

### Executive Summary
[2-3 sentences: what was found, key insight, recommended approach]

### Affected Surface
| Layer | Files | Key Symbols | Line Count |
|-------|-------|-------------|------------|
| Backend | ... | ... | ... |
| Frontend | ... | ... | ... |
| Shared | ... | ... | ... |

### Data Layer Status
| Table | Fields Needed | Current State | Migration? |
|-------|---------------|---------------|------------|
| ... | ... | ... | Yes/No |

### Solution Options
| # | Approach | Pros | Cons | Effort | Risk |
|---|----------|------|------|--------|------|
| 1 | [Recommended] ... | ... | ... | S/M/L | Low/Med/High |
| 2 | [Alternative] ... | ... | ... | S/M/L | Low/Med/High |

### Implementation Sequence (Recommended)
| Step | File(s) | Change | Depends On |
|------|---------|--------|------------|
| 1 | ... | ... | - |
| 2 | ... | ... | Step 1 |

### Regression Risks
| Risk | Affected Feature | Likelihood | Mitigation |
|------|------------------|------------|------------|
| ... | ... | Low/Med/High | ... |

### Open Questions
- [Any ambiguities or decisions needed before implementation]
```

---

## EXECUTION FLOW

```
┌──────────────────────────────────────────────────────┐
│ STEP 1: DISCOVERY (3× opus, parallel, single message) │
│ ├── Agent 1 (Explore): Code patterns, dependencies    │
│ ├── Agent 2 (Explore): Architecture, regression risks  │
│ └── Agent 3 (data): Schema, samples, migrations        │
├──────────────────────────────────────────────────────┤
│ STEP 2: SOLUTIONS MATRIX (Orchestrator)                │
│ └── Synthesize all 3 agent outputs into matrix         │
│     → Present to user                                  │
└──────────────────────────────────────────────────────┘
```

---

## CRITICAL RULES

1. **3 agents in PARALLEL** — ALL `Task` invocations in a single `<function_calls>` block with ZERO text between `</invoke>` and `<invoke>`. Plan ALL prompts BEFORE emitting.
2. **All agents use `model: opus`** — Discovery requires depth
3. **Explore prompts include "VERY THOROUGH"** — Thoroughness is conveyed in the prompt, not as a parameter
4. **Never run in background** — Wait for all results
5. **No code changes** — Analysis and recommendations only
6. **Orchestrator synthesizes** — Don't dump raw agent output, build the matrix
7. **Solutions matrix is the deliverable** — Structured, actionable, decision-ready

**IMPORTANT**: STEP 1 - Discovery: ALL `Task` invocations in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Plan ALL prompts BEFORE emitting. Any text output between calls forces a round-trip, serializing them.