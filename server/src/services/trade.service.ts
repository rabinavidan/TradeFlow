import { TradeRequest, type TradeRequestDoc } from '../models/TradeRequest.js';
import { AppError } from '../utils/AppError.js';
import type { CreateTradeInput, ListTradesQuery, UpdateTradeInput } from '../schemas/trade.schema.js';
import type { AccessTokenPayload } from '../utils/jwt.js';

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Reviewers and admins triage every request; a plain user only sees their own. */
export function canSeeAllTrades(role: AccessTokenPayload['role']): boolean {
  return role === 'reviewer' || role === 'admin';
}

export function isOwnerOrPrivileged(trade: TradeRequestDoc, requester: AccessTokenPayload): boolean {
  return trade.createdBy.toString() === requester.sub || canSeeAllTrades(requester.role);
}

export async function createTrade(
  input: CreateTradeInput,
  requester: AccessTokenPayload,
): Promise<TradeRequestDoc> {
  return TradeRequest.create({ ...input, createdBy: requester.sub });
}

export async function listTrades(
  query: ListTradesQuery,
  requester: AccessTokenPayload,
): Promise<Paginated<TradeRequestDoc>> {
  const filter: Record<string, unknown> = canSeeAllTrades(requester.role)
    ? {}
    : { createdBy: requester.sub };

  if (query.status) filter.status = query.status;
  if (query.requestType) filter.requestType = query.requestType;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { customerName: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    TradeRequest.find(filter).sort(sort).skip(skip).limit(query.limit),
    TradeRequest.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getTradeById(
  id: string,
  requester: AccessTokenPayload,
): Promise<TradeRequestDoc> {
  const trade = await TradeRequest.findById(id);
  if (!trade) {
    throw AppError.notFound('TRADE_NOT_FOUND', 'Trade request was not found');
  }
  if (!isOwnerOrPrivileged(trade, requester)) {
    throw AppError.forbidden('You do not have permission to view this trade request');
  }
  return trade;
}

const EDITABLE_STATUSES = new Set(['Draft', 'Rejected']);

export async function updateTrade(
  id: string,
  input: UpdateTradeInput,
  requester: AccessTokenPayload,
): Promise<TradeRequestDoc> {
  const trade = await TradeRequest.findById(id);
  if (!trade) {
    throw AppError.notFound('TRADE_NOT_FOUND', 'Trade request was not found');
  }
  if (!isOwnerOrPrivileged(trade, requester)) {
    throw AppError.forbidden('You do not have permission to edit this trade request');
  }
  if (!EDITABLE_STATUSES.has(trade.status) && requester.role !== 'admin') {
    throw AppError.conflict(
      'TRADE_NOT_EDITABLE',
      `A trade request with status "${trade.status}" can no longer be edited`,
    );
  }

  Object.assign(trade, input);
  await trade.save();
  return trade;
}

export async function deleteTrade(id: string, requester: AccessTokenPayload): Promise<void> {
  const trade = await TradeRequest.findById(id);
  if (!trade) {
    throw AppError.notFound('TRADE_NOT_FOUND', 'Trade request was not found');
  }
  if (!isOwnerOrPrivileged(trade, requester)) {
    throw AppError.forbidden('You do not have permission to delete this trade request');
  }
  if (!EDITABLE_STATUSES.has(trade.status) && requester.role !== 'admin') {
    throw AppError.conflict(
      'TRADE_NOT_EDITABLE',
      `A trade request with status "${trade.status}" can no longer be deleted`,
    );
  }

  await trade.deleteOne();
}
