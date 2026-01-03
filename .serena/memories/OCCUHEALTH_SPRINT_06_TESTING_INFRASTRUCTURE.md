# Testing Infrastructure Overview

**Sprint**: 06 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: OCCUHEALTH_SPRINT_07_BROWSER_CLI_E2E

---

## Testing Ecosystem Summary

OccuHealth has a **multi-layered testing infrastructure** with three distinct ecosystems:

| Ecosystem | Location | Tests | Framework | Coverage |
|-----------|----------|-------|-----------|----------|
| Playwright E2E | `/tests/e2e/` | 13 | Playwright | Auth flows only |
| BROWSER-CLI | `/BROWSER-CLI/tests/` | 32 files | Vitest | CLI features |
| ORCHESTRATION | `/ORCHESTRATION/tests/` | 17 files | Vitest | Workflow engine |

**Critical Gap**: 0% backend test coverage, 0% component tests.

---

## Playwright E2E Tests

**Location**: `/tests/e2e/`
**Config**: `playwright.config.ts`
**Test Count**: 13 tests

### Test Structure

```
tests/e2e/
├── fixtures/
│   └── auth.fixture.ts      # Auth fixtures for all roles
└── auth/
    ├── login.spec.ts        # 5 tests - WorkOS login flow
    ├── logout.spec.ts       # 4 tests - Storage clearing
    └── role-routing.spec.ts # 4 tests - Role-based navigation
```

### Auth Fixture Pattern

```typescript
// tests/e2e/fixtures/auth.fixture.ts
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test';

export const test = base.extend<AuthFixtures>({
  authenticatedAdminPage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'fixture_admin',
        accessToken: token,
        refreshToken: 'fixture_refresh_token',
      }));
    }, TEST_TOKEN);
    await page.goto('/admin');
    await use(page);
  },
  
  authenticatedEmployerPage: async ({ page }, use) => {
    // Similar pattern for employer role
  },
  
  authenticatedDoctorPage: async ({ page }, use) => {
    // Similar pattern for doctor role
  },
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
  },
});
```

### NPM Test Commands

```bash
npm run test:e2e          # Run all Playwright tests
npm run test:e2e:ui       # Interactive Playwright UI
npm run test:e2e:debug    # Debug mode
npm run test:e2e:headed   # Headed browser
npm run test:e2e:auth     # Auth tests only
```

---

## BROWSER-CLI Tests

**Location**: `/BROWSER-CLI/tests/`
**Framework**: Vitest
**Test Count**: 32 files

### Test Structure

```
BROWSER-CLI/tests/
├── setup.ts                 # Mock utilities (538 lines)
├── cli/                     # 4 tests - Command parsing
├── features/                # 22 feature tests
│   ├── snapshot.test.ts     # 481 lines
│   ├── network-mocking.test.ts
│   ├── core-actions.test.ts
│   └── ... (19 more)
├── security/                # 4 security tests
│   └── evaluate-sandbox.test.ts  # 453 lines
├── utils/                   # 1 utility test
└── e2e/                     # 1 integration test
```

### Mock Utilities

```typescript
// BROWSER-CLI/tests/setup.ts
export function createMockPage(): MockPage { ... }
export function createMockSnapshot(): SnapshotResult { ... }
export function createMockBrowserContext(): MockBrowserContext { ... }
export function createMockFileSystem(): MockFS { ... }
```

---

## ORCHESTRATION Tests

**Location**: `/ORCHESTRATION/tests/`
**Framework**: Vitest
**Test Count**: 17 files

### Test Structure

```
ORCHESTRATION/tests/
├── setup.ts                        # Mock filesystem
├── lib/
│   ├── context-hub.test.ts         # 757 lines - Core facade
│   ├── parallel-engine.test.ts     # Parallel execution
│   ├── evidence-chain.test.ts      # Evidence tracking
│   └── template-processor/         # 3 template tests
├── gateParserModules/              # 4 parser tests
├── performance/                    # Timing tests
└── benchmarks/                     # 3 benchmark files
```

---

## Quality Tools

### TypeScript Configuration

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### ESLint Configuration

```javascript
// eslint.config.js
export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      // Relaxed for flexibility (potential tech debt)
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    }
  }
);
```

### Type Checking

```bash
npm run typecheck        # tsgo --noEmit (fast)
npm run typecheck:tsc    # tsc --noEmit (fallback)
npm run dev:typecheck    # tsgo --watch (dev mode)
```

---

## Coverage Analysis

### Areas WITH Coverage

| Area | Test Type | Coverage |
|------|-----------|----------|
| Auth flows | Playwright E2E | 13 tests |
| BROWSER-CLI features | Vitest unit | 32 files |
| ORCHESTRATION | Vitest unit | 17 files |
| Security sandbox | Vitest unit | 453 lines |

### Areas MISSING Coverage

| Area | Files | Impact | Priority |
|------|-------|--------|----------|
| Convex backend | 14 files | No mutation validation | P0 |
| React components | 25+ files | No UI regression | P1 |
| GDPR functions | gdpr.ts | No compliance verification | P0 |
| Medical domain | appointments, reports | No business logic tests | P1 |

---

## Test Recommendations

### Priority 1: Backend Tests (Vitest)

```typescript
// Example: convex/appointments.test.ts
import { convexTest } from "convex-test";
import { api } from "./_generated/api";

describe("appointments", () => {
  it("should not book unavailable slot", async () => {
    const t = convexTest();
    
    // Create a slot that's already booked
    const slotId = await t.mutation(api.availableSlots.createSlot, {
      doctorId: "...",
      date: "2025-01-15",
      startTime: "09:00",
    });
    await t.mutation(api.availableSlots.markBooked, { slotId });
    
    // Attempt to book should fail
    await expect(
      t.mutation(api.appointments.book, {
        patientId: "...",
        slotId,
      })
    ).rejects.toThrow("Slot is not available");
  });
});
```

### Priority 2: Component Tests (Vitest + Testing Library)

```typescript
// Example: src/components/employer/BookingFlow.test.tsx
import { render, screen } from "@testing-library/react";
import { BookingFlow } from "./BookingFlow";

describe("BookingFlow", () => {
  it("shows error when booking fails", async () => {
    // Mock Convex mutation to fail
    const mockMutation = vi.fn().mockRejectedValue(new Error("Slot taken"));
    
    render(<BookingFlow />);
    
    // Fill form and submit
    // ...
    
    // Verify error displayed
    expect(screen.getByText(/booking failed/i)).toBeInTheDocument();
  });
});
```

---

## Testing Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  TESTING INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Playwright E2E]     [BROWSER-CLI]     [ORCHESTRATION]    │
│  tests/e2e/           BROWSER-CLI/tests/ ORCHESTRATION/    │
│  - 13 auth tests      - 32 test files   tests/             │
│  - Chromium/FF/       - Vitest          - 17 test files    │
│    WebKit             - Mock utilities  - Vitest           │
│  - localhost:5175     - Security tests  - Benchmarks       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Pre-saved States]                                         │
│  BROWSER-CLI/states/                                        │
│  - authenticated-coach.json                                 │
│  - landing-page.json                                        │
│  - calendar-authenticated.json                              │
│  (13 state files for rapid test initialization)            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Quality Tools]                                            │
│  - TypeScript strict mode                                   │
│  - ESLint + typescript-eslint                               │
│  - Prettier (default config)                                │
│  - tsgo (fast type checking)                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [COVERAGE GAPS - CRITICAL]                                 │
│  - Convex backend (0 tests)                                 │
│  - React components (0 tests)                               │
│  - GDPR compliance (0 tests)                                │
│  - Medical domain logic (0 tests)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

→ Next: OCCUHEALTH_SPRINT_07_BROWSER_CLI_E2E
