import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTradesQuery } from '../hooks/useTrades';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { getApiErrorMessage } from '../api/client';
import { TRADE_REQUEST_TYPES, TRADE_STATUSES, type TradeRequestType, type TradeStatus } from '../types/trade';

const PAGE_SIZE = 10;

export function TradeList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TradeStatus | ''>('');
  const [requestType, setRequestType] = useState<TradeRequestType | ''>('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, error, isPlaceholderData } = useTradesQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status || undefined,
    requestType: requestType || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  function updateFilterAndResetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Trade Requests</h1>
        <Link to="/trades/new" className="btn">
          New request
        </Link>
      </div>

      <div className="trade-filters">
        <input
          type="search"
          aria-label="Search trade requests"
          placeholder="Search by title or customer…"
          value={search}
          onChange={(e) => updateFilterAndResetPage(setSearch)(e.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => updateFilterAndResetPage(setStatus)(e.target.value as TradeStatus | '')}
        >
          <option value="">All statuses</option>
          {TRADE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by request type"
          value={requestType}
          onChange={(e) =>
            updateFilterAndResetPage(setRequestType)(e.target.value as TradeRequestType | '')
          }
        >
          <option value="">All request types</option>
          {TRADE_REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p>Loading trade requests…</p>}

      {isError && (
        <p className="form-error" role="alert">
          {getApiErrorMessage(error, 'Could not load trade requests.')}
        </p>
      )}

      {data && data.data.length === 0 && (
        <p className="empty-state">No trade requests match your filters yet.</p>
      )}

      {data && data.data.length > 0 && (
        <div className="trade-table-wrapper" style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
          <table className="trade-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((trade) => (
                <tr key={trade.id}>
                  <td>
                    <Link to={`/trades/${trade.id}`}>{trade.title}</Link>
                  </td>
                  <td>{trade.customerName}</td>
                  <td>
                    {trade.amount.toLocaleString(undefined, {
                      style: 'currency',
                      currency: trade.currency,
                    })}
                  </td>
                  <td>{trade.requestType}</td>
                  <td>
                    <StatusBadge status={trade.status} />
                  </td>
                  <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}
