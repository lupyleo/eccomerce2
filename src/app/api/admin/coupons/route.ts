import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';

const createCouponSchema = z.object({
  code: z.string().min(1, '쿠폰 코드는 필수입니다.').max(50),
  name: z.string().min(1, '쿠폰 이름은 필수입니다.').max(100),
  type: z.enum(['FIXED', 'PERCENTAGE']),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUsageCount: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const isActive = req.nextUrl.searchParams.get('isActive');

  const where: Record<string, unknown> = {};
  if (isActive !== null) where.isActive = isActive === 'true';

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { usages: true } },
      },
    }),
    prisma.coupon.count({ where }),
  ]);

  const data = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    value: Number(c.value),
    minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
    maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    maxUsageCount: c.maxUsageCount,
    usedCount: c.usedCount,
    isActive: c.isActive,
    usageCount: c._count.usages,
    createdAt: c.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json();
  const dto = createCouponSchema.parse(body);

  const coupon = await prisma.coupon.create({
    data: {
      code: dto.code.toUpperCase(),
      name: dto.name,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount,
      maxDiscount: dto.maxDiscount,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      maxUsageCount: dto.maxUsageCount,
      isActive: dto.isActive ?? true,
    },
  });

  return successResponse(
    {
      ...coupon,
      value: Number(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    },
    201,
  );
});
