import type { ProductEntity, ProductVariantEntity, ProductImageEntity } from './entities';

export interface ProductFilter {
  categoryId?: string;
  brandId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  search?: string;
}

export interface ProductRepository {
  findById(id: string): Promise<ProductEntity | null>;
  findBySlug(slug: string): Promise<ProductEntity | null>;
  findMany(filter: ProductFilter, page: number, limit: number): Promise<{ data: ProductEntity[]; total: number }>;
  create(data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt' | 'avgRating' | 'reviewCount' | 'salesCount'>): Promise<ProductEntity>;
  update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity>;
  delete(id: string): Promise<void>;
}

export interface ProductVariantRepository {
  findByProductId(productId: string): Promise<ProductVariantEntity[]>;
  create(data: Omit<ProductVariantEntity, 'id'>): Promise<ProductVariantEntity>;
  update(id: string, data: Partial<ProductVariantEntity>): Promise<ProductVariantEntity>;
  delete(id: string): Promise<void>;
}

export interface ProductImageRepository {
  findByProductId(productId: string): Promise<ProductImageEntity[]>;
  create(data: Omit<ProductImageEntity, 'id'>): Promise<ProductImageEntity>;
  delete(id: string): Promise<void>;
  reorder(productId: string, imageIds: string[]): Promise<void>;
}
