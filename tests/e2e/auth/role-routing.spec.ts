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
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
        refreshToken: 'test_refresh_token',
      }));
    });

    // Navigate to admin portal
    await page.goto('/admin');

    // Should show admin content (not redirect to login)
    await expect(page).toHaveURL(/\/admin/);
  });

  test('employer token routes to /employer', async ({ page }) => {
    await page.goto('/');

    // Inject employer auth token
    await page.evaluate(() => {
      localStorage.setItem('workos_employer_auth', JSON.stringify({
        workosUserId: 'user_test_employer',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
        refreshToken: 'test_refresh_token',
      }));
    });

    await page.goto('/employer');

    // Should show employer portal
    await expect(page).toHaveURL(/\/employer/);
  });

  test('doctor token routes to /doctor', async ({ page }) => {
    await page.goto('/');

    // Inject doctor auth token
    await page.evaluate(() => {
      localStorage.setItem('workos_doctor_auth', JSON.stringify({
        workosUserId: 'user_test_doctor',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
        refreshToken: 'test_refresh_token',
      }));
    });

    await page.goto('/doctor');

    await expect(page).toHaveURL(/\/doctor/);
  });

  test('expired token clears auth and shows login', async ({ page }) => {
    // Create an expired JWT (exp in the past)
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const fakeJWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${expiredPayload}.signature`;

    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_expired',
        accessToken: token,
      }));
    }, fakeJWT);

    // Reload to trigger expiration check
    await page.goto('/admin');

    // Token should be cleared
    const isCleared = await page.evaluate(() => {
      return localStorage.getItem('workos_admin_auth') === null;
    });
    expect(isCleared).toBe(true);
  });
});
