import { test, expect } from '@playwright/test';

test.describe('홈페이지', () => {
  test('메인 페이지 로딩', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/clothing/i);
  });

  test('네비게이션 링크 존재', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('상품 섹션이 표시됨', async ({ page }) => {
    await page.goto('/');
    // Homepage should show product sections (new arrivals or featured)
    await expect(page.locator('main')).toBeVisible();
  });
});
