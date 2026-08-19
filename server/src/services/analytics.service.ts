import { Types } from 'mongoose';
import { TradeRequest, TRADE_STATUSES, type TradeStatus } from '../models/TradeRequest.js';
import { canSeeAllTrades } from './trade.service.js';
import type { AccessTokenPayload } from '../utils/jwt.js';

export interface AnalyticsSummary {
  totalRequests: number;
  countByStatus: Record<TradeStatus, number>;
  recentRequests: {
    id: string;
    title: string;
    customerName: string;
    status: TradeStatus;
    createdAt: Date;
  }[];
}

const RECENT_LIMIT = 5;

interface FacetResult {
  totalCount: { count: number }[];
  byStatus: { _id: TradeStatus; count: number }[];
  recent: {
    _id: Types.ObjectId;
    title: string;
    customerName: string;
    status: TradeStatus;
    createdAt: Date;
  }[];
}

export async function getAnalyticsSummary(requester: AccessTokenPayload): Promise<AnalyticsSummary> {
  const matchStage = canSeeAllTrades(requester.role)
    ? {}
    : { createdBy: new Types.ObjectId(requester.sub) };

  // $facet runs three independent pipelines against the same $match in a
  // single aggregation call — one round trip to MongoDB instead of three
  // separate queries (count, group-by-status, and a sorted/limited list).
  const [result] = await TradeRequest.aggregate<FacetResult>([
    { $match: matchStage },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: RECENT_LIMIT },
          { $project: { title: 1, customerName: 1, status: 1, createdAt: 1 } },
        ],
      },
    },
  ]);

  const countByStatus = Object.fromEntries(TRADE_STATUSES.map((status) => [status, 0])) as Record<
    TradeStatus,
    number
  >;
  for (const bucket of result.byStatus) {
    countByStatus[bucket._id] = bucket.count;
  }

  return {
    totalRequests: result.totalCount[0]?.count ?? 0,
    countByStatus,
    recentRequests: result.recent.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      customerName: r.customerName,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
