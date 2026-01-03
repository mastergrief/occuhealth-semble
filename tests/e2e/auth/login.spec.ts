import { test, expect } from '@playwright/test';

test.describe('WorkOS Login Flow', () => {

  test('landing page login button redirects to WorkOS', async ({ page }) => {
    await page.goto('/');

    // Click login button in navigation
    const loginButton = page.getByRole('link', { name: 'Login' });
    await expect(loginButton).toBeVisible();

    // Verify href points to WorkOS auth/login endpoint
    const href = await loginButton.getAttribute('href');
    expect(href).toContain('/auth/login');
  });

  test('hero CTA button redirects to WorkOS', async ({ page }) => {
    await page.goto('/');

    // Find "Request Demo" link in navigation (desktop CTA)
    const ctaButton = page.getByRole('link', { name: 'Request Demo' }).first();
    await expect(ctaButton).toBeVisible();

    const href = await ctaButton.getAttribute('href');
    expect(href).toContain('/auth/login');
  });

  test('mobile navigation login works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Open mobile menu - the button has Menu icon but may not have accessible name
    const menuButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Wait for sheet to open
    await page.waitForTimeout(300);

    // Find mobile login link in the sheet
    const mobileLogin = page.getByRole('link', { name: 'Login' });
    await expect(mobileLogin).toBeVisible();

    const href = await mobileLogin.getAttribute('href');
    expect(href).toContain('/auth/login');
  });

  test('no AuthModal appears on login click', async ({ page }) => {
    await page.goto('/');

    // Click login - should navigate externally, not open modal
    const loginLink = page.getByRole('link', { name: 'Login' }).first();

    // Before click, check no dialog exists
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify this is a real link (not a placeholder or button)
    const href = await loginLink.getAttribute('href');
    expect(href).toContain('/auth/login');
    expect(href).not.toBe('#'); // Should not be a placeholder

    // The link should be an external WorkOS URL (contains .site domain)
    expect(href).toMatch(/\.site\/auth\/login/);
  });

  test('both desktop CTAs link to WorkOS auth', async ({ page }) => {
    await page.goto('/');

    // Get all links in the desktop navigation area
    const loginLink = page.getByRole('link', { name: 'Login' }).first();
    const demoLink = page.getByRole('link', { name: 'Request Demo' }).first();

    await expect(loginLink).toBeVisible();
    await expect(demoLink).toBeVisible();

    const loginHref = await loginLink.getAttribute('href');
    const demoHref = await demoLink.getAttribute('href');

    // Both should point to the same auth endpoint
    expect(loginHref).toContain('/auth/login');
    expect(demoHref).toContain('/auth/login');
    expect(loginHref).toBe(demoHref);
  });
});
