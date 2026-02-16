# Repository Guidelines (OccuHealth)

## Bootstrap Documentation
Bootstrap and Linux user provisioning instructions are maintained in `BOOTSTRAP.md`.

## Project Structure & Module Organization
- `src/`: React 19 frontend (components, hooks, routes, services, validation, and UI).
- `convex/`: Convex backend functions, schema, generated types, and domain modules (for example `authModules/`, `availableSlotsModules/`, `gdprModules/`).
- `e2e/`: Playwright end-to-end specs (`*.spec.ts`).
- `tests/`, `convex/__tests__/`, `BROWSER-CLI/tests/`, `ORCHESTRATION/tests/`, and feature-local `__tests__/`: Vitest suites across app and tooling.
- `docs/` and `DOCUMENTS/`: setup, API, deployment, architecture, and product documentation.
- `public/`: static assets.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start frontend (`vite`), backend (`convex dev`), and watch typecheck in parallel.
- `npm run build`: typecheck (`tsgo`) + production build (`vite build`).
- `npm run lint`: typecheck (`tsgo`) + strict ESLint run (fails on warnings).
- `npm run typecheck`: TypeScript checks via `tsgo` without emitting.
- `npm run typecheck:tsc`: TypeScript checks via `tsc` without emitting.
- `npm test -- --run`: run Vitest once.
- `npm run test:coverage`: run Vitest with coverage output.
- `npm run test:e2e`: run Playwright end-to-end suite.
- `npx playwright test e2e`: run `e2e/` Playwright specs directly.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`) with React + JSX.
- Formatting: Prettier defaults (no custom overrides in `.prettierrc`).
- Linting: ESLint + `typescript-eslint` + `react-hooks`; keep code warning-free.
- Style conventions used in codebase: 2-space indentation, semicolons, double quotes.
- Naming: components/layouts in `PascalCase.tsx`; hooks/utilities in `camelCase.ts`; tests as `*.test.ts(x)` or `*.spec.ts`.
- Prefer `@/*` import alias for app code under `src/`.

## Testing Guidelines
- Unit/integration tests use Vitest + Testing Library (`jsdom` environment).
- Coverage thresholds are enforced at 70% for lines/functions/statements and 60% for branches.
- Add or update tests with every behavior change, especially validation logic and Convex mutations.
- Keep Playwright scenarios in `e2e/` focused on user-critical workflows.

## Commit & Pull Request Guidelines
- Follow Conventional Commits used in history: `feat(scope): ...`, `fix(scope): ...`, `chore: ...`.
- Keep commits focused by feature area (example: `fix(validation): strip negative inputs on update`).
- PRs should include: clear summary, linked issue, test evidence (`npm run lint`, `npm run typecheck`, relevant tests), and screenshots for UI changes.
- Call out schema/env changes explicitly and note required setup or migration steps.

## Security & Configuration Tips
- Use `.env.local` for secrets; never commit credentials.
- Start from `.env.example` (or local onboarding docs) when configuring new environments.
- Treat `convex/_generated` as generated output; do not hand-edit generated files.

## Convex TS2589 Deep Type Instantiation
Convex generated `api.*` and `internal.*` types can exceed TypeScript's instantiation depth limit (~50-100 levels) when called from action context.

**Cause**: Action -> Query/Mutation bridging creates deeply nested generics through `ActionCtx` -> `QueryCtx` type inference.

**Behavior**: TS2589 is non-deterministic and can appear/disappear based on file complexity, TypeScript version, and surrounding suppressions.

**Pattern**:
```typescript
// @ts-ignore TS2589 - Convex deep type instantiation (non-deterministic)
const result = await ctx.runQuery(api.module.function, { args });
```

**Why `@ts-ignore` over `@ts-expect-error`**: `@ts-expect-error` fails with TS2578 if the underlying error resolves; `@ts-ignore` is stable for non-deterministic errors.

**When needed**: `ctx.runQuery`/`ctx.runMutation`/`ctx.runAction` calls inside `action()` handlers referencing `api.*` or `internal.*`.

---

## Modular Architecture (Facade Pattern)
- Threshold: >400 lines = flag as concern, >800 lines = must split before adding features.
- Pattern: facade file (<100 lines, re-exports only) + focused modules (~150-400 lines each).
- Structure: `module.ts` (facade) -> `moduleModules/{mutations,queries,domain}.ts`.
- OccuHealth examples: `auth.ts` with `authModules/`, `availableSlots.ts` with `availableSlotsModules/`, and `gdpr.ts` with `gdprModules/`.
- Critical: preserve API paths; facade re-exports maintain `api.module.function` compatibility.
- During analysis: flag monolithic files with split recommendation and target structure.

---

## Serena - Symbolic Code Intelligence
Semantic coding tools for token-efficient codebase exploration and precise editing.

---

## Memory Management & Lifecycle

**Initial setup**:
- `mcp__serena__check_onboarding_performed()` -> verify if project has been explored.
- `mcp__serena__onboarding()` -> initial project familiarization (if not performed).
- Creates `.serena/memories/` with architectural insights.

**Working with memories**:
- `mcp__serena__list_memories()` -> see available knowledge before starting work.
- `mcp__serena__read_memory(name)` -> load relevant context (only if task-relevant).
- `mcp__serena__write_memory(name, content)` -> persist discoveries in markdown format.
- `mcp__serena__delete_memory(name)` -> remove outdated/incorrect information (user request only).

**What to memorize**:
- Architecture patterns: auth flow, data flow, module organization.
- Key entry points: main services, routers, initialization.
- Conventions: naming patterns, testing approach, build process.
- Complex discoveries: multi-file investigations, dependency graphs.
- Session continuations: current state for resuming in new conversation.

**When to use memories**:
- Read at start: run `mcp__serena__list_memories()` to avoid re-discovery.
- Write after discovery: significant architecture understanding and complex investigation results.
- Write before context limit: save progress for continuation in a new session.

**Essential rules**:
1. Read memories first; don't re-explore what is already known.
2. Use descriptive names, e.g. `authentication_architecture_[timestamp]`.
3. Write after significant discovery, not every small finding.
4. Memories persist across sessions.

---

## Codebase Search Workflow (DISCOVER -> LOCATE -> UNDERSTAND -> VALIDATE)
4-step pattern: ripgrep for breadth -> Serena for depth.

**Step 1: DISCOVER** (ripgrep, broad scoping)
- `rg -l "pattern" -g "*.ts"` -> find candidate files quickly.
- `rg -c "pattern" -g "*.ts" | sort -t: -k2 -nr | head -10` -> measure density and hotspots.
- `rg "pattern" -g "*.ts" -C 2 | head -50` -> preview nearby context.
- Useful flags: `-l`, `-c`, `-i`, `-g`, `--glob "!*.test.ts"`.
- Skip when files are already known from memories or prior discovery.

**Step 2: LOCATE** (Serena, structure without bodies)
- `mcp__serena__get_symbols_overview(file)` -> list symbols without implementations.
- `mcp__serena__find_symbol(name_path, include_body=False, depth=1, relative_path=<file>)` -> map class/interface structure.

**Step 3: UNDERSTAND** (Serena, targeted reads)
- `mcp__serena__find_symbol(name_path, include_body=True, relative_path=<specific>)` -> read only required symbols.
- `mcp__serena__find_referencing_symbols(name_path, file)` -> analyze usage/dependencies.
- `mcp__serena__search_for_pattern(regex)` -> strings/patterns in non-code files.

**Step 4: VALIDATE**
- `mcp__serena__think_about_collected_information()` -> verify sufficiency before proceeding.

**Essential rules**:
1. ripgrep for breadth, Serena for depth.
2. Avoid `include_body=True` until target symbol is known.
3. Restrict with `relative_path` whenever possible.
4. Name paths: `"symbol"`, `"Class/method"`, `"/Class/method"`.
5. Use symbolic search for code and pattern search for plain text.
6. Use thinking tools after search sequences.
7. Discovery hierarchy: memories -> ripgrep -> Serena symbolic analysis.

---

## Editing Operations Workflow
**Replace an entire symbol** (function, method, class):
- `mcp__serena__replace_symbol_body(name_path, file, body)`.

**Insert new code**:
- `mcp__serena__insert_before_symbol(name_path, file, body)` -> add imports (anchor to first symbol).
- `mcp__serena__insert_after_symbol(name_path, file, body)` -> add functions (anchor to last symbol).

**Refactor names**:
- `mcp__serena__rename_symbol(name_path, file, new_name)` -> update references codebase-wide.

**Essential rules**:
1. Think before editing: `mcp__serena__think_about_task_adherence()` before modifications.
2. Symbol bodies exclude docstrings/imports.
3. Use anchors for stable insertion points.
4. Check impacts with `mcp__serena__find_referencing_symbols` before signature changes.
5. Serena editing tools are reliable if they return success.

---

## Reflection Workflow
Three thinking checkpoints:

**After search** (validate sufficiency):
- `mcp__serena__think_about_collected_information()`.

**Before edit** (verify alignment):
- `mcp__serena__think_about_task_adherence()` (mandatory before modifications).

**At completion** (confirm done):
- `mcp__serena__think_about_whether_you_are_done()`.

**When to think**:
- After multiple symbol/pattern searches.
- Before replace/insert/rename operations.
- Whenever a task or subtask appears complete.

**Essential rules**:
1. Thinking steps are quality gates, not optional.
2. Thinking checkpoints prevent drift.
3. Thinking early reduces repeated work.

---

## Chrome DevTools MCP
Browser automation via Chrome DevTools Protocol. Available in all sandbox modes.

### Core Workflow
`take_snapshot` (get uid refs) -> identify target uid -> interact -> `take_snapshot` (verify).

### Key Tools
| Tool | Purpose |
|------|---------|
| `take_snapshot` | Accessibility tree with uid refs; primary observation tool |
| `take_screenshot` | Visual capture (viewport or element) |
| `click uid="X"` | Click element by uid |
| `fill uid="X" value="text"` | Type into input/textarea |
| `navigate_page url="..."` | Navigate (also supports `type="reload"`, `"back"`, `"forward"`) |
| `wait_for text="..." timeout=5000` | Wait for text to appear |
| `drag from_uid="X" to_uid="Y"` | Drag and drop |
| `list_pages` / `select_page` | Tab management |
| `list_console_messages types=["error"]` | Browser console output |
| `list_network_requests resourceTypes=["fetch"]` | Network activity |
| `evaluate_script function="() => ..."` | Run JS in page context |

### Rules
- Always `take_snapshot` before interaction; uids go stale.
- Use `take_snapshot` over `take_screenshot` for element identification.
- AI features may need extended timeouts (8000-10000ms).

---

## Convex CLI
Native `npx convex` commands for OccuHealth development and production deployments.

**Sandbox requirement**: Convex CLI requires `--sandbox danger-full-access` to reach the network. Commands fail in `workspace-write` mode.

### Available Commands
```bash
# Discovery
npx convex data                               # List all dev tables
npx convex data --prod                        # List all prod tables
npx convex function-spec                      # JSON of all deployed functions (dev)
npx convex function-spec --prod               # JSON of all deployed functions (prod)
# function-spec outputs JSON; pipe through grep '"identifier"' for quick listing

# Data operations
npx convex data <table> --limit 10            # Query dev table
npx convex data <table> --limit 10 --prod     # Query prod table
npx convex run <module:function> '{}'         # Run function on dev
npx convex run <module:function> '{}' --prod  # Run function on prod

# Environment management
npx convex env list                           # Dev env vars
npx convex env list --prod                    # Prod env vars
npx convex env set VAR val                    # Set dev variable
npx convex env set VAR val --prod             # Set prod variable

# Logs and debugging (always use timeout - can hang)
timeout 5 npx convex logs --history 20        # Dev logs
timeout 5 npx convex logs --history 20 --prod # Prod logs

# Other
npx convex export                             # Export data
npx convex codegen                            # Regenerate types
npx convex dashboard                          # Open dashboard URL
```

### Critical Rules
- `--prod` flag: appending `--prod` targets production for any command.
- Timeout required for logs: always wrap logs with `timeout 5` to prevent hangs.
- Function format: `module:functionName` (colon separator, not dot).
- Never expose secrets: avoid printing env values containing keys/tokens.

### Debugging
| Issue | Cause | Solution |
|-------|-------|----------|
| Network error / timeout | Wrong sandbox mode | Use `--sandbox danger-full-access` |
| Timeout (> 30s) | Logs without timeout | Wrap with `timeout 5`, reduce `--history` |
| Empty results | Table empty or wrong name | Verify with `npx convex data` without limit |
| `npx convex run` fails | Wrong path format | Use `module:functionName` not `module.functionName` |

---

## Codex in Claude Code
How to run OpenAI Codex from Claude Code and Claude Code subagents in this repository.

### Local Setup
1. Ensure Codex CLI is installed and available in `PATH`.
2. Verify from the same shell context Claude uses:

```bash
command -v codex
codex --version
codex exec --help
```

3. Confirm repository working directory before launching Codex:

```bash
pwd
# expected: /home/handoff/projects/convex-medical-starter
```

### Claude Subagent Constraint
For Claude subagents, Codex access is through `codex exec` only.
- Do not assume direct access to Codex MCP tools from Claude.
- Use one top-level `codex exec` wrapper call from the subagent.
- Put orchestration logic inside the Codex prompt.

### Required `codex exec` Pattern
Use this exact pattern for robust execution and failure fallback:

```bash
# 1) Build prompt file
cat > /tmp/codex-explore-prompt.txt <<'EOF'
[Codex orchestrator prompt here]
EOF

# 2) Run exactly one Codex session
rm -f /tmp/codex-explore-output.txt /tmp/codex-explore-stream.log
timeout 1200 codex exec \
  -s danger-full-access \
  -C /home/handoff/projects/convex-medical-starter \
  -o /tmp/codex-explore-output.txt \
  "$(cat /tmp/codex-explore-prompt.txt)" 2>&1 | tee /tmp/codex-explore-stream.log

# 3) Return result
if [ -f /tmp/codex-explore-output.txt ]; then
  cat /tmp/codex-explore-output.txt
else
  cat /tmp/codex-explore-stream.log
fi
```

### Flag Rules
- `-s danger-full-access`: required for full tool/network access in this workflow.
- `-C /home/handoff/projects/convex-medical-starter`: force correct workspace root.
- `-o <file>`: capture final Codex response deterministically.
- `timeout 1200`: prevent runaway sessions.
- Do not use `--full-auto` for this workflow (it implies `workspace-write` sandbox).

### Subagent Prompt Contract (Discovery Matrix Workflow)
When driving `discover-explorer-matrix`, the Codex prompt must require:
1. Spawn exactly 3 `explorer` agents in parallel.
2. Wait for all three before synthesis.
3. Discovery-only behavior (no edits/refactors/migrations/browser testing).
4. Single synthesized `Solutions Matrix` output only.
5. Canonical labels only:
   - Severity/Priority: `Critical`, `High`, `Medium`, `Low`
   - Confidence/Likelihood: `High`, `Medium`, `Low`
   - Domains: `Architecture`, `Data Flow`, `API Contracts`, `Data Integrity`, `Security`, `UX/Functional`, `Quality`, `Regression Risk`

### Anti-Patterns
- Do not run shell-level phase orchestration (`/tmp/phase1.txt`, `/tmp/phase2.txt`, `/tmp/phase3.txt`).
- Do not run multiple top-level `codex exec` calls when one orchestrator run is expected.
- Do not return raw agent transcripts when the workflow requires a synthesized matrix.
- Do not silently change canonical label spellings (`Med`, `S/M/L`, `P0/P1/P2` are invalid here).

### Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `codex: command not found` | PATH mismatch in Claude runtime | Use absolute path from `command -v codex`, or fix shell init for Claude process |
| No `/tmp/codex-explore-output.txt` | Timeout or Codex failure before final message write | Return `/tmp/codex-explore-stream.log` |
| Subagents run serially | Prompt ambiguity | Explicitly require parallel spawn first, then single wait for all IDs |
| Output not matrix-shaped | Weak output contract | Include exact required section template in prompt |
