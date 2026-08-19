import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeForm } from '../components/TradeForm';

describe('<TradeForm />', () => {
  it('shows validation errors and does not call onSubmit for an empty form', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TradeForm onSubmit={onSubmit} submitLabel="Create request" />);

    await user.click(screen.getByRole('button', { name: /create request/i }));

    expect(await screen.findByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes and submits valid input', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TradeForm onSubmit={onSubmit} submitLabel="Create request" />);

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
});
