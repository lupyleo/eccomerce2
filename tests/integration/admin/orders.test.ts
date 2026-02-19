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

const mockGetOrdersForAdmin = vi.fn();

// Mock OrderService as a class with constructor
vi.mock('@/application/order/order.service', () => ({
  OrderService: class MockOrderService {
    getOrdersForAdmin = mockGetOrdersForAdmin;
  },
}));

const mockAuth = vi.mocked(auth);
const { GET } = await import('@/app/api/admin/orders/route');

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(fixtures.session.admin());
  });

  it('주문 목록 조회 성공', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'PAID',
        totalAmount: new Decimal(87000),
        finalAmount: new Decimal(87000),
        user: { id: 'u1', name: 'Customer', email: 'c@test.com' },
        items: [{ productName: '티셔츠', quantity: 3 }],
        payment: { method: 'CARD', status: 'COMPLETED' },
        shipment: null,
        createdAt: new Date(),
      },
    ];

    mockGetOrdersForAdmin.mockResolvedValue({ data: mockOrders, total: 1 });

    const req = createRequest('/api/admin/orders');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].orderNumber).toBe('ORD-001');
    expect(body.data[0].status).toBe('PAID');
    expect(body.data[0].finalAmount).toBe(87000);
    expect(body.data[0].itemCount).toBe(1);
  });

  it('미인증 시 401', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/admin/orders');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('CUSTOMER 역할 시 403', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const req = createRequest('/api/admin/orders');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
