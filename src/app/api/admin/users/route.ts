import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler, paginatedResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePaginationParams } from '@/lib/utils';

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin();
  const { page, limit, skip } = parsePaginationParams(req.nextUrl.searchParams);
  const search = req.nextUrl.searchParams.get('search');
  const role = req.nextUrl.searchParams.get('role');

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(users, { page, limit, total });
});
