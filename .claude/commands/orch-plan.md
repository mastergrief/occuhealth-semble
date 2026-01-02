# ORCH-PLAN - Discovery & Design Phase

**Purpose**: Phase 0 of orchestration - discover codebase context and design implementation plan
**Output**: `pending-plan.json` in context hub for `/orch-execute` to consume
**Mode**: Plan mode required (shift+tab+tab)
**Arguments**: `$ARGUMENTS` = User's original request string

---

## PHASE 0: DISCOVERY & DESIGN

### 0.1 Launch 3 Explore Agents (SINGLE message, foreground)

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

### 0.3 Launch Plan Agent

```python
Task(
  subagent_type="Plan",
  prompt="""
  IMPLEMENTATION DESIGN: {$ARGUMENTS}

  Scout Results:
  - UI: {ui_scout}
  - API: {api_scout}
  - DB: {db_scout}

  Design Requirements:
  1. Implementation approach (strategy, patterns)
  2. Critical files to modify (with line counts)
  3. Phase breakdown for execution
  4. Risk assessment and mitigation
  5. Dependencies between changes

  Return: Structured design document.
  """
)
```

### 0.4 Write Pending Plan

```bash
# Write plan to context hub for /orch-execute
npx tsx ORCHESTRATION/cli/orch.ts plan write-pending "{planAgentOutput}"
```

**Plan Location**: `ORCHESTRATION/context-hub/pending-plans/plan-<timestamp>.json`

### 0.5 Present Plan Summary

Display to user:
1. **Scope**: Files affected, estimated complexity
2. **Phases**: Breakdown of implementation steps
3. **Risks**: Identified concerns and mitigations
4. **Next Step**: "Review plan, then run `/orch-execute` to begin implementation"

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
□ 0.3 - Plan agent launched with scout context
□ 0.4 - Pending plan written to context hub
□ 0.5 - Plan summary presented to user
```

---

**IMPORTANT**: This command ends after presenting the plan. User reviews, optionally edits, then runs `/orch-execute` to begin implementation.
