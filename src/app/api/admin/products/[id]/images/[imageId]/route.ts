import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { NotFoundError } from '@/lib/errors';

export const DELETE = apiHandler(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; imageId: string }> },
  ) => {
    await requireAdmin();
    const { imageId } = await params;

    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundError('이미지');

    await prisma.productImage.delete({ where: { id: imageId } });

    if (image.isPrimary) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return successResponse({ deleted: true });
  },
);
