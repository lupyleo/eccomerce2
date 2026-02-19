import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, parseResponse } from '../../helpers/api-test-helpers';
import { createMockPrisma } from '../../helpers/prisma-mock';
import { fixtures } from '../../helpers/test-fixtures';

const mockPrisma = createMockPrisma();
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

const { GET } = await import('@/app/api/categories/route');

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('카테고리 트리 구조 반환', async () => {
    const top = fixtures.category.top();
    const shirts = fixtures.category.shirts();

    mockPrisma.category.findMany.mockResolvedValue([top, shirts]);

    const req = createRequest('/api/categories');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.success).toBe(true);
    // Root level should only have top-level categories
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('상의');
    expect(body.data[0].children).toHaveLength(1);
    expect(body.data[0].children[0].name).toBe('셔츠');
  });

  it('isActive: true 카테고리만 조회', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    const req = createRequest('/api/categories');
    await GET(req);

    const call = mockPrisma.category.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ isActive: true });
  });

  it('depth, sortOrder 순서로 정렬', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    const req = createRequest('/api/categories');
    await GET(req);

    const call = mockPrisma.category.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([{ depth: 'asc' }, { sortOrder: 'asc' }]);
  });

  it('여러 루트 카테고리 + 자식 트리', async () => {
    const top = fixtures.category.top();
    const shirts = fixtures.category.shirts();
    const pants = fixtures.category.pants();

    mockPrisma.category.findMany.mockResolvedValue([top, pants, shirts]);

    const req = createRequest('/api/categories');
    const res = await GET(req);
    const body = await parseResponse(res);

    expect(body.data).toHaveLength(2); // 상의, 바지
    const topCategory = body.data.find((c: { name: string }) => c.name === '상의');
    expect(topCategory.children).toHaveLength(1);
  });
});
