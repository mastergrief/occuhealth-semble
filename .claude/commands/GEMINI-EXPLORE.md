# GEMINI-EXPLORE - AI Second Opinion Codebase Analysis

**Single Gemini Pro call with rg-first workflow (~60-90 seconds)**

**Target:** [$ARGUMENTS] (directory path, file pattern, or query)

**Model**: `gemini-3-pro-preview` (single call)

**CRITICAL RULES**:
- Always use `--model gemini-3-pro-preview -y`
- Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
- Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
- Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
- Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()`, Loop back if gaps found
- **DO NOT read Serena memories** - fresh analysis only

---

## **STEP 0: CLARIFY SCOPE**

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

---

## **STEP 1: EXECUTE GEMINI PRO**

```bash
gemini --model gemini-3-pro-preview -y "PENDING PROMPT 

CRITICAL RULES:
1. DO NOT read Serena memories (skip list_memories/read_memory) - fresh analysis only
2. Discovery (rg commands) - '| wc -l' for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
3. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
4. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
5. Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()`, Loop back if gaps found

TARGET: {TARGET}
GOAL: {GOAL}

STEP 1 - DISCOVERY

PHASE 1 - Inventory, Architecture & Entry Points

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

PHASE 2 - Dependencies & Integrations

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

STEP 2 - DATA FLOW

PHASE 1 - State, APIs & Transformations

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

PHASE 2 - Side Effects & Async Operations

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

STEP 3 - DEEP ANALYSIS

PHASE 1 - Errors, Edge Cases & Quality

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

PHASE 2 - Performance & Security

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

STEP 4 - VERIFICATION

PHASE 1 - Architecture & Consistency Validation

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

PHASE 2 - Documentation & Completeness

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
```

---

**STEP 2: Present Findings & Recommended Next Steps**
On completion of comprehensive analysis and discovery:
- Create wireframe diagram of what you have analysed/discovered
- Create source tree stemming from feature, files associated, dependencies and respective sizes in lines
- Explain in detail what you have discovered related to in terms of function/use case
- Present conclusion in concise but detailed manner
- Prioritized action items based on findings:
Improvement Opportunities
 | Priority | Issue | Impact | Recommendation |
 |----------|-------|--------|----------------|
 | HIGH | ... | ... | ... |
 | MEDIUM | ... | ... | ... |
 | LOW | ... | ... | ... |

Metrics
| Metric | Count |
|--------|-------|
| Files | X |
| LOC | Y |
| Modules | Z |
| Custom Hooks | W |

Health Scores
| Category | Score |
|----------|-------|
| Architecture | X/10 |
| Security | X/10 |
| Quality | X/10 |
| **Overall** | **X/10** |

Code Quality
| Metric | Count | Status |
|--------|-------|--------|
| `: any` | X | ✅/⚠️/❌ |
| `as any` | X | ✅/⚠️/❌ |
| `@ts-ignore TS2589` (Convex) | X | ℹ️ expected |
| `@ts-ignore` (other) | X | ✅/⚠️/❌ |
| `@ts-expect-error` | X | ✅/⚠️/❌ |
| TODOs/FIXMEs | X | ✅/⚠️/❌ |

Status thresholds: `: any` (✅ 0-10, ⚠️ 11-50, ❌ 50+), `as any` (✅ 0-20, ⚠️ 21-100, ❌ 100+), `@ts-ignore other` (✅ 0-5, ⚠️ 6-20, ❌ 20+), `@ts-ignore TS2589` (ℹ️ any - Convex limitation)

---
**CRITICAL RULES**:
- Always use `--model gemini-3-pro-preview -y`
- Discovery (rg commands) - '| wc -l' for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
- Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
- Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
- Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()`, Loop back if gaps found
- **DO NOT read Serena memories** - fresh analysis only
