# AUDIT-PLAN - Discovery & Test Design Phase

**Phase 1 of 2**: Discover feature architecture and generate structured audit plan for `/audit-execute`.
**Output**: `pending-plans/audit-{timestamp}.json` via ORCHESTRATION CLI
**Agents**: 3-phase sequential — 1x `Explore` haiku (discovery) → 1x `Explore` opus (analysis) → 1x `Plan` opus (generation)

**IMPORTANT** - Always delegate with `Task` tool! Never Edit/Write! Phases SEQUENTIAL! Plan agent writes directly to context hub via `Bash`.

> **Why discovery-first?** Phase 1 discovers testable features, then AskUserQuestion presents informed choices. Phase 2 analyzes only selected domains — no wasted tokens.

**4-Phase Analysis workflow for `Explore` agents**:
1. Discovery (rg commands) - `wc -l` for ALL counts, `rg -l` files only, `rg -c | sort -nr` density hotspots
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False, depth=1)`
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols`
4. Validate (Checkpoints) - `think_about_collected_information()` after searches

---

## **EXECUTION FLOW**

```
Phase 1: haiku (discovery) → AskUserQuestion (informed) → Phase 2: opus (analysis) → Phase 3: Plan opus (JSON)
```

| Phase | Agent | Input | Output |
|-------|-------|-------|--------|
| 1 | Explore haiku | [$ARGUMENTS] | Feature inventory |
| — | AskUserQuestion | Phase 1 findings | User selections |
| 2 | Explore opus | Phase 1 + selections | Verification checklists |
| 3 | Plan opus | All findings | `audit-{timestamp}.json` |

---

## **PHASE 1: Discovery (1x Explore haiku)**

Scan codebase for testable features. Output structured inventory for AskUserQuestion.

**Discover**: Routes & pages, mutation density by domain, auth patterns & roles, edge case gaps, test credential env vars (names only).

**Output**: Feature domains table, route inventory, edge case gaps, auth patterns, recommended focus (HIGH/MED/LOW).

**WAIT for completion before AskUserQuestion!**

---

## **AskUserQuestion (Informed by Phase 1)**

Generate questions dynamically from discovery. Replace placeholders with actual counts.

```yaml
questions:
  - question: "Phase 1 found {N} domains. Which to audit?"
    header: "Features"
    options:
      - label: "All domains ({routes} routes, {mutations} mutations)"
      - label: "High-complexity only ({highDomains})"
      - label: "Specific domain"
      - label: "Recent changes only"

  - question: "Include edge case testing?"
    header: "Edge Cases"
    options:
      - label: "Yes - test gaps ({gapCount} components)"
      - label: "Happy paths only"
      - label: "Validation only"

  - question: "Auth testing scope?"
    header: "Roles"
    options:
      - label: "Primary role only ({primaryRole})"
      - label: "Cross-role testing ({roleCount} roles)"
      - label: "Permission boundaries"

  - question: "Testing depth?"
    header: "Depth"
    options:
      - label: "Standard (Recommended)"
      - label: "Smoke test"
      - label: "Exhaustive"
```

**User selections → Phase 2 sections:**

| Selection | Sections |
|-----------|----------|
| Happy paths only | Mutations only |
| Validation only | Mutations + Validation |
| Edge cases | Mutations + Validation + Empty/Error |
| Cross-role | + Permissions |

---

## **PHASE 2: Targeted Analysis (1x Explore opus)**

Analyze ONLY selected domains. Dynamic sections based on user selection.

**Section A (always)**: Mutation mapping — triggers, args, backend handlers, DB ops, expected logs, feedback.

**Section B (if validation)**: Validator constraints, error messages, rejection scenarios.

**Section C (if edge cases)**: Empty state patterns, error boundary coverage.

**Section D (if permissions)**: Role checks, protected routes, unauthorized behavior.

**Output**: Scenario counts by protocol, verification checklists, key findings.

**WAIT for completion before Phase 3!**

---

## **PHASE 3: Plan Generation (1x Plan opus)**

Generate comprehensive e2e audit plan with full workflow awareness.

### Plan Agent Prompt

```
Task(
  subagent_type="Plan",
  model="opus",
  prompt="""
  Generate a comprehensive e2e audit plan from discovery and analysis findings.

  ## Input
  Phase 1 Discovery: {phase1_output}
  Phase 2 Analysis: {phase2_output}
  User Selections: features={features}, edgeCases={edgeCases}, roles={roles}, depth={depth}

  ## Core Principle: Workflow Prerequisites

  Features don't exist in isolation. To test feature X, you often need feature Y to exist first.

  **Identify dependency chains:**
  - What data must exist before this feature can be tested?
  - What user actions create that prerequisite data?
  - What's the minimum viable path to reach the testable state?

  **Examples (generic patterns):**
  - Testing "edit item" requires "create item" first
  - Testing "view details" requires navigating from "list view"
  - Testing "submit form" requires "fill form fields" first
  - Testing "delete confirmation" requires "click delete" first
  - Testing "search results" requires "items exist in database"
  - Testing "notification badge" requires "trigger notification event"
  - Testing "export report" requires "data to export exists"

  ## Scenario Ordering Rules

  ### 1. Build Dependency Graph
  For each testable feature, determine:
  - **Requires**: What must exist/happen before this test
  - **Creates**: What state/data this test produces
  - **Enables**: What tests become possible after this

  ### 2. Order by Prerequisites
  ```
  Authentication → Data Creation → Data Manipulation → Data Viewing → Cleanup
  ```

  Generic ordering:
  1. Login/auth scenarios (enable all protected routes)
  2. Create/setup scenarios (produce testable data)
  3. Read/view scenarios (verify created data)
  4. Update/modify scenarios (change existing data)
  5. Delete/cleanup scenarios (remove data, test empty states)
  6. Edge cases (validation, errors, permissions)

  ### 3. Chain Scenarios into Journeys
  Group related scenarios into user journeys that share state:

  ```
  Journey: "Item Management"
  ├── J1-01: Login as user
  ├── J1-02: Navigate to items list (prereq: J1-01)
  ├── J1-03: Create new item (prereq: J1-02, creates: item)
  ├── J1-04: View item details (prereq: J1-03)
  ├── J1-05: Edit item (prereq: J1-04)
  ├── J1-06: Delete item (prereq: J1-05)
  └── J1-07: Verify empty state (prereq: J1-06)
  ```

  ### 4. Explicit Prerequisites per Scenario
  Every scenario declares:
  - `prerequisites`: Scenario IDs that must pass first
  - `creates`: State/data this scenario produces
  - `cleanup`: Whether to preserve or reset state after

  ## Protocol Structure

  ### HAPPY_PATH (always included)
  Full user journeys through core functionality.
  - Order: auth → create → read → update → delete
  - Each scenario chains to next via prerequisites
  - Verify both UI state AND backend persistence

  ### VALIDATION (if enabled)
  Invalid input scenarios within existing journeys.
  - Insert after the "create" step that would normally succeed
  - Verify rejection without corrupting state
  - No backend mutation expected

  ### EMPTY_STATE (if enabled)
  Fresh user or cleared data scenarios.
  - Test BEFORE create scenarios (truly empty)
  - Test AFTER delete scenarios (returned to empty)
  - Verify meaningful empty messages

  ### ERROR_RECOVERY (if enabled)
  Failure and recovery scenarios.
  - Network errors, timeouts, invalid state
  - Verify graceful degradation
  - Verify recovery path works

  ### PERMISSION (if enabled)
  Cross-role access scenarios.
  - Same journey, different role
  - Verify denied at correct points
  - No unauthorized data leakage

  ## Scenario Format

  ```json
  {
    "id": "HP-03",
    "suite": "ItemManagement",
    "name": "Create new item with required fields",
    "role": "user",
    "route": "/items/new",
    "prerequisites": ["HP-01", "HP-02"],
    "creates": ["item:testItem1"],
    "steps": [
      "Navigate to /items",
      "Click 'New Item' button",
      "Fill name field: 'Test Item'",
      "Fill description field: 'Test description'",
      "Click 'Save' button"
    ],
    "verification": {
      "ui": "Success toast visible, redirected to item detail page",
      "console": "No errors",
      "backend": "[MUTATION items:create] name='Test Item'",
      "persistence": "Item appears in list after page reload"
    },
    "priority": "high",
    "cleanup": "preserve"
  }
  ```

  ## 3-Layer Verification (REQUIRED)

  Every scenario specifies:
  - **ui**: Snapshot/visual assertion after action
  - **console**: Expected console state (usually "No errors")
  - **backend**: Expected mutation log pattern (or "None" for read-only)
  - **persistence**: What survives page reload (or "N/A")

  ## JSON Schema

  Write to context hub:
  ```bash
  npx tsx ORCHESTRATION/cli/orch.ts plan write-pending --stdin <<'EOF'
  {
    "type": "e2e-audit",
    "metadata": {
      "generatedAt": "{timestamp}",
      "target": "{$ARGUMENTS}",
      "scope": "{selectedFeatures}",
      "depth": "{depth}",
      "roles": ["{roles}"],
      "discoveryFindings": {
        "totalRoutes": {N},
        "totalMutations": {N},
        "edgeCaseGaps": {N}
      }
    },
    "journeys": [
      {
        "id": "J1",
        "name": "Core Feature Flow",
        "description": "End-to-end journey through primary functionality",
        "scenarios": ["HP-01", "HP-02", "HP-03", "HP-04"]
      }
    ],
    "protocols": {
      "HAPPY_PATH": {
        "description": "Normal user journeys verify success",
        "scenarios": [...],
        "gate": { "condition": "all_pass" }
      },
      "VALIDATION": {
        "description": "Invalid input rejected gracefully",
        "scenarios": [...],
        "gate": { "condition": "console_clean" }
      }
    },
    "execution": {
      "totalScenarios": {N},
      "totalJourneys": {N},
      "byProtocol": {...},
      "credentials": {
        "{role}": { "emailEnv": "ENV_VAR", "passwordEnv": "ENV_VAR" }
      },
      "executionOrder": ["HP-01", "HP-02", "HP-03", ...]
    }
  }
  EOF
  ```

  ## Priority Assignment

  - **high**: Auth, core CRUD, data integrity, payment flows
  - **medium**: Secondary features, non-critical paths
  - **low**: Edge cases, cosmetic, nice-to-have

  Return brief summary: journey count, scenario count by protocol, execution order.
  """
)
```

---

## PRESENT SUMMARY

After Plan agent completes:

```markdown
## Audit Plan: {target}

### Discovery
| Metric | Count |
|--------|-------|
| Domains | {N} |
| Routes | {N} |
| Mutations | {N} |

### User Journeys
| Journey | Scenarios | Description |
|---------|-----------|-------------|
| J1: Core Flow | {N} | End-to-end primary functionality |
| J2: Edge Cases | {N} | Validation and error handling |

### Protocol Coverage
| Protocol | Scenarios | Gate |
|----------|-----------|------|
| HAPPY_PATH | {N} | all_pass |
| VALIDATION | {N} | console_clean |
| EMPTY_STATE | {N} | console_clean |
| PERMISSION | {N} | all_pass |

### Execution Order (prerequisite-aware)
1. HP-01: Login → 2. HP-02: Navigate → 3. HP-03: Create → ...

**Plan saved to**: `pending-plans/audit-{timestamp}.json`
**Next**: `/audit-execute`
```

---

## CRITICAL RULES

1. **Phase 1 before AskUserQuestion** — Never ask blind questions
2. **AskUserQuestion uses Phase 1 data** — Replace placeholders with findings
3. **Phase 2 is SINGLE opus** — Dynamic sections based on selection
4. **Phases SEQUENTIAL** — Phase 1 → Questions → Phase 2 → Phase 3
5. **Foreground only** — Never run agents in background
6. **Plan agent writes via Bash** — `npx tsx ORCHESTRATION/cli/orch.ts plan write-pending --stdin`
7. **No raw credentials** — Only env var names
8. **3-layer verification** — UI + Console + Backend + Persistence per scenario
9. **Prerequisites are explicit** — Every scenario declares dependencies
10. **Journeys chain scenarios** — Related scenarios share state
11. **Execution order respects prerequisites** — Never test X before Y if X requires Y
