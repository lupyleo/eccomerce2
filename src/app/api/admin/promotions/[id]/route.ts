import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

const updatePromotionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!promotion) throw new NotFoundError('프로모션');

    return successResponse({
      ...promotion,
      discountRate: Number(promotion.discountRate),
    });
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = updatePromotionSchema.parse(body);

    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundError('프로모션');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.discountRate !== undefined) data.discountRate = dto.discountRate;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await prisma.promotion.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return successResponse({
      ...updated,
      discountRate: Number(updated.discountRate),
    });
  },
);

export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;

    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundError('프로모션');

    await prisma.promotion.delete({ where: { id } });

    return successResponse({ deleted: true });
  },
);
