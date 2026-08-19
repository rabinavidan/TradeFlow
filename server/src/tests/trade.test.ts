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

  // A JWT's role claim is a snapshot from sign-time — elevating the DB
  // record alone doesn't change an already-issued token. Re-login after
  // the promotion to get a fresh token carrying the new role.
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
  currency: 'usd',
  country: 'Germany',
  requestType: 'Letter of Credit',
  description: 'Quarterly import financing request.',
};

describe('POST /api/trades', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/trades').send(validTrade);
    expect(res.status).toBe(401);
  });

  it('creates a trade request owned by the caller', async () => {
    const { token, userId } = await registerUser('owner@example.com');

    const res = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrade);

    expect(res.status).toBe(201);
    expect(res.body.trade.title).toBe(validTrade.title);
    expect(res.body.trade.currency).toBe('USD'); // normalized to uppercase
    expect(res.body.trade.status).toBe('Draft');
    expect(res.body.trade.createdBy).toBe(userId);
    expect(res.body.trade).toHaveProperty('id');
    expect(res.body.trade).not.toHaveProperty('_id');
  });

  it('rejects invalid input with 422', async () => {
    const { token } = await registerUser('owner2@example.com');

    const res = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTrade, amount: -5 });

    expect(res.status).toBe(422);
    // requestId lets a user report "error X" and have it map directly to
    // one server log line, without matching on timestamps/descriptions.
    expect(typeof res.body.error.requestId).toBe('string');
    expect(res.headers['x-request-id']).toBe(res.body.error.requestId);
  });
});

describe('GET /api/trades', () => {
  it('scopes results to the caller for a plain user, but not for a reviewer', async () => {
    const owner = await registerUser('scoped-owner@example.com');
    const other = await registerUser('scoped-other@example.com');
    const reviewer = await registerUser('scoped-reviewer@example.com', 'reviewer');

    await request(app).post('/api/trades').set('Authorization', `Bearer ${owner.token}`).send(validTrade);
    await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ ...validTrade, title: 'Other user trade' });

    const ownerRes = await request(app).get('/api/trades').set('Authorization', `Bearer ${owner.token}`);
    expect(ownerRes.body.pagination.total).toBe(1);

    const reviewerRes = await request(app)
      .get('/api/trades')
      .set('Authorization', `Bearer ${reviewer.token}`);
    expect(reviewerRes.body.pagination.total).toBe(2);
  });

  it('paginates, filters by status, and searches by title', async () => {
    const { token } = await registerUser('list-owner@example.com');

    for (let i = 0; i < 15; i += 1) {
      await request(app)
        .post('/api/trades')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validTrade, title: `Trade ${i}` });
    }

    const page1 = await request(app)
      .get('/api/trades?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.pagination.total).toBe(15);
    expect(page1.body.pagination.totalPages).toBe(2);

    const page2 = await request(app)
      .get('/api/trades?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(page2.body.data).toHaveLength(5);

    const search = await request(app)
      .get('/api/trades?search=Trade 3')
      .set('Authorization', `Bearer ${token}`);
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].title).toBe('Trade 3');
  });
});

describe('GET /api/trades/:id', () => {
  it('returns 403 when a non-owner, non-privileged user requests it', async () => {
    const owner = await registerUser('detail-owner@example.com');
    const stranger = await registerUser('detail-stranger@example.com');

    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(validTrade);

    const res = await request(app)
      .get(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a well-formed but nonexistent id', async () => {
    const { token } = await registerUser('detail-owner2@example.com');
    const res = await request(app)
      .get('/api/trades/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const { token } = await registerUser('detail-owner3@example.com');
    const res = await request(app).get('/api/trades/not-an-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/trades/:id', () => {
  it('lets the owner edit a Draft trade', async () => {
    const { token } = await registerUser('edit-owner@example.com');
    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrade);

    const res = await request(app)
      .put(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.trade.title).toBe('Updated title');
  });

  it('blocks editing once the trade is no longer editable (e.g. Approved)', async () => {
    const { token } = await registerUser('edit-owner2@example.com');
    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrade);

    await TradeRequest.findByIdAndUpdate(created.body.trade.id, { status: 'Approved' });

    const res = await request(app)
      .put(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Should not apply' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TRADE_NOT_EDITABLE');
  });
});

describe('DELETE /api/trades/:id', () => {
  it('lets the owner delete a Draft trade', async () => {
    const { token } = await registerUser('delete-owner@example.com');
    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrade);

    const res = await request(app)
      .delete(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('forbids a non-owner from deleting', async () => {
    const owner = await registerUser('delete-owner2@example.com');
    const stranger = await registerUser('delete-stranger@example.com');

    const created = await request(app)
      .post('/api/trades')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(validTrade);

    const res = await request(app)
      .delete(`/api/trades/${created.body.trade.id}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);
  });
});
