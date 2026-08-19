import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../utils/jwt.js';

describe('jwt sign/verify (unit)', () => {
  it('round-trips a payload through sign and verify', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'reviewer' });
    const decoded = verifyAccessToken(token);

    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('reviewer');
  });

  it('throws for a tampered token', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'user' });
    const tampered = `${token}tampered`;

    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
