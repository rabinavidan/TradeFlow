import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  get statGrid() {
    return this.page.locator('.stat-grid');
  }

  get recentList() {
    return this.page.locator('.recent-list');
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Log out' }).click();
  }

  async goToTradeRequests() {
    await this.page.getByRole('link', { name: 'Trade Requests' }).click();
  }

  async goToNewRequest() {
    await this.page.getByRole('link', { name: 'New request' }).first().click();
  }
}
