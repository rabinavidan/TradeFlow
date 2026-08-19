import { expect, test } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { TradeFormPage } from '../pages/TradeFormPage';
import { TradeDetailsPage } from '../pages/TradeDetailsPage';
import { uniqueEmail } from '../utils/testUser';
import { promoteUserRole } from '../utils/db';

test.describe('Permissions', () => {
  test('a reviewer can move a submitted request through review to a decision', async ({ page }) => {
    const ownerEmail = uniqueEmail('e2e-perm-owner');
    const reviewerEmail = uniqueEmail('e2e-perm-reviewer');
    const password = 'supersecret123';

    // Owner: register, create a trade, submit it. One browser session is
    // reused throughout the test — switching identity via logout/login,
    // not a second concurrent context — since only one user is ever
    // "driving" at a time in this scenario.
    await new RegisterPage(page).goto();
    await new RegisterPage(page).register('Owner User', ownerEmail, password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await new TradeFormPage(page).createTrade({
      title: 'Reviewer workflow trade',
      customerName: 'Workflow Corp',
      amount: '7500',
      currency: 'usd',
      country: 'Spain',
      requestType: 'Guarantee',
    });
    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/);
    const tradeUrl = page.url();

    const details = new TradeDetailsPage(page);
    await details.changeStatus('Submitted');
    await expect(details.statusBadge).toHaveText('Submitted');

    // The owner cannot move it further themselves (reviewer-only step)
    await expect(page.getByRole('button', { name: /^Move to/ })).toHaveCount(0);

    // Switch identity: log out as owner, register+promote a reviewer, log in as them
    await page.getByRole('button', { name: 'Log out' }).click();
    await new RegisterPage(page).goto();
    await new RegisterPage(page).register('Reviewer User', reviewerEmail, password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await promoteUserRole(reviewerEmail, 'reviewer');
    await page.getByRole('button', { name: 'Log out' }).click();
    await new LoginPage(page).login(reviewerEmail, password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(tradeUrl, { waitUntil: 'networkidle' });
    await details.changeStatus('In Review', 'Picking this up');
    await expect(details.statusBadge).toHaveText('In Review');

    await details.changeStatus('Approved', 'Looks good');
    await expect(details.statusBadge).toHaveText('Approved');

    // Terminal status: no further actions offered
    await expect(page.getByRole('button', { name: /^Move to/ })).toHaveCount(0);

    // History reflects all three transitions with the reviewer's name
    const historyText = await details.historySection.textContent();
    expect(historyText).toContain('Draft → Submitted');
    expect(historyText).toContain('Submitted → In Review');
    expect(historyText).toContain('In Review → Approved');
    expect(historyText).toContain('Reviewer User');
  });

  test('a stranger cannot view or act on another user’s trade request', async ({ page }) => {
    const password = 'supersecret123';

    await new RegisterPage(page).goto();
    await new RegisterPage(page).register('Private Owner', uniqueEmail('e2e-perm-private'), password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await new TradeFormPage(page).createTrade({
      title: 'Private trade request',
      customerName: 'Private Corp',
      amount: '1200',
      currency: 'usd',
      country: 'Portugal',
      requestType: 'Other',
    });
    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/);
    const tradeUrl = page.url();

    // Switch identity: log out as the owner, register a second, unrelated user
    await page.getByRole('button', { name: 'Log out' }).click();
    await new RegisterPage(page).goto();
    await new RegisterPage(page).register('Stranger User', uniqueEmail('e2e-perm-stranger'), password);
    await expect(page).toHaveURL(/\/dashboard$/);

    // Direct navigation to someone else's trade is blocked, not silently empty
    await page.goto(tradeUrl, { waitUntil: 'networkidle' });
    const details = new TradeDetailsPage(page);
    await expect(details.errorBanner).toBeVisible();
    await expect(details.errorBanner).toHaveText(/permission/i);

    // No edit/delete/status actions are ever rendered for a request you can't even view
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });
});
