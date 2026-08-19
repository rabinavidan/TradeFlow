import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsSummary } from '../api/analytics.api';

export function useAnalyticsSummaryQuery() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
  });
}
