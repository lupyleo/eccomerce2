import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, '상품명은 필수입니다.').max(200),
  description: z.string().min(1, '상품 설명은 필수입니다.'),
  basePrice: z.number().min(0, '가격은 0 이상이어야 합니다.'),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'HIDDEN', 'DISCONTINUED']).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  basePrice: z.number().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'HIDDEN', 'DISCONTINUED']).optional(),
});

export const createVariantSchema = z.object({
  size: z.string().min(1, '사이즈는 필수입니다.'),
  color: z.string().min(1, '색상은 필수입니다.'),
  colorCode: z.string().optional(),
  price: z.number().min(0, '가격은 0 이상이어야 합니다.'),
  stock: z.number().int().min(0, '재고는 0 이상이어야 합니다.'),
  sku: z.string().optional(),
});

export const updateVariantSchema = z.object({
  size: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  colorCode: z.string().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});
