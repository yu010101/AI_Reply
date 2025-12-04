import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * 設定ページ用の認証セットアップ
 */
async function setupAuthenticatedSettingsPage(page: Page) {
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

test.describe('設定ページ', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('設定ページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // タイトルが表示される
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    });

    test('タブが正しく表示される', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // タブが表示される
      await expect(page.getByRole('tab', { name: 'Google Business Profile連携' })).toBeVisible();
      await expect(page.getByRole('tab', { name: '通知設定' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'サブスクリプション管理' })).toBeVisible();
    });

    test('デフォルトでGoogle連携タブが選択されている', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // 最初のタブが選択状態
      const googleTab = page.getByRole('tab', { name: 'Google Business Profile連携' });
      await expect(googleTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('タブ切り替え', () => {
    test('通知設定タブに切り替えられる', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // 通知設定タブをクリック
      await page.getByRole('tab', { name: '通知設定' }).click();

      // タブが選択状態になる
      const notificationTab = page.getByRole('tab', { name: '通知設定' });
      await expect(notificationTab).toHaveAttribute('aria-selected', 'true');

      // URLが更新される
      await expect(page).toHaveURL(/tab=1/);
    });

    test('サブスクリプション管理タブに切り替えられる', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // サブスクリプション管理タブをクリック
      await page.getByRole('tab', { name: 'サブスクリプション管理' }).click();

      // タブが選択状態になる
      const subscriptionTab = page.getByRole('tab', { name: 'サブスクリプション管理' });
      await expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');

      // URLが更新される
      await expect(page).toHaveURL(/tab=2/);
    });

    test('URLパラメータでタブを直接指定できる', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // URLパラメータでタブ2を指定
      await page.goto('/settings?tab=2');

      // サブスクリプション管理タブが選択される
      const subscriptionTab = page.getByRole('tab', { name: 'サブスクリプション管理' });
      await expect(subscriptionTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Google Business Profile連携', () => {
    test('Google連携タブのコンテンツが表示される', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // Google連携関連の要素が表示される
      const googleTab = page.getByRole('tab', { name: 'Google Business Profile連携' });
      await googleTab.click();

      // タブパネルが表示される
      await expect(page.getByRole('tabpanel')).toBeVisible();
    });
  });

  test.describe('通知設定', () => {
    test('通知設定タブのコンテンツが表示される', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // 通知設定タブをクリック
      await page.getByRole('tab', { name: '通知設定' }).click();

      // タブパネルが表示される
      await expect(page.getByRole('tabpanel')).toBeVisible();
    });
  });

  test.describe('サブスクリプション管理', () => {
    test('サブスクリプション管理タブのコンテンツが表示される', async ({ page }) => {
      await setupAuthenticatedSettingsPage(page);

      // サブスクリプション管理タブをクリック
      await page.getByRole('tab', { name: 'サブスクリプション管理' }).click();

      // タブパネルが表示される
      await expect(page.getByRole('tabpanel')).toBeVisible();
    });
  });

  test.describe('設定ページ - 異常系', () => {
    test('API エラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
      await page.goto('/settings');

      // ページは表示される
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.abort('failed');
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
      await page.goto('/settings');

      // ページは表示される
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    });

    test('無効なタブパラメータでもページが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // 無効なタブパラメータを指定
      await page.goto('/settings?tab=999');

      // ページは表示される（デフォルトタブが選択される）
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    });
  });

  test.describe('ステータスメッセージ', () => {
    test('サブスクリプション成功メッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // 成功パラメータ付きでアクセス
      await page.goto('/settings?success=true&tab=2');

      // 成功メッセージが表示される
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('サブスクリプションの変更が完了しました');
    });

    test('サブスクリプションキャンセルメッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // キャンセルパラメータ付きでアクセス
      await page.goto('/settings?cancelled=true&tab=2');

      // キャンセルメッセージが表示される
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('キャンセルされました');
    });

    test('ステータスメッセージを閉じることができる', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      await page.goto('/settings?success=true&tab=2');

      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });

      // 閉じるボタンをクリック
      await alert.getByRole('button').click();
      await expect(alert).toBeHidden();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイルサイズでもタブが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupAuthenticatedSettingsPage(page);

      // タブが表示される
      await expect(page.getByRole('tab', { name: 'Google Business Profile連携' })).toBeVisible();
    });

    test('タブレットサイズでもタブが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupAuthenticatedSettingsPage(page);

      // タブが表示される
      await expect(page.getByRole('tab', { name: 'Google Business Profile連携' })).toBeVisible();
      await expect(page.getByRole('tab', { name: '通知設定' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'サブスクリプション管理' })).toBeVisible();
    });
  });
});
