# Push Production

3-phase production deployment with pre-flight checks, gated deploy, and smoke verification.

**Prod targets**: Convex `dashing-reindeer-259` | Vercel `zenith-athlete.com`

---

## **PHASE 1: PRE-FLIGHT (Parallel Agents)**

Spawn `data` + `Explore` agents **in parallel** using `Task` tool in a single block. ULTRATHINK

### **data agent prompt**:
```
Production deployment pre-flight — DATA DIAGNOSIS (read-only, --prod flag for all commands).

1. **Schema alignment**: Read convex/schema.ts, then run `npx convex data --prod` — compare expected tables/fields vs actual prod state.
2. **Migration check**: Run `npx convex function-spec --prod | grep -i migrat` — identify any unrun migrations on prod.
   - For each migration found, check if it's been applied by sampling relevant prod tables.
3. **Critical table sampling**: Run `npx convex data <table> --limit 3 --prod` for core tables (users, calendarWorkouts, workoutLogs, exercises) — verify data integrity.
4. **Report format**:
   - Status: READY | NEEDS_MIGRATION | BLOCKED
   - Unrun migrations: [list with exact run commands]
   - Schema drift: [any mismatches found]
   - Data integrity: [any corruption or missing data]
   - Blockers: [anything that should prevent deploy]
```

### **Explore agent prompt**:
```
Production deployment pre-flight — CODE & CONFIG READINESS (very thorough).

1. **Uncommitted changes**: Run `git status` and `git diff --stat` — flag anything not committed that won't be deployed.
2. **Function spec diff**: Run `npx convex function-spec` (dev) and `npx convex function-spec --prod` (prod), compare identifiers — report NEW, REMOVED, and CHANGED functions.
3. **Env var alignment**: Run `npx convex env list` (dev) and `npx convex env list --prod` (prod) — flag vars present in dev but missing in prod (DO NOT log values, names only).
4. **Typecheck**: Run `npm run typecheck` — confirm clean build before deploy.
5. **Report format**:
   - Status: READY | BLOCKED
   - Uncommitted files: [list]
   - Function changes: [new/removed/changed]
   - Missing prod env vars: [list of names only]
   - Typecheck: PASS | FAIL (with errors)
   - Blockers: [anything that should prevent deploy]
```

### **Gate Decision**

After both agents return, evaluate:

| data status | Explore status | Action |
|-------------|----------------|--------|
| READY | READY | → Proceed to Phase 2 |
| NEEDS_MIGRATION | READY | → Phase 2 with migration step first |
| Any BLOCKED | Any | → STOP. Report blockers to user. Do NOT deploy. |
| Any | BLOCKED | → STOP. Report blockers to user. Do NOT deploy. |

If either agent reports missing prod env vars → **ASK USER** before proceeding (env vars require manual Vercel/Convex dashboard action).

---

## **PHASE 2: DEPLOY**

### Step 2a: Run Prod Migrations (if NEEDS_MIGRATION)

Spawn `developer` agent **only if** data agent reported unrun migrations. ULTRATHINK

#### **developer agent prompt**:
```
Production migration execution. Run these migrations on PROD (--prod flag required):

[INSERT EXACT MIGRATION COMMANDS FROM DATA AGENT REPORT]

For each migration:
1. Run: `npx convex run migrations:<name> '{}' --prod`
2. Verify: `npx convex data <affected_table> --limit 3 --prod`
3. If migration fails → STOP immediately, report failure, do NOT continue.

Report: List each migration with PASS/FAIL status and verification result.
```

### **Step 2b: Deploy Convex Backend**

Run `CONVEX_DEPLOYMENT=prod:dashing-reindeer-259 npx convex deploy -y`. ULTRATHINK

If deploy fails → STOP. Report error to user. Do NOT proceed to frontend deploy.

### **Step 2c: Deploy Vercel Frontend**

Run `npx vercel --prod`. ULTRATHINK

Capture deployment URL from output for Phase 3 verification.

---

## **PHASE 3: VERIFY (Browser Agent)**

Spawn `browser` agent for production smoke test. ULTRATHINK

### **browser agent prompt**:
```
Production smoke test for https://zenith-athlete.com — verify deployment is live and functional.

**PREPARE**:
1. navigate_page url="https://zenith-athlete.com"
2. wait_for text="Zenith" timeout=10000
3. take_snapshot
4. take_screenshot filePath="/tmp/prod-deploy-landing.png"

**VERIFY LANDING**:
5. Confirm app loads without errors
6. list_console_messages types=["error"] — report any errors

**VERIFY AUTH**:
7. Click login, fill credentials (coach@zenith.co.uk / Testpass1234)
8. wait_for text="Dashboard" timeout=10000
9. take_snapshot
10. take_screenshot filePath="/tmp/prod-deploy-dashboard.png"

**VERIFY CRITICAL ROUTES** (navigate each, snapshot + screenshot):
11. Training Calendar — wait_for "My Training"
12. Exercise Library — wait_for "Exercise Library"

**REPORT**:
- Status: LIVE | DEGRADED | DOWN
- Landing: loads? errors?
- Auth: login works?
- Routes: each route accessible?
- Console errors: [list any]
- Evidence: screenshot file paths
```

---

## **ROLLBACK REFERENCE**

If Phase 3 fails or production is broken:

```bash
# Convex: Redeploy previous version
CONVEX_DEPLOYMENT=prod:dashing-reindeer-259 npx convex deploy -y  # Re-deploy from last good commit

# Vercel: Promote previous deployment
npx vercel ls --prod                    # Find previous deployment URL
npx vercel promote <previous-url>       # Promote to production

# Verify rollback
# Re-run Phase 3 browser smoke test
```

---

## **SUMMARY**

```
PRE-FLIGHT ──→ GATE ──→ DEPLOY ──→ VERIFY
  (parallel)     │        │          │
  data agent     │     migrations?   browser agent
  Explore agent  │     convex deploy smoke test
                 │     vercel deploy evidence
                 │
            READY → go
           BLOCKED → stop
```
