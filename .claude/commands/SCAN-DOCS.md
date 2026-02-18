# CODEBASE SCAN - AGENTIC PARALLEL ANALYSIS

**DOCUMENTATION ACCURACY & COMPLETENESS SEQUENTIAL PIPELINE using 5 agents across 3 phases (2→2→1) set to thoroughness level `very thorough` with `Task` tool to validate [$ARGUMENTS] (documentation path, config directory, or "all") against actual codebase — each phase builds on prior findings for compounding context**

**Agent Strategy**: 3-phase sequential pipeline — Phase 1: 1x `Explore` `opus` + 1x `data` `opus` in parallel (command/path discovery + env/config validation) → Phase 2: 2x `Explore` `opus` in parallel (agent config + memory accuracy, coverage gaps) → Phase 3: 1x `Explore` `opus` (cross-validation). Each phase receives synthesized prior findings as context. All agents set to thoroughness level `very thorough`.

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never `Edit` or `Write` code! Only analysis & presentation! Execute phases SEQUENTIALLY — each phase MUST complete before the next launches!

> **Why sequential?** Parallel scans launch all agents blind to each other. This pipeline compounds context: Phase 1 inventories docs and validates paths/configs → Phase 2 deep-checks accuracy with Phase 1's inventory as scope → Phase 3 cross-validates real findings. Same 5 agents, better results.

> **Sibling scans** for other concerns: `SCAN-TARGET` (bug hunting), `SCAN-IMPLEMENTATION` (pre-implementation), `SCAN-DATA` (data flow & integrity), `SCAN-FUNCTIONAL` (workflows & UX), `SCAN-SECURITY` (vulnerabilities & access control)

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
    - question: "What's the documentation audit goal?"
      header: "Goal"
      options:
        - label: "Full documentation audit (Recommended)"
          description: "All 5 agents — commands, agents, memories, env/config, coverage gaps"
        - label: "Command & agent accuracy"
          description: "Validate .claude/commands/ and .claude/agents/ against CLI paths, agent types, tool names"
        - label: "Memory freshness check"
          description: "Verify Serena memories and CLAUDE.md against current codebase state"
        - label: "Coverage gap analysis"
          description: "Find undocumented features, routes, modules, and missing configs"
      multiSelect: false

    - question: "Any specific documentation concerns?"
      header: "Concerns"
      options:
        - label: "None - general audit"
          description: "Let agents find what's important"
        - label: "Recently changed features"
          description: "Focus on docs for modules modified in recent commits"
        - label: "Orchestration accuracy"
          description: "PLAN/EXECUTE/SCAN commands, agent configs, CLI references"
        - label: "Stale memories"
          description: "Serena memories that may describe outdated architecture"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "Spot-check 2-3 claims per doc, verify all path references"
        - label: "Quick scan"
          description: "Path existence checks only, skip content verification"
        - label: "Deep dive"
          description: "Verify every claim, every path, every cross-reference exhaustively"
      multiSelect: false
```

---

## **STEP 1: Execute Phases**

### **Phase 1 — Discovery (parallel: 1x `Explore` opus + 1x `data` opus)**

Launch BOTH agents in a **single message** with two `Task` tool calls:

**Agent 1a — `Explore` opus (Command & Path Inventory)**:
```
Inventory all documentation files and validate path/CLI references for [$ARGUMENTS] using 4-phase workflow (Discovery → Locate → Understand → Validate).
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

Search targets:
- ls .claude/commands/ .claude/agents/ .claude/rules/                       # All doc files
- wc -l .claude/commands/*.md .claude/agents/*.md .claude/rules/**/*.md     # Line counts
- rg "npx tsx" -g ".claude/**/*.md" -C 1                                    # CLI command references
- rg "subagent_type|Task\(" -g ".claude/**/*.md" -C 2                       # Agent type references
- rg "scratchpad|context-hub|pending-plans" -g ".claude/**/*.md" -C 1       # Output path references
- ls ORCHESTRATION/cli/ ORCHESTRATION/templates/ GEMINI-CLI/SCRIPTS/ 2>/dev/null  # Verify referenced paths

Deliverables (use STRUCTURED OUTPUT FORMAT below):
- File inventory with `wc -l` line counts for ALL doc files
- Every `npx tsx <path>` command — does the script file exist?
- Every `subagent_type="<name>"` — is it a valid agent type?
- Every file/directory path referenced — does it exist?
- CLI commands (e.g., `plan write-pending`, `session status`) — do subcommands exist?

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Document:Line | Reference | Type | Expected | Actual | Status |
|----------|---------------|-----------|------|----------|--------|--------|
| CRITICAL/HIGH/MEDIUM/LOW | file:line | Referenced path/command | CLI/path/agent/tool | What doc claims | What exists | VALID/DRIFT/BROKEN |
```

**Agent 1b — `data` opus (Env & Config Validation)**:
```
Validate environment variables, API keys, and configuration references in documentation for [$ARGUMENTS]. Diagnostic only — no modifications.

Search targets:
- rg "GEMINI_API_KEY|OPENAI|VITE_|CONVEX_" -g ".env.local" -C 0           # Actual env vars
- rg "env\.local|GEMINI|OPENAI|CONVEX" -g ".claude/CLAUDE.md" -C 1        # CLAUDE.md env refs
- rg "gemini-3-flash|gemini-3-pro|text-embedding" -g ".claude/**/*.md" -C 1 # Model name refs
- rg "npm run|npx convex|npx tsc" -g ".claude/**/*.md" -C 1               # Build/CLI command refs
- npx convex functions 2>/dev/null | head -20                               # Actual Convex functions

Deliverables:
- Every env var referenced in docs — does it exist in .env.local?
- Model names (gemini-3-flash-preview, etc.) — current or deprecated?
- CLI commands in docs — do they work?
- Convex function references — do they match actual deployed functions?

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Document | Reference | Type | Expected | Actual | Status |
|----------|----------|-----------|------|----------|--------|--------|
| CRITICAL/HIGH/MEDIUM/LOW | file | env var/model/command | env/model/cli | What doc claims | What exists | ACCURATE/DRIFT/WRONG |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding.

### **Phase 2 — Deep Analysis (parallel: 2x `Explore` opus)**

Launch BOTH agents in a **single message**. Include **synthesized Phase 1 findings** (not raw output):

**Agent 2a — `Explore` opus (Agent Config & Memory Accuracy)**:
```
Validate agent configs and Serena memories against actual codebase for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- rg "tools:" -g ".claude/agents/*.md" -C 0                                # Tool declarations
- rg "handoff|ORCHESTRATION" -g ".claude/agents/*.md" -C 2                  # Orchestration integration
- rg "mcp__serena__|mcp__chrome-devtools__" -g ".claude/**/*.md" -C 1       # MCP tool references
- rg "PASS|FAIL|PARTIAL|BLOCKED" -g ".claude/agents/*.md" -C 1             # Status vocabulary
- rg "calendarWorkoutsModules|trainingBlockMarkersModules" -g "**/*.ts" -l  # Reference impl dirs
- rg "facade|Facade" -g ".claude/CLAUDE.md" -C 2                           # Architecture pattern refs

Focus:
1. Tool lists in agent configs — do all listed tools actually exist?
2. Handoff JSON schemas — do field names match what orchestrator/composer expect?
3. Workflow descriptions — do they match protocols in PLAN.md/EXECUTE.md?
4. Serena memories — read each memory name, spot-check 2-3 claims against codebase reality
5. Reference implementations cited — do those directories still exist and follow described pattern?
6. Module names, file paths, function names cited in docs — do they still exist?

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Document | Section | Claim | Codebase Reality | Status |
|----------|----------|---------|-------|-----------------|--------|
| CRITICAL/HIGH/MEDIUM/LOW | file | section | What doc claims | What code shows | ACCURATE/STALE/MISMATCH |
```

**Agent 2b — `Explore` opus (Coverage & Gap Detection)**:
```
Find undocumented features and documentation gaps for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- ls -d convex/*Modules/ src/components/*/                                  # Feature modules
- rg "path:" -g "src/**/*.ts{,x}" -C 1                                     # Route definitions
- rg "export default" -g "src/**/pages/**/*.ts{,x}" -l                      # Page components
- ls .claude/agents/ .claude/commands/ .claude/rules/                       # Documented configs

Focus:
1. Every `convex/*Modules/` directory — is it mentioned in any memory or CLAUDE.md section?
2. Every route in the app — does NAV-MAP.md have an entry for it?
3. Every agent type used in commands — does it have a `.claude/agents/<name>.md` config?
4. Every SCAN variant — does the sibling reference banner list all variants?
5. Serena memories — are any clearly stale (describing modules that were renamed/deleted)?
6. Are there features with no documentation anywhere (no memory, no command, no rule)?
7. Same concept described differently in different files — which is correct?

STRUCTURED OUTPUT FORMAT — return findings as:
| Entity Type | Name | Has Memory? | Has Command? | Has NAV-MAP? | Has Agent Config? | Gap Description |
|-------------|------|-------------|-------------|-------------|-------------------|----------------|
| module/route/agent/feature | name | Yes/No | Yes/No/N/A | Yes/No/N/A | Yes/No/N/A | What's missing |
```

**Wait for both to complete.** Synthesize all findings (Phase 1 + Phase 2) into consolidated bullet list before proceeding.

### **Phase 3 — Cross-Validation (1x `Explore` opus)**

Launch **single agent** with ALL synthesized findings:

**Agent 3 — `Explore` opus (Cross-Validator)**:
```
Cross-validate and verify documentation findings for [$ARGUMENTS].
DO NOT re-discover — only confirm, contradict, or extend existing findings.

ALL PRIOR FINDINGS:
[$SYNTHESIZED_ALL_PHASES_BULLETS]

Tasks:
1. Verify top 5 critical/high findings — check referenced paths/symbols to confirm
2. Check for contradictions between Phase 2a and 2b findings
3. Identify same concept described differently across files — flag inconsistencies
4. Identify gaps — any obvious documentation areas not covered?
5. Rate confidence (HIGH/MEDIUM/LOW) for each finding

STRUCTURED OUTPUT FORMAT — return as:
| Original Finding | Verdict | Confidence | Notes |
|------------------|---------|------------|-------|
| [from prior phases] | CONFIRMED/CONTRADICTED/EXTENDED/UNVERIFIED | HIGH/MEDIUM/LOW | Additional evidence or correction |
```

---

## **Phase Specializations**

**Phase 1a — Command & Path Inventory** (`Explore` opus):
Broad inventory of all doc files. Validates every path, CLI command, and agent type reference exists. Output becomes the scope for Phase 2.

**Phase 1b — Env & Config Validation** (`data` opus):
Env vars, model names, CLI commands, Convex function references. Cross-checks documentation claims against actual config state. Diagnostic only — no modifications.

**Phase 2a — Agent Config & Memory Accuracy** (`Explore` opus):
Receives synthesized Phase 1 findings. Deep-checks agent configs, Serena memories, and architectural claims against codebase reality.

**Phase 2b — Coverage & Gap Detection** (`Explore` opus):
Receives synthesized Phase 1 findings. Finds undocumented features, routes, modules, inconsistencies between docs.

**Phase 3 — Cross-Validation & Verification** (`Explore` opus):
Receives ALL synthesized findings. Validates, cross-references, identifies gaps. Never re-discovers.

---

## **STEP 2**: Present Findings

On completion of all phases, synthesize and present:

- **Documentation health summary** (overall accuracy %, gap count, staleness risk)
- **Cross-reference diagram** (ASCII: which docs reference which code, highlighting broken links)
- **Source tree** of all documentation files with line counts and last-relevant-commit assessment
- **Detailed explanation** of discovered documentation drift and gaps
- **Concise conclusion** with confidence ratings from Phase 3

### Findings Tables

**A. ACCURACY — Doc References vs Code Reality**
| Document | Reference | Type | Expected | Actual | Status |
|----------|-----------|------|----------|--------|--------|
| EXECUTE.md | `npx tsx ORCHESTRATION/cli/orch.ts` | CLI path | File exists | File exists | VALID |
| browser.md | `mcp__chrome-devtools__drag` | MCP tool | Tool exists | Tool exists | VALID |
| CLAUDE.md | `gemini-3-flash-preview` | Model name | Current model | Deprecated | DRIFT |

**B. COVERAGE GAPS — Undocumented Entities**
| Entity Type | Name | Has Memory? | Has Command? | Has NAV-MAP? | Has Agent Config? | Gap |
|-------------|------|-------------|-------------|-------------|-------------------|-----|
| Module | `convex/assessmentsModules/` | No | N/A | N/A | N/A | No memory |
| Route | `/analytics` | N/A | N/A | Yes | N/A | — |
| Agent | `gemini-synthesis` | N/A | N/A | N/A | No `.md` | No config |

**C. STALENESS — Documentation Age & Drift Risk**
| Document/Memory | Key Claims | Verified? | Drift Risk | Recommendation |
|----------------|------------|-----------|------------|----------------|
| `0_PROJECT_OVERVIEW` | Tech stack, auth method | 2/3 accurate | LOW | Update auth section |
| `1_PROJECT_STRUCTURE` | Directory layout | 1/3 accurate | HIGH | Regenerate |

**D. INCONSISTENCY — Same Concept, Different Descriptions**
| Concept | File A | Says | File B | Says | Which is Correct? |
|---------|--------|------|--------|------|-------------------|
| Typecheck command | CLAUDE.md | `npm run typecheck` | developer.md | `npm run typecheck` | Consistent |
| Model for planning | PLAN.md | `opus` | SCAN copy.md | Not specified | PLAN.md |

**E. BROKEN REFERENCES — Paths/Commands That Don't Resolve**
| Document | Line | Reference | Type | Issue |
|----------|------|-----------|------|-------|
| EXECUTE.md | 45 | `ORCHESTRATION/templates/` | Directory | Missing |
| browser.md | 239 | `handoff write /tmp/handoff-browser.json` | CLI cmd | Unverified |

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
11. **Never implement changes** — Analysis & presentation only, no fixes
12. **Do not search yourself** — Always delegate to subagents
13. **4-phase workflow per agent** — Each agent internally follows Discovery → Locate → Understand → Validate
14. **Phase 1 output is the contract** — If Phase 1 output is incomplete, note gaps explicitly before launching Phase 2
15. **Phase 3 validates, not re-discovers** — Cross-validation agent confirms, contradicts, or extends — never repeats
16. **Exact counts** — Use `wc -l` for line counts, never estimate or round
17. **Structured output format** — ALL agents return findings in the specified table format for consistent synthesis
18. **Orchestrator synthesizes between phases** — Deduplicate and consolidate before injecting into next phase
19. **Spot-check memories** — Read memory, pick 2-3 claims, verify each against code
20. **Cross-reference, don't assume** — Every doc claim must be checked against codebase
21. **Path existence is minimum** — Every referenced file/directory must be checked with `ls` or `find_file`
