# COMPREHENSIVE CODEBASE SCAN - AGENTIC PARALLEL ANALYSIS

**MULTI-DOMAIN SEQUENTIAL PIPELINE using 5 agents across 3 phases (2→2→1) set to thoroughness level `very thorough` with `Task` tool to analyse [$ARGUMENTS] (directory path, file pattern, or query) across ALL dimensions: architecture, data flow, security, UX, and quality — each phase builds on prior findings for compounding context**

**Agent Strategy**: 3-phase sequential pipeline — Phase 1: 1x `Explore` `opus` + 1x `data` `opus` in parallel (codebase structure + data state diagnosis) → Phase 2: 2x `Explore` `opus` in parallel (architecture & data flow + security & quality) → Phase 3: 1x `Explore` `opus` (cross-validation). Each phase receives synthesized prior findings as context. All agents set to thoroughness level `very thorough`.

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never `Edit` or `Write` code! Only analysis & presentation! Execute phases SEQUENTIALLY — each phase MUST complete before the next launches!

> **Why sequential?** Parallel scans launch all agents blind to each other. This pipeline compounds context: Phase 1 maps structure and data state → Phase 2 deep-analyses pre-scoped targets across multiple domains → Phase 3 cross-validates real findings. Same 5 agents, better results.

> **Sibling scans** for focused analysis: `SCAN-TARGET` (bug hunting), `SCAN-IMPLEMENTATION` (pre-implementation), `SCAN-DOCS` (documentation accuracy), `SCAN-SECURE` (security), `SCAN-DATA` (data flow & integrity), `SCAN-FUNCTIONAL` (workflows & UX), `SCAN-AUDIT` (E2E browser testing)

**4-Phase Analysis workflow for `Explore` agents**:
1. Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools → `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

---

## **STEP 0**: On submission of [$ARGUMENTS] by user `AskUserQuestion` to clarify scope & purpose of analysis/exploration (Don't just assume or randomly explore before launching subagents!)

```
AskUserQuestion:
  questions:
    - question: "What's the exploration goal?"
      header: "Goal"
      options:
        - label: "Full exploration (Recommended)"
          description: "Complete multi-domain analysis — architecture, data flow, security, UX, quality"
        - label: "Full workflow audit"
          description: "Structure, state, frontend mutations, backend sequencing, UX paths"
        - label: "Architecture review"
          description: "Focus on structure, modules, dependencies, patterns, thresholds"
        - label: "Bug hunting"
          description: "Find potential bugs, edge cases, error handling gaps, race conditions"
      multiSelect: false

    - question: "Any specific concerns to investigate?"
      header: "Concerns"
      options:
        - label: "None - general analysis"
          description: "Let agents find what's important across all domains"
        - label: "Performance issues"
          description: "Caching, re-renders, memory leaks, bottlenecks, query efficiency"
        - label: "Type safety"
          description: "Type errors, any casts, missing validations, weak validators"
        - label: "Security gaps"
          description: "Auth bypass, injection vectors, data exposure, secrets"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "Balanced analysis across all domains — good coverage without excessive detail"
        - label: "Quick scan"
          description: "High-level overview, major issues only per domain"
        - label: "Deep dive"
          description: "Exhaustive analysis, all findings regardless of severity across every domain"
      multiSelect: false
```

---

## **STEP 1: Execute Phases**

### **Phase 1 — Discovery (parallel: 1x `Explore` opus + 1x `data` opus)**

Launch BOTH agents in a **single message** with two `Task` tool calls:

**Agent 1a — `Explore` opus (Codebase Structure & Inventory)**:
```
Broad structural analysis of [$ARGUMENTS] using 4-phase workflow (Discovery → Locate → Understand → Validate).
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

Search targets:
- wc -l convex/**/*.ts src/**/*.tsx src/**/*.ts                              # File sizes across backend + frontend
- rg "mutation\(\{|action\(\{|query\(\{" -g "convex/**/*.ts" -c | sort -t: -k2 -nr  # Mutation density by file
- rg "ctx\.auth|getUserIdentity" -g "convex/**/*.ts" -l                     # Auth-gated functions
- rg "dangerouslySetInnerHTML|innerHTML" -g "src/**/*.tsx" -C 1             # XSS surface
- rg "useMutation|useAction|useQuery" -g "src/**/*.tsx" -c | sort -t: -k2 -nr  # Frontend→backend density
- rg "catch\s*\(|\.catch\(|onError" -g "**/*.ts{,x}" -c | sort -t: -k2 -nr # Error handling density
- rg "toast|Toast" -g "src/**/*.tsx" -l                                      # User-facing error notifications
- ls -d convex/*Modules/ src/components/*/                                   # Feature modules

Deliverables (use STRUCTURED OUTPUT FORMAT below):
- File inventory with `wc -l` line counts (flag >400 lines)
- Symbol map (exports, classes, functions) via get_symbols_overview for key files
- Dependency graph (imports, cross-module references)
- Mutation density by domain — which areas have most backend complexity
- Auth pattern overview — which endpoints are gated, which aren't
- Initial issue candidates across ALL domains with file:line references

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | architecture/data-flow/security/ux/quality |
```

**Agent 1b — `data` opus (Data State Diagnosis)**:
```
Diagnose data state for [$ARGUMENTS]. Diagnostic only — no modifications.

Tasks:
- Schema analysis: tables, indexes, relationships
- Data sampling: `npx convex data <table> --limit 5` for relevant tables
- Migration status: pending/applied migrations
- Data integrity: orphaned records, missing references, constraint violations
- Index coverage: queries without matching indexes (full table scan risk)
- Environment: `npx convex env list` for dev env var names (not values)

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Table/Field | Issue | Evidence | Category |
|----------|-------------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | table.field | Description | Sample data or query result | schema/integrity/migration/orphan/index |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding.

### **Phase 2 — Deep Analysis (parallel: 2x `Explore` opus)**

Launch BOTH agents in a **single message**. Include **synthesized Phase 1 findings** (not raw output):

**Agent 2a — `Explore` opus (Architecture & Data Flow)**:
```
Deep analysis of architecture, data flow, and structural quality for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- rg "import.*from" -g "convex/**/*.ts" -C 0                               # Backend import graph
- rg "import.*from" -g "src/**/*.tsx" -C 0                                  # Frontend import graph
- rg "useMutation|useQuery|useAction" -g "src/**/*.tsx" -C 3                # Frontend→backend bindings
- rg "ctx\.runQuery|ctx\.runMutation|ctx\.runAction" -g "convex/**/*.ts" -C 3  # Backend cross-calls
- rg "as any|@ts-ignore|@ts-expect-error" -g "**/*.ts{,x}" -C 1            # Type safety debt

Focus:
1. Mutation chains — trace data from UI form → mutation → DB → query → component
2. Module structure — which modules follow facade pattern, which are monolithic (>400 lines)?
3. Cross-module dependencies — circular imports, tight coupling, blast radius of changes
4. State management — optimistic updates, error propagation, stale data handling
5. Performance — unnecessary re-renders, missing memoization, query efficiency
6. Type safety — any casts, weak validators, missing null checks

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | architecture/data-flow/state/perf/type-safety |
```

**Agent 2b — `Explore` opus (Security & Quality)**:
```
Deep analysis of security, error handling, and code quality for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- rg "ctx\.auth\.getUserIdentity" -g "convex/**/*.ts" -C 5                  # Auth check implementations
- rg "mutation\(\{" -g "convex/**/*.ts" -C 8                               # Mutation handlers (verify auth)
- rg "dangerouslySetInnerHTML|innerHTML|outerHTML" -g "src/**/*.tsx" -C 3    # XSS sinks
- rg "generateContent|parts.*text" -g "convex/**/*.ts" -C 5                 # AI prompt injection
- rg "v\.string\(\)|v\.any\(\)" -g "convex/**/*.ts" -C 2                    # Weak validators
- rg "catch\s*\(|\.catch\(" -g "**/*.ts{,x}" -C 5                           # Error handling patterns
- rg "console\.log|console\.error" -g "convex/**/*.ts" -C 1                 # Debug logging in backend
- rg "TODO|FIXME|HACK|XXX" -g "**/*.ts{,x}" -C 1                           # Technical debt markers

Focus:
1. Auth coverage — every mutation/action checked for identity and role
2. Input validation — strict Convex validators vs permissive v.any()
3. Injection vectors — XSS, prompt injection, URL manipulation
4. Error handling — do catch blocks surface useful errors vs swallow silently?
5. Edge cases — null/undefined paths, empty arrays, boundary conditions
6. Code quality — dead code, duplicated logic, technical debt markers
7. Logging — PII in logs, excessive debug output in production paths

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | security/auth/error-handling/edge-case/quality/debt |
```

**Wait for both to complete.** Synthesize all findings (Phase 1 + Phase 2) into consolidated bullet list before proceeding.

### **Phase 3 — Cross-Validation (1x `Explore` opus)**

Launch **single agent** with ALL synthesized findings:

**Agent 3 — `Explore` opus (Cross-Validator)**:
```
Cross-validate and verify findings for [$ARGUMENTS].
DO NOT re-discover — only confirm, contradict, or extend existing findings.

ALL PRIOR FINDINGS:
[$SYNTHESIZED_ALL_PHASES_BULLETS]

Tasks:
1. Verify top 5 critical/high findings — read symbol bodies to confirm
2. Check for contradictions between Phase 2a and 2b findings
3. Identify gaps — any major analysis domain not covered (architecture, data, security, UX, quality)?
4. Rate confidence (HIGH/MEDIUM/LOW) for each finding
5. Cross-domain correlations — do architecture issues cause security gaps? Do data flow issues cause UX bugs?

STRUCTURED OUTPUT FORMAT — return as:
| Original Finding | Verdict | Confidence | Cross-Domain Impact | Notes |
|------------------|---------|------------|-------------------|-------|
| [from prior phases] | CONFIRMED/CONTRADICTED/EXTENDED/UNVERIFIED | HIGH/MEDIUM/LOW | Which other domains affected | Additional evidence or correction |
```

---

## **Phase Specializations**

**Phase 1a — Codebase Structure & Inventory** (`Explore` opus):
Broad scoping and structural mapping across all domains. File inventory, mutation density, auth patterns, error handling. Output becomes the foundation for Phase 2.

**Phase 1b — Data State Diagnosis** (`data` opus):
Schema analysis, data sampling, migration status, data integrity, index coverage. Diagnostic only — no modifications.

**Phase 2a — Architecture & Data Flow** (`Explore` opus):
Receives synthesized Phase 1 findings. Traces mutation chains, module structure, cross-module dependencies, state management, performance, type safety.

**Phase 2b — Security & Quality** (`Explore` opus):
Receives synthesized Phase 1 findings. Audits auth coverage, input validation, injection vectors, error handling, edge cases, code quality, technical debt.

**Phase 3 — Cross-Validation & Verification** (`Explore` opus):
Receives ALL synthesized findings. Validates, cross-references, identifies cross-domain correlations and gaps. Never re-discovers.

---

## **STEP 2**: Present Findings & Recommended Next Steps

On completion of all phases, synthesize and present:
- **Dependency graph** showing module relationships, call chains, and data flow for analysed target
- **Source tree** stemming from feature — files, dependencies, and line counts
- **Detailed explanation** of discoveries in terms of function/use case
- **Concise conclusion** with confidence ratings from Phase 3

### Findings Tables

**SOLUTIONS MATRIX — COMPREHENSIVE**
| Priority | Issue | File:Line | Domain | Impact | Confidence | Recommendation |
|----------|-------|-----------|--------|--------|------------|----------------|
| CRITICAL | ... | ... | ... | ... | HIGH/MED/LOW | ... |
| HIGH | ... | ... | ... | ... | HIGH/MED/LOW | ... |
| MEDIUM | ... | ... | ... | ... | HIGH/MED/LOW | ... |
| LOW | ... | ... | ... | ... | HIGH/MED/LOW | ... |

**A. ARCHITECTURE & DATA FLOW**
| Priority | Issue | File:Line | Impact | Evidence | Recommendation |
|----------|-------|-----------|--------|----------|----------------|
| HIGH | Monolithic file (>400 lines) | path:line | Maintainability | wc -l output | Split into facade + modules |
| MEDIUM | Circular dependency | path:line | Coupling | Import chain | Extract shared interface |

**B. SECURITY**
| Priority | Issue | File:Line | Attack Vector | Impact | Recommendation |
|----------|-------|-----------|--------------|--------|----------------|
| CRITICAL | Missing auth check | path:line | Direct mutation call | Data breach | Add getUserIdentity() guard |
| HIGH | Weak input validation | path:line | Malformed input | Data corruption | Use strict Convex validators |

**C. DATA INTEGRITY**
| Priority | Issue | Table/Field | Impact | Evidence | Recommendation |
|----------|-------|-------------|--------|----------|----------------|
| HIGH | Missing index | table.field | Full table scan | Schema analysis | Add index in schema.ts |
| MEDIUM | Orphaned records | table | Stale data | Data sampling | Add cascade delete |

**D. FUNCTIONAL & UX**
| Priority | Issue | File:Line | User Impact | Evidence | Recommendation |
|----------|-------|-----------|------------|----------|----------------|
| HIGH | Silent error | path:line | User unaware of failure | catch block swallows | Add toast notification |
| MEDIUM | Missing loading state | path:line | UI flicker | No Suspense/skeleton | Add loading indicator |

**E. CODE QUALITY & DEBT**
| Priority | Issue | File:Line | Debt Type | Impact | Recommendation |
|----------|-------|-----------|----------|--------|----------------|
| MEDIUM | as any cast | path:line | Type safety | Runtime risk | Add proper typing |
| LOW | TODO/FIXME marker | path:line | Technical debt | Unfinished work | Address or remove |

**F. CROSS-DOMAIN CORRELATIONS**
| Finding A | Domain A | Finding B | Domain B | Correlation | Combined Impact |
|-----------|----------|-----------|----------|-------------|-----------------|
| Missing auth | Security | Over-fetched query | Data Flow | Unauthed access to excess data | CRITICAL |

**G. SEVERITY SUMMARY**
| Severity | Count | Top Priority Fix |
|----------|-------|-----------------|
| CRITICAL | ... | ... |
| HIGH | ... | ... |
| MEDIUM | ... | ... |
| LOW | ... | ... |

---

## **CRITICAL RULES**

1. **Do NOT run agents in background** — Wait for ALL agents in each phase to complete before proceeding
2. **Phases are SEQUENTIAL** — Phase 1 must complete before Phase 2 launches, Phase 2 must complete before Phase 3 launches
3. **Phase 1 agents launch in parallel** — `Explore` opus + `data` opus in a SINGLE message
4. **Phase 2 agents launch in parallel** — Both `opus` agents in a SINGLE message, but only after Phase 1 completes
5. **Synthesized context injection** — Every phase prompt includes synthesized key findings (max 20 bullets) from prior phases, not raw output
6. **Very thorough for ALL agents** — Comprehensive analysis set to thoroughness level `very thorough`
7. **All agents use opus** — Phase 1 `opus` + `opus` (deep discovery) → Phase 2 `opus` + `opus` (deep analysis) → Phase 3 `opus` (cross-validation)
8. **100% coverage** — Read files completely, do not skim
9. **Evidence-based** — Include file:line references in ALL findings
10. **Determine scope & purpose** — Always `AskUserQuestion` first
11. **Never implement changes** — Analysis & presentation only
12. **Do not search yourself** — Always delegate to subagents
13. **4-phase workflow per agent** — Each agent internally follows Discovery → Locate → Understand → Validate
14. **Phase 1 output is the contract** — If Phase 1 output is incomplete, note gaps explicitly before launching Phase 2
15. **Phase 3 validates, not re-discovers** — Cross-validation agent confirms, contradicts, or extends — never repeats
16. **Exact counts** — Use `wc -l` for line counts, never estimate or round
17. **Structured output format** — ALL agents return findings in the specified table format for consistent synthesis
18. **Orchestrator synthesizes between phases** — Deduplicate and consolidate before injecting into next phase
19. **Multi-domain coverage mandatory** — Findings must span architecture, data flow, security, UX, and quality — flag any domain with zero findings
20. **Cross-domain correlations** — Phase 3 must identify how issues in one domain amplify issues in another
21. **Domain tagging** — Every finding must be tagged with its domain category for the solutions matrix
