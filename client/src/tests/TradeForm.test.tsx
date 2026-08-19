import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeForm } from '../components/TradeForm';
import { renderWithProviders } from './testUtils';
import * as aiApi from '../api/ai.api';

vi.mock('../api/ai.api');
const mockedAiApi = vi.mocked(aiApi);

describe('<TradeForm />', () => {
  it('shows validation errors and does not call onSubmit for an empty form', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TradeForm onSubmit={onSubmit} submitLabel="Create request" />);

    await user.click(screen.getByRole('button', { name: /create request/i }));

    expect(await screen.findByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes and submits valid input', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TradeForm onSubmit={onSubmit} submitLabel="Create request" />);

    await user.type(screen.getByLabelText(/title/i), 'Import shipment financing');
    await user.type(screen.getByLabelText(/customer name/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/amount/i), '25000');
    await user.type(screen.getByLabelText(/currency/i), 'usd');
    await user.type(screen.getByLabelText(/country/i), 'Germany');
    await user.click(screen.getByRole('button', { name: /create request/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    // handleSubmit(onSubmit) also passes the SyntheticEvent as a second
    // argument, so we assert on the first call's first argument directly
    // rather than toHaveBeenCalledWith (which checks the full arg list).
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Import shipment financing',
        customerName: 'Acme Corp',
        amount: 25000,
        currency: 'USD',
        country: 'Germany',
        requestType: 'Letter of Credit',
      }),
    );
  });

  it('fills the description field when AI generation succeeds', async () => {
    mockedAiApi.generateTradeDescription.mockResolvedValue('An AI-drafted description.');
    const user = userEvent.setup();
    renderWithProviders(<TradeForm onSubmit={vi.fn()} submitLabel="Create request" />);

    await user.type(screen.getByLabelText(/title/i), 'Import shipment financing');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    expect(await screen.findByDisplayValue('An AI-drafted description.')).toBeInTheDocument();
    expect(mockedAiApi.generateTradeDescription).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Import shipment financing' }),
    );
  });

  it('shows an inline notice instead of crashing when AI generation is unavailable', async () => {
    mockedAiApi.generateTradeDescription.mockRejectedValue(new Error('AI unavailable'));
    const user = userEvent.setup();
    renderWithProviders(<TradeForm onSubmit={vi.fn()} submitLabel="Create request" />);

    await user.type(screen.getByLabelText(/title/i), 'Import shipment financing');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/unavailable/i);
  });
});
