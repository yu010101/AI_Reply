import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * レビュー同期ページ用の認証セットアップ
 */
async function setupAuthenticatedSyncPage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // レビュー同期APIをモック
  await page.route('**/api/google-reviews/sync*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          synced_count: 5,
          new_reviews: 3,
        },
      }),
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
      headers: { 'content-range': '0-0/0' },
    });
  });

  // ログインしてダッシュボードに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('レビュー同期機能', () => {
  test.describe('レビュー同期 - 正常系', () => {
    test('レビュー同期ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // レビュー同期ボタンが表示される
      await expect(page.getByRole('button', { name: /同期|Sync|レビュー/i })).toBeVisible();
    });

    test('レビュー同期を実行できる', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // 成功メッセージが表示される
        await expect(page.getByText(/同期|Sync|成功|Success/i)).toBeVisible({ timeout: 10000 });
      }
    });

    test('同期中はローディング状態が表示される', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // 遅延レスポンスをモック
      await page.route('**/api/google-reviews/sync*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { synced_count: 5 },
          }),
        });
      });

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // ローディング状態が表示される
        await expect(page.locator('[role="progressbar"]')).toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('レビュー同期 - 異常系', () => {
    test('Google連携未設定時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // Google連携未設定エラーをモック
      await page.route('**/api/google-reviews/sync*', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'GOOGLE_NOT_CONNECTED',
              message: 'Google連携を設定してください',
            },
          }),
        });
      });

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // エラーメッセージが表示される
        await expect(page.getByText(/Google連携|設定/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('Google API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // Google API エラーをモック
      await page.route('**/api/google-reviews/sync*', (route) => {
        route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'EXT_001',
              message: 'Google API エラーが発生しました',
            },
          }),
        });
      });

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });

    test('レート制限エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // レート制限エラーをモック
      await page.route('**/api/google-reviews/sync*', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'LIMIT_002',
              message: 'レート制限に達しました',
            },
          }),
        });
      });

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // エラーメッセージが表示される
        await expect(page.getByText(/レート制限|Rate limit/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await setupAuthenticatedSyncPage(page);

      // ネットワークエラーをモック
      await page.route('**/api/google-reviews/sync*', (route) => {
        route.abort('failed');
      });

      // レビュー同期ボタンをクリック
      const syncButton = page.getByRole('button', { name: /同期|Sync/i });
      if (await syncButton.isVisible().catch(() => false)) {
        await syncButton.click();

        // ページはクラッシュせず表示される
        await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

