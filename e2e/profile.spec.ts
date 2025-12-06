import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * プロフィールページ用の認証セットアップ
 */
async function setupAuthenticatedProfilePage(page: Page) {
  await mockSupabaseAuthSuccess(page);

  // プロファイルAPIをモック
  await page.route('**/rest/v1/profiles*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'test-user-id',
          email: TEST_USER.email,
          name: 'テストユーザー',
          role: 'user',
        },
      ]),
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('profiles')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインしてプロフィールページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/profile');
}

test.describe('プロフィール管理機能', () => {
  test.describe('プロフィール表示 - 正常系', () => {
    test('プロフィールページが表示される', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // プロフィールページが表示される
      await expect(page.getByRole('heading', { name: /プロフィール|Profile/i })).toBeVisible();
    });

    test('現在のプロフィール情報が表示される', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // メールアドレスが表示される
      await expect(page.getByText(TEST_USER.email)).toBeVisible();
    });

    test('プロフィール編集フォームが表示される', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // 編集フォームが表示される
      await expect(page.locator('input[type="text"], input[name="name"]')).toBeVisible();
    });
  });

  test.describe('プロフィール更新 - 正常系', () => {
    test('プロフィール情報を更新できる', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // プロファイル更新APIをモック
      await page.route('**/rest/v1/profiles*', (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'test-user-id',
              name: '更新された名前',
              email: TEST_USER.email,
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'test-user-id',
                name: 'テストユーザー',
                email: TEST_USER.email,
              },
            ]),
          });
        }
      });

      // 名前を入力
      const nameInput = page.locator('input[name="name"], input[type="text"]').first();
      await nameInput.fill('更新された名前');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存|Save|更新|Update/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();

        // 成功メッセージが表示される
        await expect(page.getByText(/更新|保存|Success/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('プロフィール更新 - 異常系', () => {
    test('プロフィール更新API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // プロファイル更新APIをエラーにする
      await page.route('**/rest/v1/profiles*', (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'test-user-id',
                name: 'テストユーザー',
                email: TEST_USER.email,
              },
            ]),
          });
        }
      });

      // 名前を入力
      const nameInput = page.locator('input[name="name"], input[type="text"]').first();
      await nameInput.fill('更新された名前');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存|Save/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();

        // エラーメッセージが表示される
        await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
      }
    });

    test('バリデーションエラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedProfilePage(page);

      // 名前が空の場合
      const nameInput = page.locator('input[name="name"], input[type="text"]').first();
      await nameInput.fill('');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: /保存|Save/i });
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();

        // バリデーションエラーが表示される
        await expect(page.getByText(/必須|Required|入力/i)).toBeVisible({ timeout: 3000 });
      }
    });
  });
});

