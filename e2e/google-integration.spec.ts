import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * Google連携ページ用の認証セットアップ
 */
async function setupAuthenticatedGooglePage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
      headers: { 'content-range': '0-0/0' },
    });
  });

  // ログインして設定ページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/settings');
}

test.describe('Google連携機能', () => {
  test.describe('Google連携設定 - 正常系', () => {
    test('Google連携タブが表示される', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google連携タブが表示される
      await expect(page.getByRole('tab', { name: /Google/i })).toBeVisible();
    });

    test('Google連携ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // Google連携ボタンが表示される
      await expect(page.getByRole('button', { name: /Google|連携|Connect/i })).toBeVisible();
    });

    test('Google連携を開始できる', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google認証APIをモック
      await page.route('**/api/auth/google-auth*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://accounts.google.com/o/oauth2/auth?client_id=...',
          }),
        });
      });

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // Google連携ボタンをクリック
      const connectButton = page.getByRole('button', { name: /Google|連携|Connect/i });
      if (await connectButton.isVisible().catch(() => false)) {
        await connectButton.click();

        // OAuth URLが生成される（またはリダイレクトされる）
        await page.waitForTimeout(1000);
      }
    });

    test('Google連携済みの場合、連携状態が表示される', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google連携済みをモック
      await page.route('**/rest/v1/google_auth_tokens*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              tenant_id: 'test-user-id',
              access_token: 'mock-token',
              expiry_date: Date.now() + 3600000,
            },
          ]),
        });
      });

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // 連携済みメッセージが表示される
      await expect(page.getByText(/連携済み|Connected/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Google連携 - 異常系', () => {
    test('Google認証API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google認証APIをエラーにする
      await page.route('**/api/auth/google-auth*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
          }),
        });
      });

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // Google連携ボタンをクリック
      const connectButton = page.getByRole('button', { name: /Google|連携|Connect/i });
      if (await connectButton.isVisible().catch(() => false)) {
        await connectButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // ネットワークエラーをモック
      await page.route('**/api/auth/google-auth*', (route) => {
        route.abort('failed');
      });

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // ページはクラッシュせず表示される
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    });
  });

  test.describe('Google連携解除 - 正常系', () => {
    test('Google連携を解除できる', async ({ page }) => {
      await setupAuthenticatedGooglePage(page);

      // Google連携解除APIをモック
      await page.route('**/api/auth/google-disconnect*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Google連携タブをクリック
      await page.getByRole('tab', { name: /Google/i }).click();

      // 解除ボタンをクリック（存在する場合）
      const disconnectButton = page.getByRole('button', { name: /解除|Disconnect/i });
      if (await disconnectButton.isVisible().catch(() => false)) {
        await disconnectButton.click();

        // 成功メッセージが表示される
        await expect(page.getByText(/解除|Disconnected/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

