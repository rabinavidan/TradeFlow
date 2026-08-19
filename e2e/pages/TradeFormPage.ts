import type { Page } from '@playwright/test';

export interface TradeFormInput {
  title: string;
  customerName: string;
  amount: string;
  currency: string;
  country: string;
  requestType: string;
  description?: string;
}

export class TradeFormPage {
  constructor(private readonly page: Page) {}

  async gotoNew() {
    await this.page.goto('/trades/new');
  }

  async fill(input: TradeFormInput) {
    await this.page.getByLabel('Title').fill(input.title);
    await this.page.getByLabel('Customer name').fill(input.customerName);
    await this.page.getByLabel('Amount').fill(input.amount);
    await this.page.getByLabel('Currency').fill(input.currency);
    await this.page.getByLabel('Country').fill(input.country);
    await this.page.getByLabel('Request type').selectOption(input.requestType);
    if (input.description) {
      await this.page.getByLabel('Description').fill(input.description);
    }
  }

  async submit() {
    await this.page.locator('button[type="submit"]').click();
  }

  async createTrade(input: TradeFormInput) {
    await this.gotoNew();
    await this.fill(input);
    await this.submit();
  }
}
