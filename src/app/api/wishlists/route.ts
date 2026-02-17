import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAuth } from '@/lib/auth-guard';

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const wishlists = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          status: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
          brand: { select: { name: true } },
        },
      },
    },
  });

  const data = wishlists.map((w) => ({
    id: w.id,
    productId: w.productId,
    product: {
      id: w.product.id,
      name: w.product.name,
      slug: w.product.slug,
      basePrice: Number(w.product.basePrice),
      status: w.product.status,
      primaryImage: w.product.images[0] ?? null,
      brand: w.product.brand?.name ?? null,
    },
    createdAt: w.createdAt,
  }));

  return successResponse(data);
});
