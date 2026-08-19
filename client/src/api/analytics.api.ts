import { apiClient } from './client';
import type { AnalyticsSummary } from '../types/analytics';

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await apiClient.get<AnalyticsSummary>('/analytics/summary');
  return res.data;
}
