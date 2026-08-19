import type { Page } from '@playwright/test';

export class TradeDetailsPage {
  constructor(private readonly page: Page) {}

  get statusBadge() {
    return this.page.locator('.status-badge');
  }

  get editLink() {
    return this.page.getByRole('link', { name: 'Edit' });
  }

  get deleteButton() {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  get historySection() {
    return this.page.locator('.history-section');
  }

  get errorBanner() {
    return this.page.locator('.form-error');
  }

  statusActionButton(status: string) {
    return this.page.getByRole('button', { name: `Move to ${status}` });
  }

  async fillComment(comment: string) {
    await this.page.getByLabel('Comment (optional)').fill(comment);
  }

  async changeStatus(status: string, comment?: string) {
    if (comment) {
      await this.fillComment(comment);
    }
    await this.statusActionButton(status).click();
  }

  async delete() {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.deleteButton.click();
  }
}
