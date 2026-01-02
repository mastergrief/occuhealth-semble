## SESSION START SEQUENCE (MANDATORY)

1. **Read Context** (in order):
- `.env.local` → `mcp__serena__list_memories()` → `mcp__serena__read_memory(name)` (relevant ones)

2. **Create Todo List** (if complex task):
- TodoWrite tool with concrete steps

**Full-stack development directive (FE+BE+DB)** NO MOCK CODE, NO MOCK DATA, ONLY REAL WORKING FEATURES & FUNCTIONALITY
- NO GIT ACTIONS unless explicitly requested
- Read entire documentation files with 100% coverage i.e `.md` files, don't skim read
- Typecheck is BLOCKING - failures must be fixed immediately
- Auth: Convex Auth (coaches/clients), Clerk Auth (admins)
- READ `.env.local` for API keys/implementations & test user credentials
- Read `package.json` for dependencies & npm commands
- LLM: gpt-5-mini key in `.env.local` uses default temperature of (1)
- Serena memory structure: project subdirectory `.serena\memories\project` contains architecture, code conventions, project overview, tech stack etc
- When presented with an image or screenshot analyse deeply with 100% content & coverage, think about what you're looking at in relation to the query or request given, leave no stones unturned & create ASCII wireframe diagram of what you have observed/analysed to present as findings.
- Modular Architecture (Facade Pattern):
- **Threshold**: >400 lines = flag as concern, >800 lines = must split before adding features
- **Pattern**: Facade file (<100 lines, re-exports only) + focused modules (~150-400 lines each)
- **Structure**: `module.ts` (facade) → `moduleModules/{mutations,queries,domain}.ts`
- **Reference implementations**: `calendarWorkoutsModules/`, `trainingBlockMarkersModules/`
- **Critical**: Preserve API paths - facade re-exports maintain `api.module.function` compatibility
- **On analysis**: Flag monolithic files with split recommendation showing target structure
- Always use planning mode for all analysis & implementation tasks
- Never run subagents in the background, keep them in the foreground and wait for completion!

---

#**Serena Memory Management & Memory Lifecycle**
**Initial Setup**:
- `mcp__serena__check_onboarding_performed()` → verify if project has been explored
- `mcp__serena__nboarding()` → initial project familiarization (if not performed)
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
1. **Read memories first** - don't re-explore what's already known
2. **Memory names are descriptive** - `authentication_architecture_[Timestamp]`
3. **Write after significant discovery** - not every small finding, just architectural insights
4. **Memories persist across sessions** - future-you will thank present-you

#**Serena Symbolic Search Workflow (SEMANTIC ANALYSIS PROTOCOL)**
3-Phase Pattern: LOCATE → UNDERSTAND → VALIDATE
**Phase 1: LOCATE** (structure without bodies)
- Files known (from memories) → Direct to symbolic tools
- `mcp__serena__get_symbols_overview(file)` → See all symbols without reading implementations
- `mcp__serena__find_symbol(name_path, include_body=False, depth=1, relative_path=<file>)` → Map class/interface structure
**Phase 2: UNDERSTAND** (targeted deep reads)
- `mcp__serena__find_symbol(name_path, include_body=True, relative_path=<specific>)` → read ONLY needed symbols
- `mcp__serena__find_referencing_symbols(name_path, file)` → analyze usage/dependencies
- `mcp__serena__search_for_pattern(regex)` → for strings/pattern/non-code only
**Phase 3: VALIDATE**
- `mcp__serena__think_about_collected_information()` → verify sufficiency before proceeding
Essential Rules:
1. **Never `include_body=True` until you know exactly which symbol** - structure first, implementation last
2. **Always restrict with `relative_path`** when context known - faster, fewer results
3. **Name paths**: `"symbol"` (anywhere), `"Class/method"` (nested), `"/Class/method"` (absolute top-level)
4. **Symbolic for code, pattern for text** - use `find_symbol` for functions/classes, `search_for_pattern` for strings
5. **Call thinking tools after search sequences** - especially before editing code
6. **Discovery hierarchy**: Memories > Serena symbolic tools

#**Editing Operations Workflow**
**Replace entire symbol** (function, method, class):
- `mcp__serena__replace_symbol_body(name_path, file, body)` → body includes signature, excludes docstrings/imports
**Insert new code**:
- `mcp__serena__insert_before_symbol(name_path, file, body)` → add imports (use first symbol as anchor)
- `mcp__serena__insert_after_symbol(name_path, file, body)` → add new functions (use last symbol for end-of-file)
**Refactor names**:
- `mcp__serena__rename_symbol(name_path, file, new_name)` → updates all references codebase-wide
Essential Rules:
1. **Think before edit** - `mcp__serena__think_about_task_adherence()` is mandatory before modifications
2. **Symbol bodies exclude docstrings/imports** - don't include preceding comments in replacement
3. **Use anchors for position** - first symbol for imports, last symbol for end-of-file additions
4. **Verify impact first** - call `mcp__serena__find_referencing_symbols` before signature changes
5. **Editing tools are reliable** - no verification needed if no error returned

#**Serena Reflection Workflow**
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
1. **Thinking is mandatory, not optional** - these aren't suggestions, they're quality gates
2. **Think prevents drift** - catches mistakes before they propagate
3. **Think saves tokens** - finding gaps early prevents redundant work later


#**Convex-cli**
Run CLI scripts directly (or via TypeScript SDK/advanced SDK for programmatic access)
**Architecture** (3 layers: CLI → API → SDK, ~2,000 TypeScript lines, LRU cache, telemetry):
- CLI scripts: 7 individual commands (status, tables, data, functions, run, env, logs)
- TypeScript API: ConvexCLI class with Zod validation
- Advanced SDK: Builder pattern, caching, batch operations, streaming, monitoring
- Response format: `{ success, data, error, metadata }` with type safety
- Performance: 2-4s per operation (cold start), < 1ms (cached)
**Core Data Operations**: Query → Cache → Execute → Validate
1. **Query** - CLI scripts or SDK builders construct operations
2. **Cache** - LRU cache checks (60s TTL status/env, 300s tables/functions)
3. **Execute** - Spawn `npx convex` subprocess with timeout (default: 30s)
4. **Validate** - Zod schemas verify response structure
**Essential Commands**
```bash
# Status & Discovery
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json          # Deployment info (< 1ms)
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json          # List tables (3.5s cold, 300s cache)
npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --json       # List functions (2ms, 300s cache)
# Data Operations
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <table> --limit=10 --json  # Query data (2.5s, no cache)
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <fn:name> '{}' --json       # Execute function (2.5s, no cache)
# Environment Management
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --json        # List env vars (2.5s, 60s cache)
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts get VAR --json     # Get variable (2.5s, 60s cache)
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts set VAR val        # Set variable (invalidates cache)
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --masked      # Mask secrets (sk-p***z789)
# Logs & Debugging
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=20 --json       # Recent logs (5-10s)
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=5 --timeout=15000  # With timeout
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --follow          # Stream logs (EventEmitter)
# Security Features
- Auto-masks: /key|secret|token|password|jwks|jwt|api_key|private|auth|credential/i
- Format: "sk-proj-xyz123" → "sk-p***z789" (first 4 + last 4 chars)
- SDK default: masked=true (security by default)
```
**Critical Rules**
- **Always use --json flag** → Ensures parseable output, no mixed messages
- **Respect cache TTLs** → Status/env 60s, tables/functions 300s, data/run no cache
- **Timeout parameter required for logs** → Default 30s, increase for large history
- **Mask secrets in production** → Use `--masked` flag to hide sensitive env vars
- **Input validation** → Rejects NaN/negative limits (FIX-009), validates var existence (FIX-007)
- **Builder pattern for queries** → `.limit()`, `.order()`, `.noCache()` chaining
- **Stream for large datasets** → Reduces memory 99% (50MB → 500KB for 10K docs)
- **Batch parallel for independence** → Reduces latency 33% (6s → 4s for 3 ops)
**Performance Optimization**:
- **Reuse SDK instances** → Connection pooling reduces overhead (6s → 4s for 3 ops)
- **Cache repeated queries** → Eliminates redundant API calls (6s → 2s for repeated status)
- **Stream large datasets** → Memory-efficient iteration (15s/50MB → 1s/500KB)
- **Batch parallel operations** → Execute independent ops concurrently (8s → 4s)
**Debugging**
| Issue | Cause | Solution |
|-------|-------|----------|
| Timeout (> 30s) | Logs without timeout, large history | Add `--timeout=60000`, reduce `--history=10` |
| Empty results | Table empty, limit too small | Verify table exists (`tables`), increase `--limit` |
| Invalid JSON | Mixed output modes | Use `--json` only, avoid mixing flags |
| Function not found | Wrong path format | Use `module:functionName` not `module.functionName` |
| Cache stale data | Long TTL, data changed | Use `.noCache()` or `clearCache()` for fresh data |
| Memory high | Loading large datasets | Use `sdk.stream()` instead of `.execute()` |
| Slow repeated queries | Cache disabled | Enable cache: `{ cache: { enabled: true } }` |
| Cold start slow (3.5s) | Convex CLI initialization | Expected first-command penalty, subsequent calls faster |
**Golden Operations Workflow**
```bash
# Status → Tables → Query → Run → Verify
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json  # Check deployment
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json  # List available tables
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=5 --json  # Query data
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list '{}' --json   # Execute function
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --masked            # Verify config
```

---
#**SEQUENTIAL FILE MODIFICATIONS**
- **ONE edit per file per message** → Prevents concurrent hook execution
- **Batch changes** → Combine multiple edits into single tool call
- **Hook awareness** → PostToolUse:Edit triggers typecheck (1-60s), never stack edits

#**CONFIGURATION EDITING DISCIPLINE**
When editing `.claude/` configs (agents, CLAUDE.md, commands):
- **Preserve structure** → Match existing formatting (bullets, sections, headers)
- **Match tone** → Imperative, terse, no fluff (e.g., "Do X" not "You should consider doing X")
- **Add value** → Every word must serve purpose (examples only if essential)
- **No verbosity** → If edit adds >25% word count, refactor for conciseness
- **Maintain style & patterns** → Use existing conventions
- **No duplication** → Don't repeat information already present elsewhere
- **Verify integration** → New content must flow naturally with surrounding text

---

**ANTI-PATTERNS TO AVOID**
1. Reading entire code files with Read() (use Serena symbolic tools)
2. Using search_for_pattern on .md files (use Read for documentation)
3. Skipping typecheck after mutations (BLOCKING requirement)
4. UI testing on backend-only changes (no UI = skip STEP 4)
5. Creating files unnecessarily (prefer editing existing files)
6. Multiple edits to same file in one message (concurrent hook errors)
7. Calling Edit/replace_symbol_body on same file before hook completes
8. Skipping memory check before analysis (Discovery Hierarchy violation)
9. Running subagents in the background (always run in foreground and wait for completion)

