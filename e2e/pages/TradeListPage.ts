import type { Page } from '@playwright/test';

export class TradeListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/trades');
  }

  get searchInput() {
    return this.page.getByLabel('Search trade requests');
  }

  get statusFilter() {
    return this.page.getByLabel('Filter by status');
  }

  get requestTypeFilter() {
    return this.page.getByLabel('Filter by request type');
  }

  get rows() {
    return this.page.locator('table.trade-table tbody tr');
  }

  get emptyState() {
    return this.page.getByText('No trade requests match your filters yet.');
  }

  rowByTitle(title: string) {
    return this.page.getByRole('link', { name: title, exact: true });
  }

  async openTrade(title: string) {
    await this.rowByTitle(title).click();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
  }
}
