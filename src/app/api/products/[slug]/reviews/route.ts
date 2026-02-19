import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paginatedResponse } from '@/lib/api-handler';
import { parsePaginationParams } from '@/lib/utils';
import { AppError, NotFoundError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
    const sort = req.nextUrl.searchParams.get('sort') ?? 'newest';

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) throw new NotFoundError('상품');

    const orderBy =
      sort === 'rating_desc'
        ? { rating: 'desc' as const }
        : sort === 'rating_asc'
          ? { rating: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          content: true,
          images: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.review.count({ where: { productId: product.id } }),
    ]);

    const data = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      images: r.images,
      userName: r.user.name,
      createdAt: r.createdAt,
    }));

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 },
    );
  }
}
