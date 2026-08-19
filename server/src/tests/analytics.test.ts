import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { TradeRequest } from '../models/TradeRequest.js';

const app = createApp();

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), TradeRequest.deleteMany({})]);
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

describe('GET /api/analytics/summary', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('scopes totals and counts to the caller for a plain user', async () => {
    const owner = await registerUser('analytics-owner@example.com');
    const other = await registerUser('analytics-other@example.com');

    await request(app).post('/api/trades').set('Authorization', `Bearer ${owner.token}`).send(validTrade);
    await request(app).post('/api/trades').set('Authorization', `Bearer ${owner.token}`).send(validTrade);
    await request(app).post('/api/trades').set('Authorization', `Bearer ${other.token}`).send(validTrade);

    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(2);
    expect(res.body.countByStatus).toMatchObject({
      Draft: 2,
      Submitted: 0,
      'In Review': 0,
      Approved: 0,
      Rejected: 0,
    });
    expect(res.body.recentRequests).toHaveLength(2);
  });

  it('gives a reviewer totals across every user', async () => {
    const owner = await registerUser('analytics-owner2@example.com');
    const other = await registerUser('analytics-other2@example.com');
    const reviewer = await registerUser('analytics-reviewer@example.com', 'reviewer');

    await request(app).post('/api/trades').set('Authorization', `Bearer ${owner.token}`).send(validTrade);
    await request(app).post('/api/trades').set('Authorization', `Bearer ${other.token}`).send(validTrade);

    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${reviewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(2);
  });

  it('reflects status changes in the counts', async () => {
    const owner = await registerUser('analytics-owner3@example.com');
    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(validTrade);

    await request(app)
      .patch(`/api/trades/${created.body.trade.id}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'Submitted' });

    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.body.countByStatus.Draft).toBe(0);
    expect(res.body.countByStatus.Submitted).toBe(1);
  });

  it('caps recentRequests and returns 0/empty when there is no data', async () => {
    const owner = await registerUser('analytics-owner4@example.com');
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.body.totalRequests).toBe(0);
    expect(res.body.recentRequests).toEqual([]);
  });
});
