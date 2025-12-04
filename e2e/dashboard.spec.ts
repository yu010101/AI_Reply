import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * ダッシュボードテスト用の認証セットアップ
 */
async function setupAuthenticatedPage(page: Page) {
  // 認証をモック
  await mockSupabaseAuthSuccess(page);

  // ダッシュボードデータをモック
  await page.route('**/rest/v1/locations*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
      headers: { 'content-range': '0-0/0' },
    });
  });

  await page.route('**/rest/v1/reviews*', (route) => {
    const url = route.request().url();
    if (url.includes('select=rating')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { rating: 5 },
          { rating: 4 },
          { rating: 5 },
          { rating: 3 },
        ]),
      });
    } else if (url.includes('select=id')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            rating: 5,
            comment: '素晴らしいサービスでした！',
            reviewer_name: '田中太郎',
            review_date: '2024-01-15',
            locations: { name: '東京店' },
            replies: [],
          },
          {
            id: '2',
            rating: 4,
            comment: '良かったです',
            reviewer_name: '佐藤花子',
            review_date: '2024-01-14',
            locations: { name: '大阪店' },
            replies: [{ id: 'r1', content: 'ありがとうございます', is_ai_generated: true }],
          },
        ]),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/10' },
      });
    }
  });

  await page.route('**/rest/v1/replies*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
      headers: { 'content-range': '0-0/5' },
    });
  });

  // ログイン
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('ダッシュボード', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('ダッシュボードが正しく表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // タイトルが表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });

    test('統計カードが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // 統計情報が表示される
      await expect(page.getByText('総レビュー数')).toBeVisible();
      await expect(page.getByText('平均評価')).toBeVisible();
      await expect(page.getByText('返信率')).toBeVisible();
      await expect(page.getByText('AI生成返信数')).toBeVisible();
    });

    test('ナビゲーションメニューが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // ナビゲーションリンクが表示される
      await expect(page.getByRole('link', { name: /レビュー/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /設定/i })).toBeVisible();
    });

    test('レビュー同期ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // 同期ボタンが存在する
      await expect(page.getByRole('button', { name: /同期|レビュー/i })).toBeVisible();
    });

    test('月別レビュー数チャートが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // チャートセクションが表示される
      await expect(page.getByText('月別レビュー数')).toBeVisible();
    });

    test('評価分布チャートが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // 評価分布セクションが表示される
      await expect(page.getByText('評価分布')).toBeVisible();
    });

    test('最近のレビューセクションが表示される', async ({ page }) => {
      await setupAuthenticatedPage(page);

      // 最近のレビューセクションが表示される
      await expect(page.getByText('最近のレビュー')).toBeVisible();
    });
  });

  test.describe('データ表示', () => {
    test('レビュー数が正しく表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // レビュー数をモック（10件）
      await page.route('**/rest/v1/reviews*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
          headers: { 'content-range': '0-0/10' },
        });
      });

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

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      await expect(page.getByText('総レビュー数')).toBeVisible();
    });

    test('レビューがない場合、空のメッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // 空のレビューをモック
      await page.route('**/rest/v1/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
          headers: { 'content-range': '0-0/0' },
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // 空の状態メッセージまたはデフォルト値が表示される
      await expect(page.getByText('レビューはまだありません')).toBeVisible();
    });
  });

  test.describe('ダッシュボード - 異常系', () => {
    test('API エラー時にエラー状態が表示される', async ({ page }) => {
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

      // ダッシュボードは表示される（エラーがあってもクラッシュしない）
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // ネットワークエラーをモック
      await page.route('**/rest/v1/**', (route) => {
        route.abort('failed');
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // ページはクラッシュせず表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });

    test('タイムアウト時にローディング状態が適切に処理される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // 遅延レスポンスをモック
      await page.route('**/rest/v1/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
          headers: { 'content-range': '0-0/0' },
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // ページは最終的に表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('ナビゲーション', () => {
    test('レビューリンクをクリックするとレビューページに遷移する', async ({ page }) => {
      await setupAuthenticatedPage(page);

      await page.getByRole('link', { name: /レビュー/i }).click();
      await expect(page).toHaveURL(/\/reviews/);
    });

    test('設定リンクをクリックすると設定ページに遷移する', async ({ page }) => {
      await setupAuthenticatedPage(page);

      await page.getByRole('link', { name: /設定/i }).click();
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイルサイズでも正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupAuthenticatedPage(page);

      // 主要な要素が表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
      await expect(page.getByText('総レビュー数')).toBeVisible();
    });

    test('タブレットサイズでも正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupAuthenticatedPage(page);

      // 主要な要素が表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
      await expect(page.getByText('総レビュー数')).toBeVisible();
    });
  });
});
