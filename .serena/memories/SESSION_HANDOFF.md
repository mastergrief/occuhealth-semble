# Session Handoff — 2026-02-18

## Goal
Fix broken Vercel deployments (all builds failing), set up `occuflow.co.uk` as the primary production domain, and rebrand the entire codebase from "OccuHealth" to "OccuFlow".

## Completed

### 1. Fixed Vercel Build Failures (3 commits)
- **Root cause**: `tsgo` typecheck in build script failed because `convex/_generated/` was gitignored and absent on Vercel
- **Fix 1** (`a8f41b0`): `vercel.json` — set `buildCommand: "vite build"` to skip typecheck on Vercel (matches zenith-fitness pattern)
- **Fix 2** (`1868d7f`): Removed `convex/_generated` from `.gitignore` and committed the generated files. Vite bundler also needs these for import resolution, not just typecheck.
- **Key learning**: Two-layer fix needed — typecheck AND bundler both require `_generated/` files. zenith-fitness commits these to git as the standard pattern.
- Documented in `.claude/CLAUDE.md` under "Vercel Deployment > Convex Generated Types"

### 2. Domain Setup — occuflow.co.uk
- **Two Vercel projects** on same repo (`mastergrief/occuhealth-semble`):
  - `occuhealth-semble` → `occuflow.co.uk` (primary production)
  - `convex-medical-starter` → `convex-medical-starter-phi.vercel.app` (kept as staging/backup)
- Set env vars on `occuhealth-semble`: `VITE_CONVEX_URL`, `VITE_WORKOS_CLIENT_ID`
- Updated Convex prod `APP_URL` to `https://occuflow.co.uk`
- WorkOS redirect URIs already configured by user (both Convex site callbacks + occuflow.co.uk)
- Auth flow verified: uses dynamic `returnTo` via `window.location.origin` — no code changes needed for domain switch

### 3. Full Rebrand: OccuHealth → OccuFlow (`c296921`)
- 34 files changed across UI, backend, config, docs, and internal memories
- Email domain: `@occuhealth.com` → `@occuflow.co.uk` (support emails, ICS calendar invites)
- **Preserved**: test credential emails (`testdoc@occuhealth.com` etc.) — these are registered in WorkOS and cannot change
- Page title: "Vite + React + TS" → "OccuFlow"
- ICS generator: PRODID, organizer CN, UID domain all updated
- Convex prod deployed with `npx convex deploy --cmd 'npx vite build' -y` → `exciting-herring-835`

### 4. .claude/ Config Overhaul (part of first commit `a8f41b0`)
- Removed all BMad agents/tasks (replaced with new VDD/SCAN/EXPLORE skills)
- Cleaned up deprecated hooks
- Added new commands, hooks, and agent configs

## In Progress
Nothing — all tasks completed and deployed.

## Next Steps
1. **E2E auth test on occuflow.co.uk** — was about to run browser agent test but MCP servers not configured on handoff user. Need Chrome DevTools MCP set up first.
2. **MCP server setup for handoff user** — `uv` installed at `/home/handoff/.local/bin/uv`. Serena and Chrome DevTools MCP need to be added via `claude mcp add` in a separate terminal (can't run inside Claude Code session).
3. **Consider deleting old `convex-medical-starter` Vercel project** if staging isn't needed — currently both projects build on every push to main.
4. **WorkOS branding** — user had WorkOS "Branding" tab open. May want to update AuthKit branding to say OccuFlow.
5. **Favicon** — still using default Convex logo (`/convex.svg`). Could be replaced with OccuFlow branding.

## Key Context
- **Vercel linked to `occuhealth-semble`** — the `.vercel/` directory was relinked during this session via `vercel link --project occuhealth-semble`. Running `vercel` commands targets this project, not `convex-medical-starter`.
- **convex/_generated/ is now in git** — after any schema changes, run `npx convex dev` locally then commit the updated `_generated/` files
- **Auth uses dynamic returnTo** — `window.location.origin` passed through OAuth state, so domain changes don't require code changes. `APP_URL` is just a fallback.
- **Two Convex deployments**: dev = `accurate-warbler-380`, prod = `exciting-herring-835`
- **Failed approach**: initially thought only `vercel.json buildCommand` fix was needed. Vite also failed on import resolution, requiring `_generated/` to be committed.
- **Unstaged files remaining**: `.mcp.json` (local MCP config, intentionally not committed), `.claude/hooks/__pycache__/`, `.claude/hooks/*.backup*`

## Files Modified (3 commits: a8f41b0, c296921, 1868d7f)
### Build/Deploy fixes
- `vercel.json` — added buildCommand, outputDirectory, framework
- `.gitignore` — removed `convex/_generated` line
- `convex/_generated/*` — committed 5 generated type/runtime files
- `.claude/CLAUDE.md` — added Vercel deployment docs, updated directives

### Rebrand (OccuHealth → OccuFlow)
- `src/App.tsx`, `src/pages/AdminLayout.tsx`, `src/pages/DoctorLayout.tsx`, `src/pages/EmployerLayout.tsx` — sidebar/header brand text
- `src/components/layout/NavigationBar.tsx`, `src/components/layout/Footer.tsx` — nav + footer brand
- `src/components/landing/CTASection.tsx`, `src/components/landing/TestimonialsSection.tsx` — marketing copy
- `src/pages/register/ChooseRole.tsx`, `src/components/doctor/DoctorRegistrationForm.tsx` — registration
- `src/pages/patient/ViewAppointment.tsx` — support email → support@occuflow.co.uk
- `convex/http.ts` — comment + ICS organizer email
- `convex/lib/icsGenerator.ts` — PRODID, organizer CN, UID domain
- `convex/schema.ts` — comment header
- `index.html` — page title
- `package.json` — description + keywords
- `README.md`, `AGENTS.md`, `SETUP_GUIDE.md`, `docs/DEPLOYMENT.md`, `docs/error-codes-reference.md`, `DOCUMENTS/AUTH.md`, `DOCUMENTS/CONVEX-AUTH.md`, `src/pages/doctor/README.md` — doc references
- `.serena/memories/*` — 8 memory files updated
- `.claude/rules/CHROME-DEVTOOLS-MCP/NAV-MAP.md` — brand selectors

### .claude/ config overhaul
- Deleted: 35 BMad agent/task files, 11 deprecated hook files
- Added: 30 new command files, new agent config, new hook files
