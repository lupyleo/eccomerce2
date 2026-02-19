import type { Prisma } from '@prisma/client';
import { AppError, NotFoundError } from '@/lib/errors';
import { validateRating } from '@/domain/review/entities';

type PrismaClient = {
  order: Prisma.OrderDelegate;
  review: Prisma.ReviewDelegate;
  product: Prisma.ProductDelegate;
};

export interface CreateReviewDto {
  productId: string;
  orderId: string;
  rating: number;
  content: string;
  images?: string[];
}

export class ReviewService {
  constructor(private readonly prisma: PrismaClient) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    validateRating(dto.rating);

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundError('주문');
    }

    if (order.status !== 'CONFIRMED') {
      throw new AppError('REVIEW_NOT_ALLOWED', '구매 확정된 주문에 대해서만 리뷰를 작성할 수 있습니다.');
    }

    const hasOrderedProduct = order.items.some(
      (item) => item.variantId !== null,
    );
    if (!hasOrderedProduct) {
      throw new AppError('PRODUCT_NOT_IN_ORDER', '해당 주문에 포함된 상품이 아닙니다.');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_orderId_productId: {
          userId,
          orderId: dto.orderId,
          productId: dto.productId,
        },
      },
    });

    if (existingReview) {
      throw new AppError('REVIEW_ALREADY_EXISTS', '이미 리뷰를 작성했습니다.');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rating: dto.rating,
        content: dto.content,
        images: dto.images ?? [],
      },
    });

    await this.updateProductRating(dto.productId);

    return review;
  }

  async updateProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
      },
    });
  }
}
