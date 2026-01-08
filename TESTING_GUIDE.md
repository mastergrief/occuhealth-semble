# OccuHealth Testing Guide

## Test Types

### Unit Tests (Vitest)

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode (re-run on file changes)
npm test -- --coverage     # Generate coverage report
npm run test:ui            # Interactive test UI
```

### E2E Tests (Playwright)

```bash
npm run test:e2e           # Run all E2E tests (headless)
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:e2e:debug     # Debug mode with step-through
npm run test:e2e:auth      # Auth-specific tests only
```

### Browser-CLI Tests (Manual)

```bash
# Start dev server first
npm run dev

# Run browser commands
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot test.png
```

See `.claude/rules/BROWSER-CLI/SKILL.md` for full command reference.

## Coverage Targets

| Layer | Target | Current |
|-------|--------|---------|
| Convex Functions | 60% | - |
| React Pages | 70% | - |
| E2E Critical Paths | 100% | - |

## Test File Locations

```
convex/__tests__/          # Backend unit tests
tests/e2e/                 # Playwright E2E tests
tests/e2e/auth/           # Authentication flow tests
```

## Writing Unit Tests

### Convex Function Test Example

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

describe("patients.list", () => {
  it("should return paginated patients", async () => {
    const t = convexTest(schema);

    // Setup test data
    await t.run(async (ctx) => {
      await ctx.db.insert("patients", {
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        dateOfBirth: "1990-01-01",
        employerId: "test-employer-id",
        createdAt: Date.now(),
      });
    });

    // Test query
    const result = await t.query(api.patients.list, {
      employerId: "test-employer-id",
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].firstName).toBe("John");
  });
});
```

### React Component Test Example

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../components/ui/button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

## E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("employer can view dashboard", async ({ page }) => {
  // Login
  await page.goto("/");
  await page.click("text=Provider Login");
  // ... complete auth flow

  // Navigate to dashboard
  await page.goto("/employer/dashboard");

  // Verify content
  await expect(page.locator("text=Dashboard")).toBeVisible();
});
```

## Running Tests in CI

```bash
# Full test suite
npm run typecheck && npm test && npm run test:e2e

# With coverage
npm run test:coverage
```

## Debugging Failed Tests

### Vitest

```bash
# Run specific test file
npm test -- convex/__tests__/patients.test.ts

# Run with verbose output
npm test -- --reporter=verbose
```

### Playwright

```bash
# Run specific test
npm run test:e2e -- tests/e2e/auth/login.spec.ts

# Generate trace for debugging
npm run test:e2e -- --trace on

# View last trace
npx playwright show-trace test-results/*/trace.zip
```

## Test Data

### Development Credentials

| Role | Email | Password |
|------|-------|----------|
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` |

### Browser-CLI Saved States

Pre-authenticated states for quick testing:

```bash
# Restore authenticated employer state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer

# List available states
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listStates
```

## Convex Test Utilities

The project uses `convex-test` for backend testing:

```typescript
import { convexTest } from "convex-test";
import schema from "../schema";

const t = convexTest(schema);

// Run mutations
await t.mutation(api.patients.create, { ... });

// Run queries
const result = await t.query(api.patients.list, { ... });

// Direct DB access for setup/assertions
await t.run(async (ctx) => {
  await ctx.db.insert("table", { ... });
});
```
