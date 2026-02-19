import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';
import { ReviewService } from '@/application/review/review.service';

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().min(10).max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        product: { select: { id: true, name: true, slug: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!review) throw new NotFoundError('리뷰');

    return successResponse(review);
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const dto = updateReviewSchema.parse(body);

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.userId !== session.user.id) {
      throw new NotFoundError('리뷰');
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.images !== undefined && { images: dto.images }),
      },
    });

    if (dto.rating !== undefined) {
      const reviewService = new ReviewService(prisma);
      await reviewService.updateProductRating(review.productId);
    }

    return successResponse(updated);
  },
);

export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAuth();
    const { id } = await params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.userId !== session.user.id) {
      throw new NotFoundError('리뷰');
    }

    await prisma.review.delete({ where: { id } });

    const reviewService = new ReviewService(prisma);
    await reviewService.updateProductRating(review.productId);

    return successResponse({ deleted: true });
  },
);
