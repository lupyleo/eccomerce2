import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';

export const GET = apiHandler(async (_req: NextRequest) => {
  const session = await requireAuth();
  const now = new Date();

  const usedCouponIds = await prisma.couponUsage
    .findMany({
      where: { userId: session.user.id },
      select: { couponId: true },
    })
    .then((usages) => usages.map((u) => u.couponId));

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      id: { notIn: usedCouponIds },
    },
    orderBy: { validUntil: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      value: true,
      minOrderAmount: true,
      maxDiscount: true,
      maxUsageCount: true,
      usedCount: true,
      validFrom: true,
      validUntil: true,
    },
  });

  // Filter out coupons that have reached their usage limit
  const availableCoupons = coupons.filter(
    (c) => c.maxUsageCount === null || c.usedCount < c.maxUsageCount,
  );

  const data = availableCoupons.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    value: Number(c.value),
    minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
    maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
  }));

  return successResponse(data);
});
