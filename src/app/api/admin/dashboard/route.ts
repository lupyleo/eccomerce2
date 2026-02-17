import { prisma } from '@/lib/prisma';
import { apiHandler, successResponse } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth-guard';

export const GET = apiHandler(async () => {
  await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    todayOrders,
    pendingOrders,
    pendingReturns,
    lowStockVariants,
    recentOrders,
    topProducts,
    orderStatusCounts,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
      select: { finalAmount: true },
    }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.return.count({ where: { status: 'REQUESTED' } }),
    prisma.productVariant.count({
      where: { isActive: true, stock: { lte: 5 } },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
      select: { finalAmount: true, createdAt: true },
    }),
    prisma.product.findMany({
      orderBy: { salesCount: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        salesCount: true,
        basePrice: true,
      },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.finalAmount), 0);

  // Aggregate daily sales for last 30 days
  const dailySalesMap = new Map<string, number>();
  for (const order of recentOrders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) ?? 0) + Number(order.finalAmount));
  }
  const monthlySales = Array.from(dailySalesMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const orderStatusSummary = Object.fromEntries(
    orderStatusCounts.map((s) => [s.status, s._count]),
  );

  return successResponse({
    todaySales,
    todayOrders: todayOrders.length,
    pendingOrders,
    pendingReturns,
    lowStockVariants,
    monthlySales,
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      salesCount: p.salesCount,
      revenue: p.salesCount * Number(p.basePrice),
    })),
    orderStatusSummary,
  });
});
