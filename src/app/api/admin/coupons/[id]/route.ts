import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

const updateCouponSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  value: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUsageCount: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, orderNumber: true } },
          },
          orderBy: { usedAt: 'desc' },
          take: 20,
        },
        _count: { select: { usages: true } },
      },
    });

    if (!coupon) throw new NotFoundError('쿠폰');

    return successResponse({
      ...coupon,
      value: Number(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    });
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = updateCouponSchema.parse(body);

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError('쿠폰');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) data.validUntil = new Date(dto.validUntil);
    if (dto.maxUsageCount !== undefined) data.maxUsageCount = dto.maxUsageCount;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.coupon.update({ where: { id }, data });

    return successResponse({
      ...updated,
      value: Number(updated.value),
      minOrderAmount: updated.minOrderAmount ? Number(updated.minOrderAmount) : null,
      maxDiscount: updated.maxDiscount ? Number(updated.maxDiscount) : null,
    });
  },
);

export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError('쿠폰');

    await prisma.coupon.delete({ where: { id } });

    return successResponse({ deleted: true });
  },
);
