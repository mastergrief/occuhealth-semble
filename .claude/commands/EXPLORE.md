# CODEBASE EXPLORATION V2 - OPTIMIZED 2×4 AGENT DESIGN

**Deep analysis using 4 sequential batches of 2 parallel `Explore` agents (8 total) set to thoroughness level `very thorough` + `synthesis` agent to analyse [$ARGUMENTS] (directory path, file pattern, or query)**

**Agent Strategy**: 4x parallel batches of `Explore` agents 2× haiku (discovery) → 2× sonnet (data flow) → 2× opus (deep analysis) → 2× haiku (verification) → opus `synthesis` agent.

**IMPORTANT**: Always delegate to subagents via `Task` tool. Never `Edit`or `Write` code. Always spawn batch agents in parallel. Analysis & presentation only.

**Context Hub**: All findings written to `EXPLORE/context-hub/` for token-efficient synthesis.

**Token Pattern**: Agents write detailed findings to context hub, return ONLY 1-2 line summary to parent (~100 tokens per agent vs 15,000+).

**4-Phase Analysis workflow for `Explore` agents**: 
1. Discovery (rg commands) - `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

---

## **STEP 0: CLARIFICATION & SESSION START**

On submission of [$ARGUMENTS], use `AskUserQuestion` to clarify scope:

```
AskUserQuestion:
  questions:
    - question: "What's the exploration goal?"
      header: "Goal"
      options:
        - label: "Full exploration"
          description: "Complete analysis - architecture, data flow, quality, security"
        - label: "Architecture review"
          description: "Structure, modules, dependencies, patterns"
        - label: "Bug hunting"
          description: "Potential bugs, edge cases, error handling gaps"
        - label: "Security audit"
          description: "OWASP-focused security analysis"
        - label: "Pre-Implementation analysis"
          description: "Analyse architecture, structure, entry points, data flow, dependencies, integrations, functional workflopws, edge cases, error handling"
      multiSelect: false

    - question: "Any specific concerns?"
      header: "Concerns"
      options:
        - label: "None - general analysis"
          description: "Let agents find what's important"
        - label: "Performance issues"
          description: "Caching, re-renders, memory leaks"
        - label: "Type safety"
          description: "Type errors, any casts, missing validations"
        - label: "Test coverage"
          description: "Untested code, missing edge cases"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "Balanced - good coverage without excess"
        - label: "Quick scan"
          description: "High-level overview, major issues only"
        - label: "Deep dive"
          description: "Exhaustive analysis, all findings"
      multiSelect: false
```

### Start Session

```bash
npx tsx EXPLORE/cli/explore.ts session start --type=exploration --target=$ARGUMENTS --mode=full_scan
```

---

## **STEP 1: DISCOVERY (2× haiku, very thorough)**

Launch 2 `Explore` agents with `haiku` model set to thoroughness level `very thorough` **in parallel**.

### Agent 1: Inventory, Architecture & Entry Points
```
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Map complete codebase structure, architecture, and entry points.

INVENTORY:
1. List ALL files/directories recursively with 100% coverage
2. Categorize by purpose (components, hooks, utils, configs, tests, types)
3. Flag file sizes (>400 lines = concern, >800 = must-split)
4. Note unusual or misplaced files

ARCHITECTURE:
5. Find ALL entry points (index files, main exports, CLI scripts, servers)
6. Map module boundaries and public interfaces
7. Document facade patterns and re-exports
8. Create import/dependency graph between modules
9. Identify initialization and lifecycle patterns

Output: File inventory with line counts, ASCII architecture diagram, module relationship map.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 1, agentId: 'discovery-inventory-architecture', category: 'discovery') to /tmp/batch1-agent1.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=1 /tmp/batch1-agent1.json'. Return ONLY summary line."
)
```

### Agent 2: Dependencies & Integrations
```
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Map all external dependencies, integrations, and configuration.

DEPENDENCIES:
1. Identify ALL third-party libraries and usage patterns
2. Check for outdated dependencies or version conflicts
3. Map dev vs production dependencies
4. Document build tools and bundlers

INTEGRATIONS:
5. Map external API integrations and endpoints
6. Document service integrations (databases, auth, AI, storage)
7. Identify configuration files and their purposes
8. List environment variables and their usage
9. Check for hardcoded values that should be configurable

Output: Dependency graph, integration map, config inventory, env var catalog.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 1, agentId: 'discovery-dependencies', category: 'discovery') to /tmp/batch1-agent2.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=1 /tmp/batch1-agent2.json'. Return ONLY summary line."
)
```

**GATE**: Wait for both agents. Parent receives ~100 tokens.

---

## **STEP 2: DATA FLOW (2× sonnet, very thorough)**

Launch 2 `Explore` agents with `sonnet` model set to thoroughness level `very thorough` **in parallel**.

### Agent 1: State, APIs & Transformations
```
Task(
  subagent_type="Explore",
  model="sonnet",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Trace all state management, API contracts, and data transformations.

STATE MANAGEMENT:
1. Identify all state stores (Context, Redux, Zustand, atoms, localStorage, etc.)
2. For each state slice: trace read and write locations
3. Map state flow: trigger → handler → update → re-render
4. Find orphaned state (written but never read)
5. Identify circular dependencies or prop drilling

API CONTRACTS:
6. Map all API calls (REST, GraphQL, RPC, WebSocket)
7. Document request/response shapes and types
8. Trace: API response → transform → state → UI
9. Check type alignment (frontend types vs backend)

TRANSFORMATIONS:
10. Map data mappers, formatters, validators
11. Trace entity lifecycle: create → read → update → delete
12. Identify data normalization points
13. Find potential data loss (optional fields dropped)
14. Document format conversions (dates, currencies, etc.)

Output: State flow diagram, API contract inventory, transformation pipeline map.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 2, agentId: 'dataflow-state-api-transforms', category: 'dataflow') to /tmp/batch2-agent1.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=2 /tmp/batch2-agent1.json'. Return ONLY summary line."
)
```

### Agent 2: Side Effects & Async Operations
```
Task(
  subagent_type="Explore",
  model="sonnet",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Catalog all side effects, async patterns, and runtime behavior.

SIDE EFFECTS:
1. Map ALL side effects (API calls, storage, events, timers)
2. Document event subscriptions and listeners
3. Find mutation triggers and cascading effects
4. Identify cleanup patterns (useEffect returns, AbortController, etc.)

ASYNC OPERATIONS:
5. Trace async flows (pending → success/error)
6. Map loading state management
7. Document retry and timeout patterns
8. Check error boundary coverage for async ops

RUNTIME CONCERNS:
9. Verify cleanup on unmount/navigation
10. Identify potential memory leaks
11. Find dangling subscriptions or timers
12. Check for race conditions

Output: Side effect inventory, async flow diagram, cleanup coverage matrix, leak risk list.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 2, agentId: 'dataflow-async-effects', category: 'dataflow') to /tmp/batch2-agent2.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=2 /tmp/batch2-agent2.json'. Return ONLY summary line."
)
```

**GATE**: Wait for both agents. Parent receives ~100 tokens.

---

## **STEP 3: DEEP ANALYSIS (2× opus, very thorough)**

Launch 2 `Explore` agents with `opus` model set to thoroughness level `very thorough` **in parallel**. These agents should catch anything missed in earlier batches.

### Agent 1: Errors, Edge Cases & Quality
```
Task(
  subagent_type="Explore",
  model="opus",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Deep analysis of error handling, edge cases, and code quality. Catch anything previous batches may have missed.

ERROR HANDLING:
1. Map ALL error handling (try/catch, .catch(), error boundaries)
2. Trace error propagation paths (throw → catch → UI)
3. Find unhandled promise rejections or missing catches
4. Identify silent failures or swallowed errors
5. Document recovery patterns and user-facing messages

EDGE CASES:
6. Check handling of: empty states, nulls, undefined, boundaries
7. Validate input sanitization coverage
8. Find race conditions and timing edge cases
9. Identify missing defensive checks

CODE QUALITY:
10. Check for code duplication and DRY violations
11. Find overly complex functions (high cyclomatic complexity)
12. Identify naming convention violations
13. Find magic numbers/strings without constants
14. Locate dead code or unused exports
15. Document technical debt and TODOs

TESTING:
16. Map test files and coverage areas
17. Identify untested critical paths
18. Find coverage gaps in edge cases

Output: Error taxonomy, edge case inventory, quality issues list, test coverage gaps.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 3, agentId: 'deep-errors-quality', category: 'quality') to /tmp/batch3-agent1.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=3 /tmp/batch3-agent1.json'. Return ONLY summary line."
)
```

### Agent 2: Performance & Security
```
Task(
  subagent_type="Explore",
  model="opus",
  prompt="Perform VERY THOROUGH exploration of $ARGUMENTS.

MISSION: Deep analysis of performance and security. Catch anything previous batches may have missed.

PERFORMANCE:
1. Identify caching strategies and memoization usage
2. Find missing optimization opportunities (memo, useMemo, useCallback)
3. Check for N+1 queries or inefficient data fetching
4. Identify bundle size concerns and code splitting opportunities
5. Find unnecessary re-renders or computation
6. Document bottlenecks and optimization priorities

SECURITY:
7. Check secrets handling and env variable usage
8. Validate authentication patterns
9. Validate authorization checks (route guards, permission checks)
10. Find input validation gaps (injection, XSS risks)
11. Check for data exposure in responses or logs
12. Identify insecure patterns (eval, innerHTML, dangerouslySetInnerHTML)
13. Document OWASP Top 10 compliance gaps

MISSED ITEMS:
14. Review for anything previous batches may have overlooked
15. Cross-reference findings for inconsistencies

Output: Performance profile, security assessment, OWASP checklist, prioritized remediation list.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 3, agentId: 'deep-perf-security', category: 'quality') to /tmp/batch3-agent2.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=3 /tmp/batch3-agent2.json'. Return ONLY summary line."
)
```

**GATE**: Wait for both agents. Parent receives ~100 tokens.

---

## **STEP 4: VERIFICATION (2× haiku, very thorough)**

Launch 2 `Explore` agents with `opus` model set to thoroughness level `very thorough` **in parallel**.

### Agent 1: Architecture & Consistency Validation
```
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="Perform VERY THOROUGH verification of $ARGUMENTS.

MISSION: Validate architecture claims and check consistency across codebase.

ARCHITECTURE VALIDATION:
1. Confirm file counts and line counts from discovery
2. Verify module boundaries are respected
3. Validate dependency graph (no orphans, circular deps)
4. Check for dead code paths
5. Confirm facade patterns correctly implemented

CONSISTENCY CHECKS:
6. Verify naming convention adherence throughout
7. Check error handling consistency across modules
8. Validate type consistency across boundaries
9. Find inconsistent patterns (different approaches to same problem)
10. Check for duplicate implementations
11. Verify configuration consistency

Output: Verification status, corrections to previous findings, inconsistencies list.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 4, agentId: 'verify-architecture-consistency', category: 'verification') to /tmp/batch4-agent1.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=4 /tmp/batch4-agent1.json'. Return ONLY summary line."
)
```

### Agent 2: Documentation & Completeness
```
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="Perform VERY THOROUGH verification of $ARGUMENTS.

MISSION: Verify documentation coverage and overall completeness.

DOCUMENTATION:
1. Compare documented vs implemented features
2. Identify undocumented APIs/functions
3. Check inline comment quality and accuracy
4. Verify README completeness
5. Find outdated documentation
6. Identify missing type definitions or JSDoc

COMPLETENESS:
7. Verify all critical paths have been analyzed
8. Check for unexplored directories or modules
9. Confirm example code validity
10. Assess onboarding documentation gaps
11. Flag any areas needing deeper investigation

Output: Documentation coverage %, gaps list, completeness assessment.

**CONTEXT HUB**: Write BatchFinding JSON (batchNumber: 4, agentId: 'verify-documentation', category: 'verification') to /tmp/batch4-agent2.json, then run 'npx tsx EXPLORE/cli/explore.ts findings write --batch=4 /tmp/batch4-agent2.json'. Return ONLY summary line."
)
```

**GATE**: Wait for both agents. Parent receives ~100 tokens.

---

## **STEP 5: SYNTHESIS (opus - fresh context)**

**CRITICAL**: Spawn dedicated `synthesis` agent. Do NOT synthesize in parent.

```
Task(
  subagent_type="synthesis",
  model="opus",
  prompt="Read ALL findings from EXPLORE context hub and generate comprehensive report.

1. Read all batch findings: 'npx tsx EXPLORE/cli/explore.ts findings read --all --json'
2. Analyze cumulative findings across all 4 batches (8 agents)
3. Generate structured report:
   - Executive summary with health scores (Architecture/Data Flow/Quality/Security)
   - Architecture diagram (ASCII)
   - Data flow diagram
   - Dependency graph
   - Findings table by category with severity counts
   - Source tree with feature mapping
   - Prioritized improvements (Critical → High → Medium → Low)
   - Technical debt inventory
   - Recommended next actions
4. Write report: 'npx tsx EXPLORE/cli/explore.ts report write /tmp/synthesis-report.json'
5. Return brief summary (health scores, critical count, report location)"
)
```

### End Session

```bash
npx tsx EXPLORE/cli/explore.ts session end
```

### View Report

```bash
npx tsx EXPLORE/cli/explore.ts report read
```

---

## EXECUTION FLOW

```
┌──────────────────────────────────────────────────────────┐
│ STEP 0: CLARIFICATION + SESSION START                    │
│ └── AskUserQuestion → session start                      │
├──────────────────────────────────────────────────────────┤
│ BATCH 1: DISCOVERY (2× haiku)                            │
│ ├── Agent 1: Inventory, Architecture, Entry Points       │
│ └── Agent 2: Dependencies & Integrations                 │
│     → ~100 tokens to parent                              │
├──────────────────────────────────────────────────────────┤
│ BATCH 2: DATA FLOW (2× sonnet)                           │
│ ├── Agent 1: State, APIs & Transformations               │
│ └── Agent 2: Side Effects & Async                        │
│     → ~100 tokens to parent                              │
├──────────────────────────────────────────────────────────┤
│ BATCH 3: DEEP ANALYSIS (2× opus)                         │
│ ├── Agent 1: Errors, Edge Cases & Quality                │
│ └── Agent 2: Performance & Security                      │
│     → ~100 tokens to parent (catch-all for missed items) │
├──────────────────────────────────────────────────────────┤
│ BATCH 4: VERIFICATION (2× haiku)                         │
│ ├── Agent 1: Architecture & Consistency                  │
│ └── Agent 2: Documentation & Completeness                │
│     → ~100 tokens to parent                              │
├──────────────────────────────────────────────────────────┤
│ SYNTHESIS: (1× opus, fresh context)                      │
│ └── Reads all findings, generates report                 │
│     → ~100 tokens to parent                              │
├──────────────────────────────────────────────────────────┤
│ Parent total: ~500 tokens (vs 80,000+ without pattern)   │
└──────────────────────────────────────────────────────────┘
```

---

## BatchFinding Schema

```json
{
  "id": "batch<N>-<agentId>-<timestamp>",
  "batchNumber": 1,
  "agentId": "discovery-inventory-architecture",
  "model": "haiku|sonnet|opus",
  "timestamp": "ISO8601",
  "category": "discovery|dataflow|quality|verification",
  "findings": [
    {
      "id": "finding-<uuid>",
      "type": "architecture_issue|performance|security_risk|test_gap|...",
      "severity": "critical|high|medium|low|info",
      "title": "Short description",
      "description": "Detailed explanation",
      "location": { "file": "path", "line": 45, "symbol": "name" },
      "evidence": ["Code snippet", "Diagram"],
      "suggestedFix": "Recommendation"
    }
  ],
  "metadata": {
    "sessionId": "<from session>",
    "targetPath": "$ARGUMENTS"
  }
}
```

---

## CRITICAL RULES

1. **Agents write to files, return only summaries** - Never return full findings to parent
2. **Do NOT run agents in background** - Wait for each batch
3. **Launch 2 agents per batch in SINGLE message** - Parallel execution
4. **Very thorough for ALL agents** - Comprehensive regardless of model use thoroughness level `very thorough`
5. **Model escalation**: `haiku` → `sonnet` → `opus` → `haiku`
6. **Opus batch is catch-all** - Explicitly catches anything missed
7. **Synthesis uses fresh context** - Reads files, not parent context
8. **100% coverage** - Read completely, do not skim
9. **Evidence-based** - Include file:line references
10. **Always run all 4 batches** - Don't skip phases
11. **Clarify scope first** - Always AskUserQuestion
12. **Never implement changes** - Analysis only
