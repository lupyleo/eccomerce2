import type { PrismaClient, Prisma } from '@prisma/client';
import type { ProductRepository, ProductFilter } from '@/domain/product/repository';
import type { ProductEntity } from '@/domain/product/entities';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product ? this.toEntity(product) : null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    return product ? this.toEntity(product) : null;
  }

  async findMany(
    filter: ProductFilter,
    page: number,
    limit: number,
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const where = this.buildWhereClause(filter);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: products.map((p) => this.toEntity(p)), total };
  }

  async create(
    data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt' | 'avgRating' | 'reviewCount' | 'salesCount'>,
  ): Promise<ProductEntity> {
    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        basePrice: data.basePrice,
        categoryId: data.categoryId,
        brandId: data.brandId,
        status: data.status,
      },
    });
    return this.toEntity(product);
  }

  async update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity> {
    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.status !== undefined) updateData.status = data.status;

    const product = await this.prisma.product.update({ where: { id }, data: updateData });
    return this.toEntity(product);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  private buildWhereClause(filter: ProductFilter): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.brandId) where.brandId = filter.brandId;
    if (filter.status) where.status = filter.status as never;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.minPrice || filter.maxPrice) {
      where.basePrice = {};
      if (filter.minPrice) where.basePrice.gte = filter.minPrice;
      if (filter.maxPrice) where.basePrice.lte = filter.maxPrice;
    }
    if (filter.sizes?.length || filter.colors?.length) {
      where.variants = {
        some: {
          isActive: true,
          ...(filter.sizes?.length && { size: { in: filter.sizes } }),
          ...(filter.colors?.length && { color: { in: filter.colors } }),
        },
      };
    }

    return where;
  }

  private toEntity(product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    basePrice: Prisma.Decimal;
    categoryId: string;
    brandId: string | null;
    status: string;
    avgRating: Prisma.Decimal;
    reviewCount: number;
    salesCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): ProductEntity {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: Number(product.basePrice),
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: product.status as ProductEntity['status'],
      avgRating: Number(product.avgRating),
      reviewCount: product.reviewCount,
      salesCount: product.salesCount,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
