import { TradeRequest, type TradeRequestDoc, type TradeStatus } from '../models/TradeRequest.js';
import { StatusHistory, type StatusHistoryDoc } from '../models/StatusHistory.js';
import { AppError } from '../utils/AppError.js';
import { isOwnerOrPrivileged } from './trade.service.js';
import type { AccessTokenPayload } from '../utils/jwt.js';

/**
 * The only status changes the workflow allows, and who may perform each
 * one. A plain user may submit their own draft; only a reviewer/admin may
 * move a request through review to a final decision.
 */
const TRANSITIONS: Record<
  TradeStatus,
  { to: TradeStatus; allowedRoles: Array<'owner' | 'reviewer' | 'admin'> }[]
> = {
  Draft: [{ to: 'Submitted', allowedRoles: ['owner', 'admin'] }],
  Submitted: [{ to: 'In Review', allowedRoles: ['reviewer', 'admin'] }],
  'In Review': [
    { to: 'Approved', allowedRoles: ['reviewer', 'admin'] },
    { to: 'Rejected', allowedRoles: ['reviewer', 'admin'] },
  ],
  Approved: [],
  Rejected: [],
};

function isTransitionAllowedForRequester(
  trade: TradeRequestDoc,
  toStatus: TradeStatus,
  requester: AccessTokenPayload,
): boolean {
  const rule = TRANSITIONS[trade.status]?.find((r) => r.to === toStatus);
  if (!rule) return false;

  const isOwner = trade.createdBy.toString() === requester.sub;
  return rule.allowedRoles.some((role) => {
    if (role === 'owner') return isOwner;
    return requester.role === role;
  });
}

export async function changeTradeStatus(
  id: string,
  toStatus: TradeStatus,
  comment: string,
  requester: AccessTokenPayload,
): Promise<TradeRequestDoc> {
  const trade = await TradeRequest.findById(id);
  if (!trade) {
    throw AppError.notFound('TRADE_NOT_FOUND', 'Trade request was not found');
  }

  const validNextStatuses = TRANSITIONS[trade.status]?.map((r) => r.to) ?? [];
  if (!validNextStatuses.includes(toStatus)) {
    throw AppError.conflict(
      'INVALID_STATUS_TRANSITION',
      `Cannot move a trade request from "${trade.status}" to "${toStatus}". ` +
        (validNextStatuses.length > 0
          ? `Allowed next status(es): ${validNextStatuses.join(', ')}.`
          : `"${trade.status}" is a final status.`),
    );
  }

  if (!isTransitionAllowedForRequester(trade, toStatus, requester)) {
    throw AppError.forbidden('You do not have permission to make this status change');
  }

  const previousStatus = trade.status;
  trade.status = toStatus;
  await trade.save();

  await StatusHistory.create({
    tradeRequestId: trade._id,
    previousStatus,
    newStatus: toStatus,
    changedBy: requester.sub,
    comment,
  });

  return trade;
}

export async function getTradeHistory(
  id: string,
  requester: AccessTokenPayload,
): Promise<StatusHistoryDoc[]> {
  const trade = await TradeRequest.findById(id);
  if (!trade) {
    throw AppError.notFound('TRADE_NOT_FOUND', 'Trade request was not found');
  }
  if (!isOwnerOrPrivileged(trade, requester)) {
    throw AppError.forbidden('You do not have permission to view this trade request');
  }

  return StatusHistory.find({ tradeRequestId: id })
    .sort({ createdAt: 1 })
    .populate('changedBy', 'name role');
}
