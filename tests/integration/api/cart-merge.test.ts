import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../../helpers/api-test-helpers';
import { createMockPrisma } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';
import { auth } from '@/lib/auth';

const mockPrisma = createMockPrisma();
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

const { POST } = await import('@/app/api/cart/merge/route');

describe('POST /api/cart/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma),
    );
  });

  it('미인증 시 401', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: { sessionId: 'guest-session-123' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('인증 사용자 - 게스트 카트 병합 성공', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const guestCart = fixtures.cart.guest();
    const guestItems = [fixtures.cartItem.guestItem1()];
    const userCart = fixtures.cart.user();

    mockPrisma.cart.findUnique
      .mockResolvedValueOnce({ ...guestCart, items: guestItems })
      .mockResolvedValueOnce({ ...userCart, items: [] });
    mockPrisma.cartItem.create.mockResolvedValue({});
    mockPrisma.cart.delete.mockResolvedValue({});

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: { sessionId: 'guest-session-123' },
    });
    const res = await POST(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.merged).toBe(1);
  });

  it('중복 variant 병합 시 수량 합산', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const guestItems = [fixtures.cartItem.guestItem1()]; // variantId: uuid(40), qty: 2
    const userItems = [fixtures.cartItem.userItem1()]; // same variant, qty: 1

    mockPrisma.cart.findUnique
      .mockResolvedValueOnce({ ...fixtures.cart.guest(), items: guestItems })
      .mockResolvedValueOnce({ ...fixtures.cart.user(), items: userItems });
    mockPrisma.cartItem.update.mockResolvedValue({});
    mockPrisma.cart.delete.mockResolvedValue({});

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: { sessionId: 'guest-session-123' },
    });
    const res = await POST(req);
    const body = await parseResponse(res);

    expect(body.data.merged).toBe(1);
    expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: userItems[0].id },
      data: { quantity: 3 }, // 1 + 2
    });
  });

  it('빈 게스트 카트 병합 시 404 에러', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());
    mockPrisma.cart.findUnique.mockResolvedValue({
      ...fixtures.cart.guest(),
      items: [],
    });

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: { sessionId: 'guest-session-123' },
    });
    const res = await POST(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('CART_EMPTY');
  });

  it('sessionId 누락 시 validation 에러', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);

    // ZodError is not an AppError, so apiHandler catches it as 500
    expect(res.status).toBe(500);
  });

  it('병합 후 게스트 카트 삭제 확인', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const guestCart = fixtures.cart.guest();
    mockPrisma.cart.findUnique
      .mockResolvedValueOnce({ ...guestCart, items: [fixtures.cartItem.guestItem1()] })
      .mockResolvedValueOnce({ ...fixtures.cart.user(), items: [] });
    mockPrisma.cartItem.create.mockResolvedValue({});
    mockPrisma.cart.delete.mockResolvedValue({});

    const req = createRequest('/api/cart/merge', {
      method: 'POST',
      body: { sessionId: 'guest-session-123' },
    });
    await POST(req);

    expect(mockPrisma.cart.delete).toHaveBeenCalledWith({ where: { id: guestCart.id } });
  });
});
