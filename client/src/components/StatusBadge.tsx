import type { TradeStatus } from '../types/trade';

const STATUS_CLASS: Record<TradeStatus, string> = {
  Draft: 'status-badge status-draft',
  Submitted: 'status-badge status-submitted',
  'In Review': 'status-badge status-in-review',
  Approved: 'status-badge status-approved',
  Rejected: 'status-badge status-rejected',
};

export function StatusBadge({ status }: { status: TradeStatus }) {
  return <span className={STATUS_CLASS[status]}>{status}</span>;
}
