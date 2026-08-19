import { apiClient } from './client';

export interface GenerateDescriptionPayload {
  title: string;
  customerName?: string;
  amount?: number;
  currency?: string;
  country?: string;
  requestType?: string;
}

export async function generateTradeDescription(payload: GenerateDescriptionPayload): Promise<string> {
  const res = await apiClient.post<{ description: string }>('/ai/generate-description', payload);
  return res.data.description;
}
