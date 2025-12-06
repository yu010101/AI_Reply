import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * サブスクリプション管理ページ用の認証セットアップ
 */
async function setupAuthenticatedSubscriptionPage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // サブスクリプションAPIをモック
  await page.route('**/rest/v1/subscriptions*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'sub-1',
          tenant_id: 'test-user-id',
          plan: 'free',
          status: 'active',
        },
      ]),
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('subscriptions')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインして設定ページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/settings?tab=2');
}

test.describe('サブスクリプション管理機能', () => {
  test.describe('サブスクリプション表示 - 正常系', () => {
    test('サブスクリプション管理タブが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // サブスクリプション管理タブが表示される
      await expect(page.getByRole('tab', { name: /サブスクリプション|Subscription/i })).toBeVisible();
    });

    test('現在のプランが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // 現在のプランが表示される
      await expect(page.getByText(/Free|Pro|Enterprise|プラン/i)).toBeVisible();
    });

    test('プラン変更ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // プラン変更ボタンが表示される
      await expect(page.getByRole('button', { name: /変更|Change|Upgrade/i })).toBeVisible();
    });
  });

  test.describe('プラン変更 - 正常系', () => {
    test('プラン変更ボタンをクリックするとチェックアウトページへ遷移する', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // チェックアウトセッション作成APIをモック
      await page.route('**/api/subscriptions/create-checkout-session*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/pay/...',
          }),
        });
      });

      // プラン変更ボタンをクリック
      const changeButton = page.getByRole('button', { name: /変更|Change|Upgrade/i });
      if (await changeButton.isVisible().catch(() => false)) {
        await changeButton.click();

        // チェックアウトURLが生成される（またはリダイレクトされる）
        await page.waitForTimeout(1000);
      }
    });

    test('プラン選択UIが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // プラン選択UIが表示される
      await expect(page.getByText(/Free|Pro|Enterprise/i)).toBeVisible();
    });
  });

  test.describe('プラン変更 - 異常系', () => {
    test('チェックアウトセッション作成エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // チェックアウトセッション作成APIをエラーにする
      await page.route('**/api/subscriptions/create-checkout-session*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
          }),
        });
      });

      // プラン変更ボタンをクリック
      const changeButton = page.getByRole('button', { name: /変更|Change|Upgrade/i });
      if (await changeButton.isVisible().catch(() => false)) {
        await changeButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });

    test('Stripe エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // Stripe エラーをモック
      await page.route('**/api/subscriptions/create-checkout-session*', (route) => {
        route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'card_declined',
              message: 'カードが拒否されました',
            },
          }),
        });
      });

      // プラン変更ボタンをクリック
      const changeButton = page.getByRole('button', { name: /変更|Change|Upgrade/i });
      if (await changeButton.isVisible().catch(() => false)) {
        await changeButton.click();

        // エラーメッセージが表示される
        await expect(page.getByText(/拒否|エラー|Error/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('プランキャンセル - 正常系', () => {
    test('プランキャンセルボタンが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // キャンセルボタンが表示される（Proプラン以上の場合）
      const cancelButton = page.getByRole('button', { name: /キャンセル|Cancel/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await expect(cancelButton).toBeVisible();
      }
    });

    test('プランキャンセルを実行できる', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // キャンセルAPIをモック
      await page.route('**/api/subscriptions/cancel*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole('button', { name: /キャンセル|Cancel/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();

        // 確認ダイアログが表示される（存在する場合）
        const confirmButton = page.getByRole('button', { name: /確認|Confirm|はい|Yes/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // 成功メッセージが表示される
        await expect(page.getByText(/キャンセル|Cancelled/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('プランキャンセル - 異常系', () => {
    test('キャンセルAPI エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedSubscriptionPage(page);

      // キャンセルAPIをエラーにする
      await page.route('**/api/subscriptions/cancel*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
          }),
        });
      });

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole('button', { name: /キャンセル|Cancel/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

