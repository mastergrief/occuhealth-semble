# Serena - Symbolic Code Intelligence

Semantic coding tools for token-efficient codebase exploration and precise editing.

---

## **Memory Management & Lifecycle**

**Initial Setup**:
- `mcp__serena__check_onboarding_performed()` → verify if project has been explored
- `mcp__serena__onboarding()` → initial project familiarization (if not performed)
- Creates `.serena/memories/` with architectural insights

**Working with Memories**:
- `mcp__serena__list_memories()` → see available knowledge before starting work
- `mcp__serena__read_memory(name)` → load relevant context (only if task-relevant)
- `mcp__serena__write_memory(name, content)` → persist discoveries in markdown format
- `mcp__serena__delete_memory(name)` → remove outdated/incorrect information (user request only)

What to Memorise?
**Architecture patterns**: How auth works, data flow, module organization
**Key entry points**: Main services, routers, initialization
**Conventions**: Naming patterns, testing approach, build process
**Complex discoveries**: Multi-file investigations, dependency graphs
**Session continuations**: Current state for resuming in new conversation

When to Use Memories?
**Read at start**: Check `mcp__serena__list_memories()` → avoid re-discovering existing knowledge
**Write after discovery**: Significant architecture understanding, complex investigation results
**Write before context limit**: Save progress for continuation in new session

Essential Rules:
1. **Read memories first** — don't re-explore what's already known
2. **Memory names are descriptive** — `authentication_architecture_[Timestamp]`
3. **Write after significant discovery** — not every small finding, just architectural insights
4. **Memories persist across sessions** — future-you will thank present-you

---

## **Codebase Search Workflow (DISCOVER → LOCATE → UNDERSTAND → VALIDATE)**
4-Step Pattern: ripgrep for breadth → Serena for depth
**Step 1: DISCOVER** (ripgrep — broad scoping)
- `rg -l "pattern" -g "*.ts"` → Find candidate files (list only, fast)
- `rg -c "pattern" -g "*.ts" | sort -t: -k2 -nr | head -10` → Measure density, find hotspots
- `rg "pattern" -g "*.ts" -C 2 | head -50` → Preview context around matches
- Flags: `-l` (files only), `-c` (count), `-i` (case-insensitive), `-g` (glob filter), `--glob "!*.test.ts"` (exclude)
- Skip if: Files already known from memories or previous discovery
**Step 2: LOCATE** (Serena — structure without bodies)
- `mcp__serena__get_symbols_overview(file)` → See all symbols without reading implementations
- `mcp__serena__find_symbol(name_path, include_body=False, depth=1, relative_path=<file>)` → Map class/interface structure
**Step 3: UNDERSTAND** (Serena — targeted deep reads)
- `mcp__serena__find_symbol(name_path, include_body=True, relative_path=<specific>)` → Read ONLY needed symbols
- `mcp__serena__find_referencing_symbols(name_path, file)` → Analyze usage/dependencies
- `mcp__serena__search_for_pattern(regex)` → For strings/patterns in non-code files only
**Step 4: VALIDATE**
- `mcp__serena__think_about_collected_information()` → Verify sufficiency before proceeding
Essential Rules:
1. **ripgrep for breadth, Serena for depth** — find candidates fast, then analyze precisely
2. **Never `include_body=True` until you know exactly which symbol** — structure first, implementation last
3. **Always restrict with `relative_path`** when context known — faster, fewer results
4. **Name paths**: `"symbol"` (anywhere), `"Class/method"` (nested), `"/Class/method"` (absolute top-level)
5. **Symbolic for code, pattern for text** — use `find_symbol` for functions/classes, `search_for_pattern` for strings
6. **Call thinking tools after search sequences** — especially before editing code
7. **Discovery hierarchy**: Memories > ripgrep (broad) > Serena symbolic (precise)

---

## **Editing Operations Workflow**
**Replace entire symbol** (function, method, class):
- `mcp__serena__replace_symbol_body(name_path, file, body)` → body includes signature, excludes docstrings/imports
**Insert new code**:
- `mcp__serena__insert_before_symbol(name_path, file, body)` → add imports (use first symbol as anchor)
- `mcp__serena__insert_after_symbol(name_path, file, body)` → add new functions (use last symbol for end-of-file)
**Refactor names**:
- `mcp__serena__rename_symbol(name_path, file, new_name)` → updates all references codebase-wide
Essential Rules:
1. **Think before edit** — `mcp__serena__think_about_task_adherence()` is mandatory before modifications
2. **Symbol bodies exclude docstrings/imports** — don't include preceding comments in replacement
3. **Use anchors for position** — first symbol for imports, last symbol for end-of-file additions
4. **Verify impact first** — call `mcp__serena__find_referencing_symbols` before signature changes
5. **Editing tools are reliable** — no verification needed if no error returned

---

## **Reflection Workflow**
3 Thinking Checkpoints:
**After Search** (validate sufficiency):
- `mcp__serena__think_about_collected_information()` → call after ANY non-trivial search sequence
- Questions: Do I have what I need? Missing critical context? Ready to proceed?
**Before Edit** (verify alignment):
- `mcp__serena__think_about_task_adherence()` → **MANDATORY** before any code modification
- Questions: Still on track? Plan matches user request? Assumptions valid?
**Task Completion** (confirm done):
- `mcp__serena__think_about_whether_you_are_done()` → call when you believe task is complete
- Questions: All requirements met? Edge cases handled? Tests passing?
When to Think:
**Always after**: Multiple find_symbol calls, search_for_pattern sequences, referencing symbol checks
**Always before**: replace_symbol_body, insert operations, rename_symbol
**Always when**: Feeling "done" with a task or subtask
Essential Rules:
1. **Thinking is mandatory, not optional** — these aren't suggestions, they're quality gates
2. **Think prevents drift** — catches mistakes before they propagate
3. **Think saves tokens** — finding gaps early prevents redundant work later
