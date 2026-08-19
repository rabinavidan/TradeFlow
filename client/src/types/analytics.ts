import type { TradeStatus } from './trade';

export interface AnalyticsSummary {
  totalRequests: number;
  countByStatus: Record<TradeStatus, number>;
  recentRequests: {
    id: string;
    title: string;
    customerName: string;
    status: TradeStatus;
    createdAt: string;
  }[];
}
