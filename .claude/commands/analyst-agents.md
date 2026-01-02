# ANALYST-AGENTS - Parallel Codebase Analysis

**Spawn 3 analyst agents in parallel to analyze [$ARGUMENTS] with auto-detected split strategy**

**Mode**: Plan mode required (shift+tab+tab)
**Agents**: 3 Explore (Scout) → 1 Plan → 3 Analyst → Parent synthesis

---

## PHASE 1: SCOUT (Explore Agents)

**Objective**: Discover scope via 3 parallel Explore agents

### 1.1 Launch 3 Explore Agents (SINGLE message, all background)

```python
# Agent 1 - UI Discovery
Task(
  subagent_type="Explore",
  prompt="""
  SCOUT MISSION 1/3: UI Layer Discovery for {$ARGUMENTS}

  Find all UI-related files:
  - Components (src/components/**)
  - Pages (src/pages/**)
  - Hooks (src/hooks/**)
  - Related UI patterns and conventions

  Return: File paths with line counts, component hierarchy, state patterns.
  """,
  run_in_background=True
)

# Agent 2 - API Discovery
Task(
  subagent_type="Explore",
  prompt="""
  SCOUT MISSION 2/3: API Layer Discovery for {$ARGUMENTS}

  Find all API-related files:
  - Convex functions (convex/*.ts, excluding schema)
  - API utilities (src/lib/api/**)
  - Function signatures and exports

  Return: File paths with line counts, function signatures, validation patterns.
  """,
  run_in_background=True
)

# Agent 3 - DB Discovery
Task(
  subagent_type="Explore",
  prompt="""
  SCOUT MISSION 3/3: Database Layer Discovery for {$ARGUMENTS}

  Find all DB-related context:
  - Schema (convex/schema.ts)
  - Generated types (convex/_generated/*)
  - Table relationships and indexes

  Return: Tables, fields, relationships, index definitions.
  """,
  run_in_background=True
)
```

### 1.2 Collect Scout Results
```python
ui_scout = TaskOutput(task_id=explore1_id, block=True)
api_scout = TaskOutput(task_id=explore2_id, block=True)
db_scout = TaskOutput(task_id=explore3_id, block=True)

SCOUT_RESULTS = {
  ui: ui_scout,
  api: api_scout,
  db: db_scout
}
```

### 1.3 Auto-Detect Split Strategy

**Decision Matrix** (applied by parent after collecting results):
| Condition | Strategy | Agent Assignments |
|-----------|----------|-------------------|
| UI files > 5 AND convex files > 3 | `layer` | UI / API / DB |
| Single domain, complex flow | `concern` | Structure / Flow / Quality |
| Multiple distinct components | `domain` | Component clusters |
| Unclear boundaries | `layer` (default) | UI / API / DB |

---

## PHASE 2: PLAN (Plan Agent)

**Objective**: Design optimal analysis strategy via Plan agent

### 2.1 Launch Plan Agent

```python
Task(
  subagent_type="Plan",
  prompt="""
  ANALYSIS PLANNING: {$ARGUMENTS}

  ## Scout Results
  {SCOUT_RESULTS}  # UI, API, DB discovery from Phase 1

  ## Task
  Design a 3-agent parallel analysis strategy:
  1. Select strategy: layer (default), concern, or domain
  2. Define non-overlapping scopes for each agent
  3. Specify exact file assignments per agent
  4. Create agent prompts with output schema

  ## Strategy Options

  **Layer Strategy** (default - when UI files > 5 AND convex files > 3):
  - Agent 1 - UI: src/components/, src/hooks/, src/pages/
  - Agent 2 - API: convex/*.ts (excluding schema), src/lib/api/
  - Agent 3 - DB: convex/schema.ts, convex/_generated/

  **Concern Strategy** (when single domain, complex flow):
  - Agent 1 - STRUCTURE: Symbols, dependencies, module boundaries
  - Agent 2 - FLOW: Data flow FE→BE→DB, state transitions
  - Agent 3 - QUALITY: Error handling, validation, security

  **Domain Strategy** (when multiple distinct components):
  - Cluster files by component/feature domain

  ## Constraints
  - Each file assigned to exactly ONE agent
  - Agents return output (no memory writes)
  - Use standard markers: → UI:, → API:, → DB:

  ## Output Required
  Return structured plan with:
  - Selected strategy + rationale
  - 3 agent assignments (scope, files, focus, prompt)
  - Cross-reference marker conventions
  """,
  run_in_background=False  # Need result before Phase 3
)
```

### 2.2 Boundary Rules (enforced by Plan agent)
- Each file assigned to exactly ONE agent
- Cross-domain refs use standard markers: `→ UI:`, `→ API:`, `→ DB:`
- Agents RETURN output, do NOT write to memory

---

## PHASE 3: SPAWN (Parent)

**CRITICAL**: Launch all 3 agents in a SINGLE message with multiple `Task` tool calls

### 3.1 Agent Output Schema

Each agent MUST return this hybrid markdown + JSON structure:
```markdown
## Domain: {UI|API|DB} Layer

### Architecture
[ASCII diagram of domain structure]

### Source Tree
path/to/file.ts  [~N lines] [M exports]
path/to/other.ts [~N lines] [M exports]

### Functional Analysis
[Prose description of domain purpose and flows]

### Dependencies
```json
{
  "internal": ["./relative/imports"],
  "cross_domain": ["→ API: functionName", "→ DB: tableName"]
}
```

### Edge Cases
- Case 1: description
- Case 2: description

### Traceability
```json
{
  "symbols": ["file.ts:symbolName:lineNum"],
  "entry_points": ["file.ts:exportedFunction"]
}
```

### Confidence
```json
{
  "architecture": 0.9,
  "dependencies": 0.8,
  "completeness": 0.85,
  "gaps": ["Could not determine X", "Y needs review"]
}
```
```

### 3.2 Parallel Agent Launch

```python
# Agent 1 - UI
Task(
  subagent_type="analyst",
  prompt=f"""
PARALLEL ANALYSIS - AGENT 1 of 3 (UI LAYER)
Feature: {$ARGUMENTS}
Strategy: {SCOUT_RESULT.strategy}

## YOUR SCOPE (STRICT BOUNDARIES)
Files: {SCOUT_RESULT.domains.agent1.files}
Focus: {SCOUT_RESULT.domains.agent1.focus}

## INSTRUCTIONS
1. Analyze ONLY files in your scope
2. Use Serena symbolic tools for code exploration
3. Mark cross-domain dependencies with standard markers:
   - API calls: "→ API: functionName"
   - DB references: "→ DB: tableName"
4. Return structured output (DO NOT write to memory)

## OUTPUT FORMAT
Return hybrid markdown + JSON as specified:
- Architecture (ASCII diagram)
- Source Tree (files with metrics)
- Functional Analysis (prose)
- Dependencies (JSON with internal + cross_domain)
- Edge Cases (bullet list)
- Traceability (JSON with symbols + entry_points)
- Confidence (JSON with scores 0-1 + gaps array)

DO NOT call mcp__serena__write_memory. Parent handles synthesis.
""",
  run_in_background=True
)

# Agent 2 - API
Task(
  subagent_type="analyst",
  prompt=f"""
PARALLEL ANALYSIS - AGENT 2 of 3 (API LAYER)
Feature: {$ARGUMENTS}
Strategy: {SCOUT_RESULT.strategy}

## YOUR SCOPE (STRICT BOUNDARIES)
Files: {SCOUT_RESULT.domains.agent2.files}
Tables: {SCOUT_RESULT.domains.agent2.tables}
Focus: {SCOUT_RESULT.domains.agent2.focus}

## INSTRUCTIONS
1. Analyze ONLY files in your scope
2. Use Serena symbolic tools for code exploration
3. Mark cross-domain dependencies:
   - UI consumers: "→ UI: ComponentName"
   - DB operations: "→ DB: tableName.operation"
4. Return structured output (DO NOT write to memory)

## OUTPUT FORMAT
[Same hybrid markdown + JSON structure as Agent 1]

DO NOT call mcp__serena__write_memory. Parent handles synthesis.
""",
  run_in_background=True
)

# Agent 3 - DB
Task(
  subagent_type="analyst",
  prompt=f"""
PARALLEL ANALYSIS - AGENT 3 of 3 (DB LAYER)
Feature: {$ARGUMENTS}
Strategy: {SCOUT_RESULT.strategy}

## YOUR SCOPE (STRICT BOUNDARIES)
Files: {SCOUT_RESULT.domains.agent3.files}
Tables: {SCOUT_RESULT.domains.agent3.tables}
Focus: {SCOUT_RESULT.domains.agent3.focus}

## INSTRUCTIONS
1. Analyze ONLY schema and generated types in your scope
2. Use Serena symbolic tools for code exploration
3. Mark cross-domain dependencies:
   - API consumers: "→ API: functionName"
4. Return structured output (DO NOT write to memory)

## OUTPUT FORMAT
[Same hybrid markdown + JSON structure as Agent 1]

DO NOT call mcp__serena__write_memory. Parent handles synthesis.
""",
  run_in_background=True
)
```

---

## PHASE 4: COLLECT (Parent)

### 4.1 Gather Agent Outputs

```python
# Wait for all agents (outputs returned directly, no memory reads needed)
result1 = TaskOutput(task_id=agent1_id, block=True, timeout=300000)
result2 = TaskOutput(task_id=agent2_id, block=True, timeout=300000)
result3 = TaskOutput(task_id=agent3_id, block=True, timeout=300000)
```

### 4.2 Parse Structured Outputs

Extract from each result:
- Architecture diagram (text between `### Architecture` and next `###`)
- Source tree (text block)
- Functional analysis (prose)
- Dependencies JSON (parse json block)
- Edge cases (bullet list)
- Traceability JSON (parse json block)
- Confidence JSON (parse json block)

### 4.3 Handle Failures

| Failed Agents | Action |
|---------------|--------|
| 0 | Full synthesis |
| 1 | Synthesis with gap noted, flag missing domain |
| 2 | Partial synthesis + recommend re-run |
| 3 | Abort, report errors to user |

**No orphan artifacts** - failed agents simply return error, nothing written.

---

## PHASE 5: SYNTHESIZE (Parent)

### 5.1 Merge Strategy

**Architecture**: Stack diagrams, draw cross-domain connections
```
┌─────────────────────────────────────────────────────────────┐
│                    {$ARGUMENTS}                              │
├───────────────────┬───────────────────┬─────────────────────┤
│  [UI Diagram]     │  [API Diagram]    │  [DB Diagram]       │
│        │          │        │          │        │            │
│        └──────────┼────────┘          │        │            │
│                   └───────────────────┼────────┘            │
│              [Cross-domain flows]                           │
└─────────────────────────────────────────────────────────────┘
```

**Source Tree**: Concatenate with domain tags
```
src/
├── [UI] components/Feature.tsx     [~250 lines] [4 exports]
├── [API] convex/feature.ts         [~180 lines] [6 exports]
└── [DB] convex/schema.ts           [~120 lines] [table: features]
```

**Dependencies**: Merge JSON, resolve cross-refs
```json
{
  "ui_to_api": ["Component.onClick → api.feature.create"],
  "api_to_db": ["createFeature → ctx.db.insert('features')"],
  "db_to_api": ["features table ← api.feature.list"],
  "resolved": ["→ API: create ✓", "→ DB: features ✓"],
  "unresolved": ["→ API: orphanFn ✗"]
}
```

### 5.2 Cross-Reference Validation

Parse all `→ DOMAIN: target` markers and validate:

1. **UI → API**: Every `→ API: fn` in UI output exists in API output?
2. **API → DB**: Every `→ DB: table` in API output exists in DB output?
3. **API → UI**: Every `→ UI: component` in API output exists in UI output?

```
VALIDATION = {
  total_refs: N,
  resolved: M,
  unresolved: [{ ref: "→ API: missing", from: "UI", severity: "warning" }],
  circular: [],
  coverage: "M/N (X%)"
}
```

### 5.3 Confidence Aggregation

```json
{
  "overall": 0.85,
  "by_domain": {
    "ui": { "score": 0.9, "gaps": [] },
    "api": { "score": 0.8, "gaps": ["auth flow unclear"] },
    "db": { "score": 0.85, "gaps": [] }
  },
  "low_confidence_areas": ["API auth flow needs manual review"]
}
```

### 5.4 Generate Unified Document

```markdown
# ANALYSIS: {$ARGUMENTS}
Generated: {timestamp}
Strategy: {layer|concern|domain}
Agents: 3/3 completed
Confidence: {overall}%

## 1. UNIFIED ARCHITECTURE
[Merged diagram with cross-domain connections]

## 2. COMPLETE SOURCE TREE
[Domain-tagged file list]

## 3. FUNCTIONAL ANALYSIS
### 3.1 UI Layer
[Agent 1 analysis]

### 3.2 API Layer
[Agent 2 analysis]

### 3.3 Data Layer
[Agent 3 analysis]

### 3.4 Cross-Layer Flows
[Synthesized from cross-refs]

## 4. DEPENDENCY MAP
### Internal (per domain)
[Merged internal deps]

### Cross-Domain
[Resolved cross-refs with ✓/✗ status]

### External
[Third-party dependencies]

## 5. EDGE CASES & GOTCHAS
### UI Layer
[Agent 1 edge cases]

### API Layer
[Agent 2 edge cases]

### DB Layer
[Agent 3 edge cases]

### Cross-Cutting
[Synthesized from validation]

## 6. VALIDATION REPORT
- Total references: N
- Resolved: M (X%)
- Unresolved: K (list with severity)
- Circular dependencies: (if any)

## 7. TRACEABILITY
{
  "analyzed_symbols": [merged from all agents],
  "entry_points": [merged],
  "data_flow_map": {synthesized}
}

## 8. CONFIDENCE & GAPS
Overall: X%
Low confidence areas: [list]
Recommended manual review: [list]

## 9. CONCLUSION
### Summary
[2-3 sentences]

### Key Insights
[Non-obvious findings]

### Modification Impact
[What changes would affect]
```

### 5.5 Write Single Memory (Atomic)

```bash
mcp__serena__write_memory(
  "ANALYSIS_{$ARGUMENTS}_{YYYYMMDD_HHMMSS}",
  unified_document
)
```

**No cleanup phase** - no partials were created.

---

## EXECUTION CHECKLIST

```
□ Phase 1: Scout (Explore Agents)
  □ 3 Explore agents launched in SINGLE message
  □ All running in background
  □ TaskOutput collected from all 3
  □ Scout results merged (UI + API + DB)

□ Phase 2: Plan (Plan Agent)
  □ Plan agent launched with scout results
  □ Strategy selected (layer/concern/domain)
  □ 3 agent assignments received
  □ Non-overlapping scopes verified

□ Phase 3: Spawn (Analyst Agents)
  □ All 3 analyst agents launched in SINGLE message
  □ All running in background
  □ Agent IDs captured

□ Phase 4: Collect
  □ All TaskOutput calls completed
  □ Structured outputs parsed
  □ Failures handled (if any)

□ Phase 5: Synthesize
  □ Architectures merged
  □ Source trees combined
  □ Cross-refs validated
  □ Confidence aggregated
  □ Unified document generated
  □ SINGLE memory write executed
```

---

## ERROR HANDLING

| Error | Response |
|-------|----------|
| Scout finds no files | Ask user to clarify feature name |
| Agent timeout (>5min) | Continue with available outputs |
| Agent returns malformed output | Log warning, use partial data |
| All agents fail | Abort, report errors |
| Cross-ref unresolved | Flag in report, don't block |
| Memory write fails | Retry once, then output directly to user |

---

## PERFORMANCE

| Phase | Duration | Tokens |
|-------|----------|--------|
| Scout (3 Explore) | ~30-60s | ~3×30k agents |
| Plan (1 Plan) | ~30s | ~50k agent |
| Spawn | ~2s | ~1k |
| Collect | ~60-180s | ~2k |
| Synthesize | ~30s | ~8k |
| **Total** | **~3-5 min** | **~12k parent + 3×30k + 50k + 3×100k** |

**Improvements over previous version**:
- Memory operations: 10 → 1 (90% reduction)
- Artifact cleanup: Required → Eliminated
- Orphan risk: Possible → Impossible
- Format consistency: 3 sources → 1 source
- **Agent-based discovery**: Parallel Explore agents for thorough scouting
- **Delegated planning**: Plan agent designs optimal strategy
