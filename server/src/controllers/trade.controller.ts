import type { Request, Response } from 'express';
import { createTradeSchema, listTradesQuerySchema, updateTradeSchema } from '../schemas/trade.schema.js';
import { statusTransitionSchema } from '../schemas/statusTransition.schema.js';
import { createTrade, deleteTrade, getTradeById, listTrades, updateTrade } from '../services/trade.service.js';
import { changeTradeStatus, getTradeHistory } from '../services/workflow.service.js';
import { AppError } from '../utils/AppError.js';

function requireUser(req: Request) {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  return req.user;
}

export async function create(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const input = createTradeSchema.parse(req.body);
  const trade = await createTrade(input, requester);
  res.status(201).json({ trade });
}

export async function list(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const query = listTradesQuerySchema.parse(req.query);
  const result = await listTrades(query, requester);
  res.status(200).json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const trade = await getTradeById(req.params.id, requester);
  res.status(200).json({ trade });
}

export async function update(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const input = updateTradeSchema.parse(req.body);
  const trade = await updateTrade(req.params.id, input, requester);
  res.status(200).json({ trade });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  await deleteTrade(req.params.id, requester);
  res.status(204).send();
}

export async function changeStatus(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const input = statusTransitionSchema.parse(req.body);
  const trade = await changeTradeStatus(req.params.id, input.status, input.comment, requester);
  res.status(200).json({ trade });
}

export async function history(req: Request, res: Response): Promise<void> {
  const requester = requireUser(req);
  const entries = await getTradeHistory(req.params.id, requester);
  res.status(200).json({ history: entries });
}
