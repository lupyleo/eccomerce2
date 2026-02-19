import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getCartIdentity, cartWhereClause, cartCreateData } from '@/lib/cart-identity';
import { auth } from '@/lib/auth';
import { fixtures } from '../../helpers/test-fixtures';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe('getCartIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('인증된 사용자 → user type identity', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());
    const req = new NextRequest('http://localhost:3000/api/cart');

    const identity = await getCartIdentity(req);

    expect(identity).toEqual({
      type: 'user',
      userId: fixtures.user.customer().id,
    });
  });

  it('미인증 + x-session-id 헤더 → guest type identity', async () => {
    mockAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/cart', {
      headers: { 'x-session-id': 'test-session-id' },
    });

    const identity = await getCartIdentity(req);

    expect(identity).toEqual({
      type: 'guest',
      sessionId: 'test-session-id',
    });
  });

  it('미인증 + 세션ID 없음 → SESSION_REQUIRED 에러', async () => {
    mockAuth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/cart');

    await expect(getCartIdentity(req)).rejects.toThrow('로그인하거나 세션 ID가 필요합니다.');
  });

  it('인증된 사용자일 때 세션ID 헤더 무시', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());
    const req = new NextRequest('http://localhost:3000/api/cart', {
      headers: { 'x-session-id': 'should-be-ignored' },
    });

    const identity = await getCartIdentity(req);

    expect(identity.type).toBe('user');
  });
});

describe('cartWhereClause', () => {
  it('user type → { userId }', () => {
    const clause = cartWhereClause({ type: 'user', userId: 'user-1' });
    expect(clause).toEqual({ userId: 'user-1' });
  });

  it('guest type → { sessionId }', () => {
    const clause = cartWhereClause({ type: 'guest', sessionId: 'session-1' });
    expect(clause).toEqual({ sessionId: 'session-1' });
  });
});

describe('cartCreateData', () => {
  it('user type → { userId }', () => {
    const data = cartCreateData({ type: 'user', userId: 'user-1' });
    expect(data).toEqual({ userId: 'user-1' });
  });

  it('guest type → { sessionId }', () => {
    const data = cartCreateData({ type: 'guest', sessionId: 'session-1' });
    expect(data).toEqual({ sessionId: 'session-1' });
  });
});
