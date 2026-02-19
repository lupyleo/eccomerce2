import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { NotFoundError } from '@/lib/errors';

const createPromotionSchema = z.object({
  name: z.string().min(1, '프로모션 이름은 필수입니다.').max(100),
  type: z.enum(['CATEGORY_DISCOUNT', 'PERIOD_DISCOUNT']),
  discountRate: z.number().min(0).max(100, '할인율은 0~100% 사이여야 합니다.'),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const isActive = req.nextUrl.searchParams.get('isActive');

  const where: Record<string, unknown> = {};
  if (isActive !== null) where.isActive = isActive === 'true';

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.promotion.count({ where }),
  ]);

  const data = promotions.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    discountRate: Number(p.discountRate),
    category: p.category,
    startDate: p.startDate,
    endDate: p.endDate,
    isActive: p.isActive,
    createdAt: p.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json();
  const dto = createPromotionSchema.parse(body);

  if (dto.type === 'CATEGORY_DISCOUNT' && !dto.categoryId) {
    throw new NotFoundError('카테고리');
  }

  if (dto.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundError('카테고리');
  }

  const promotion = await prisma.promotion.create({
    data: {
      name: dto.name,
      type: dto.type,
      discountRate: dto.discountRate,
      categoryId: dto.categoryId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isActive: dto.isActive ?? true,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  return successResponse(
    {
      ...promotion,
      discountRate: Number(promotion.discountRate),
    },
    201,
  );
});
