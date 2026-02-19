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

const { GET } = await import('@/app/api/admin/products/route');

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(fixtures.session.admin());
  });

  function createAdminProduct(overrides = {}) {
    const p = fixtures.product.tshirt();
    return {
      ...p,
      category: { id: p.categoryId, name: '셔츠' },
      brand: { id: p.brandId, name: 'Nike' },
      images: [{ url: '/img.jpg' }],
      variants: [
        { id: 'v1', size: 'M', color: 'Black', stock: 50, reservedStock: 5, price: new Decimal(29000) },
      ],
      _count: { reviews: 10 },
      ...overrides,
    };
  }

  it('상품 목록 조회 (페이지네이션)', async () => {
    const products = [createAdminProduct()];
    mockPrisma.product.findMany.mockResolvedValue(products);
    mockPrisma.product.count.mockResolvedValue(1);

    const req = createRequest('/api/admin/products?page=1&limit=10');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).toHaveProperty('variantCount');
    expect(body.data[0]).toHaveProperty('totalStock');
    expect(body.data[0]).toHaveProperty('reviewCount');
    expect(body.data[0].totalStock).toBe(50);
    expect(body.data[0].variantCount).toBe(1);
    expect(body.meta.page).toBe(1);
  });

  it('상태 필터 적용', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/admin/products?status=HIDDEN');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('HIDDEN');
  });

  it('검색어 필터 적용', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/admin/products?search=티셔츠');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { name: { contains: '티셔츠', mode: 'insensitive' } },
      { slug: { contains: '티셔츠', mode: 'insensitive' } },
    ]);
  });

  it('카테고리ID 필터', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const catId = fixtures.category.shirts().id;
    const req = createRequest(`/api/admin/products?categoryId=${catId}`);
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.categoryId).toBe(catId);
  });

  it('createdAt 내림차순 정렬', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/admin/products');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('미인증 시 401', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/admin/products');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('CUSTOMER 역할 시 403', async () => {
    mockAuth.mockResolvedValue(fixtures.session.customer());

    const req = createRequest('/api/admin/products');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
