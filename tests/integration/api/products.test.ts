import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../../helpers/api-test-helpers';
import { createMockPrisma } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';
import { Decimal } from '@prisma/client/runtime/library';

// Mock prisma module
const mockPrisma = createMockPrisma();
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import route handler after mocking
const { GET } = await import('@/app/api/products/route');

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createProductRow(overrides = {}) {
    const p = fixtures.product.tshirt();
    return {
      ...p,
      category: { id: p.categoryId, name: '셔츠' },
      brand: { id: p.brandId, name: 'Nike' },
      images: [{ url: '/img.jpg', alt: 'test' }],
      variants: [
        { size: 'M', color: 'Black', colorCode: '#000' },
        { size: 'L', color: 'Black', colorCode: '#000' },
      ],
      ...overrides,
    };
  }

  it('상품 목록 기본 조회 - 성공', async () => {
    const products = [createProductRow()];
    mockPrisma.product.findMany.mockResolvedValue(products);
    mockPrisma.product.count.mockResolvedValue(1);

    const req = createRequest('/api/products');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).toHaveProperty('name');
    expect(body.data[0]).toHaveProperty('slug');
    expect(body.data[0]).toHaveProperty('basePrice');
    expect(body.data[0]).toHaveProperty('primaryImage');
    expect(body.data[0]).toHaveProperty('category');
    expect(body.data[0]).toHaveProperty('brand');
    expect(body.data[0]).toHaveProperty('availableSizes');
    expect(body.data[0]).toHaveProperty('availableColors');
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('카테고리 slug 필터링', async () => {
    mockPrisma.product.findMany.mockResolvedValue([createProductRow()]);
    mockPrisma.product.count.mockResolvedValue(1);

    const req = createRequest('/api/products?category=shirts');
    await GET(req);

    // Verify the where clause includes category filter
    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where).toHaveProperty('category');
    expect(call.where.category).toEqual({ slug: 'shirts' });
  });

  it('브랜드 slug 필터링', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?brand=nike');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where).toHaveProperty('brand');
    expect(call.where.brand).toEqual({ slug: 'nike' });
  });

  it('카테고리 + 브랜드 복합 필터링', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?category=shirts&brand=nike');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.category).toEqual({ slug: 'shirts' });
    expect(call.where.brand).toEqual({ slug: 'nike' });
  });

  it('가격 범위 필터링 - minPrice', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?minPrice=10000');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.basePrice).toEqual({ gte: 10000 });
  });

  it('가격 범위 필터링 - maxPrice', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?maxPrice=50000');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.basePrice).toEqual({ lte: 50000 });
  });

  it('사이즈 필터링', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?sizes=M,L');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.variants).toEqual({
      some: { size: { in: ['M', 'L'] }, isActive: true },
    });
  });

  it('색상 필터링', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?colors=Black,White');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.variants).toEqual({
      some: { color: { in: ['Black', 'White'] }, isActive: true },
    });
  });

  it('텍스트 검색 (name/description)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?search=티셔츠');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { name: { contains: '티셔츠', mode: 'insensitive' } },
      { description: { contains: '티셔츠', mode: 'insensitive' } },
    ]);
  });

  it('정렬 - price_asc', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?sort=price_asc');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ basePrice: 'asc' });
  });

  it('정렬 - price_desc', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?sort=price_desc');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ basePrice: 'desc' });
  });

  it('정렬 - popular (salesCount 내림차순)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?sort=popular');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ salesCount: 'desc' });
  });

  it('정렬 기본값 - newest (createdAt 내림차순)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('ACTIVE 상태만 조회', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products');
    await GET(req);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('ACTIVE');
  });

  it('페이지네이션 - page/limit 파라미터', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(100);

    const req = createRequest('/api/products?page=3&limit=10');
    const res = await GET(req);
    const body = await parseResponse(res);

    const call = mockPrisma.product.findMany.mock.calls[0][0];
    expect(call.skip).toBe(20); // (3-1)*10
    expect(call.take).toBe(10);
    expect(body.meta.totalPages).toBe(10); // ceil(100/10)
  });

  it('빈 결과 - 정상 빈 배열 반환', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const req = createRequest('/api/products?category=nonexistent');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('availableSizes/availableColors 중복 제거', async () => {
    const product = createProductRow({
      variants: [
        { size: 'M', color: 'Black', colorCode: '#000' },
        { size: 'M', color: 'White', colorCode: '#FFF' },
        { size: 'L', color: 'Black', colorCode: '#000' },
      ],
    });
    mockPrisma.product.findMany.mockResolvedValue([product]);
    mockPrisma.product.count.mockResolvedValue(1);

    const req = createRequest('/api/products');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data[0].availableSizes).toEqual(['M', 'L']);
    expect(body.data[0].availableColors).toHaveLength(2);
  });
});
