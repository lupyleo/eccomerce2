import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';

export const GET = apiHandler(async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      depth: true,
      sortOrder: true,
    },
  });

  // Build tree structure
  type CategoryNode = (typeof categories)[number] & { children: CategoryNode[] };
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return successResponse(roots);
});
