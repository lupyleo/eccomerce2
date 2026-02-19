import type { PrismaClient, Prisma } from '@prisma/client';
import type { ReviewRepository } from '@/domain/review/repository';
import type { ReviewEntity } from '@/domain/review/entities';

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProductId(
    productId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ReviewEntity[]; total: number }> {
    const where: Prisma.ReviewWhereInput = { productId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { data: reviews.map((r) => this.toEntity(r)), total };
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ReviewEntity[]; total: number }> {
    const where: Prisma.ReviewWhereInput = { userId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { data: reviews.map((r) => this.toEntity(r)), total };
  }

  async create(data: Omit<ReviewEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewEntity> {
    const review = await this.prisma.review.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        orderId: data.orderId,
        rating: data.rating,
        content: data.content,
        images: data.images,
      },
    });
    return this.toEntity(review);
  }

  async update(id: string, data: Partial<ReviewEntity>): Promise<ReviewEntity> {
    const updateData: Prisma.ReviewUpdateInput = {};
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.images !== undefined) updateData.images = data.images;

    const review = await this.prisma.review.update({ where: { id }, data: updateData });
    return this.toEntity(review);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({ where: { id } });
  }

  private toEntity(review: {
    id: string;
    userId: string;
    productId: string;
    orderId: string;
    rating: number;
    content: string;
    images: string[];
    createdAt: Date;
    updatedAt: Date;
  }): ReviewEntity {
    return {
      id: review.id,
      userId: review.userId,
      productId: review.productId,
      orderId: review.orderId,
      rating: review.rating,
      content: review.content,
      images: review.images,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
