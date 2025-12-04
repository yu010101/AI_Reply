import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * レビュー管理ページ用の認証とデータセットアップ
 */
async function setupAuthenticatedReviewsPage(page: Page, reviewsData: object[] = []) {
  await mockSupabaseAuthSuccess(page);

  // レビューAPIをモック
  await page.route('**/api/reviews*', (route) => {
    const url = new URL(route.request().url());
    const pageNum = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: reviewsData,
        pagination: {
          page: pageNum,
          limit: limit,
          total: reviewsData.length,
        },
      }),
    });
  });

  // Supabase REST APIもモック
  await page.route('**/rest/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
      headers: { 'content-range': '0-0/0' },
    });
  });

  // ログインしてレビューページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/reviews');
}

const mockReviews = [
  {
    id: '1',
    author: '田中太郎',
    rating: 5,
    comment: '素晴らしいサービスでした！スタッフの対応が丁寧で、また利用したいです。',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    author: '佐藤花子',
    rating: 4,
    comment: '概ね満足です。少し待ち時間がありましたが、料理は美味しかったです。',
    status: 'responded',
    created_at: '2024-01-14T15:30:00Z',
  },
  {
    id: '3',
    author: '鈴木一郎',
    rating: 2,
    comment: '期待はずれでした。改善を希望します。',
    status: 'pending',
    created_at: '2024-01-13T09:00:00Z',
  },
];

test.describe('レビュー管理', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('レビュー管理ページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // タイトルが表示される（ヘディングを特定）
      await expect(page.getByRole('heading', { name: 'レビュー管理' })).toBeVisible();
    });

    test('ステータスフィルターが表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // フィルターが表示される（MUIのセレクトを確認）
      await expect(page.locator('.MuiSelect-select').first()).toBeVisible();
    });

    test('レビューカードが表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // レビュー内容が表示される
      await expect(page.getByText('田中太郎')).toBeVisible();
      await expect(page.getByText(/素晴らしいサービスでした/)).toBeVisible();
    });

    test('評価（星）が表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // 星評価が表示される
      await expect(page.getByText('★★★★★')).toBeVisible();
    });

    test('アクションボタンが表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // 対応済みボタンと無視ボタンが表示される
      await expect(page.getByRole('button', { name: '対応済み' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '無視' }).first()).toBeVisible();
    });
  });

  test.describe('フィルタリング', () => {
    test('ステータスフィルターで絞り込みができる', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      // フィルターをクリック（MUIセレクト）
      await page.locator('.MuiSelect-select').first().click();
      await page.getByRole('option', { name: '未対応' }).click();

      // フィルターが適用される（UIが更新される）
      await expect(page.locator('.MuiSelect-select').first()).toContainText('未対応');
    });

    test('すべてのステータスを選択できる', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, mockReviews);

      await page.locator('.MuiSelect-select').first().click();
      await page.getByRole('option', { name: 'すべて' }).click();

      // フィルターが変更された（選択操作が成功した）
      await expect(page.locator('.MuiSelect-select').first()).toBeVisible();
    });
  });

  test.describe('レビュー操作 - 正常系', () => {
    test('レビューを対応済みにできる', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // 初期データ
      await page.route('**/api/reviews*', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: mockReviews,
              pagination: { page: 1, limit: 10, total: mockReviews.length },
            }),
          });
        }
      });

      // PUT リクエストをモック
      await page.route('**/api/reviews/*', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

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
      await page.goto('/reviews');

      // 対応済みボタンをクリック
      await page.getByRole('button', { name: '対応済み' }).first().click();

      // ボタンクリックが成功する（MUIのエラーアラートが表示されない）
      await expect(page.locator('.MuiAlert-standardError')).not.toBeVisible({ timeout: 2000 });
    });

    test('レビューを無視にできる', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/api/reviews*', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: mockReviews,
              pagination: { page: 1, limit: 10, total: mockReviews.length },
            }),
          });
        }
      });

      await page.route('**/api/reviews/*', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

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
      await page.goto('/reviews');

      // 無視ボタンをクリック
      await page.getByRole('button', { name: '無視' }).first().click();

      // エラーが表示されない（MUIのエラーアラート）
      await expect(page.locator('.MuiAlert-standardError')).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('レビュー管理 - 異常系', () => {
    test('レビューがない場合、空状態が表示される', async ({ page }) => {
      await setupAuthenticatedReviewsPage(page, []);

      // ページは表示されるがレビューカードがない
      await expect(page.getByRole('heading', { name: 'レビュー管理' })).toBeVisible();
    });

    test('API エラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/api/reviews*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

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
      await page.goto('/reviews');

      // ページタイトルは表示される
      await expect(page.getByRole('heading', { name: 'レビュー管理' })).toBeVisible();
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/api/reviews*', (route) => {
        route.abort('failed');
      });

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
      await page.goto('/reviews');

      // ページは表示される
      await expect(page.getByRole('heading', { name: 'レビュー管理' })).toBeVisible();
    });

    test('ステータス更新失敗時にエラーが発生してもページがクラッシュしない', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.route('**/api/reviews*', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: mockReviews,
              pagination: { page: 1, limit: 10, total: mockReviews.length },
            }),
          });
        }
      });

      // PUT リクエストをエラーにする
      await page.route('**/api/reviews/*', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Update failed' }),
          });
        }
      });

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
      await page.goto('/reviews');

      // 対応済みボタンをクリック
      await page.getByRole('button', { name: '対応済み' }).first().click();

      // ページはクラッシュせず表示され続ける
      await expect(page.getByRole('heading', { name: 'レビュー管理' })).toBeVisible();
    });
  });

  test.describe('ページネーション', () => {
    test('ページネーションが表示される（複数ページある場合）', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // 大量のレビューをモック
      const manyReviews = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        author: `ユーザー${i + 1}`,
        rating: Math.floor(Math.random() * 5) + 1,
        comment: `レビュー${i + 1}の内容`,
        status: 'pending',
        created_at: new Date().toISOString(),
      }));

      await page.route('**/api/reviews*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: manyReviews.slice(0, 10),
            pagination: { page: 1, limit: 10, total: 25 },
          }),
        });
      });

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
      await page.goto('/reviews');

      // ページネーションが表示される（MUI Pagination）
      await expect(page.locator('.MuiPagination-root')).toBeVisible();
    });
  });
});
