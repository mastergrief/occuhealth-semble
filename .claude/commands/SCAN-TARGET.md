# BUG HUNTING SCAN - AGENTIC PARALLEL ANALYSIS

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
- Initial issue candidates with file:line references

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | bug/perf/type/logic/edge-case |
```

**Agent 1b — `data` opus**:
```
Diagnose data state for [$ARGUMENTS]. Diagnostic only — no modifications.
- Schema analysis: tables, indexes, relationships
- Data sampling: `npx convex data <table> --limit 5` for relevant tables
- Migration status: pending/applied migrations
- Data integrity: orphaned records, missing references, constraint violations

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Table/Field | Issue | Evidence | Category |
|----------|-------------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | table.field | Description | Sample data or query result | schema/integrity/migration/orphan |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding.

### **Phase 2 — Deep Analysis (parallel: 2x `Explore` opus)**

Launch BOTH agents in a **single message**. Include **synthesized Phase 1 findings** (not raw output):

**Agent 2a — `Explore` opus (Data Flow & Integrity)**:
```
Trace data flow for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Focus: mutation chains, query→component data flow, error propagation, state management gaps.
Use find_referencing_symbols to trace call chains. Read symbol bodies only for flagged issues.

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | data-flow/mutation/state/error |
```

**Agent 2b — `Explore` opus (Deep Bug Analysis)**:
```
Deep analysis of [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Focus: edge cases, race conditions, null/undefined paths, error handling gaps, logic errors.
Prioritize issues flagged in Phase 1. Read symbol bodies for suspicious patterns.

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Issue | Evidence | Category |
|----------|-----------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | Code snippet or reference | edge-case/race/null/logic/error |
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
Schema analysis, data sampling, migration status, data integrity checks. Diagnostic only — no modifications.

**Phase 2a — Data Flow Tracing & Integrity** (`Explore` opus):
Receives synthesized Phase 1 findings. Traces mutation chains and data flow.

**Phase 2b — Deep Bug Analysis** (`Explore` opus):
Receives synthesized Phase 1 findings. Hunts edge cases, race conditions, logic errors.

**Phase 3 — Cross-Validation & Verification** (`Explore` opus):
Receives ALL synthesized findings. Validates, cross-references, identifies gaps. Never re-discovers.

---

### **STEP 2**: Present Findings & Recommended Next Steps

On completion of all phases, present to user:
- **Dependency graph** showing module relationships, call chains, and data flow for analysed target
- **Source tree** stemming from feature — files, dependencies, and line counts
- **Detailed explanation** of discoveries in terms of function/use case
- **Concise conclusion** with confidence ratings from Phase 3

**SOLUTIONS MATRIX**:
| Priority | Issue | File:Line | Impact | Confidence | Recommendation |
|----------|-------|-----------|--------|------------|----------------|
| CRITICAL | ... | ... | ... | HIGH/MED/LOW | ... |
| HIGH | ... | ... | ... | HIGH/MED/LOW | ... |
| MEDIUM | ... | ... | ... | HIGH/MED/LOW | ... |
| LOW | ... | ... | ... | HIGH/MED/LOW | ... |

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
