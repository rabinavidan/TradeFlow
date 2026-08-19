import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Dashboard } from '../pages/Dashboard';
import { renderWithProviders } from './testUtils';
import * as analyticsApi from '../api/analytics.api';
import * as authApi from '../api/auth.api';
import { TOKEN_STORAGE_KEY } from '../api/client';

vi.mock('../api/analytics.api');
vi.mock('../api/auth.api');
const mockedAnalyticsApi = vi.mocked(analyticsApi);
const mockedAuthApi = vi.mocked(authApi);

describe('<Dashboard />', () => {
  it('renders totals, per-status counts, and recent requests', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'fake-token');
    mockedAuthApi.fetchCurrentUser.mockResolvedValueOnce({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
    });
    mockedAnalyticsApi.fetchAnalyticsSummary.mockResolvedValueOnce({
      totalRequests: 3,
      countByStatus: { Draft: 1, Submitted: 1, 'In Review': 0, Approved: 1, Rejected: 0 },
      recentRequests: [
        {
          id: 't1',
          title: 'Import shipment financing',
          customerName: 'Acme Corp',
          status: 'Draft',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('Import shipment financing')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows an empty state when there are no requests yet', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'fake-token');
    mockedAuthApi.fetchCurrentUser.mockResolvedValueOnce({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
    });
    mockedAnalyticsApi.fetchAnalyticsSummary.mockResolvedValueOnce({
      totalRequests: 0,
      countByStatus: { Draft: 0, Submitted: 0, 'In Review': 0, Approved: 0, Rejected: 0 },
      recentRequests: [],
    });

    renderWithProviders(<Dashboard />, { route: '/dashboard' });

    expect(await screen.findByText(/no trade requests yet/i)).toBeInTheDocument();
  });
});
