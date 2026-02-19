import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../../helpers/api-test-helpers';
import { createMockPrisma } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';

const mockPrisma = createMockPrisma();
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

const { GET } = await import('@/app/api/brands/route');

describe('GET /api/brands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('브랜드 목록 반환', async () => {
    const nike = fixtures.brand.nike();
    const adidas = fixtures.brand.adidas();
    mockPrisma.brand.findMany.mockResolvedValue([adidas, nike]); // sorted by name

    const req = createRequest('/api/brands');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Adidas');
    expect(body.data[1].name).toBe('Nike');
  });

  it('브랜드 데이터 구조 검증', async () => {
    mockPrisma.brand.findMany.mockResolvedValue([fixtures.brand.nike()]);

    const req = createRequest('/api/brands');
    const res = await GET(req);
    const body = await parseResponse(res);

    const brand = body.data[0];
    expect(brand).toHaveProperty('id');
    expect(brand).toHaveProperty('name');
    expect(brand).toHaveProperty('slug');
    expect(brand).toHaveProperty('logoUrl');
    expect(brand).toHaveProperty('description');
  });

  it('isActive: true 브랜드만 조회', async () => {
    mockPrisma.brand.findMany.mockResolvedValue([]);

    const req = createRequest('/api/brands');
    await GET(req);

    const call = mockPrisma.brand.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ isActive: true });
  });

  it('이름 오름차순 정렬', async () => {
    mockPrisma.brand.findMany.mockResolvedValue([]);

    const req = createRequest('/api/brands');
    await GET(req);

    const call = mockPrisma.brand.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: 'asc' });
  });
});
