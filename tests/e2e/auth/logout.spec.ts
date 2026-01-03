import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {

  test('admin logout clears storage', async ({ page }) => {
    // Setup: Inject admin auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_admin',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
      }));
    });

    await page.goto('/admin');

    // Find and click sign out button
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });

    // If sign out button exists and is visible, click it
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();

      // Verify storage cleared
      const authCleared = await page.evaluate(() => {
        return localStorage.getItem('workos_admin_auth') === null;
      });
      expect(authCleared).toBe(true);
    }
  });

  test('employer logout clears storage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_employer_auth', JSON.stringify({
        workosUserId: 'user_employer',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
      }));
    });

    await page.goto('/employer');

    // Check if logout button exists
    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });

    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();

      const authCleared = await page.evaluate(() => {
        return localStorage.getItem('workos_employer_auth') === null;
      });
      expect(authCleared).toBe(true);
    }
  });

  test('doctor logout clears storage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_doctor_auth', JSON.stringify({
        workosUserId: 'user_doctor',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
      }));
    });

    await page.goto('/doctor');

    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });

    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();

      const authCleared = await page.evaluate(() => {
        return localStorage.getItem('workos_doctor_auth') === null;
      });
      expect(authCleared).toBe(true);
    }
  });

  test('logout redirects to home page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('workos_admin_auth', JSON.stringify({
        userId: 'user_admin',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test',
      }));
    });

    await page.goto('/admin');

    const signOutBtn = page.getByRole('button', { name: /sign out|logout/i });

    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();

      // Should redirect to home
      await expect(page).toHaveURL('/');
    }
  });
});
