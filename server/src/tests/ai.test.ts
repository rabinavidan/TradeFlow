import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

const app = createApp();

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function registerUser(email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'supersecret123' });
  return res.body.token as string;
}

describe('POST /api/ai/generate-description', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/ai/generate-description').send({ title: 'Import financing' });
    expect(res.status).toBe(401);
  });

  it('rejects a body without a title', async () => {
    const token = await registerUser('ai-validation@example.com');
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('returns a generated description when Ollama responds successfully', async () => {
    const token = await registerUser('ai-success@example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'A short, professional description.' }),
      }),
    );

    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Import shipment financing',
        customerName: 'Acme Corp',
        amount: 25000,
        currency: 'USD',
        country: 'Germany',
        requestType: 'Letter of Credit',
      });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('A short, professional description.');
  });

  it('returns a 503 AI_UNAVAILABLE error when Ollama cannot be reached, instead of crashing', async () => {
    const token = await registerUser('ai-unavailable@example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434')),
    );

    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Import shipment financing' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('returns a 503 AI_UNAVAILABLE error when Ollama responds with a non-OK status', async () => {
    const token = await registerUser('ai-bad-status@example.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Import shipment financing' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });
});
