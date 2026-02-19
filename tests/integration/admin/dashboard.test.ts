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

const { GET } = await import('@/app/api/admin/dashboard/route');

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(fixtures.session.admin());
  });

  it('대시보드 데이터 구조 반환', async () => {
    mockPrisma.order.findMany
      .mockResolvedValueOnce([]) // todayOrders
      .mockResolvedValueOnce([]); // recentOrders
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.return.count.mockResolvedValue(0);
    mockPrisma.productVariant.count.mockResolvedValue(0);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.groupBy.mockResolvedValue([]);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const data = body.data;
    expect(data).toHaveProperty('todaySales');
    expect(data).toHaveProperty('todayOrders');
    expect(data).toHaveProperty('pendingOrders');
    expect(data).toHaveProperty('pendingReturns');
    expect(data).toHaveProperty('lowStockVariants');
    expect(data).toHaveProperty('monthlySales');
    expect(data).toHaveProperty('topProducts');
    expect(data).toHaveProperty('orderStatusSummary');
  });

  it('오늘 매출 집계 - 취소 주문 제외', async () => {
    mockPrisma.order.findMany
      .mockResolvedValueOnce([
        { finalAmount: new Decimal(50000) },
        { finalAmount: new Decimal(30000) },
      ]) // todayOrders (CANCELLED already excluded by where clause)
      .mockResolvedValueOnce([]); // recentOrders
    mockPrisma.order.count.mockResolvedValue(3);
    mockPrisma.return.count.mockResolvedValue(1);
    mockPrisma.productVariant.count.mockResolvedValue(2);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.groupBy.mockResolvedValue([]);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data.todaySales).toBe(80000);
    expect(body.data.todayOrders).toBe(2);
    expect(body.data.pendingOrders).toBe(3);
    expect(body.data.pendingReturns).toBe(1);
    expect(body.data.lowStockVariants).toBe(2);
  });

  it('인기 상품 TOP 10 - salesCount 기준', async () => {
    const topProducts = [
      { id: '1', name: '인기상품A', salesCount: 100, basePrice: new Decimal(29000) },
      { id: '2', name: '인기상품B', salesCount: 50, basePrice: new Decimal(59000) },
    ];
    mockPrisma.order.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.return.count.mockResolvedValue(0);
    mockPrisma.productVariant.count.mockResolvedValue(0);
    mockPrisma.product.findMany.mockResolvedValue(topProducts);
    mockPrisma.order.groupBy.mockResolvedValue([]);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data.topProducts).toHaveLength(2);
    expect(body.data.topProducts[0].name).toBe('인기상품A');
    expect(body.data.topProducts[0].salesCount).toBe(100);
    expect(body.data.topProducts[0].revenue).toBe(2900000); // 100 * 29000
  });

  it('월간 매출 추이 - 일별 집계, 날짜순', async () => {
    const recentOrders = [
      { finalAmount: new Decimal(10000), createdAt: new Date('2025-02-01T10:00:00Z') },
      { finalAmount: new Decimal(20000), createdAt: new Date('2025-02-01T14:00:00Z') },
      { finalAmount: new Decimal(30000), createdAt: new Date('2025-02-02T10:00:00Z') },
    ];
    mockPrisma.order.findMany
      .mockResolvedValueOnce([]) // todayOrders
      .mockResolvedValueOnce(recentOrders); // recentOrders
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.return.count.mockResolvedValue(0);
    mockPrisma.productVariant.count.mockResolvedValue(0);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.groupBy.mockResolvedValue([]);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data.monthlySales).toHaveLength(2);
    expect(body.data.monthlySales[0].date).toBe('2025-02-01');
    expect(body.data.monthlySales[0].amount).toBe(30000); // 10000 + 20000
    expect(body.data.monthlySales[1].date).toBe('2025-02-02');
    expect(body.data.monthlySales[1].amount).toBe(30000);
  });

  it('주문 상태 요약', async () => {
    mockPrisma.order.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.return.count.mockResolvedValue(0);
    mockPrisma.productVariant.count.mockResolvedValue(0);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.groupBy.mockResolvedValue([
      { status: 'PAID', _count: 5 },
      { status: 'PREPARING', _count: 3 },
      { status: 'CANCELLED', _count: 1 },
    ]);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data.orderStatusSummary).toEqual({
      PAID: 5,
      PREPARING: 3,
      CANCELLED: 1,
    });
  });

  it('미인증 시 401', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/admin/dashboard');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
