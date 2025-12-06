import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * レビュー分析ページ用の認証セットアップ
 */
async function setupAuthenticatedAnalyticsPage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // レビュー分析APIをモック
  await page.route('**/rest/v1/reviews*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { rating: 5, created_at: '2024-01-15T10:00:00Z' },
        { rating: 4, created_at: '2024-01-14T15:30:00Z' },
        { rating: 5, created_at: '2024-01-13T09:00:00Z' },
      ]),
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('reviews')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインしてレビュー分析ページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/reviews/analytics');
}

test.describe('レビュー分析機能', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('レビュー分析ページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedAnalyticsPage(page);

      // タイトルが表示される
      await expect(page.getByRole('heading', { name: /分析|Analytics/i })).toBeVisible();
    });

    test('分析チャートが表示される', async ({ page }) => {
      await setupAuthenticatedAnalyticsPage(page);

      // チャートが表示される（Chart.js）
      await expect(page.locator('canvas')).toBeVisible({ timeout: 5000 });
    });

    test('統計情報が表示される', async ({ page }) => {
      await setupAuthenticatedAnalyticsPage(page);

      // 統計情報が表示される
      await expect(page.getByText(/平均|Average|総数|Total/i)).toBeVisible();
    });
  });

  test.describe('レビュー分析 - 異常系', () => {
    test('API エラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/rest/v1/reviews*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('reviews')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
      await page.goto('/reviews/analytics');

      // ページは表示される
      await expect(page.getByRole('heading', { name: /分析|Analytics/i })).toBeVisible();
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/reviews*', (route) => {
        route.abort('failed');
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('reviews')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
      await page.goto('/reviews/analytics');

      // ページは表示される
      await expect(page.getByRole('heading', { name: /分析|Analytics/i })).toBeVisible();
    });
  });
});

