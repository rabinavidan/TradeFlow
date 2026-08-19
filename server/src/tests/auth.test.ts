import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token, never the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'supersecret123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ada@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First User', email: 'dup@example.com', password: 'supersecret123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second User', email: 'dup@example.com', password: 'supersecret123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects invalid input with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'supersecret123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'supersecret123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password with a generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an unknown email with the same generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Me User', email: 'me@example.com', password: 'supersecret123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });
});
