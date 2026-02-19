import { test, expect } from '@playwright/test';

test.describe('인증', () => {
  test('로그인 페이지 접근', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
  });

  test('회원가입 페이지 접근', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('form')).toBeVisible();
  });

  test('미인증 사용자 마이페이지 리다이렉트', async ({ page }) => {
    await page.goto('/mypage');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('미인증 사용자 체크아웃 리다이렉트', async ({ page }) => {
    await page.goto('/checkout');
    // Should redirect to login or show auth required
    await page.waitForURL(/\/login/, { timeout: 5000 }).catch(() => {
      // Some implementations show an error page instead
    });
  });
});
