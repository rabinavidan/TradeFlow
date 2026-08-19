import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TradeForm } from '../components/TradeForm';
import { useTradeQuery, useUpdateTradeMutation } from '../hooks/useTrades';
import { getApiErrorMessage } from '../api/client';
import type { TradeFormValues } from '../schemas/trade.schema';

export function EditTrade() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: trade, isLoading, isError, error } = useTradeQuery(id);
  const updateTrade = useUpdateTradeMutation(id as string);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (values: TradeFormValues) => {
    setApiError(null);
    try {
      await updateTrade.mutateAsync(values);
      navigate(`/trades/${id}`, { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not save changes.'));
    }
  };

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

  return (
    <main className="page">
      <h1>Edit trade request</h1>
      <TradeForm
        defaultValues={trade}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        apiError={apiError}
      />
    </main>
  );
}
