import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../../helpers/api-test-helpers';
import { createMockPrisma } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';
import { auth } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = createMockPrisma();
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

const { GET } = await import('@/app/api/cart/route');
const { POST: addItem } = await import('@/app/api/cart/items/route');

describe('GET /api/cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('게스트 x-session-id 헤더로 카트 조회', async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.cart.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/cart', {
      headers: { 'x-session-id': 'test-session' },
    });
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ items: [], totalAmount: 0, itemCount: 0 });
  });

  it('인증 사용자 userId로 카트 조회', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());
    mockPrisma.cart.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/cart');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([]);

    // Check that where clause uses userId
    const call = mockPrisma.cart.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ userId: fixtures.user.customer().id });
  });

  it('미인증 + 세션 없음 → 401', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/cart');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('카트에 아이템이 있는 경우 전체 데이터 반환', async () => {
    mockAuth.mockResolvedValue(null);
    const variant = fixtures.variant.tshirtM();
    mockPrisma.cart.findUnique.mockResolvedValue({
      ...fixtures.cart.guest(),
      items: [
        {
          id: 'item-1',
          variant: {
            ...variant,
            product: {
              id: 'p1',
              name: '티셔츠',
              slug: 'tshirt',
              images: [{ url: '/img.jpg', alt: 'test' }],
            },
          },
          quantity: 3,
        },
      ],
    });

    const req = createRequest('/api/cart', {
      headers: { 'x-session-id': 'guest-session-123' },
    });
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].quantity).toBe(3);
    expect(body.data.items[0].subtotal).toBe(87000); // 29000 * 3
    expect(body.data.totalAmount).toBe(87000);
    expect(body.data.itemCount).toBe(1);
  });
});

describe('POST /api/cart/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('게스트 카트에 아이템 추가', async () => {
    mockAuth.mockResolvedValue(null);
    const variant = fixtures.variant.tshirtM();
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      ...variant,
      product: { id: 'p1', name: 'test', slug: 'test', images: [] },
    });
    mockPrisma.cart.findUnique.mockResolvedValue(fixtures.cart.guest());
    mockPrisma.cartItem.findUnique.mockResolvedValue(null);
    mockPrisma.cartItem.upsert.mockResolvedValue({
      id: 'new-item',
      cartId: fixtures.cart.guest().id,
      variantId: variant.id,
      quantity: 1,
    });

    const req = createRequest('/api/cart/items', {
      method: 'POST',
      headers: { 'x-session-id': 'guest-session-123' },
      body: { variantId: variant.id, quantity: 1 }, // fixture UUIDs are now v4 compatible
    });
    const res = await addItem(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.quantity).toBe(1);
  });

  it('재고 초과 시 에러', async () => {
    mockAuth.mockResolvedValue(null);
    // Use a proper UUID v4 for Zod validation
    const variantId = '11111111-1111-4111-a111-111111111111';
    const variant = { ...fixtures.variant.tshirtMWhite(), id: variantId, stock: 0, reservedStock: 0 };
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      ...variant,
      product: { id: 'p1', name: 'test', slug: 'test', images: [] },
    });
    mockPrisma.cart.findUnique.mockResolvedValue(fixtures.cart.guest());

    const req = createRequest('/api/cart/items', {
      method: 'POST',
      headers: { 'x-session-id': 'guest-session-123' },
      body: { variantId, quantity: 1 },
    });
    const res = await addItem(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('비활성 variant 추가 시 에러', async () => {
    mockAuth.mockResolvedValue(null);
    const variantId = '22222222-2222-4222-a222-222222222222';
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      ...fixtures.variant.inactive(),
      id: variantId,
      product: { id: 'p1', name: 'test', slug: 'test', images: [] },
    });

    const req = createRequest('/api/cart/items', {
      method: 'POST',
      headers: { 'x-session-id': 'guest-session-123' },
      body: { variantId, quantity: 1 },
    });
    const res = await addItem(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VARIANT_NOT_FOUND');
  });
});
