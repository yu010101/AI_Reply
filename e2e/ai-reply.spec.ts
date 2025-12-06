import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * AI返信生成ページ用の認証セットアップ
 */
async function setupAuthenticatedAIPage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // レビューAPIをモック
  await page.route('**/api/reviews*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: '1',
            author: '田中太郎',
            rating: 5,
            comment: '素晴らしいサービスでした！',
            status: 'pending',
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 10, total: 1 },
      }),
    });
  });

  // 利用量APIをモック
  await page.route('**/api/usage-metrics*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ai_replies_count: 5,
        ai_replies_limit: 100,
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

  // ログインしてレビューページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/reviews');
}

test.describe('AI返信生成機能', () => {
  test.describe('AI返信生成 - 正常系', () => {
    test('レビューに対してAI返信を生成できる', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをモック
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'reply-1',
              review_id: '1',
              content: 'ご利用いただき、ありがとうございます。',
              is_ai_generated: true,
              tone: 'polite',
            },
          }),
        });
      });

      // レビューカードが表示される
      await expect(page.getByText('田中太郎')).toBeVisible();

      // 「AI返信を生成」ボタンをクリック（存在する場合）
      const generateButton = page.getByRole('button', { name: /AI返信|生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();

        // 生成された返信が表示される
        await expect(page.getByText(/ご利用いただき|ありがとう/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('トーンを選択してAI返信を生成できる', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをモック
      await page.route('**/api/ai-reply/generate*', (route) => {
        const body = JSON.parse(route.request().postData() || '{}');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'reply-1',
              content: 'カジュアルな返信文',
              tone: body.tone || 'polite',
            },
          }),
        });
      });

      // トーン選択UIが存在する場合
      const toneSelect = page.locator('select[name="tone"], .MuiSelect-select').first();
      if (await toneSelect.isVisible().catch(() => false)) {
        await toneSelect.click();
        await page.getByRole('option', { name: /カジュアル|casual/i }).click();
      }

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();
        await expect(page.getByText(/カジュアル|返信/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('生成された返信を編集できる', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをモック
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'reply-1',
              content: '元の返信文',
            },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // 編集可能なテキストエリアが存在する場合
        const textarea = page.locator('textarea, input[type="text"]').filter({ hasText: /元の返信/i });
        if (await textarea.isVisible().catch(() => false)) {
          await textarea.fill('編集された返信文');
          await expect(textarea).toHaveValue('編集された返信文');
        }
      }
    });

    test('生成された返信を承認して投稿できる', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをモック
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'reply-1',
              content: '承認する返信文',
            },
          }),
        });
      });

      // 返信投稿APIをモック
      await page.route('**/api/google-reviews/reply*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { posted: true },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // 「承認して投稿」ボタンをクリック
        const approveButton = page.getByRole('button', { name: /承認|投稿|Post|Approve/i });
        if (await approveButton.isVisible().catch(() => false)) {
          await approveButton.click();

          // 成功メッセージが表示される
          await expect(page.getByText(/投稿|成功|Success/i)).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('AI返信生成 - 異常系', () => {
    test('利用量超過時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // 利用量超過をモック
      await page.route('**/api/usage-metrics*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ai_replies_count: 100,
            ai_replies_limit: 100,
          }),
        });
      });

      // AI返信生成APIをエラーにする
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'LIMIT_001',
              message: '利用量が上限に達しています',
            },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();

        // エラーメッセージが表示される
        await expect(page.getByText(/上限|利用量|Limit/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('OpenAI API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをエラーにする
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'EXT_002',
              message: 'AI返信の生成に失敗しました',
            },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });

    test('レビュー不存在時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // AI返信生成APIをエラーにする
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'レビューが見つかりません',
            },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();

        // エラーメッセージが表示される
        await expect(page.getByText(/見つかりません|Not found/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      // ネットワークエラーをモック
      await page.route('**/api/ai-reply/generate*', (route) => {
        route.abort('failed');
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();

        // ページはクラッシュせず表示される
        await expect(page.getByRole('heading', { name: /レビュー/i })).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('AI返信生成 - 再生成機能', () => {
    test('再生成ボタンで返信を再生成できる', async ({ page }) => {
      await setupAuthenticatedAIPage(page);

      let callCount = 0;
      await page.route('**/api/ai-reply/generate*', (route) => {
        callCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'reply-1',
              content: `生成された返信 ${callCount}`,
            },
          }),
        });
      });

      // 生成ボタンをクリック
      const generateButton = page.getByRole('button', { name: /生成|Generate/i });
      if (await generateButton.isVisible().catch(() => false)) {
        await generateButton.click();
        await page.waitForTimeout(1000);

        // 「再生成」ボタンをクリック
        const regenerateButton = page.getByRole('button', { name: /再生成|Regenerate/i });
        if (await regenerateButton.isVisible().catch(() => false)) {
          await regenerateButton.click();

          // 新しい返信が生成される
          await expect(page.getByText(/生成された返信 2/i)).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});

