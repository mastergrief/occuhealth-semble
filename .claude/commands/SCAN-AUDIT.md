# COMPREHENSIVE CODEBASE AUDIT WITH EXPLORE & BROWSER - AGENTIC ANALYSIS & TESTING

**3-PHASE AUDIT PIPELINE: code discovery + data diagnosis (parallel) → informed scope selection → sequential browser E2E testing → synthesis. Uses `Task` tool to spawn `Explore` + `data` agents for discovery, then `browser` agents to comprehensively test features & workflows E2E, creating test data via UI workflow simulation to find edge cases on real user journeys.**

**Agent Strategy**: Phase 1: 1x `Explore` `opus` + 1x `data` `opus` in parallel (feature inventory + test data/schema diagnosis) → `AskUserQuestion` (dynamically informed by Phase 1) → Phase 2: Nx `browser` `opus` in sequence (one per domain/workflow, each receives prior findings) → Phase 3: Orchestrator synthesis of all findings. All agents set to thoroughness level `very thorough`.

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never `Edit` or `Write` code! Only analysis & presentation! Execute phases SEQUENTIALLY — each phase MUST complete before the next launches!

> **Why this pipeline?** Phase 1 maps every testable feature and data prerequisite → AskUserQuestion lets the user scope what matters → browser agents test scoped features sequentially (single dev server constraint) with compounding findings → synthesis consolidates all evidence into actionable tables.

> **Sibling scans** for other concerns: `SCAN-TARGET` (bug hunting), `SCAN-IMPLEMENTATION` (pre-implementation), `SCAN-DOCS` (documentation accuracy), `SCAN-SECURE` (security), `SCAN-DATA` (data flow & integrity), `SCAN-FUNCTIONAL` (workflows & UX)

**4-Phase Analysis workflow for `Explore` agent**:
1. Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools → `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

---

## **EXECUTION FLOW**

```
Phase 1: Explore opus + data opus (parallel discovery)
    ↓ synthesize (max 20 bullets)
AskUserQuestion (dynamically informed by Phase 1 counts)
    ↓ user selects scope
Phase 2: browser opus × N (sequential E2E testing, one per domain)
    ↓ synthesize between each browser agent
Phase 3: Orchestrator synthesis & presentation
```

---

## **PHASE 1: Discovery (parallel: 1x `Explore` opus + 1x `data` opus)**

Launch BOTH agents in a **single message** with two `Task` tool calls:

**Agent 1a — `Explore` opus (Feature Inventory)**:
```
Scan codebase for ALL testable features using 4-phase workflow (Discovery → Locate → Understand → Validate).
Goal: Map every route, workflow, mutation, auth pattern, and edge case gap for browser E2E audit.

Search targets:
- rg "path:" -g "src/**/*.ts{,x}" -C 2                                     # Route definitions
- rg "export default" -g "src/**/pages/**/*.ts{,x}" -l                      # Page components
- rg "mutation\(\{|action\(\{|query\(\{" -g "convex/**/*.ts" -c | sort -t: -k2 -nr  # Mutation density by file
- rg "ctx\.auth|getUserIdentity" -g "convex/**/*.ts" -l                     # Auth-gated functions
- rg "useMutation|useAction|useQuery" -g "src/**/*.tsx" -C 1                # Frontend → backend connections
- rg "toast|Toast|onError|catch" -g "src/**/*.tsx" -C 1                     # Error handling in UI
- wc -l src/**/pages/**/*.tsx src/components/**/*.tsx                        # Page/component sizes
- Read .env.local for test credential variable names (not values)

Deliverables (use STRUCTURED OUTPUT FORMAT below):
- Route inventory with page component and line count
- Feature domains grouped by area (e.g., Calendar, Logger, Analytics, Athletes, Exercises)
- Mutation density per domain (which areas have most backend operations)
- Auth patterns: which roles can access which features
- Edge case candidates: large components, complex forms, drag-drop, AI features
- Test credential env var names (NEVER include actual passwords in output)

STRUCTURED OUTPUT FORMAT — return findings as:

FEATURE DOMAINS:
| Domain | Routes | Pages | Mutations | Queries | Actions | Auth Roles | Complexity |
|--------|--------|-------|-----------|---------|---------|------------|------------|
| Calendar | /training-calendar | 2 | 5 | 3 | 1 | coach, athlete | HIGH |

EDGE CASE CANDIDATES:
| Area | File:Line | Pattern | Why It's Risky | Priority |
|------|-----------|---------|---------------|----------|
| Drag-drop | src/components/Calendar/...:45 | dnd-kit sortable | Race conditions, state sync | HIGH |

WORKFLOW CHAINS (multi-feature flows):
| Workflow | Steps | Domains Touched | Test Value |
|----------|-------|----------------|------------|
| Create → Log → Analyse | Calendar → Logger → Analytics | 3 | HIGH |
```

**Agent 1b — `data` opus (Test Data & Schema Diagnosis)**:
```
Diagnose data state and test data availability for browser E2E audit. Diagnostic only — no modifications.

Tasks:
- Schema analysis: tables, indexes, relationships relevant to testable features
- Data sampling: `npx convex data <table> --limit 5` for key tables (users, workouts, exercises, etc.)
- Test accounts: verify test credentials from .env.local work (check user table for matching emails)
- Data prerequisites: which features need pre-existing data (e.g., analytics needs logged workouts)
- Empty states: which features gracefully handle zero data vs crash

STRUCTURED OUTPUT FORMAT — return findings as:
| Table | Record Count | Has Test Data? | Required By Feature | Notes |
|-------|-------------|---------------|--------------------|----|
| users | ... | Yes/No | All features | Test accounts: coach@..., bronze@... |
| calendarWorkouts | ... | Yes/No | Calendar, Logger | Need workouts for logging tests |

DATA PREREQUISITES:
| Feature Under Test | Requires | Table | Minimum Records | Available? |
|-------------------|----------|-------|----------------|-----------|
| Analytics charts | Logged workout data | workoutLogs | 3+ | Yes/No |
| Exercise Library | Exercise categories | exerciseCategories | 1+ | Yes/No |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding to AskUserQuestion.

---

## **AskUserQuestion (Dynamically Informed by Phase 1)**

Generate questions from discovery. Replace placeholders with actual counts from Phase 1.

```
AskUserQuestion:
  questions:
    - question: "Phase 1 found {N} feature domains ({routeCount} routes, {mutationCount} mutations). Which to audit?"
      header: "Features"
      options:
        - label: "All domains (Recommended)"
          description: "Comprehensive E2E audit across all {N} domains — {workflowCount} workflows"
        - label: "High-complexity only"
          description: "Focus on {highComplexityDomains} — drag-drop, AI features, multi-step forms"
        - label: "Specific domain"
          description: "Test a single domain in depth — will ask which one"
        - label: "Recent changes only"
          description: "Focus on domains with recent git activity"
      multiSelect: false

    - question: "Include edge case testing?"
      header: "Edge Cases"
      options:
        - label: "Yes - test gaps ({gapCount} candidates) (Recommended)"
          description: "Empty states, validation boundaries, error handling, race conditions"
        - label: "Happy paths only"
          description: "Standard workflows with valid data — faster but less thorough"
        - label: "Validation & error paths"
          description: "Focus on form validation, error messages, invalid input handling"
      multiSelect: false

    - question: "Auth testing scope?"
      header: "Roles"
      options:
        - label: "Primary role only ({primaryRole})"
          description: "Test as {primaryRole} — covers core functionality"
        - label: "Cross-role testing ({roleCount} roles)"
          description: "Test each role's access — catches permission bugs"
        - label: "Permission boundaries"
          description: "Specifically test what each role CAN'T do — access control focus"
      multiSelect: false

    - question: "Testing depth?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "PREPARE → ACT → VERIFY → PERSIST for each workflow, 1 browser agent per domain"
        - label: "Smoke test"
          description: "Navigate + snapshot each route, verify loads without errors"
        - label: "Exhaustive"
          description: "Every permutation, every edge case, every role — multiple browser agents per domain"
      multiSelect: false
```

---

## **PHASE 2: E2E Testing (Nx `browser` opus, sequential)**

Spawn one `browser` agent per domain/workflow selected by user. Each agent runs sequentially.

### Browser Agent Orchestration

**Scoping**: Based on AskUserQuestion answers, determine:
- Number of browser agents needed (1 per domain for Standard, multiple for Exhaustive)
- Test order: start with domains that create data needed by later domains (e.g., Calendar before Analytics)
- Credentials per agent: which test account to use

**Per-agent prompt template**:
```
E2E test the [$DOMAIN] domain for [$ARGUMENTS].
Test credentials: [$EMAIL] / [$PASSWORD] (from .env.local)
Depth: [$DEPTH] | Edge cases: [$EDGE_CASES] | Auth scope: [$AUTH_SCOPE]

PHASE 1 CONTEXT:
[$SYNTHESIZED_PHASE_1_BULLETS]

PRIOR BROWSER FINDINGS (if any):
[$SYNTHESIZED_PRIOR_BROWSER_BULLETS]

DATA PREREQUISITES:
[$DATA_PREREQUISITES_FOR_THIS_DOMAIN]

INSTRUCTIONS:
1. Login with test credentials via UI (navigate → fill → click → verify)
2. Navigate to [$DOMAIN_ROUTE]
3. Create fresh test data via UI workflow — NEVER rely on existing data
4. Test each workflow in PREPARE → ACT → VERIFY → PERSIST sequence
5. Be creative — try to break things, find edge cases, test boundaries
6. After each VERIFY: run `timeout 5 npx convex logs --history 5` for backend verification
7. On failure: escalate with console/network/convex logs before reporting

WORKFLOWS TO TEST:
[$WORKFLOW_LIST_FOR_DOMAIN]

STRUCTURED OUTPUT FORMAT — return findings as:

TEST RESULTS:
| Test | Workflow | Steps | Result | Evidence | Notes |
|------|----------|-------|--------|----------|-------|
| T1 | Create workout | Navigate → fill form → submit | PASS/FAIL | screenshot-path, snapshot excerpt | ... |

ISSUES FOUND:
| Severity | Test | Issue | Steps to Reproduce | Evidence | Category |
|----------|------|-------|--------------------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | T1 | Description | Click X → fill Y → expect Z, got W | screenshot-path | bug/ux/edge-case/perf |
```

### VDD Verification Protocol (per browser agent)
**Philosophy**
- **Snapshot-first**: Never guess selectors — `take_snapshot` before every interaction.
- **Real input only**: No programmatic injection. Use `click`, `fill`, `press_key`, etc
- **Fresh data always**: Create test data manually via UI — never rely on existing state.
- **Evidence chains**: Every assertion backed by snapshot or screenshot.
- **Lazy debugging**: Console/network checks only on failure, not preemptively.
- **Creative testing**: Try to break things — empty inputs, special characters, rapid clicks, back-button, reload mid-flow.

**Sequence**
| Phase | Steps | Tools | Gate |
|-------|-------|-------|------|
| **PREPARE** | Navigate → wait for content → snapshot → create fresh test data via UI | `navigate_page`, `wait_for`, `take_snapshot`, `click`, `fill` | App loaded, data exists |
| **ACT** | Perform the user action being tested | `click`, `fill`, `drag`, `press_key` | Action executed |
| **VERIFY** | Snapshot + screenshot → confirm UI reflects expected state | `take_snapshot`, `take_screenshot` | UI correct |
| **VERIFY (backend)** | `timeout 5 npx convex logs --history 5` — default after every UI verify | Bash | Mutation succeeded |
| **PERSIST** | Reload → wait → snapshot → confirm state survived | `navigate_page type="reload"`, `wait_for`, `take_snapshot` | Data matches pre-reload |

**Escalation (only on VERIFY or PERSIST failure)**
VERIFY/PERSIST fails
    ├─ Step 1: Console errors?
    │   └─ list_console_messages types=["error"]
    ├─ Step 2: Backend mutation fired?
    │   └─ timeout 5 npx convex logs --history 10
    ├─ Step 3: Network failures?
    │   └─ list_network_requests resourceTypes=["xhr","fetch"]
    │
    ├─ Diagnosis: CODE issue → report with file:line evidence
    ├─ Diagnosis: DATA issue → report with table/query evidence
    └─ Diagnosis: FLAKY/timing → increase wait timeout, retry once

### Between Browser Agents

After each browser agent completes:
1. **Synthesize findings** into bullet list (max 10 items per agent)
2. **Inject into next agent** — avoids re-testing same paths, focuses on gaps
3. **Track cumulative test coverage** — which workflows tested, which remain

---

## **PHASE 3: Synthesis & Presentation**

On completion of ALL browser agents, synthesize and present:

- **Test coverage matrix** showing every route/workflow tested with pass/fail
- **Feature workflow diagram** (ASCII: user journeys tested, highlighting failure points)
- **Source tree** of tested files with line counts and test annotations
- **Detailed explanation** of discoveries in terms of user impact
- **Concise conclusion** with overall app health assessment

### Findings Tables

**TEST COVERAGE MATRIX**
| Domain | Route | Workflows Tested | Pass | Fail | Skip | Coverage |
|--------|-------|-----------------|------|------|------|----------|
| Calendar | /training-calendar | Create, Drag, Delete | 2 | 1 | 0 | 67% |
| Logger | /workouts | Log sets, Swap exercise | 2 | 0 | 0 | 100% |

**A. FUNCTIONAL & UX ISSUES**
| Priority | Issue | Domain | File:Line | Steps to Reproduce | Impact | Evidence |
|----------|-------|--------|-----------|-------------------|--------|----------|
| HIGH | ... | ... | ... | ... | ... | screenshot-path |
| MEDIUM | ... | ... | ... | ... | ... | snapshot excerpt |

**B. BUGS & EDGE CASES**
| Priority | Issue | Domain | File:Line | Steps to Reproduce | Expected | Actual | Evidence |
|----------|-------|--------|-----------|-------------------|----------|--------|----------|
| CRITICAL | ... | ... | ... | ... | ... | ... | screenshot-path |
| HIGH | ... | ... | ... | ... | ... | ... | ... |

**C. PERSISTENCE FAILURES**
| Domain | Workflow | Saved OK? | Survived Reload? | Backend Log | Issue |
|--------|----------|----------|-----------------|-------------|-------|
| Calendar | Create workout | Yes | No | No mutation logged | Optimistic update only |

**D. AUTH & ROLE ISSUES** (if cross-role testing selected)
| Role | Feature | Expected Access | Actual Access | Issue |
|------|---------|----------------|---------------|-------|
| athlete | Coach settings | Denied | Accessible | Missing role check |

**E. SEVERITY SUMMARY**
| Severity | Count | Top Priority Fix |
|----------|-------|-----------------|
| CRITICAL | ... | ... |
| HIGH | ... | ... |
| MEDIUM | ... | ... |
| LOW | ... | ... |

---

## **CRITICAL RULES**

1. **Do NOT run agents in background** — Wait for ALL agents to complete before proceeding
2. **Phases are SEQUENTIAL** — Phase 1 → AskUserQuestion → Phase 2 → Phase 3
3. **Phase 1 agents launch in parallel** — `Explore` opus + `data` opus in a SINGLE message
4. **Browser agents launch sequentially** — One at a time, single dev server constraint
5. **Synthesized context injection** — Every agent prompt includes synthesized key findings (max 20 bullets for Phase 1, max 10 per browser agent) from prior phases, not raw output
6. **Very thorough for ALL agents** — Comprehensive analysis set to thoroughness level `very thorough`
7. **All agents use opus** — Phase 1 `opus` + `opus` (deep discovery) → Phase 2 `opus` (browser testing) → Phase 3 orchestrator synthesis
8. **100% coverage** — Read files completely, do not skim
9. **Evidence-based** — Include file:line references, screenshot paths, and snapshot excerpts in ALL findings
10. **AskUserQuestion after Phase 1** — Dynamically generate questions from discovery counts, never static
11. **Never implement changes** — Analysis & presentation only, no fixes
12. **Do not search yourself** — Always delegate to subagents
13. **4-phase workflow for Explore** — Each Explore agent internally follows Discovery → Locate → Understand → Validate
14. **VDD Verification for browser** — Every browser test follows PREPARE → ACT → VERIFY → PERSIST
15. **Backend verification is default** — `timeout 5 npx convex logs --history 5` after every UI VERIFY, not just on failure
16. **Fresh test data always** — Browser agents create data via UI, never rely on existing state
17. **Creative testing encouraged** — Try to break things, test boundaries, empty inputs, special characters, rapid interactions
18. **Structured output format** — ALL agents return findings in the specified table format for consistent synthesis
19. **Orchestrator synthesizes between browser agents** — Deduplicate and consolidate before injecting into next browser agent
20. **Test order matters** — Start with data-creating domains (Calendar, Exercises) before data-consuming domains (Analytics, Logger)
21. **Exact counts** — Use `wc -l` for line counts, actual route/mutation counts from Phase 1, never estimate
