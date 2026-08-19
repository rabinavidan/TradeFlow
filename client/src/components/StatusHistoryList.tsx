import type { StatusHistoryEntry } from '../types/trade';

export function StatusHistoryList({ history }: { history: StatusHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="empty-state">No status changes yet.</p>;
  }

  return (
    <ol className="history-list">
      {history.map((entry) => {
        const changedBy = typeof entry.changedBy === 'string' ? null : entry.changedBy;
        return (
          <li key={entry.id} className="history-item">
            <div className="history-item-header">
              <strong>
                {entry.previousStatus} → {entry.newStatus}
              </strong>
              <time dateTime={entry.changedAt}>{new Date(entry.changedAt).toLocaleString()}</time>
            </div>
            {changedBy && (
              <p className="history-item-meta">
                by {changedBy.name} ({changedBy.role})
              </p>
            )}
            {entry.comment && <p className="history-item-comment">{entry.comment}</p>}
          </li>
        );
      })}
    </ol>
  );
}
