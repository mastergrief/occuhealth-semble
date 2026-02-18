# PRE-IMPLEMENTATION SCAN - AGENTIC PARALLEL ANALYSIS

**DEEP ANALYSIS/SCAN SEQUENTIAL PIPELINE using 5 agents across 3 phases (2→2→1) set to thoroughness level `very thorough` with `Task` tool to analyse [$ARGUMENTS] (directory path, file pattern, or query) — each phase builds on prior findings for compounding context**

**Agent Strategy**: 3-phase sequential pipeline — Phase 1: 1x `Explore` `opus` + 1x `data` `opus` in parallel (discovery & structure + data state diagnosis) → Phase 2: 2x `Explore` `opus` in parallel (data flow + deep analysis) → Phase 3: 1x `Explore` `opus` (cross-validation). Each phase receives synthesized prior findings as context. All agents set to thoroughness level `very thorough`.

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never `Edit` or `Write` code! Only analysis & presentation! Execute phases SEQUENTIALLY — each phase MUST complete before the next launches!

> **Why sequential?** Parallel scans launch all agents blind to each other. This pipeline compounds context: Phase 1 narrows scope → Phase 2 analyses pre-scoped targets → Phase 3 validates real findings. Same 5 agents, better results.

**4-Phase Analysis workflow for `Explore` agents**:
1. Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

---

## **STEP 0**: On submission of [$ARGUMENTS] by user `AskUserQuestion` to clarify scope & purpose of analysis/exploration (Don't just assume or randomly explore before launching subagents!)

```
AskUserQuestion:
  questions:
    - question: "What's the exploration goal?"
      header: "Goal"
      options:
        - label: "Full exploration"
          description: "Complete codebase analysis - architecture, data flow, quality, security"
        - label: "Full Workflow audit"
          description: "Structure, state, frontend mutations, backend sequencing, UX"
        - label: "Architecture review"
          description: "Focus on structure, modules, dependencies, patterns"
        - label: "Bug hunting"
          description: "Find potential bugs, edge cases, error handling gaps"
        - label: "Security audit"
          description: "OWASP-focused security analysis"
        - label: "PreImplementation analysis"
          description: "Analyse architecture, structure, entry points, data flow, dependencies, integrations, functional workflows, edge cases, error handling"
      multiSelect: false

    - question: "Any specific concerns to investigate?"
      header: "Concerns"
      options:
        - label: "None - general analysis"
          description: "Let agents find what's important"
        - label: "Performance issues"
          description: "Caching, re-renders, memory leaks, bottlenecks"
        - label: "Type safety"
          description: "Type errors, any casts, missing validations"
        - label: "Test coverage"
          description: "Untested code, missing edge cases"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "Balanced analysis - good coverage without excessive detail"
        - label: "Quick scan"
          description: "High-level overview, major issues only"
        - label: "Deep dive"
          description: "Exhaustive analysis, all findings regardless of severity"
      multiSelect: false
```

## **STEP 1: Execute Phases**

### **Phase 1 — Discovery (parallel: 1x `Explore` opus + 1x `data` opus)**

Launch BOTH agents in a **single message** with two `Task` tool calls:

**Agent 1a — `Explore` opus**:
```
Analyze [$ARGUMENTS] using 4-phase workflow (Discovery → Locate → Understand → Validate).
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

Deliverables (use STRUCTURED OUTPUT FORMAT below):
- File inventory with `wc -l` line counts
- Symbol map (exports, classes, functions) via get_symbols_overview
- Dependency graph (imports, cross-module references)
- Entry points, insertion candidates, and existing patterns
- Initial issue candidates with file:line references

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | architecture/pattern/threshold/dependency |
```

**Agent 1b — `data` opus**:
```
Diagnose data state for [$ARGUMENTS]. Diagnostic only — no modifications.
- Schema readiness: tables, indexes, relationships needed for new feature
- Data sampling: `npx convex data <table> --limit 5` for relevant tables
- Migration status: pending/applied migrations
- Data prerequisites: existing data the feature depends on, missing references

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Table/Field | Issue | Evidence | Category |
|----------|-------------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | table.field | Description | Sample data or query result | schema/integrity/migration/prerequisite |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding.

### Phase 2 — Deep Analysis (parallel: 2x `Explore` opus)

Launch BOTH agents in a **single message**. Include **synthesized Phase 1 findings** (not raw output):

**Agent 2a — `Explore` opus (Data Flow & Integration Points)**:
```
Trace data flow and integration points for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Focus: mutation chains, query→component data flow, existing patterns to follow, insertion points for new code.
Use find_referencing_symbols to trace call chains. Read symbol bodies only for flagged issues.
Identify reference implementations closest to the planned feature.

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | data-flow/integration/pattern/insertion |
```

**Agent 2b — `Explore` opus (Risk & Constraint Analysis)**:
```
Deep risk and constraint analysis of [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Focus: files near size thresholds, type safety gaps, auth pattern coverage, missing indexes, blast radius of changes.
Prioritize issues flagged in Phase 1. Read symbol bodies for suspicious patterns.

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | threshold/type-safety/auth/index/blast-radius |
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
3. Identify gaps — any obvious areas not covered?
4. Rate confidence (HIGH/MEDIUM/LOW) for each finding
5. Validate proposed insertion points still make sense

STRUCTURED OUTPUT FORMAT — return as:
| Original Finding | Verdict | Confidence | Notes |
|------------------|---------|------------|-------|
| [from prior phases] | CONFIRMED/CONTRADICTED/EXTENDED/UNVERIFIED | HIGH/MEDIUM/LOW | Additional evidence or correction |
```

---

## **Phase Specializations**

**Phase 1a — Discovery & Structure** (`Explore` opus):
Broad scoping AND structural mapping. Output becomes the foundation for Phase 2.

**Phase 1b — Data State Diagnosis** (`data` opus):
Schema readiness for new feature, data sampling, migration status, data prerequisites. Diagnostic only — no modifications.

**Phase 2a — Data Flow & Integration Points** (`Explore` opus):
Receives synthesized Phase 1 findings. Traces mutation chains, data flow, and identifies insertion points.

**Phase 2b — Risk & Constraint Analysis** (`Explore` opus):
Receives synthesized Phase 1 findings. Evaluates thresholds, type safety, auth coverage, blast radius.

**Phase 3 — Cross-Validation & Verification** (`Explore` opus):
Receives ALL synthesized findings. Validates, cross-references, identifies gaps. Never re-discovers.

---

### **STEP 2**: Present Findings & Recommended Next Steps

On completion of all phases, present to user:
- **Dependency graph** showing module relationships, call chains, and data flow for analysed target
- **Source tree** stemming from feature — files, dependencies, and line counts
- **Detailed explanation** of discoveries in terms of function/use case
- **Concise conclusion** with confidence ratings from Phase 3

**RECOMMENDED PRE-IMPLEMENTATION MATRIX**:
| Priority | Issue | File:Line | Impact | Confidence | Recommendation |
|----------|-------|-----------|--------|------------|----------------|
| CRITICAL | ... | ... | ... | HIGH/MED/LOW | ... |
| HIGH | ... | ... | ... | HIGH/MED/LOW | ... |
| MEDIUM | ... | ... | ... | HIGH/MED/LOW | ... |
| LOW | ... | ... | ... | HIGH/MED/LOW | ... |

**A. INSERTION POINTS**
| What | Where (File:Line) | How | Notes |
|------|-------------------|-----|-------|
| Route | `src/router.tsx:NN` | Add `<Route>` inside auth layout group | Follow existing nesting |
| Nav item | `src/components/Sidebar.tsx:NN` | Add NavLink after closest sibling | Match icon + label pattern |
| Schema table | `convex/schema.ts:NN` | Add `defineTable({...})` with indexes | See recommended indexes below |
| Facade module | `convex/newFeature.ts` (new) | Re-export from `newFeatureModules/` | Follow reference impl pattern |
| Component directory | `src/components/NewFeature/` (new) | Page + Form + hooks + types | Follow reference impl pattern |

**B. PATTERNS TO FOLLOW**
| Pattern | Reference Implementation | File:Line | Key Details |
|---------|------------------------|-----------|-------------|
| Mutation handler | `{closest existing module}` | `file:line` | Auth → validate → DB op → return |
| Query handler | `{closest existing module}` | `file:line` | Auth → filter → return shape |
| Frontend form | `{closest existing form}` | `file:line` | Library + validation + submission + toast |
| Facade module | `{closest facade}` | `file:line` | <100 lines, re-exports only |
| Component structure | `{closest feature component}` | `file:line` | Page → subcomponents → hooks |

**C. DEPENDENCY MAP**
| Component | Why It's Affected | Change Needed | Consumers | Blast Radius |
|-----------|------------------|---------------|-----------|-------------|
| `convex/schema.ts` | New table | Add defineTable | Auto-generated types | Low (additive) |
| `src/router.tsx` | New route | Add Route element | N/A | Low (additive) |
| `{shared type file}` | Type extension | Add optional fields | N files | Medium (verify consumers) |

**D. RISKS & CONSTRAINTS**
| Risk | File:Line | Current State | Impact If Ignored | Mitigation |
|------|-----------|--------------|------------------|-----------|
| File near threshold | `file:NN` | 380 lines | Adding feature pushes past 400 | Plan module split |
| Type debt in area | `file:NN` | 5x `as any` | New code inherits unsafety | Clean up before building |
| Missing auth pattern | — | No role check in area | Data exposed to wrong users | Copy pattern from {reference} |
| No index for planned query | `schema.ts` | No matching index | Full table scan at scale | Add index in schema change |

**E. RECOMMENDED FILE STRUCTURE**
```
convex/
  {feature}.ts                        (facade — re-exports only, <100 lines)
  {feature}Modules/
    mutations.ts                      (create, update, delete handlers)
    queries.ts                        (list, get, search handlers)
    types.ts                          (shared types & validators)
    {domain}.ts                       (business logic if complex)
src/
  components/
    {Feature}/
      {Feature}Page.tsx               (page-level component)
      {Feature}Form.tsx               (form if needed)
      {Feature}List.tsx               (list/table if needed)
      hooks.ts                        (useMutation/useQuery wrappers)
      types.ts                        (frontend types)
```

**F. IMPLEMENTATION ORDER**
| Step | What | Why First |
|------|------|-----------|
| 1 | Schema table + indexes | Everything depends on the data model |
| 2 | Backend mutations + queries | Frontend needs API to call |
| 3 | Facade re-exports | Maintains `api.module.function` paths |
| 4 | Frontend hooks | Wraps backend calls for components |
| 5 | UI components | Uses hooks, presents data |
| 6 | Route + navigation | Makes feature accessible |
| 7 | Edge cases & polish | Empty states, loading, error handling |

---

### **CRITICAL RULES**

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

---
