# DOC-SHARD - Sprint Documentation Protocol

Using the `Plan` agent, model `opus` with the `Task` tool decompose comprehensive plans [$ARGUMENTS] into structured sprint files for phased execution.

**PRE**: Validate [$ARGUMENTS] (analysis input, scope, depth)
**PRE**: `mcp__serena__list_memories()` → check for existing related docs (avoid duplication)

---

## AUTONOMOUS EXECUTION - `Plan` agent

**CRITICAL**: Plan agent executes ALL steps autonomously. DO NOT return to parent until all files written and verified.

### STEP 1: Assess Content Volume
- Read input (file/analysis/query from $ARGUMENTS)
- Calculate estimated output size (word count, section count)
- `mcp__serena__think_about_collected_information()` → input sufficient?
- **Decision Tree**:
```
├─ <1000 words → SINGLE FILE → skip to STEP 4
├─ 1000-3000 words → 2-3 SPRINTS
└─ >3000 words → N SPRINTS (1 per major section/phase)
```
- **Output**: `📊 Input: {n} words → {n} sprints planned`


### STEP 2: Plan Sprint Structure
- Identify logical sections/phases from input
- Create sprint manifest:
```markdown
| Sprint | Topic | Est. Words | Dependencies | Priority |
|--------|-------|------------|--------------|----------|
| 01 | Overview & Context | ~400 | None | P1 |
| 02 | Phase 1 Implementation | ~600 | 01 | P1 |
| 03 | Phase 2 Implementation | ~500 | 02 | P2 |
```
- Define cross-references (which sprints depend on others)
- **Naming Pattern**: `{PREFIX}_SPRINT_{NN}_{TOPIC}`
  - Example: `FEATURE_X_SPRINT_01_OVERVIEW`
  - Example: `FEATURE_X_SPRINT_02_BACKEND`
- `mcp__serena__think_about_task_adherence()` → structure aligned with objectives?


### STEP 3: Generate Sprints
**EXECUTE DIRECTLY** - Call Serena tools, do not delegate:

For each sprint in manifest:
```
mcp__serena__write_memory("{PREFIX}_SPRINT_{NN}_{TOPIC}", content)
```

- **Sprint Header** (mandatory):
```markdown
# {TOPIC}
**Sprint**: {NN} of {TOTAL}
**Index**: {PREFIX}_INDEX
**Depends On**: {list or "None"}
**Next**: {NEXT_SPRINT or "Complete"}
```
- **Sprint Content**: Implementation details, acceptance criteria, evidence
- **Sprint Footer**: `→ Next: {NEXT_SPRINT_NAME}` or `✓ Final Sprint`
- **Output per sprint**: `✓ Sprint {NN}/{TOTAL} written: {name} ({n} words)`


### STEP 4: Create Master Index
**EXECUTE DIRECTLY**:
```
mcp__serena__write_memory("{PREFIX}_INDEX", index_content)
```

- **Index Structure**:
```markdown
# {PREFIX} - Sprint Index

**Created**: {ISO timestamp}
**Total Sprints**: {N}
**Total Words**: {N}
**Scope**: {from $ARGUMENTS}

## Sprint Manifest
| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | {TOPIC} | {n} | Pending | None |
| 02 | {TOPIC} | {n} | Pending | 01 |

## Reading Order
1. {SPRINT_01} - Foundation/context
2. {SPRINT_02} - Core implementation
3. ...

## Topic Cross-Reference
- Authentication → Sprint 02, Sprint 04
- Database → Sprint 03
- Frontend → Sprint 05, Sprint 06
```


### STEP 5: Verify & Complete
**STILL WITHIN Plan AGENT** - Do not return yet:

- `mcp__serena__list_memories()` → confirm all sprints + index exist
- Validate cross-references resolve (dependencies exist)
- Check total coverage matches input scope
- `mcp__serena__think_about_whether_you_are_done()` → all sprints + index created?

**RETURN TO PARENT** only after verification passes.

---

## RETURN FORMAT

Plan agent returns structured summary to parent:
```
✓ DOC-SHARD COMPLETE
📊 Sprints: {N} files, {M} total words
📁 Index: {PREFIX}_INDEX
📋 Sprint Files:
  - {SPRINT_01}: {topic} ({n} words)
  - {SPRINT_02}: {topic} ({n} words)
  - ...
✓ Verified: All files written, cross-references valid
```

Parent logs result only - no additional file operations required.
