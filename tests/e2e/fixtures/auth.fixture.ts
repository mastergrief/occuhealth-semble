import { test as base, Page } from '@playwright/test';

// Valid future-dated JWT for testing
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.test';

interface AuthFixtures {
  authenticatedAdminPage: Page;
  authenticatedEmployerPage: Page;
  authenticatedDoctorPage: Page;
}

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
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('workos_employer_auth', JSON.stringify({
        workosUserId: 'fixture_employer',
        accessToken: token,
        refreshToken: 'fixture_refresh_token',
      }));
    }, TEST_TOKEN);
    await page.goto('/employer');
    await use(page);
  },

  authenticatedDoctorPage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('workos_doctor_auth', JSON.stringify({
        workosUserId: 'fixture_doctor',
        accessToken: token,
        refreshToken: 'fixture_refresh_token',
      }));
    }, TEST_TOKEN);
    await page.goto('/doctor');
    await use(page);
  },
});

export { expect } from '@playwright/test';
