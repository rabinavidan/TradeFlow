import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { TradeRequest } from '../models/TradeRequest.js';
import { StatusHistory } from '../models/StatusHistory.js';

const app = createApp();

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), TradeRequest.deleteMany({}), StatusHistory.deleteMany({})]);
});

async function registerUser(email: string, role: 'user' | 'reviewer' | 'admin' = 'user') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'supersecret123' });

  if (role === 'user') {
    return { token: res.body.token as string, userId: res.body.user.id as string };
  }

  await User.findByIdAndUpdate(res.body.user.id, { role });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'supersecret123' });
  return { token: loginRes.body.token as string, userId: res.body.user.id as string };
}

const validTrade = {
  title: 'Import shipment financing',
  customerName: 'Acme Corp',
  amount: 25000,
  currency: 'USD',
  country: 'Germany',
  requestType: 'Letter of Credit',
};

async function createTrade(token: string) {
  const res = await request(app).post('/api/trades').set('Authorization', `Bearer ${token}`).send(validTrade);
  return res.body.trade.id as string;
}

describe('PATCH /api/trades/:id/status — Draft -> Submitted', () => {
  it('lets the owner submit their own draft', async () => {
    const owner = await registerUser('submit-owner@example.com');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(200);
    expect(res.body.trade.status).toBe('Submitted');
  });

  it('forbids a stranger from submitting someone else’s draft', async () => {
    const owner = await registerUser('submit-owner2@example.com');
    const stranger = await registerUser('submit-stranger@example.com');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(403);
  });

  it('forbids a reviewer from submitting on the owner’s behalf', async () => {
    const owner = await registerUser('submit-owner3@example.com');
    const reviewer = await registerUser('submit-reviewer@example.com', 'reviewer');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/trades/:id/status — reviewer workflow', () => {
  it('lets a reviewer move Submitted -> In Review -> Approved, recording history each step', async () => {
    const owner = await registerUser('flow-owner@example.com');
    const reviewer = await registerUser('flow-reviewer@example.com', 'reviewer');
    const tradeId = await createTrade(owner.token);

    await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Submitted' });

    const toReview = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'In Review', comment: 'Picking this up' });
    expect(toReview.status).toBe(200);
    expect(toReview.body.trade.status).toBe('In Review');

    const approved = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'Approved', comment: 'Looks good' });
    expect(approved.status).toBe(200);
    expect(approved.body.trade.status).toBe('Approved');

    const historyRes = await request(app)
      .get(`/api/trades/${tradeId}/history`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history).toHaveLength(3);
    expect(historyRes.body.history.map((h: { newStatus: string }) => h.newStatus)).toEqual([
      'Submitted',
      'In Review',
      'Approved',
    ]);
    expect(historyRes.body.history[1].comment).toBe('Picking this up');
    expect(historyRes.body.history[1]).toHaveProperty('changedAt');
    expect(historyRes.body.history[1].changedBy).toMatchObject({ name: 'Test User', role: 'reviewer' });
  });

  it('rejects a plain user trying to move Submitted -> In Review', async () => {
    const owner = await registerUser('flow-owner2@example.com');
    const tradeId = await createTrade(owner.token);
    await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Submitted' });

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'In Review' });

    expect(res.status).toBe(403);
  });

  it('rejects an invalid transition (Draft -> Approved) with 409', async () => {
    const owner = await registerUser('flow-owner3@example.com');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects any transition out of a terminal status', async () => {
    const owner = await registerUser('flow-owner4@example.com');
    const reviewer = await registerUser('flow-reviewer2@example.com', 'reviewer');
    const tradeId = await createTrade(owner.token);

    await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Submitted' });
    await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'In Review' });
    await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'Rejected' });

    const res = await request(app)
      .patch(`/api/trades/${tradeId}/status`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/trades/:id/history', () => {
  it('forbids a stranger from viewing another user’s history', async () => {
    const owner = await registerUser('hist-owner@example.com');
    const stranger = await registerUser('hist-stranger@example.com');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .get(`/api/trades/${tradeId}/history`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);
  });

  it('lets a reviewer view any trade’s history', async () => {
    const owner = await registerUser('hist-owner2@example.com');
    const reviewer = await registerUser('hist-reviewer@example.com', 'reviewer');
    const tradeId = await createTrade(owner.token);

    const res = await request(app)
      .get(`/api/trades/${tradeId}/history`)
      .set('Authorization', `Bearer ${reviewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
  });
});
