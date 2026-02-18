# Data Migration CLI

Config-driven dev-to-prod data transfer using `scripts/migrate/cli.ts`.

**Source**: Dev `notable-mouse-131` | **Target**: Prod `dashing-reindeer-259`
**Config**: `migrate.config.yaml` | **Backend**: `convex/migrations/bulkImport.ts`

### Account Mappings

| Role | Dev Email | Prod Email | Auth |
|------|-----------|------------|------|
| Coach | `coach@zenith.co.uk` | `gabe@zenith-athlete.com` | Email + password |
| Admin | `admin@zenith-athlete.com` | `admin@zenith-athlete.com` | MFA via Resend (no password) |

Convex user IDs required for `userMappings` — lookup with:
```bash
npx convex data users --limit 10          # Dev IDs
npx convex data users --limit 10 --prod   # Prod IDs
```

---

## COMMANDS

```bash
# Plan (read-only) — show phases, record counts, dependency order
npx tsx scripts/migrate/cli.ts plan --verbose

# Dry run — full pipeline without writing to prod
npx tsx scripts/migrate/cli.ts run --dry-run --verbose

# Live run — execute migration
npx tsx scripts/migrate/cli.ts run --verbose

# Resume — continue from last checkpoint after crash/failure
npx tsx scripts/migrate/cli.ts resume --verbose
npx tsx scripts/migrate/cli.ts resume --table <tableName> --verbose

# Verify — post-migration integrity check (counts + ownership)
npx tsx scripts/migrate/cli.ts verify --verbose

# Rollback — delete migrated records (redirects to standalone script)
npx tsx scripts/migrate/cli.ts rollback --confirm
```

### Global Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--config <path>` | `./migrate.config.yaml` | YAML config path |
| `--verbose` | `false` | Per-record debug logging |
| `--dry-run` | `false` | Preview without writing (run only) |
| `--table <name>` | all | Restrict to single table (run/resume) |
| `--confirm` | required | Safety gate for rollback |

---

## WORKFLOW

```
1. Export dev data    →  npx convex export (produces JSONL in migration-export-dir/)
2. Plan              →  npx tsx scripts/migrate/cli.ts plan --verbose
3. Dry run           →  npx tsx scripts/migrate/cli.ts run --dry-run --verbose
4. Live run          →  npx tsx scripts/migrate/cli.ts run --verbose
5. Resume (if crash) →  npx tsx scripts/migrate/cli.ts resume --verbose
6. Verify            →  npx tsx scripts/migrate/cli.ts verify --verbose
7. Rollback (if bad) →  npx tsx scripts/migrate/cli.ts rollback --confirm
```

---

## CONFIG: migrate.config.yaml

```yaml
source:
  path: "./migration-export-dir"              # JSONL export directory
  deployment: "notable-mouse-131"             # Dev deployment

target:
  deployment: "prod:dashing-reindeer-259"     # "prod:" prefix → --prod flag
  mutation: "migrations/bulkImport:bulkInsertWithIdMapping"

userMappings:                                 # Dev user ID → Prod user ID (required)
  "dev_coach_id": "prod_coach_id"             # Lookup IDs with: npx convex data users --limit 10 [--prod]
  "dev_admin_id": "prod_admin_id"

tables:
  exclude: [authAccounts, authRefreshTokens, ...] # Tables to skip
  include: []                                      # Whitelist (empty = all non-excluded)

ownerFields:
  default: [coachId, userId, athleteId, authorId, createdBy]
  overrides:                                  # Per-table owner field overrides
    coachMessages: [senderId]

mergeStrategies:                              # Per-table merge behavior
  trainingTypes:
    strategy: merge_by_field                  # merge_by_field | skip_existing | replace
    field: slug

batch:
  size: 25                                    # Records per batch
  delayMs: 200                                # Ms between batches
  retries: 3                                  # Retry with exponential backoff
```

---

## ARCHITECTURE

```
migrate.config.yaml
       │
       v
   config.ts ── Zod validation + defaults
       │
       v
   schema-parser.ts ── Parse convex/schemaModules/*.ts → FK dependency graph
       │
       v
   topo-sort.ts ── Kahn's algorithm → ordered phases
       │
       v
   cli.ts ── Build MigrationPlan → dispatch command
       │
       v
   phase-runner.ts ── Per table:
       ├── Read JSONL from source.path/<table>/documents.jsonl
       ├── Filter by ownership (userMappings + indirect FK)
       ├── id-traversal.ts: remap all IDs (owner, FK, safety-net scan)
       ├── Batch → npx convex run --prod migrations/bulkImport:bulkInsertWithIdMapping
       └── checkpoint.ts: save progress after each batch
       │
       v
   verify.ts ── Query prod counts, report pass/fail
```

| File | Purpose | Lines |
|------|---------|-------|
| `scripts/migrate/cli.ts` | Entry point, arg parsing, dispatch | ~250 |
| `scripts/migrate/config.ts` | YAML + Zod validation | ~105 |
| `scripts/migrate/schema-parser.ts` | FK graph from schemaModules | ~317 |
| `scripts/migrate/topo-sort.ts` | Topological sort | ~74 |
| `scripts/migrate/checkpoint.ts` | Checkpoint CRUD | ~93 |
| `scripts/migrate/phase-runner.ts` | Core engine | ~453 |
| `scripts/migrate/id-traversal.ts` | Deep ID remapping | ~270 |
| `scripts/migrate/verify.ts` | Post-migration verification | ~95 |
| `scripts/migrate/types.ts` | Interfaces + logger | ~129 |
| `convex/migrations/bulkImport.ts` | Backend mutations | ~139 |

---

## SAFETY MECHANISMS

| Layer | Mechanism |
|-------|-----------|
| **Ownership** | Only records belonging to mapped users migrate (direct + indirect FK) |
| **ID safety net** | After FK remap, all string fields scanned for dev user IDs → swapped |
| **FK integrity** | Required FKs unmappable → record skipped; optional FKs → field stripped |
| **Checkpoints** | Auto-save after every batch; resume picks up from last checkpoint |
| **Retries** | Exponential backoff: 500ms base, 8s cap, 3 attempts |
| **Idempotency** | `bulkInsertWithIdMapping` supports `idempotencyField` — skips duplicates |
| **Rollback gate** | Requires `--confirm` flag; standalone script has 5s countdown |

---

## BACKEND: bulkImport.ts

Two `internalMutation` handlers (only callable via `npx convex run`):

**`bulkInsertWithIdMapping`** — Insert records with old→new ID mapping
- Args: `tableName`, `records: [{oldId, data}]`, optional `idempotencyField`
- Returns: `{inserted, skipped, idMapping: [{oldId, newId}]}`

**`bulkDeleteByOwner`** — Delete records by owner field match
- Args: `tableName`, `ownerField`, `ownerId`
- Returns: `{deleted}`

---

## LEGACY SCRIPTS (Gen 1)

Original hand-written scripts before CLI refactor. Still present for reference:

| Script | Purpose |
|--------|---------|
| `scripts/dev-to-prod-migration.ts` | Original 31-phase migration (hardcoded) |
| `scripts/resume-migration-phase22.ts` | Crash recovery phases 22-30 |
| `scripts/resume-migration-phase27.ts` | Crash recovery phase 27+ |
| `scripts/verify-migration.ts` | Standalone verification |
| `scripts/rollback-migration.ts` | Standalone rollback (still used by CLI) |

---

## TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|---------|
| Config validation fails | Missing `userMappings` or bad merge strategy | Check `migrate.config.yaml` against schema |
| FK remap failures (many skips) | Dependency order wrong | Run `plan` to inspect topological sort |
| Batch timeout | Large records or rate limiting | Reduce `batch.size`, increase `batch.delayMs` |
| Resume finds no checkpoint | Checkpoint dir missing or empty | Check `./migration-checkpoints/` exists |
| Verify shows 0 records | Table excluded or ownership filter too strict | Check `tables.exclude` and `ownerFields` config |
| Rollback incomplete | `bulkDeleteByOwner` uses `.take(500)` | Re-run rollback to catch remaining records |
