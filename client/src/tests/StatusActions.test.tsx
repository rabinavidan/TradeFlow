import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusActions } from '../components/StatusActions';
import type { TradeRequest } from '../types/trade';
import type { User } from '../types/auth';

function makeTrade(overrides: Partial<TradeRequest> = {}): TradeRequest {
  return {
    id: 't1',
    title: 'Test trade',
    customerName: 'Acme',
    amount: 100,
    currency: 'USD',
    country: 'Germany',
    requestType: 'Other',
    description: '',
    status: 'Draft',
    createdBy: 'owner-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'owner-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('<StatusActions />', () => {
  it('lets the owner submit their own Draft', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'Draft' })}
        user={makeUser({ id: 'owner-1' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByRole('button', { name: /move to submitted/i })).toBeInTheDocument();
  });

  it('does not let a non-owner, non-privileged user submit a draft they do not own', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'Draft', createdBy: 'owner-1' })}
        user={makeUser({ id: 'someone-else', role: 'user' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing for the owner once the trade is Submitted (reviewer-only next step)', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'Submitted' })}
        user={makeUser({ id: 'owner-1', role: 'user' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets a reviewer move a Submitted trade to In Review', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'Submitted' })}
        user={makeUser({ id: 'reviewer-1', role: 'reviewer' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByRole('button', { name: /move to in review/i })).toBeInTheDocument();
  });

  it('offers both Approve and Reject to a reviewer for an In Review trade', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'In Review' })}
        user={makeUser({ id: 'reviewer-1', role: 'reviewer' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByRole('button', { name: /move to approved/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move to rejected/i })).toBeInTheDocument();
  });

  it('renders nothing once the trade is in a terminal status', () => {
    render(
      <StatusActions
        trade={makeTrade({ status: 'Approved' })}
        user={makeUser({ id: 'reviewer-1', role: 'reviewer' })}
        onChangeStatus={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onChangeStatus with the target status and comment when clicked', async () => {
    const onChangeStatus = vi.fn();
    const user = userEvent.setup();
    render(
      <StatusActions
        trade={makeTrade({ status: 'Draft' })}
        user={makeUser({ id: 'owner-1' })}
        onChangeStatus={onChangeStatus}
        isSubmitting={false}
      />,
    );

    await user.type(screen.getByLabelText(/comment/i), 'Ready to go');
    await user.click(screen.getByRole('button', { name: /move to submitted/i }));

    expect(onChangeStatus).toHaveBeenCalledWith('Submitted', 'Ready to go');
  });
});
