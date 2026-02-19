import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse, paginatedResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';
import { ReviewService } from '@/application/review/review.service';

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10, '리뷰는 10자 이상 작성해주세요.').max(1000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = await req.json();
  const dto = createReviewSchema.parse(body);

  const reviewService = new ReviewService(prisma);
  const review = await reviewService.createReview(session.user.id, dto);

  return successResponse(review, 201);
});

export const GET = apiHandler(async (req: NextRequest) => {
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const productId = req.nextUrl.searchParams.get('productId');
  const userId = req.nextUrl.searchParams.get('userId');
  const sort = req.nextUrl.searchParams.get('sort') ?? 'newest';

  const where: Record<string, unknown> = {};
  if (productId) where.productId = productId;
  if (userId) where.userId = userId;

  const orderBy =
    sort === 'rating_desc'
      ? { rating: 'desc' as const }
      : sort === 'rating_asc'
        ? { rating: 'asc' as const }
        : { createdAt: 'desc' as const };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const data = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    content: r.content,
    images: r.images,
    user: r.user,
    product: r.product,
    createdAt: r.createdAt,
  }));

  return paginatedResponse(data, { page, limit, total });
});
