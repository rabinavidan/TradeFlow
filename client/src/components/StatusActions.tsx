import { useState } from 'react';
import type { TradeRequest, TradeStatus } from '../types/trade';
import type { User } from '../types/auth';

// Mirrors server/src/services/workflow.service.ts's TRANSITIONS table.
// This only decides what to *show* — the backend re-checks and enforces
// every rule independently, since a client-side check is never security.
const TRANSITIONS: Record<TradeStatus, { to: TradeStatus; allowedRoles: Array<'owner' | 'reviewer' | 'admin'> }[]> = {
  Draft: [{ to: 'Submitted', allowedRoles: ['owner', 'admin'] }],
  Submitted: [{ to: 'In Review', allowedRoles: ['reviewer', 'admin'] }],
  'In Review': [
    { to: 'Approved', allowedRoles: ['reviewer', 'admin'] },
    { to: 'Rejected', allowedRoles: ['reviewer', 'admin'] },
  ],
  Approved: [],
  Rejected: [],
};

function availableActions(trade: TradeRequest, user: User): TradeStatus[] {
  const isOwner = trade.createdBy === user.id;
  return (TRANSITIONS[trade.status] ?? [])
    .filter((rule) => rule.allowedRoles.some((role) => (role === 'owner' ? isOwner : role === user.role)))
    .map((rule) => rule.to);
}

interface StatusActionsProps {
  trade: TradeRequest;
  user: User;
  onChangeStatus: (status: TradeStatus, comment: string) => Promise<void> | void;
  isSubmitting: boolean;
}

export function StatusActions({ trade, user, onChangeStatus, isSubmitting }: StatusActionsProps) {
  const [comment, setComment] = useState('');
  const actions = availableActions(trade, user);

  if (actions.length === 0) return null;

  return (
    <div className="status-actions">
      <label htmlFor="status-comment">Comment (optional)</label>
      <textarea
        id="status-comment"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note for the audit history…"
      />
      <div className="status-actions-buttons">
        {actions.map((status) => (
          <button
            key={status}
            type="button"
            className={status === 'Rejected' ? 'btn-danger' : 'btn'}
            disabled={isSubmitting}
            onClick={() => onChangeStatus(status, comment)}
          >
            Move to {status}
          </button>
        ))}
      </div>
    </div>
  );
}
