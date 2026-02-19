import type { PrismaClient, ProductStatus } from '@prisma/client';
import { NotFoundError, AppError } from '@/lib/errors';
import { generateSlug } from '@/domain/product/entities';

export interface CreateProductDto {
  name: string;
  description: string;
  basePrice: number;
  categoryId: string;
  brandId?: string;
  status?: ProductStatus;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  basePrice?: number;
  categoryId?: string;
  brandId?: string | null;
  status?: ProductStatus;
}

export interface CreateVariantDto {
  size: string;
  color: string;
  colorCode?: string;
  price: number;
  stock: number;
  sku?: string;
}

export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async createProduct(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundError('카테고리');

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brand) throw new NotFoundError('브랜드');
    }

    let slug = generateSlug(dto.name);
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        basePrice: dto.basePrice,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        status: dto.status ?? 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('상품');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      let slug = generateSlug(dto.name);
      const existing = await this.prisma.product.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.brandId !== undefined) data.brandId = dto.brandId;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('상품');

    const hasOrders = await this.prisma.orderItem.findFirst({
      where: { variant: { productId: id } },
    });

    if (hasOrders) {
      throw new AppError('PRODUCT_HAS_ORDERS', '주문 이력이 있는 상품은 삭제할 수 없습니다. 상태를 숨김으로 변경하세요.');
    }

    await this.prisma.product.delete({ where: { id } });
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true },
    });
    if (!product) throw new NotFoundError('상품');

    const sku =
      dto.sku ??
      `${(product.brand?.slug ?? 'GEN').slice(0, 3).toUpperCase()}-${product.slug.slice(0, 5).toUpperCase()}-${dto.size.toUpperCase()}-${dto.color.slice(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    return this.prisma.productVariant.create({
      data: {
        productId,
        sku,
        size: dto.size,
        color: dto.color,
        colorCode: dto.colorCode,
        price: dto.price,
        stock: dto.stock,
      },
    });
  }

  async updateVariant(variantId: string, data: Partial<CreateVariantDto>) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundError('상품 옵션');

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.size !== undefined && { size: data.size }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.colorCode !== undefined && { colorCode: data.colorCode }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.stock !== undefined && { stock: data.stock }),
      },
    });
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundError('상품 옵션');

    const hasOrders = await this.prisma.orderItem.findFirst({
      where: { variantId },
    });
    if (hasOrders) {
      throw new AppError('VARIANT_HAS_ORDERS', '주문 이력이 있는 옵션은 삭제할 수 없습니다. 비활성화하세요.');
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });
  }
}
