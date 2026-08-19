import { apiClient } from './client';
import type { PaginatedResult, StatusHistoryEntry, TradeListParams, TradeRequest, TradeStatus } from '../types/trade';
import type { TradeFormValues } from '../schemas/trade.schema';

export async function fetchTrades(params: TradeListParams): Promise<PaginatedResult<TradeRequest>> {
  const res = await apiClient.get<PaginatedResult<TradeRequest>>('/trades', { params });
  return res.data;
}

export async function fetchTrade(id: string): Promise<TradeRequest> {
  const res = await apiClient.get<{ trade: TradeRequest }>(`/trades/${id}`);
  return res.data.trade;
}

export async function createTradeRequest(payload: TradeFormValues): Promise<TradeRequest> {
  const res = await apiClient.post<{ trade: TradeRequest }>('/trades', payload);
  return res.data.trade;
}

export async function updateTradeRequest(
  id: string,
  payload: Partial<TradeFormValues>,
): Promise<TradeRequest> {
  const res = await apiClient.put<{ trade: TradeRequest }>(`/trades/${id}`, payload);
  return res.data.trade;
}

export async function deleteTradeRequest(id: string): Promise<void> {
  await apiClient.delete(`/trades/${id}`);
}

export async function changeTradeStatus(
  id: string,
  status: TradeStatus,
  comment?: string,
): Promise<TradeRequest> {
  const res = await apiClient.patch<{ trade: TradeRequest }>(`/trades/${id}/status`, { status, comment });
  return res.data.trade;
}

export async function fetchTradeHistory(id: string): Promise<StatusHistoryEntry[]> {
  const res = await apiClient.get<{ history: StatusHistoryEntry[] }>(`/trades/${id}/history`);
  return res.data.history;
}
