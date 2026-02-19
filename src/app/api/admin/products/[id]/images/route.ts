import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

const addImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()),
});

export const POST = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = addImageSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('상품');

    if (dto.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false },
      });
    }

    const imageCount = await prisma.productImage.count({ where: { productId: id } });

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url: dto.url,
        alt: dto.alt,
        isPrimary: dto.isPrimary ?? imageCount === 0,
        sortOrder: imageCount,
      },
    });

    return successResponse(image, 201);
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const dto = reorderImagesSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('상품');

    for (let i = 0; i < dto.imageIds.length; i++) {
      await prisma.productImage.update({
        where: { id: dto.imageIds[i] },
        data: { sortOrder: i },
      });
    }

    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(images);
  },
);
