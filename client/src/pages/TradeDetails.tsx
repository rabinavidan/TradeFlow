import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useChangeStatusMutation,
  useDeleteTradeMutation,
  useTradeHistoryQuery,
  useTradeQuery,
} from '../hooks/useTrades';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { StatusActions } from '../components/StatusActions';
import { StatusHistoryList } from '../components/StatusHistoryList';
import { getApiErrorMessage } from '../api/client';
import type { TradeStatus } from '../types/trade';

const EDITABLE_STATUSES = new Set(['Draft', 'Rejected']);

export function TradeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: trade, isLoading, isError, error } = useTradeQuery(id);
  const { data: history } = useTradeHistoryQuery(id);
  const deleteTrade = useDeleteTradeMutation();
  const changeStatus = useChangeStatusMutation(id as string);
  const [apiError, setApiError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="page-status">
        <p>Loading…</p>
      </main>
    );
  }

  if (isError || !trade) {
    return (
      <main className="page-status">
        <p className="form-error" role="alert">
          {getApiErrorMessage(error, 'Trade request not found.')}
        </p>
      </main>
    );
  }

  const isOwner = trade.createdBy === user?.id;
  const isPrivileged = user?.role === 'reviewer' || user?.role === 'admin';
  const canEdit = (isOwner || isPrivileged) && EDITABLE_STATUSES.has(trade.status);

  const handleDelete = async () => {
    if (!window.confirm('Delete this trade request? This cannot be undone.')) return;
    setApiError(null);
    try {
      await deleteTrade.mutateAsync(trade.id);
      navigate('/trades', { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not delete the trade request.'));
    }
  };

  const handleChangeStatus = async (status: TradeStatus, comment: string) => {
    setApiError(null);
    try {
      await changeStatus.mutateAsync({ status, comment });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not update the status.'));
    }
  };

  return (
    <main className="page">
      <div className="page-header">
        <h1>{trade.title}</h1>
        <StatusBadge status={trade.status} />
      </div>

      {apiError && (
        <p className="form-error" role="alert">
          {apiError}
        </p>
      )}

      <dl className="detail-list">
        <dt>Customer</dt>
        <dd>{trade.customerName}</dd>
        <dt>Amount</dt>
        <dd>
          {trade.amount.toLocaleString(undefined, { style: 'currency', currency: trade.currency })}
        </dd>
        <dt>Country</dt>
        <dd>{trade.country}</dd>
        <dt>Request type</dt>
        <dd>{trade.requestType}</dd>
        <dt>Description</dt>
        <dd>{trade.description || <em>No description provided.</em>}</dd>
        <dt>Created</dt>
        <dd>{new Date(trade.createdAt).toLocaleString()}</dd>
        <dt>Last updated</dt>
        <dd>{new Date(trade.updatedAt).toLocaleString()}</dd>
      </dl>

      {user && (
        <StatusActions
          trade={trade}
          user={user}
          onChangeStatus={handleChangeStatus}
          isSubmitting={changeStatus.isPending}
        />
      )}

      <div className="detail-actions">
        <Link to="/trades" className="btn-secondary">
          Back to list
        </Link>
        {canEdit && (
          <>
            <Link to={`/trades/${trade.id}/edit`} className="btn">
              Edit
            </Link>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </>
        )}
      </div>

      <section className="history-section">
        <h2>Status history</h2>
        <StatusHistoryList history={history ?? []} />
      </section>
    </main>
  );
}
