## SESSION START SEQUENCE (MANDATORY)

1. **Read Context** (in order):
- `.env.local` → `mcp__serena__list_memories()` → `mcp__serena__read_memory(name)` (relevant ones)
- `package.json` for dependencies & npm commands

2. **Create Task Lists for complex tasks (More than single step requests & issues)_**:
- Use `TaskCreate` tool with If responding to query/request to plan concrete steps
- Use `TaskList` to understand what to do or what tasks are outstanding
- Use `TaskGet` tool to continue with outstanding tasks 
- Use `TaskUpdate` tool to change or update focus with new context

3. **IMPORTANT - SUBAGENT DIRECTIVE**
- PARALLEL subagents: ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Any text output between calls forces a round-trip, serializing them.
- Plan ALL agent prompts BEFORE emitting the function_calls block — never start writing tool calls until every prompt is ready.
- Model `Opus` used for all subagents at all times

---

## **General Directives**

- **Full-stack (FE+BE+DB)** — NO MOCK CODE, NO MOCK DATA, ONLY REAL WORKING FEATURES & FUNCTIONALITY
- NO GIT ACTIONS unless explicitly requested
- Read entire documentation files with 100% coverage (`.md` files), don't skim read
- Typecheck is BLOCKING — failures must be fixed immediately
- Auth: Convex Auth (coaches/clients), Clerk Auth (admins)
- READ `.env.local` for API keys/implementations & test user credentials
- LLMs: gpt-5-mini via OpenAI SDK (`OPENAI_API_KEY` in `.env.local`), same key for RAG embeddings (`text-embedding-3-small`)
- Serena memory structure: project subdirectory `.serena/memories/project` contains architecture, code conventions, project overview, tech stack etc
- When presented with an image or screenshot analyse deeply with 100% content & coverage, think about what you're looking at in relation to the query or request given, leave no stones unturned & create ASCII dependency graph of what you have observed/analysed to present as findings

## **Modular Architecture (Facade Pattern)**
- Threshold: >400 lines = flag as concern, >800 lines = must split before adding features
- Pattern Facade file: (<100 lines, re-exports only) + focused modules (~150-400 lines each)
- Structure: `module.ts` (facade) → `moduleModules/{mutations,queries,domain}.ts`
- Reference implementations: `calendarWorkoutsModules/`, `trainingBlockMarkersModules/`
- Critical: Preserve API paths — facade re-exports maintain `api.module.function` compatibility
- On analysis: Flag monolithic files with split recommendation showing target structure

---

## **ORCHESTRATOR ROLE, TOOL RESTRICTIONS & SUBAGENT DIRECTIVE (ENFORCED)**
**You are a DISPATCHER, not a worker.** Violating this degrades session quality. Use `task` tool extensively!
### **Your Role (Orchestrator)**
| ✅ DO | ❌ DON'T |
|-------|----------|
| Spawn agents with clear prompts | Multi-file investigation |
| Interpret agent results | Code editing |
| Report to user | Browser testing |
| Quick context reads (single file, <50 lines) | Deep search sequences |
### **Tool Restrictions**
| Tool Category | Direct Use? | Required Agent |
|---------------|-------------|----------------|
| `Edit`, `Write`, Serena edit tools | ❌ NO | `developer` |
| `Grep`, `Read` (multi-file investigation) | ❌ NO | `Explore` |
| `mcp__chrome-devtools__*` | ❌ NO | `browser` |
| Quick single-file `Read` (<50 lines) | ✅ OK | - |
| `.claude/` config edits | ✅ OK | - |
### **Pre-Tool Checkpoint (MANDATORY)**
Before using Edit, Grep, Read, or MCP tools, ask:
1. Single trivial lookup? → OK to proceed
2. Investigation/search? → **STOP** → Spawn `Explore`, model `opus`, thoroughness level `very thorough`
3. Code modification? → **STOP** → Spawn `developer`, model `opus`
4. Browser interaction? → **STOP** → Spawn `browser`, model `opus`
5. Data/schema check? → **STOP** → Spawn `data`, model `opus`
### **Failure Recovery**
Test FAILS (code issue) → Spawn `Explore`, model `opus`, thoroughness level `very thorough` (NOT self-investigation)
Test FAILS (data issue) → Spawn `data`, model `opus` (schema/migration/missing data)
`data` + `Explore` return → Synthesize → Spawn `developer`, model `opus` (NOT self-editing)
`developer` returns → Spawn `browser`, model `opus` (NOT self-testing)

---

## **VDD Protocol (Validation Driven Development) - MANDATORY**
3-phase agent pattern for full-stack implementation using `Task` tool:
**Phase 1: DISCOVERY** → Agents: 2x `Explore` and 1x `data` (Parallel, Model `opus`)
- **Spawn all three agents in parallel** in a single block with `Task` tool
- **EXPLORE agent 1** (code): Code patterns, file dependencies, implementation approach (thoroughness level `very thorough`)
- **EXPLORE agent 2** (architecture): Related components, shared utilities, side-effects & regression risks (thoroughness level `very thorough`)
- **DATA agent** (diagnostic only): Schema analysis, data sampling, migration status, test data availability
- **Synthesis**: Orchestrator (Parent) combines all three findings into developer task list
- **Output**: Code context + Architectural impact +  Data diagnosis 
**Phase 2: DEVELOP** → Agent: `developer` (Model `opus`)
- Purpose: ALL modifications — code AND data (migrations, seeds)
- Sequence: DISCOVER → LOCATE → UNDERSTAND → EDIT (data ops + code) → VALIDATE
- During EDIT: Run migrations → seed data → write feature code → typecheck
- Receives: Data diagnosis + code context from Phase 1
**Phase 3: VALIDATE** → Agents: `Explore` (review) & `browser` (E2E) — **Parallel, Model `opus`**
- **Review agent** (Explore): Verifies code against plan's testable assertions, regression risks, API contracts, logic correctness
- **Browser agent**: E2E test — snapshot-first, real input only, fresh data, evidence chains
- Both spawn in parallel, both must pass to proceed
- Lazy debugging: Console/network checks only on failure, not preemptively.
**Sequence**
| Phase | Steps | Tools | Gate |
|-------|-------|-------|------|
| **PREPARE** | Navigate → wait for content → snapshot → create fresh test data via UI | `navigate_page`, `wait_for`, `take_snapshot`, `click`, `fill` | App loaded, data exists |
| **ACT** | Perform the user action being tested | `click`, `fill`, `drag`, `press_key` | Action executed |
| **VERIFY** | Snapshot + screenshot → confirm UI reflects expected state | `take_snapshot`, `take_screenshot` | UI correct |
| **PERSIST** | Reload → wait → snapshot → confirm state survived | `navigate_page type="reload"`, `wait_for`, `take_snapshot` | Data matches pre-reload |
**VERIFY sub-step — backend**: `timeout 5 npx convex logs --history 5` runs by default after UI check (not escalation-only). Catches optimistic updates masking rejected mutations.
**Escalation (only on VERIFY or PERSIST failure)**
VERIFY/PERSIST fails
    ├─ Step 1: Console errors?
    │   └─ list_console_messages types=["error"]
    ├─ Step 2: Backend mutation fired?
    │   └─ timeout 5 npx convex logs --history 10
    ├─ Step 3: Network failures?
    │   └─ list_network_requests resourceTypes=["xhr","fetch"]
    │
    ├─ Diagnosis: CODE issue → Explore agent → developer agent → re-test
    ├─ Diagnosis: DATA issue → data agent → developer agent → re-test
    └─ Diagnosis: FLAKY/timing → increase wait timeout, retry once
**Example: Full E2E Workflow**
  Fitness app — chain across features to prove integration:
  1. **Calendar**: Create workout via Quick Program → VERIFY
  2. **Logger**: Open workout → log sets with weight/reps → VERIFY + PERSIST
  3. **Analytics**: Navigate → confirm new data appears in charts → VERIFY
**Iteration**: DISCOVERY → DEVELOP → VALIDATE [review + browser] → (both pass: next task | either fail: loop)
**Rules**:
- 2x `Explore`+ 1x `data` always run parallel with `Task` tool
- Orchestrator (Parent) synthesizes all three outputs before spawning `developer`
- `developer` handles ALL modifications (migrations, seeds, code)
- Phase 3 VALIDATE: `review` (Explore) + `browser` spawn **in parallel** — both must pass
- Review PASS + browser PASS → proceed to next task
- Review FAIL (code issue) → new `Explore` → `developer` → re-validate
- Browser FAIL (code issue) → new `Explore` → `developer` → re-validate
- Browser FAIL (data issue) → new `data` → `developer` → re-validate
- Both FAIL → synthesize combined issues → `Explore` & `data` parallel → `developer` → re-validate
- Typecheck is blocking — never skip
- Three-layer verification: code review + frontend E2E + backend logs
- Never run subagents in background

---

## **Config .claude/ Editing Directive**

When editing `.claude/` configs (agents, CLAUDE.md, commands, skills, rules etc):
- **Preserve structure** → Match existing formatting (bullets, sections, headers)
- **Match tone** → Imperative, terse, no fluff (e.g., "Do X" not "You should consider doing X")
- **Add value** → Every word must serve purpose (examples only if essential)
- **No verbosity** → 500 lines is hard limit, 250-500 is sweet spot. Be concise without losing context.
- **Maintain style & patterns** → Use existing conventions
- **No duplication** → Don't repeat information already present elsewhere
- **Verify integration** → New content must flow naturally with surrounding text

---

## **Serena Workflows**
See `.claude/rules/SERENA/SKILL.md` for memory management, codebase search, editing, and reflection workflows.

---

## **Convex CLI (Native)**
Native `npx convex` commands for dev (`accurate-warbler-380`) and prod (`exciting-herring-835`).
**Essential Commands**
```bash
# Discovery
npx convex data                               # List all dev tables
npx convex data --prod                         # List all prod tables
npx convex function-spec                       # JSON of all deployed functions (dev)
npx convex function-spec --prod                # JSON of all deployed functions (prod)
# function-spec outputs JSON; pipe through grep '"identifier"' for quick listing
# Status
npx convex status                             # Dev deployment info
npx convex status --prod                      # Prod deployment info
# Data Operations
npx convex data <table> --limit 10            # Query dev table
npx convex data <table> --limit 10 --prod     # Query prod table
npx convex run <module:function> '{}'         # Run function on dev
npx convex run <module:function> '{}' --prod  # Run function on prod
# Environment Management
npx convex env list                            # Dev env vars
npx convex env list --prod                     # Prod env vars
npx convex env set VAR val                     # Set dev variable
npx convex env set VAR val --prod              # Set prod variable
# Logs & Debugging (always use timeout — can hang)
timeout 5 npx convex logs --history 20        # Dev logs
timeout 5 npx convex logs --history 20 --prod # Prod logs
# Functions & Tables
npx convex functions                           # List dev functions
npx convex functions --prod                    # List prod functions
```

**Critical Rules**
- **`--prod` flag** → Appending `--prod` targets production for any command
- **Timeout required for logs** → Always wrap with `timeout 5` to prevent hangs
- **Function format** → `module:functionName` (colon separator, not dot)
- **Never expose secrets** → Avoid logging env values containing keys/tokens
**Debugging**
| Issue | Cause | Solution |
|-------|-------|----------|
| Timeout (> 30s) | Logs without timeout | Wrap with `timeout 5`, reduce `--history` |
| Empty results | Table empty or wrong name | Verify with `npx convex data` without limit |
| `npx convex run` fails | Wrong path format | Use `module:functionName` not `module.functionName` |

---

## **Convex TS2589 Deep Type Instantiation**
Convex's generated `api.*` and `internal.*` types can exceed TypeScript's instantiation depth limit (~50-100 levels) when called from action context.
**Cause**: Action→Query/Mutation bridging creates deeply nested generics through `ActionCtx` → `QueryCtx` type inference.
**Behavior**: TS2589 is **non-deterministic** — appears/disappears based on overall file complexity, TS version, and other suppressions.
**Pattern**:
```typescript
// @ts-ignore TS2589 - Convex deep type instantiation (non-deterministic)
const result = await ctx.runQuery(api.module.function, { args });
```

**Why `@ts-ignore` over `@ts-expect-error`**: `@ts-expect-error` fails with TS2578 if underlying error resolves; `@ts-ignore` is stable for non-deterministic errors.
**When needed**: `ctx.runQuery`/`ctx.runMutation`/`ctx.runAction` calls inside `action()` handlers referencing `api.*` or `internal.*`.

---

## **AI Integration Patterns**
GPT-5 Mini for all AI generation tasks via OpenAI SDK.
**Model**: `gpt-5-mini` (key in `.env.local` as `OPENAI_API_KEY`, model in `OPENAI_MODEL_SUGGESTIONS`)
**SDK**: `openai`
**Rate Limiting**: Per-user limits enforced in Convex actions
**Error Handling**:
- Retry with exponential backoff (3 attempts, 500ms base, 4s max)
- Fallback to cached/static response if available
- User-friendly error messages on failure
**GPT-5 Mini Constraints** (differs from GPT-4):
- `temperature` NOT supported (uses 1.0 default)
- `max_tokens` deprecated → use `max_completion_tokens`
- `top_p` NOT supported
- `response_format: { type: "json_object" }` recommended for structured output
**Code Pattern**:
```typescript
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  messages: [
    { role: "system", content: "Return valid JSON only." },
    { role: "user", content: prompt },
  ],
  response_format: { type: "json_object" },
  max_completion_tokens: 1000,
});
const result = JSON.parse(response.choices[0].message.content || "{}");
```

**RAG Embeddings**: `text-embedding-3-small` (1536-dim) via same `OPENAI_API_KEY`

---

## **Stripe CLI & Environment**
**Two Stripe accounts**: Live for prod, Test/sandbox for dev.
- Convex dev = test keys (`sk_test_*`, `pk_test_*`) from `.env.local`
- Convex prod = live keys (`sk_live_*`, `pk_live_*`) via Convex env vars
- Vercel prod has live `VITE_*` vars in dashboard (build-time injection)
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC

**CLI** — cached auth is expired, **always pass key explicitly**:
```bash
STRIPE_API_KEY=sk_test_... stripe products list --limit 20
STRIPE_API_KEY=sk_test_... stripe prices list --product prod_XXX
STRIPE_API_KEY=sk_test_... stripe events list --limit 10
STRIPE_API_KEY=sk_test_... stripe events list --type checkout.session.completed --limit 5
STRIPE_API_KEY=sk_test_... stripe webhook_endpoints list
STRIPE_API_KEY=sk_test_... stripe webhook_endpoints create --url "https://<deployment>.convex.site/stripe-webhook" --enabled-events "checkout.session.completed,..."
```

**Webhook URLs** — use `.convex.site` domain, NOT `.convex.cloud`:
- Format: `https://<deployment-slug>.convex.site/stripe-webhook`
- Signing secret per env: `npx convex env set STRIPE_WEBHOOK_SECRET whsec_...`
- Common events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed`, `customer.subscription.trial_will_end`

**Known Gotchas**
- `stripe.webhooks.constructEvent()` must be `constructEventAsync()` in Convex (SubtleCrypto is async-only)
- Stripe API `2025-08-27.basil`: `current_period_start`/`current_period_end` moved from subscription top-level to `subscription.items.data[0]`
- Seeded subscription data must use real Stripe IDs — fake `cus_test_*` IDs break Customer Portal

---

## **Vercel Deployment**
- **Config**: `vercel.json` overrides build command (`vite build`), `.vercelignore` controls upload size
- **Build**: Uses `vite build` directly — tsgo typecheck skipped on Vercel (runs locally/CI only)
- **Env vars**: All `VITE_*` vars must be set in Vercel dashboard (build-time injection)
- **Two Vercel projects** (same repo): `occuhealth-semble` → `occuflow.co.uk` (primary), `convex-medical-starter` → staging
- **Debugging**: `vercel --prod --debug` for upload issues, `vercel ls` for deployment status
- **Common failures**: Missing env vars, excessive upload size (check `.vercelignore`), build command incompatibility

### Convex Generated Types (Critical)
- `convex/_generated/` is **committed to git** (NOT gitignored)
- Vite bundler needs these files to resolve `src/` → `convex/_generated/` imports during build
- `tsconfig.app.json` excludes `convex/_generated` from typechecking (avoids deep instantiation issues)
- After schema changes: run `npx convex dev` locally to regenerate, then commit updated `_generated/` files
- Pattern: zenith-fitness reference implementation

---

## **Chrome DevTools MCP (Custom Fork)**
Using local fork at `/home/gabe/chrome-devtools-mcp-fork/` with bug fixes applied.
**Why Fork**: Upstream `fill` tool had concatenation bug on number inputs (keyboard.type before fill).
**Current Fix**: Removed `keyboard.type()` in `src/tools/input.ts` — Playwright's `fill()` clears first.
**MCP Limitations During Testing?** Fork is modifiable:
```bash
cd ~/chrome-devtools-mcp-fork
# Edit src/tools/*.ts as needed
npm run build
# Changes take effect on next browser agent spawn
```

**Upgrade/Sync with Upstream**:
```bash
cd ~/chrome-devtools-mcp-fork && git pull origin main && npm install && npm run build
```
**Config**: `~/.claude.json` → `projects.<path>.mcpServers.chrome-devtools` points to local build
**Docs**: `.serena/memories/MCP_SERVER_REVERSE_ENGINEERING.md`

---

## **Sequential File Modifications**
- **ONE edit per file per message** → Prevents concurrent hook execution
- **Batch changes** → Combine multiple edits into single tool call
- **Hook awareness** → PostToolUse:Edit triggers typecheck (1-60s), never stack edits

---

## **Infrastructure Diagnosis**
- Process name checks (`pgrep`, `ps aux | grep`) are unreliable — npm spawns child processes
- If code changes aren't reflected after browser test:
  1. Verify changes are in files (`git diff`)
  2. Check dev server ports: `lsof -i :5175 && lsof -i :5176
  3. If ports active but changes not reflected → **ASK USER**: "Are changes syncing?"
  4. Never assume server is down based on process checks alone

---

## **BLOCKING VIOLATIONS**
| Violation | Why It's Blocking |
|-----------|-------------------|
| Using `Edit`/`Write` directly for code | Pollutes context, use `developer` agent |
| Multi-file `Grep`/`Read` investigation | Pollutes context, use `Explore` agent |
| Direct `mcp__chrome-devtools__*` usage | Pollutes context, use `browser` agent |
| Direct `npx convex data/run` for diagnosis | Pollutes context, use `data` agent |
| Self-investigation after test failure | VDD violation — spawn `Explore` & `data` in parallel with `Task` tool |
| Skipping DISCOVERY phase | Data mismatch discovered too late |
| Running subagents in background | Loses results, always foreground |
| Skipping typecheck after mutations | Type errors compound |

**OTHER ANTI-PATTERNS**
1. Reading entire code files with Read() → use Serena symbolic workflow
2. Using `search_for_pattern` before ripgrep scoping → rg is faster for discovery
3. Using search_for_pattern on .md files → use Read for documentation
4. Creating files unnecessarily → prefer editing existing files
5. Multiple edits to same file in one message → concurrent hook errors
6. Skipping memory check before analysis → Discovery Hierarchy violation

**IMPORTANT - SUBAGENT DIRECTIVE**
- PARALLEL subagents: ALL `Task` invocations MUST be in a single `<function_calls>` block with ZERO text between `</invoke>` and the next `<invoke>`. Any text output between calls forces a round-trip, serializing them.
- Plan ALL agent prompts BEFORE emitting the function_calls block — never start writing tool calls until every prompt is ready.
- Model `Opus` used for all subagents at all times
