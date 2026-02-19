import { test, expect } from '@playwright/test';

test.describe('관리자 API 보안', () => {
  const adminApis = [
    '/api/admin/dashboard',
    '/api/admin/products',
    '/api/admin/orders',
    '/api/admin/users',
    '/api/admin/coupons',
    '/api/admin/promotions',
    '/api/admin/returns',
    '/api/admin/stock-alerts',
    '/api/admin/stock-logs',
  ];

  for (const endpoint of adminApis) {
    test(`${endpoint} 미인증시 401`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(401);
    });
  }
});

test.describe('관리자 대시보드', () => {
  test('대시보드 API 응답 구조 (인증 필요)', async ({ request }) => {
    const res = await request.get('/api/admin/dashboard');
    // Without auth, should get 401
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});
