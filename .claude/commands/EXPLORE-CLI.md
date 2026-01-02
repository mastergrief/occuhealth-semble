# CODEBASE/IMAGE EXPLORATION - DEEP ANALYSIS OF CODE RELATED TO IMAGE PRESENTED

**DEEP ANALYSIS OF FEATURE**
Search the codebase & database for the files & dependencies that the image/document passed as [$ARGUMENTS] or image post /IMAGE analysis command:


**STEP 1 - CODEBASE**

**Load `Serena` skill with `Skills` tool**
**DISCOVERY Phase** (SERENA-CLI entry point discovery):
1. `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts search "<technical_query>" --code-only`
   - Find: Files containing relevant keywords/patterns
   - Extract: File paths from search results (~50-200ms)
   - **Alternative**: `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts find-file "*.ts*" <suspected_dir>` (2-4ms)
   - **Gate**: `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts think-collected-info` → Enough entry points?
**LOCATE Phase** (SERENA-CLI structural map):
2. `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts symbols <file>` [for top 1-2 discovered files]
   - Map: All symbols WITHOUT implementations (depth 0 default)
   - Identify: Relevant symbols by name/kind/description
   - **Performance**: ~2-10ms
   - **Red Flag**: Reading full files instead of using overview
**REFINE Phase** (SERENA-CLI shallow read):
3. `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts symbols <file> --depth 1`
   - Map: Class/interface structure (methods, fields, nested symbols)
   - Choose: Specific symbols to read deeply
   - **Performance**: ~2-10ms
   - **Red Flag**: >50 symbols without narrowing scope
**UNDERSTAND Phase** (SERENA-CLI deep read):
4. `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts find-symbol <name_path> --file <file> --body`
   - Read: ONLY needed symbol implementations
   - Follow: Imports from search results if needed
   - **Performance**: ~50-500ms per symbol
   - **Red Flag**: Using `--body` before knowing exact symbol
**DEPENDENCIES Phase** (SERENA-CLI impact analysis):
5. `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts search <symbol_name> --code-only`
   - Trace: Where is this symbol used?
   - Assess: Impact of changes (grep-based references)
   - **Performance**: ~50-200ms targeted search
   - **Alternative**: Use `find-symbol <name> --substring` for broader discovery
   - **Gate**: `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts think-collected-info` → Complete picture?


**STEP 2 - Database** (Convex CLI exploration)
**Load `Convex` skill with `Skills` tool**
**STATUS Phase** (deployment verification):
1. `npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json`
   - Verify: Deployment active, URL accessible
   - Extract: Environment context (dev/prod)
   - **Performance**: < 1ms (local config read)
   - **Gate**: Deployment ready?
**SCHEMA Phase** (table discovery):
2. `npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json`
   - List: All database tables
   - Identify: Relevant tables for feature
   - **Performance**: 3.5s cold start
   - **Cache**: 300s TTL (schema changes infrequent)
   - **Red Flag**: Empty table list = deployment not configured
**DATA Phase** (structure validation):
3. `npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <table> --limit=5 --json`
   - Sample: Real data structure (5 documents)
   - Validate: Schema matches expectations
   - Identify: Key fields, relationships, data types
   - **Performance**: 2.5s per query
   - **Red Flag**: Empty results = table unpopulated or mock data
**API Phase** (function discovery):
4. `npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --json`
   - List: All Convex functions (queries/mutations)
   - Map: Functions to tables (CRUD operations)
   - **Performance**: 2ms (local filesystem scan)
   - **Cache**: 300s TTL
   - **Red Flag**: Missing CRUD functions = incomplete implementation
**EXECUTION Phase** (verify operations):
5. `npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <module>:<function> '{}' --json`
   - Test: Query/mutation execution
   - Validate: Response structure matches types
   - Trace: Data flow (function → table)
   - **Performance**: 2.5s per execution
   - **Red Flag**: Hardcoded returns, console.log instead of DB queries
**CORRELATION Phase** (code-to-DB mapping):
6. Cross-reference discovered symbols with DB operations:
   - Match: Component imports → Convex hooks (`useQuery`, `useMutation`)
   - Trace: Hook calls → Function names (`api.module.function`)
   - Validate: Function implementations → Table operations (`db.query(tableName)`)
   - **Red Flag**: Disconnected code (imports exist but no DB calls)

**Red Flags** (mock/incomplete implementations):
- Empty tables → No data persistence
- Hardcoded returns → Not querying DB (`return { data: [] }`)
- Mock data → `setTimeout` instead of async DB calls
- Missing mutations → Read-only, no write operations
- Console.log errors → DB connection failures hidden


**STEP 3 - Synthesis** (Correlate findings)
- Map discovered symbols to DB schema (API functions → tables, mutations → data flow)
- Trace FE→API→DB chain (component → query/mutation → table)
- Identify dependencies (imports/exports from CLI search results)
- Note edge cases (validation, permissions, error paths)
- **Gate**: `npx tsx SERENA-CLI/SCRIPTS/serena-cmd.ts think-collected-info` → Code-DB integration complete?


**STEP 4 - PRESENT FINDINGS**
Using context from Steps 1 through 3 present findings:
- Create wireframe diagram of what you have analysed/discovered
- Create source tree stemming from feature, files associated, dependencies and respective sizes in lines
- Explain in detail what you have discovered related to in terms of function/use case
- Present conclusion in concise but detailed manner

---

## SERENA-CLI Quick Reference
**Phase 0: DISCOVERY** (Entry Point Discovery)
```bash
search "<keyword>" --code-only         # Find files by pattern/keyword (~50-200ms)
find-file "*.tsx" <dir>                # Find files by glob pattern (2-4ms)
list-dir <path>                        # List directory contents (2ms)
```
**Phase 1: LOCATE** (Structure Discovery)
```bash
symbols <file>                          # Top-level symbols (~2-10ms)
symbols <file> --depth 1               # Include methods/props (~2-10ms)
symbols <file> --depth 2 --format nested  # Nested tree (~2-10ms)
```
**Phase 1b: ADVANCED ANALYSIS** (Rich Metadata)
```bash
symbols <file> --detail                # Signatures, parameters, return types
symbols <file> --resolve               # Cross-reference resolution (extends/implements)
symbols <file> --docs                  # Extract JSDoc documentation
symbols <file> --kind function         # Filter by kind (function, class, interface, variable)
symbols <file> --depth 1 --detail --resolve --docs  # Combined analysis
```
**Phase 2: UNDERSTAND** (Targeted Reads)
```bash
find-symbol <name> --file <file>       # Find symbol metadata (~2-10ms)
find-symbol <name> --file <file> --body  # Read implementation (~50-500ms)
find-symbol <pattern> --substring      # Discover by partial name (~2-10ms)
search "<pattern>" --code-only         # Pattern search (~50-200ms)
```
**Phase 2b: USAGE ANALYSIS** (Dead Code & Impact)
```bash
symbols <file> --usage                 # Full usage analytics (~100ms cold, ~1ms cached)
symbols <file> --usage-light           # Quick metrics only, no locations (~30% faster)
symbols <file> --usage --no-cache      # Bypass cache for fresh analysis
```
**Phase 3: VALIDATE** (Quality Gates)
```bash
think-collected-info                   # Validate sufficiency (0ms)
think-task-adherence                   # Verify alignment (0ms)
think-done                             # Confirm completion (0ms)
```

**Performance**:
- Daemon mode: 10x faster (5.7s → 0.5s cold start)
- Usage cache hit: **100-195x faster** (~100ms → ~1ms for repeated queries)
- Cache invalidates on file change (mtime-based)
**Token Efficiency**: Agent mode 95% reduction (`np` vs `name_path`)
**Daemon**: Auto-starts on first command (default behavior)
