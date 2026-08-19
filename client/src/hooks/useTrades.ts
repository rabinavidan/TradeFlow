import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTradeRequest,
  deleteTradeRequest,
  fetchTrade,
  fetchTrades,
  updateTradeRequest,
} from '../api/trade.api';
import type { TradeFormValues } from '../schemas/trade.schema';
import type { TradeListParams } from '../types/trade';

export function useTradesQuery(params: TradeListParams) {
  return useQuery({
    queryKey: ['trades', 'list', params],
    queryFn: () => fetchTrades(params),
    placeholderData: (previous) => previous, // keep the old page visible while the next loads
  });
}

export function useTradeQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['trades', 'detail', id],
    queryFn: () => fetchTrade(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateTradeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TradeFormValues) => createTradeRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'list'] });
    },
  });
}

export function useUpdateTradeMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<TradeFormValues>) => updateTradeRequest(id, payload),
    onSuccess: (trade) => {
      queryClient.setQueryData(['trades', 'detail', id], trade);
      queryClient.invalidateQueries({ queryKey: ['trades', 'list'] });
    },
  });
}

export function useDeleteTradeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTradeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'list'] });
    },
  });
}
