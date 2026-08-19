import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TradeForm } from '../components/TradeForm';
import { useCreateTradeMutation } from '../hooks/useTrades';
import { getApiErrorMessage } from '../api/client';
import type { TradeFormValues } from '../schemas/trade.schema';

export function CreateTrade() {
  const navigate = useNavigate();
  const createTrade = useCreateTradeMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (values: TradeFormValues) => {
    setApiError(null);
    try {
      const trade = await createTrade.mutateAsync(values);
      navigate(`/trades/${trade.id}`, { replace: true });
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create the trade request.'));
    }
  };

  return (
    <main className="page">
      <h1>New trade request</h1>
      <TradeForm onSubmit={handleSubmit} submitLabel="Create request" apiError={apiError} />
    </main>
  );
}
