import { expect, test } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { TradeFormPage } from '../pages/TradeFormPage';
import { TradeListPage } from '../pages/TradeListPage';
import { TradeDetailsPage } from '../pages/TradeDetailsPage';
import { uniqueEmail } from '../utils/testUser';

test.describe('Trade request CRUD', () => {
  // Each test registers its own user so trades don't leak across tests
  // sharing the same E2E database.
  test.beforeEach(async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register('E2E Trade User', uniqueEmail('e2e-trades'), 'supersecret123');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('creates a trade request and views its details', async ({ page }) => {
    const formPage = new TradeFormPage(page);
    const detailsPage = new TradeDetailsPage(page);

    await formPage.createTrade({
      title: 'Import shipment financing',
      customerName: 'Acme Corp',
      amount: '25000',
      currency: 'usd',
      country: 'Germany',
      requestType: 'Letter of Credit',
      description: 'Quarterly import financing request.',
    });

    // Assert: navigated to the new trade's details page with correct data
    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/);
    await expect(page.getByRole('heading', { name: 'Import shipment financing' })).toBeVisible();
    await expect(detailsPage.statusBadge).toHaveText('Draft');
    await expect(page.getByText('Acme Corp')).toBeVisible();
  });

  test('edits an existing trade request', async ({ page }) => {
    const formPage = new TradeFormPage(page);

    await formPage.createTrade({
      title: 'Original title',
      customerName: 'Beta Ltd',
      amount: '1000',
      currency: 'eur',
      country: 'France',
      requestType: 'Guarantee',
    });
    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/);

    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+\/edit$/);

    await page.getByLabel('Title').fill('Updated title');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/);
    await expect(page.getByRole('heading', { name: 'Updated title' })).toBeVisible();
  });

  test('searches and filters the trade list', async ({ page }) => {
    const formPage = new TradeFormPage(page);
    const listPage = new TradeListPage(page);

    await formPage.createTrade({
      title: 'Findable shipment deal',
      customerName: 'Search Corp',
      amount: '500',
      currency: 'usd',
      country: 'Italy',
      requestType: 'Collection',
    });
    await listPage.goto();
    await expect(listPage.rows).toHaveCount(1);

    // Search narrows the list; a non-matching term shows the empty state
    await listPage.search('Search Corp');
    await expect(listPage.rows).toHaveCount(1);

    await listPage.search('no-such-customer-xyz');
    await expect(listPage.emptyState).toBeVisible();

    await listPage.search('');
    await expect(listPage.rows).toHaveCount(1);

    // Status filter: this fresh trade is Draft, so filtering to Approved hides it
    await listPage.filterByStatus('Approved');
    await expect(listPage.emptyState).toBeVisible();

    await listPage.filterByStatus('Draft');
    await expect(listPage.rows).toHaveCount(1);
  });
});
