# Testing Infrastructure
**Sprint**: 04 of 06
**Index**: CODEBASE_ANALYSIS_INDEX
**Depends On**: CODEBASE_ANALYSIS_SPRINT_01_EXECUTIVE_OVERVIEW
**Next**: CODEBASE_ANALYSIS_SPRINT_05_BROWSER_CLI_GUIDE

---

## Testing Stack Overview

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| **Vitest 4.0** | Unit/component tests | vitest.config.ts |
| **Playwright 1.57** | E2E browser tests | playwright.config.ts |
| **Browser-CLI** | Integration testing | Custom ~15,000 lines |
| **Testing Library** | React component testing | @testing-library/react |
| **Axe-Core** | Accessibility auditing | @axe-core/playwright |

---

## Test Coverage Assessment

| Portal | Unit Tests | E2E Tests | Coverage |
|--------|------------|-----------|----------|
| **Doctor** | 5 test files | Auth specs | ~80% |
| **Employer** | 0 test files | Auth specs | 0% ❌ |
| **Admin** | 0 test files | Auth specs | 0% ❌ |
| **Auth** | 1 test file (554L) | 3 spec files | ~90% |

### Strengths
- Excellent WorkOS auth test coverage (554 lines)
- Complete doctor portal component test suite
- Multi-browser E2E (Chromium, Firefox, WebKit)
- Mature Browser-CLI infrastructure

### Critical Gaps
- **Zero employer portal tests** (5 untested pages)
- **Zero admin portal tests** (5 untested pages, GDPR-critical!)
- Coverage config limited to `src/pages/doctor/**` and `src/lib/workos-auth.tsx`
- No coverage thresholds enforced

---

## Vitest Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'],
    coverage: {
      include: [
        'src/pages/doctor/**',      // Only doctor pages!
        'src/lib/workos-auth.tsx'
      ]
    }
  }
});
```

**Issues:**
- Coverage includes only doctor portal
- No coverage thresholds (should be 70%+)

---

## Playwright Configuration

**File:** `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' }
  ],
  webServer: {
    command: 'npm run preview',
    port: 5176
  }
});
```

**Test Files:**
- `tests/e2e/auth/login.spec.ts`
- `tests/e2e/auth/logout.spec.ts`
- `tests/e2e/auth/role-routing.spec.ts`

---

## Browser-CLI Infrastructure (~15,000 lines)

### Architecture
```
BROWSER-CLI/
├── SCRIPTS/
│   ├── browser-cmd.ts ──────── CLI entry point
│   ├── browser-manager.ts ──── TCP daemon (port 3456)
│   │
│   ├── features/ (25 implementations)
│   │   ├── SnapshotFeature.ts
│   │   ├── snapshotModules/ (9 files)
│   │   ├── coreActionsModules/ (8 files)
│   │   ├── console-capture.ts
│   │   ├── network-capture.ts
│   │   ├── assertions.ts
│   │   ├── browser-state.ts
│   │   ├── visual-regression.ts
│   │   └── ... (14 more)
│   │
│   ├── cli/ (22 help, 16 formatters)
│   └── tests/ (38 test files)
│
├── states/ ──────────── 15+ saved browser states
├── templates/ ───────── 6 test templates
├── screenshots/ ─────── 250+ test artifacts
└── evidence/ ────────── Test evidence archive
```

### Key Commands
```bash
# Navigation
navigate <url>
wait <ms>
snapshot

# Interaction
click e5                 # Element ref from snapshot
type e15 "text"
pressKey Enter
selectOption <sel> <val>

# Verification
assert e5 visible
assertConsole --level=error
assertNetwork <pattern>
screenshot <path>

# State Management
saveState <name>
restoreState <name>
```

---

## Test File Inventory

### Unit Tests (Vitest)
| File | Lines | Coverage |
|------|-------|----------|
| `src/lib/__tests__/workos-auth.test.ts` | 554 | Auth context |
| `src/pages/doctor/__tests__/Schedule.test.tsx` | 147 | Schedule component |
| `tests/setup.ts` | - | Test setup |

### E2E Tests (Playwright)
| File | Purpose |
|------|---------|
| `tests/e2e/auth/login.spec.ts` | Login flow |
| `tests/e2e/auth/logout.spec.ts` | Logout flow |
| `tests/e2e/auth/role-routing.spec.ts` | Role-based routing |

### Browser-CLI Tests
- 38 test files in `BROWSER-CLI/tests/`
- Feature tests: 15 files
- CLI tests: 4 files
- Security tests: 2 files

---

## Test Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` |
| Admin | Via WorkOS portal | Manual setup |

---

## NPM Test Scripts

```bash
# Unit Tests
npm run test              # Run Vitest
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Coverage report

# E2E Tests
npm run test:e2e          # Run Playwright
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:debug    # Debug mode
npm run test:e2e:headed   # Visible browser
npm run test:e2e:auth     # Auth tests only
```

---

## Priority Recommendations

| Priority | Action | Effort |
|----------|--------|--------|
| P1 | Add employer portal test files | 4-6 hours |
| P1 | Add admin portal test files | 4-6 hours |
| P1 | Expand coverage config to all `src/` | 15 min |
| P2 | Add coverage thresholds (70%+) | 15 min |
| P2 | Integrate axe-core a11y testing | 2 hours |
| P3 | Enable ESLint strict rules | 1 hour |

---

## Quick Start: Running Tests

```bash
# 1. Start dev servers
npm run dev

# 2. Run unit tests
npm test

# 3. Run E2E tests (in separate terminal)
npm run test:e2e

# 4. Run Browser-CLI manual tests
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
```

---

→ Next: CODEBASE_ANALYSIS_SPRINT_05_BROWSER_CLI_GUIDE
