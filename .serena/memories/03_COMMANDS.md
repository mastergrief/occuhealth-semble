# OccuHealth - Development Commands

## Essential Commands

### Development
```bash
npm run dev              # Start all (frontend + backend + typecheck watch)
npm run dev:frontend     # Vite dev server only (port 5175)
npm run dev:backend      # Convex dev only
npm run dev:typecheck    # tsgo watch mode
```

### Type Checking (BLOCKING - must pass)
```bash
npm run typecheck        # tsgo (fast, ~10x faster than tsc)
npm run typecheck:tsc    # Traditional tsc (slower)
```

### Build & Deploy
```bash
npm run build            # Full build (typecheck + vite build)
npm run build:app        # Vite build only
npm run convex:deploy    # Deploy to Convex (typecheck first)
npm run convex:deploy:prod  # Deploy to production
```

### Linting
```bash
npm run lint             # ESLint + typecheck
```

### Testing
```bash
npm run test:e2e         # Playwright tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug mode
npm run test:e2e:headed  # Playwright headed browser
npm run test:e2e:auth    # Auth tests only
```

### Mobile (Capacitor)
```bash
npm run cap:sync         # Sync web assets to native
npm run cap:ios          # Open iOS project
npm run cap:android      # Open Android project
```

## Custom CLI Tools

### Browser-CLI (E2E Testing)
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts <command>
# Examples:
# navigate http://localhost:5175
# snapshot
# click e5
# screenshot test.png
```

### CONVEX-CLI (Data Inspection)
```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <table> --limit=10 --json
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <fn:name> '{}' --json
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --masked
```

## Workflow: After Task Completion
1. `npm run typecheck` - **BLOCKING** (must pass)
2. `npm run lint` - Check for issues
3. Test manually or with Browser-CLI
4. Commit (if requested)

## Port Usage
| Port | Service |
|------|---------|
| 5175 | Vite dev server |
| 5176 | Vite preview server |
| 3456 | Browser-CLI daemon |
