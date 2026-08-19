import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { uniqueEmail } from '../utils/testUser';

test.describe('Authentication', () => {
  test('a new user can register, land on the dashboard, log out, and log back in', async ({ page }) => {
    const email = uniqueEmail('e2e-auth');
    const password = 'supersecret123';

    const registerPage = new RegisterPage(page);
    const dashboardPage = new DashboardPage(page);
    const loginPage = new LoginPage(page);

    // Arrange + Act: register a brand-new account
    await registerPage.goto();
    await registerPage.register('E2E Auth User', email, password);

    // Assert: redirected straight into the authenticated app
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.heading).toBeVisible();

    // Act: log out
    await dashboardPage.logout();

    // Assert: back at the login page, and the dashboard is no longer reachable
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);

    // Act: log back in with the same credentials
    await loginPage.login(email, password);

    // Assert: authenticated again
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('shows a generic error for invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('nobody@example.com', 'wrongpassword123');

    await expect(loginPage.errorBanner).toBeVisible();
    await expect(loginPage.errorBanner).toHaveText(/invalid email or password/i);
    // still on the login page — no accidental navigation
    await expect(page).toHaveURL(/\/login$/);
  });

  test('unauthenticated users are redirected away from a protected page', async ({ page }) => {
    await page.goto('/trades');
    await expect(page).toHaveURL(/\/login$/);
  });
});
