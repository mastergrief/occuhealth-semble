# ORCH-PLAN - Discovery & Design Phase

**Purpose**: Phase 0 of orchestration - discover codebase context and design implementation plan
**Output**: `pending-plan.json` in context hub for `/orch-execute` to consume
**Arguments**: `$ARGUMENTS` = User's original request string

---

## PHASE 0: DISCOVERY & DESIGN

### 0.1 Launch 3 `Explore` Agents set to thoroughness level `very thorough` with `Task` tool (SINGLE message, foreground)

**4-Phase Analysis workflow for `Explore` agents**: 
1. Discovery (rg commands) - `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

```python
# All 3 in SINGLE message - foreground (blocking)
Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover UI files for {$ARGUMENTS}. Return: components, hooks, pages with line counts."
)

Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover API files for {$ARGUMENTS}. Return: Convex functions, mutations, queries."
)

Task(
  subagent_type="Explore",
  prompt="SCOUT: Discover DB context for {$ARGUMENTS}. Return: schema tables, relationships, indexes."
)
```

### 0.2 Collect Scout Results
Results returned directly from foreground Task calls:
- `ui_scout` = UI components, hooks, pages
- `api_scout` = Convex functions, mutations, queries
- `db_scout` = Schema tables, relationships

### 0.3 Launch `Plan Agent` with `Task` tool (Writes Plan to Context Hub)

```python
Task(
  subagent_type="Plan",
  prompt="""
  IMPLEMENTATION DESIGN: {$ARGUMENTS}

  Scout Results:
  - UI: {ui_scout}
  - API: {api_scout}
  - DB: {db_scout}

  ## Your Tasks

  ### 1. Design Implementation Plan
  Create structured plan with:
  - Implementation approach (strategy, patterns)
  - Critical files to modify (with line counts)
  - Phase breakdown for execution
  - Risk assessment and mitigation
  - Dependencies between changes

  ### 2. Write Plan to Context Hub
  Use Bash to write plan JSON:
  ```bash
  npx tsx ORCHESTRATION/cli/orch.ts plan write-pending '<plan_json>'
  ```

  Plan JSON schema:
  {
    "request": "{$ARGUMENTS}",
    "scope": { "ui": [...], "api": [...], "db": [...] },
    "phases": [{ "name": "...", "files": [...], "description": "..." }],
    "criticalFiles": [{ "path": "...", "lines": N, "change": "..." }],
    "risks": [{ "risk": "...", "mitigation": "..." }],
    "dependencies": [...]
  }

  ### 3. Return Markdown Summary
  Return ONLY a formatted markdown summary for parent to display:
  - Scope (file counts by category)
  - Phases (numbered list)
  - Critical files (with line counts)
  - Risks (with mitigations)
  - Plan file path
  """
)
```

**Plan Location**: `ORCHESTRATION/context-hub/pending-plans/plan-<timestamp>.json`

### 0.4 Present Plan Summary

Display Plan agent's returned markdown summary verbatim. Plan agent already formatted:
- Scope, Phases, Critical Files, Risks, Plan file path

Parent adds only: "Review plan above, then run `/orch-execute` to begin implementation."

---

## Output Format

```
## Plan Summary: {$ARGUMENTS}

### Scope
- UI: {N} components, {M} hooks
- API: {X} mutations, {Y} queries
- DB: {Z} tables affected

### Phases
1. {phase_1_description}
2. {phase_2_description}
...

### Critical Files
- `path/to/file.ts` ({lines} lines) - {change_description}
...

### Risks
- {risk_1}: {mitigation}
...

---
**Plan saved to**: `pending-plans/plan-{timestamp}.json`
**Next**: Review plan above, then run `/orch-execute` to begin implementation.
**Edit**: Modify plan at path above before executing if needed.
```

---

## Execution Checklist

```
□ 0.1 - 3 Explore agents launched (SINGLE message, foreground)
□ 0.2 - Scout results collected (UI, API, DB)
□ 0.3 - Plan agent launched → writes plan to context hub → returns summary
□ 0.4 - Parent displays Plan agent's summary verbatim
```

---

**IMPORTANT**: This command ends after presenting the plan. User reviews, optionally edits, then runs `/orch-execute` to begin implementation.
