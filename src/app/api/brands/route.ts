import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';

export const GET = apiHandler(async () => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      description: true,
    },
  });

  return successResponse(brands);
});
