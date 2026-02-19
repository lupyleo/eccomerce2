import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest } from '../../helpers/api-test-helpers';
import { auth } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma to prevent actual DB calls
vi.mock('@/lib/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get: () =>
        new Proxy(
          {},
          {
            get: () => vi.fn().mockResolvedValue([]),
          },
        ),
    },
  ),
}));

const mockAuth = vi.mocked(auth);

// Import all admin route handlers
const adminDashboard = await import('@/app/api/admin/dashboard/route');
const adminProducts = await import('@/app/api/admin/products/route');
const adminOrders = await import('@/app/api/admin/orders/route');
const adminCoupons = await import('@/app/api/admin/coupons/route');
const adminReturns = await import('@/app/api/admin/returns/route');
const adminStockAlerts = await import('@/app/api/admin/stock-alerts/route');
const adminStockLogs = await import('@/app/api/admin/stock-logs/route');
const adminUsers = await import('@/app/api/admin/users/route');
const adminPromotions = await import('@/app/api/admin/promotions/route');

describe('어드민 API 인증 가드 - 미인증 시 401', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  const adminEndpoints = [
    { name: '/api/admin/dashboard', handler: () => adminDashboard.GET },
    { name: '/api/admin/products', handler: () => adminProducts.GET },
    { name: '/api/admin/orders', handler: () => adminOrders.GET },
    { name: '/api/admin/coupons', handler: () => adminCoupons.GET },
    { name: '/api/admin/returns', handler: () => adminReturns.GET },
    { name: '/api/admin/stock-alerts', handler: () => adminStockAlerts.GET },
    { name: '/api/admin/stock-logs', handler: () => adminStockLogs.GET },
    { name: '/api/admin/users', handler: () => adminUsers.GET },
    { name: '/api/admin/promotions', handler: () => adminPromotions.GET },
  ];

  for (const { name, handler } of adminEndpoints) {
    it(`${name} - 미인증 시 401`, async () => {
      const req = createRequest(name);
      const res = await handler()(req);

      expect(res.status).toBe(401);
    });
  }
});

describe('어드민 API 인증 가드 - CUSTOMER 역할 시 403', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com', name: 'User', role: 'CUSTOMER' },
    });
  });

  const adminEndpoints = [
    { name: '/api/admin/dashboard', handler: () => adminDashboard.GET },
    { name: '/api/admin/products', handler: () => adminProducts.GET },
    { name: '/api/admin/orders', handler: () => adminOrders.GET },
  ];

  for (const { name, handler } of adminEndpoints) {
    it(`${name} - CUSTOMER 역할 시 403`, async () => {
      const req = createRequest(name);
      const res = await handler()(req);

      expect(res.status).toBe(403);
    });
  }
});
