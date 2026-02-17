import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api-handler';
import { AppError, NotFoundError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        brand: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, alt: true, sortOrder: true, isPrimary: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            colorCode: true,
            price: true,
            stock: true,
            reservedStock: true,
            isActive: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundError('상품');

    return successResponse({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: Number(product.basePrice),
      status: product.status,
      category: product.category,
      brand: product.brand,
      images: product.images,
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        availableStock: v.stock - v.reservedStock,
      })),
      avgRating: Number(product.avgRating),
      reviewCount: product.reviewCount,
      salesCount: product.salesCount,
    });
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
