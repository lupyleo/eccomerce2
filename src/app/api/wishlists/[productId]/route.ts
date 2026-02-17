import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';

export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) => {
  const session = await requireAuth();
  const { productId } = await params;

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return successResponse({ wishlisted: false });
  }

  await prisma.wishlist.create({
    data: { userId: session.user.id, productId },
  });

  return successResponse({ wishlisted: true }, 201);
});

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) => {
  const session = await requireAuth();
  const { productId } = await params;

  await prisma.wishlist.deleteMany({
    where: { userId: session.user.id, productId },
  });

  return successResponse({ deleted: true });
});
