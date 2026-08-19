import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAnalyticsSummaryQuery } from '../hooks/useAnalytics';
import { StatusBadge } from '../components/StatusBadge';
import { getApiErrorMessage } from '../api/client';
import { TRADE_STATUSES } from '../types/trade';

export function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useAnalyticsSummaryQuery();

  return (
    <main className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/trades/new" className="btn">
          New request
        </Link>
      </div>

      <p className="dashboard-greeting">
        Welcome back, <strong>{user?.name}</strong>.
      </p>

      {isLoading && <p>Loading dashboard…</p>}

      {isError && (
        <p className="form-error" role="alert">
          {getApiErrorMessage(error, 'Could not load dashboard data.')}
        </p>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card stat-card-total">
              <span className="stat-value">{data.totalRequests}</span>
              <span className="stat-label">Total requests</span>
            </div>
            {TRADE_STATUSES.map((status) => (
              <div key={status} className="stat-card">
                <span className="stat-value">{data.countByStatus[status]}</span>
                <span className="stat-label">{status}</span>
              </div>
            ))}
          </div>

          <h2>Recent requests</h2>
          {data.recentRequests.length === 0 ? (
            <p className="empty-state">No trade requests yet — create your first one.</p>
          ) : (
            <ul className="recent-list">
              {data.recentRequests.map((trade) => (
                <li key={trade.id} className="recent-item">
                  <Link to={`/trades/${trade.id}`}>{trade.title}</Link>
                  <span className="recent-item-meta">{trade.customerName}</span>
                  <StatusBadge status={trade.status} />
                  <time dateTime={trade.createdAt}>{new Date(trade.createdAt).toLocaleDateString()}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
