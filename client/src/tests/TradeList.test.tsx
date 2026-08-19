import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeList } from '../pages/TradeList';
import { renderWithProviders } from './testUtils';
import * as tradeApi from '../api/trade.api';
import type { PaginatedResult, TradeRequest } from '../types/trade';

vi.mock('../api/trade.api');
const mockedTradeApi = vi.mocked(tradeApi);

function makeTrade(overrides: Partial<TradeRequest> = {}): TradeRequest {
  return {
    id: '1',
    title: 'Import shipment financing',
    customerName: 'Acme Corp',
    amount: 25000,
    currency: 'USD',
    country: 'Germany',
    requestType: 'Letter of Credit',
    description: '',
    status: 'Draft',
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('<TradeList />', () => {
  it('shows a loading state, then the empty state when there is no data', async () => {
    mockedTradeApi.fetchTrades.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithProviders(<TradeList />, { route: '/trades' });

    expect(screen.getByText(/loading trade requests/i)).toBeInTheDocument();
    expect(await screen.findByText(/no trade requests match your filters/i)).toBeInTheDocument();
  });

  it('renders trade rows once data loads', async () => {
    const result: PaginatedResult<TradeRequest> = {
      data: [makeTrade()],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    mockedTradeApi.fetchTrades.mockResolvedValueOnce(result);

    renderWithProviders(<TradeList />, { route: '/trades' });

    expect(await screen.findByText('Import shipment financing')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Draft')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    mockedTradeApi.fetchTrades.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } } },
    });

    renderWithProviders(<TradeList />, { route: '/trades' });

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('re-queries with the search term after the debounce delay', async () => {
    mockedTradeApi.fetchTrades.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    const user = userEvent.setup();
    renderWithProviders(<TradeList />, { route: '/trades' });
    await screen.findByText(/no trade requests match your filters/i);
    mockedTradeApi.fetchTrades.mockClear();

    await user.type(screen.getByLabelText(/search trade requests/i), 'Acme');

    await waitFor(
      () => {
        expect(mockedTradeApi.fetchTrades).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Acme', page: 1 }),
        );
      },
      { timeout: 1000 },
    );
  });
});
