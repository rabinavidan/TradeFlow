export type TradeStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';

export const TRADE_STATUSES: TradeStatus[] = [
  'Draft',
  'Submitted',
  'In Review',
  'Approved',
  'Rejected',
];

export type TradeRequestType = 'Letter of Credit' | 'Guarantee' | 'Collection' | 'Other';

export const TRADE_REQUEST_TYPES: TradeRequestType[] = [
  'Letter of Credit',
  'Guarantee',
  'Collection',
  'Other',
];

export interface TradeRequest {
  id: string;
  title: string;
  customerName: string;
  amount: number;
  currency: string;
  country: string;
  requestType: TradeRequestType;
  description: string;
  status: TradeStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatusHistoryEntry {
  id: string;
  tradeRequestId: string;
  previousStatus: TradeStatus;
  newStatus: TradeStatus;
  changedBy: { id: string; name: string; role: string } | string;
  comment: string;
  changedAt: string;
}

export interface TradeListParams {
  page: number;
  limit: number;
  search?: string;
  status?: TradeStatus;
  requestType?: TradeRequestType;
  sortBy: 'createdAt' | 'amount' | 'title' | 'status';
  sortOrder: 'asc' | 'desc';
}
