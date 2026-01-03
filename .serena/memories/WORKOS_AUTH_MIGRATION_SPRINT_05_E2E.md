# WorkOS Auth Migration - Playwright E2E Testing

**Sprint**: 05 of 06
**Index**: WORKOS_AUTH_MIGRATION_INDEX
**Depends On**: SPRINT_03_LANDING, SPRINT_04_CONTEXT
**Next**: WORKOS_AUTH_MIGRATION_SPRINT_06_CLEANUP

---

## Objective

Create comprehensive E2E tests for the WorkOS authentication flow using Playwright to ensure all user journeys work correctly after migration.

---

## Test File Structure

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts          # Login flow tests
│   │   ├── logout.spec.ts         # Logout flow tests
│   │   ├── role-routing.spec.ts   # Role-based routing tests
│   │   └── registration.spec.ts   # New user registration tests
│   ├── fixtures/
│   │   └── auth.fixture.ts        # Auth helper fixtures
│   └── helpers/
│       └── workos-mock.ts         # WorkOS API mocking
├── playwright.config.ts
└── package.json (scripts)
```

---

## Setup: playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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

---

## Test 1: Login Flow (login.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('WorkOS Login Flow', () => {
  
  test('landing page login button redirects to WorkOS', async ({ page }) => {
    await page.goto('/');
    
    // Click login button in navigation
    const loginButton = page.getByRole('link', { name: 'Login' });
    await expect(loginButton).toBeVisible();
    
    // Verify href points to auth/login
    const href = await loginButton.getAttribute('href');
    expect(href).toContain('/auth/login');
    
    // Click and verify redirect (will go to WorkOS)
    await loginButton.click();
    
    // Should be redirected to WorkOS AuthKit
    await expect(page).toHaveURL(/workos\.com|authkit/);
  });

  test('hero CTA button redirects to WorkOS', async ({ page }) => {
    await page.goto('/');
    
    // Find "Get Started" button in hero section
    const ctaButton = page.getByRole('link', { name: 'Get Started' });
    await expect(ctaButton).toBeVisible();
    
    const href = await ctaButton.getAttribute('href');
    expect(href).toContain('/auth/login');
  });

  test('mobile navigation login works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();
    
    // Click mobile login
    const mobileLogin = page.getByRole('link', { name: 'Login' });
    await expect(mobileLogin).toBeVisible();
    
    const href = await mobileLogin.getAttribute('href');
    expect(href).toContain('/auth/login');
  });

  test('no AuthModal appears on login click', async ({ page }) => {
    await page.goto('/');
    
    // Click login - should NOT open modal
    await page.getByRole('link', { name: 'Login' }).click();
    
    // Verify no dialog/modal appeared
    const modal = page.getByRole('dialog');
    await expect(modal).not.toBeVisible();
    
    // Should have navigated away from landing page
    expect(page.url()).not.toBe('http://localhost:5175/');
  });
});
```

---

## Test 2: Role-Based Routing (role-routing.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Role-Based Routing After Auth', () => {

  test.beforeEach(async ({ page }) => {
    // Clear all auth storage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('workos_admin_auth');
      localStorage.removeItem('workos_employer_auth');
      localStorage.removeItem('workos_doctor_auth');
    });
  });

  test('admin token routes to /admin', async ({ page }) => {
    await page.goto('/');
    
    // Inject admin auth token
    await page.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_test_admin',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
      }));
    });
    
    // Navigate to admin portal
    await page.goto('/admin');
    
    // Should show admin dashboard (not redirect to login)
    await expect(page.getByText('Admin')).toBeVisible();
    await expect(page).toHaveURL(/\/admin/);
  });

  test('employer token routes to /employer', async ({ page }) => {
    await page.goto('/');
    
    // Inject employer auth token
    await page.evaluate(() => {
      localStorage.setItem('workos_employer_auth', JSON.stringify({
        workosUserId: 'user_test_employer',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
      }));
    });
    
    await page.goto('/employer');
    
    // Should show employer portal
    await expect(page).toHaveURL(/\/employer/);
    // Check for employer-specific content
    await expect(page.getByText(/dashboard|employer/i)).toBeVisible();
  });

  test('doctor token routes to /doctor', async ({ page }) => {
    await page.goto('/');
    
    // Inject doctor auth token
    await page.evaluate(() => {
      localStorage.setItem('workos_doctor_auth', JSON.stringify({
        workosUserId: 'user_test_doctor',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
      }));
    });
    
    await page.goto('/doctor');
    
    await expect(page).toHaveURL(/\/doctor/);
  });

  test('unauthenticated user redirected from protected routes', async ({ page }) => {
    // Try to access admin without auth
    await page.goto('/admin');
    
    // Should show login prompt or redirect
    const loginPrompt = page.getByText(/login|sign in|access required/i);
    await expect(loginPrompt).toBeVisible();
  });

  test('expired token clears auth and redirects', async ({ page }) => {
    // Create an expired JWT (exp in the past)
    const expiredToken = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const fakeJWT = `header.${expiredToken}.signature`;
    
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_expired',
        accessToken: token,
      }));
    }, fakeJWT);
    
    // Reload to trigger expiration check
    await page.goto('/admin');
    
    // Token should be cleared, user not authenticated
    const isCleared = await page.evaluate(() => {
      return localStorage.getItem('workos_admin_auth') === null;
    });
    expect(isCleared).toBe(true);
  });
});
```

---

## Test 3: Logout Flow (logout.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {

  test('admin logout clears storage and redirects', async ({ page }) => {
    // Setup: Inject admin auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_admin',
        accessToken: 'valid_token',
      }));
    });
    
    await page.goto('/admin');
    
    // Find and click sign out button
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    
    // Verify storage cleared
    const authCleared = await page.evaluate(() => {
      return localStorage.getItem('workos_admin_auth') === null;
    });
    expect(authCleared).toBe(true);
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('logout in one tab clears auth in another tab', async ({ browser }) => {
    // Open two tabs
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Setup auth in page1
    await page1.goto('/');
    await page1.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_multitab',
        accessToken: 'valid_token',
      }));
    });
    
    // Load admin in both tabs
    await page1.goto('/admin');
    await page2.goto('/admin');
    
    // Verify both are authenticated
    await expect(page1.getByText('Admin')).toBeVisible();
    await expect(page2.getByText('Admin')).toBeVisible();
    
    // Logout in page1
    await page1.getByRole('button', { name: /sign out/i }).click();
    
    // Wait for storage event to propagate
    await page2.waitForTimeout(500);
    
    // Check page2 sees logout (via storage event)
    // Note: May need page refresh if storage events not fully implemented
    await page2.reload();
    
    const page2Auth = await page2.evaluate(() => {
      return localStorage.getItem('workos_admin_auth');
    });
    expect(page2Auth).toBeNull();
    
    await context.close();
  });
});
```

---

## Test 4: Registration Flow (registration.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('New User Registration Flow', () => {

  test('role selection page shows two options', async ({ page }) => {
    // Simulate arriving from OAuth with no existing role
    await page.goto('/register/choose-role?accessToken=test&userId=new_user');
    
    // Should see role selection cards
    await expect(page.getByText(/employer|insurer/i)).toBeVisible();
    await expect(page.getByText(/medical provider|doctor/i)).toBeVisible();
  });

  test('selecting employer navigates to employer registration', async ({ page }) => {
    await page.goto('/register/choose-role?accessToken=test&userId=new_user&refreshToken=test');
    
    // Click employer option
    await page.getByRole('button', { name: /employer/i }).click();
    
    // Should navigate to employer registration form
    await expect(page).toHaveURL(/\/register\/employer/);
    
    // Form should have tokens in URL
    expect(page.url()).toContain('accessToken=');
    expect(page.url()).toContain('userId=');
  });

  test('selecting doctor navigates to doctor registration', async ({ page }) => {
    await page.goto('/register/choose-role?accessToken=test&userId=new_user&refreshToken=test');
    
    // Click doctor option
    await page.getByRole('button', { name: /doctor|provider/i }).click();
    
    await expect(page).toHaveURL(/\/register\/doctor/);
  });

  test('employer registration form validates required fields', async ({ page }) => {
    await page.goto('/register/employer?accessToken=test&userId=new_user&refreshToken=test');
    
    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /submit|register|continue/i });
    await submitBtn.click();
    
    // Should show validation errors
    await expect(page.getByText(/required|please fill/i)).toBeVisible();
  });
});
```

---

## Test 5: OAuth Callback (callback.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('OAuth Callback Handling', () => {

  test('callback with valid tokens stores in localStorage', async ({ page }) => {
    // Simulate WorkOS callback redirect with tokens
    await page.goto('/auth/callback?accessToken=valid_token&refreshToken=refresh_token&userId=user_123&redirectPath=/admin');
    
    // Wait for callback processing
    await page.waitForTimeout(1000);
    
    // Check localStorage was populated
    const storedAuth = await page.evaluate(() => {
      return localStorage.getItem('workos_admin_auth');
    });
    
    expect(storedAuth).not.toBeNull();
    const parsed = JSON.parse(storedAuth!);
    expect(parsed.accessToken).toBe('valid_token');
    expect(parsed.userId).toBe('user_123');
  });

  test('callback with error shows error message', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied');
    
    // Should show error UI
    await expect(page.getByText(/authentication failed|error/i)).toBeVisible();
    
    // Should have "Return Home" link
    await expect(page.getByRole('link', { name: /return home|try again/i })).toBeVisible();
  });

  test('callback with missing tokens shows error', async ({ page }) => {
    await page.goto('/auth/callback');  // No tokens
    
    await expect(page.getByText(/missing|error/i)).toBeVisible();
  });
});
```

---

## Auth Fixture: tests/e2e/fixtures/auth.fixture.ts

```typescript
import { test as base, Page } from '@playwright/test';

interface AuthFixtures {
  authenticatedAdminPage: Page;
  authenticatedEmployerPage: Page;
  authenticatedDoctorPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedAdminPage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'fixture_admin',
        accessToken: 'fixture_access_token',
        refreshToken: 'fixture_refresh_token',
      }));
    });
    await page.goto('/admin');
    await use(page);
  },

  authenticatedEmployerPage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_employer_auth', JSON.stringify({
        workosUserId: 'fixture_employer',
        accessToken: 'fixture_access_token',
        refreshToken: 'fixture_refresh_token',
      }));
    });
    await page.goto('/employer');
    await use(page);
  },

  authenticatedDoctorPage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_doctor_auth', JSON.stringify({
        workosUserId: 'fixture_doctor',
        accessToken: 'fixture_access_token',
        refreshToken: 'fixture_refresh_token',
      }));
    });
    await page.goto('/doctor');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:auth": "playwright test tests/e2e/auth/"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

---

## Acceptance Criteria

- [ ] All login flow tests pass (desktop + mobile)
- [ ] Role-based routing tests pass for all 3 roles
- [ ] Logout tests pass (single tab + multi-tab)
- [ ] Registration flow tests pass
- [ ] OAuth callback tests pass
- [ ] Tests run in CI (GitHub Actions)
- [ ] HTML report generated after test runs
- [ ] No flaky tests (3 retries all pass)

---

## CI Integration (.github/workflows/e2e.yml)

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

→ Next: WORKOS_AUTH_MIGRATION_SPRINT_06_CLEANUP
