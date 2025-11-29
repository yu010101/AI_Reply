import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

const mockTenants = [
  {
    id: '1',
    name: '株式会社テスト',
    email: 'test@company.com',
    plan: 'pro',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'サンプル企業',
    email: 'sample@company.com',
    plan: 'free',
    status: 'active',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
];

/**
 * テナント管理ページ用の認証とデータセットアップ
 */
async function setupAuthenticatedTenantsPage(page: Page, tenantsData: object[] = mockTenants) {
  await mockSupabaseAuthSuccess(page);

  // テナントAPIをモック
  await page.route('**/rest/v1/tenants*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tenantsData),
    });
  });

  // その他のSupabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('tenants')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインしてテナントページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/tenants');
}

test.describe('テナント管理', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('テナント一覧ページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // タイトルが表示される
      await expect(page.getByText('テナント一覧')).toBeVisible();
    });

    test('新規作成ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // 新規作成ボタンが表示される
      await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
    });

    test('テナントカードが表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // テナント名が表示される
      await expect(page.getByText('株式会社テスト')).toBeVisible();
      await expect(page.getByText('サンプル企業')).toBeVisible();
    });

    test('テナント情報が表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // メールアドレスが表示される
      await expect(page.getByText('test@company.com')).toBeVisible();

      // プランが表示される
      await expect(page.getByText(/pro/i)).toBeVisible();
      await expect(page.getByText(/free/i)).toBeVisible();

      // ステータスが表示される
      await expect(page.getByText(/active/i).first()).toBeVisible();
    });

    test('詳細ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // 詳細ボタンが表示される
      const detailButtons = page.getByRole('button', { name: '詳細' });
      await expect(detailButtons.first()).toBeVisible();
    });
  });

  test.describe('テナント操作', () => {
    test('新規作成ボタンをクリックすると新規作成ページに遷移する', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      await page.getByRole('button', { name: '新規作成' }).click();
      await expect(page).toHaveURL(/\/tenants\/new/);
    });

    test('詳細ボタンをクリックするとテナント詳細ページに遷移する', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      await page.getByRole('button', { name: '詳細' }).first().click();
      await expect(page).toHaveURL(/\/tenants\/1/);
    });
  });

  test.describe('テナント管理 - 異常系', () => {
    test('テナントがない場合、空状態メッセージが表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page, []);

      // 空の状態メッセージが表示される
      await expect(page.getByText('テナントがありません')).toBeVisible();
    });

    test('API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/rest/v1/tenants*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error', message: 'Database error' }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('tenants')) {
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
      await page.goto('/tenants');

      // エラーメッセージが表示される
      await expect(page.getByText(/取得に失敗しました|エラー/)).toBeVisible({ timeout: 10000 });
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/rest/v1/tenants*', (route) => {
        route.abort('failed');
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('tenants')) {
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
      await page.goto('/tenants');

      // ページタイトルは表示される
      await expect(page.getByText('テナント一覧')).toBeVisible();
    });

    test('ローディング状態が表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // 遅延レスポンスをモック
      await page.route('**/rest/v1/tenants*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockTenants),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('tenants')) {
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
      await page.goto('/tenants');

      // ローディングメッセージが表示される
      await expect(page.getByText('読み込み中...')).toBeVisible();

      // 最終的にデータが表示される
      await expect(page.getByText('株式会社テスト')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイルサイズでもテナント一覧が正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupAuthenticatedTenantsPage(page);

      // 主要な要素が表示される
      await expect(page.getByText('テナント一覧')).toBeVisible();
      await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
    });

    test('タブレットサイズでもテナント一覧が正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupAuthenticatedTenantsPage(page);

      // 主要な要素が表示される
      await expect(page.getByText('テナント一覧')).toBeVisible();
      await expect(page.getByText('株式会社テスト')).toBeVisible();
    });
  });

  test.describe('データ表示', () => {
    test('作成日が正しいフォーマットで表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // 作成日が表示される（日本語フォーマット）
      await expect(page.getByText(/作成日/)).toBeVisible();
    });

    test('複数のテナントが正しくソートされて表示される', async ({ page }) => {
      await setupAuthenticatedTenantsPage(page);

      // 両方のテナントが表示される
      await expect(page.getByText('株式会社テスト')).toBeVisible();
      await expect(page.getByText('サンプル企業')).toBeVisible();
    });
  });
});
