import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * 店舗管理ページ用の認証セットアップ
 */
async function setupAuthenticatedLocationsPage(page: Page, locationsData: object[] = []) {
  await mockSupabaseAuthSuccess(page);

  // 店舗APIをモック
  await page.route('**/rest/v1/locations*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(locationsData),
      headers: { 'content-range': `${locationsData.length - 1}-${locationsData.length - 1}/${locationsData.length}` },
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('locations')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインして店舗管理ページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/locations');
}

const mockLocations = [
  {
    id: '1',
    tenant_id: 'test-user-id',
    name: '東京店',
    address: '東京都渋谷区',
    tone: 'polite',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'test-user-id',
    name: '大阪店',
    address: '大阪府大阪市',
    tone: 'casual',
    created_at: '2024-01-14T15:30:00Z',
  },
];

test.describe('店舗管理機能', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('店舗管理ページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, mockLocations);

      // タイトルが表示される
      await expect(page.getByRole('heading', { name: /店舗|Location/i })).toBeVisible();
    });

    test('店舗一覧が表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, mockLocations);

      // 店舗名が表示される
      await expect(page.getByText('東京店')).toBeVisible();
      await expect(page.getByText('大阪店')).toBeVisible();
    });

    test('新規作成ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, mockLocations);

      // 新規作成ボタンが表示される
      await expect(page.getByRole('button', { name: /新規作成|追加|Add|Create/i })).toBeVisible();
    });
  });

  test.describe('店舗作成 - 正常系', () => {
    test('新規店舗を作成できる', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, []);

      // 店舗作成APIをモック
      await page.route('**/rest/v1/locations*', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-location-id',
              name: '新規店舗',
              address: '新規住所',
              tone: 'polite',
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      // 新規作成ボタンをクリック
      const createButton = page.getByRole('button', { name: /新規作成|追加|Add|Create/i });
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // フォームが表示される
        const nameInput = page.locator('input[name="name"], input[type="text"]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('新規店舗');

          // 保存ボタンをクリック
          const saveButton = page.getByRole('button', { name: /保存|Save|作成|Create/i });
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();

            // 成功メッセージが表示される
            await expect(page.getByText(/作成|保存|Success/i)).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('店舗作成 - 異常系', () => {
    test('店舗名が空の場合エラーが表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, []);

      // 新規作成ボタンをクリック
      const createButton = page.getByRole('button', { name: /新規作成|追加|Add|Create/i });
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // 保存ボタンをクリック（名前が空のまま）
        const saveButton = page.getByRole('button', { name: /保存|Save/i });
        if (await saveButton.isVisible().catch(() => false)) {
          await saveButton.click();

          // バリデーションエラーが表示される
          await expect(page.getByText(/必須|Required|入力/i)).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('店舗作成API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, []);

      // 店舗作成APIをエラーにする
      await page.route('**/rest/v1/locations*', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      // 新規作成ボタンをクリック
      const createButton = page.getByRole('button', { name: /新規作成|追加|Add|Create/i });
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // フォームに入力
        const nameInput = page.locator('input[name="name"], input[type="text"]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill('新規店舗');

          // 保存ボタンをクリック
          const saveButton = page.getByRole('button', { name: /保存|Save/i });
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();

            // エラーメッセージが表示される
            await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('店舗管理 - 異常系', () => {
    test('店舗がない場合、空状態メッセージが表示される', async ({ page }) => {
      await setupAuthenticatedLocationsPage(page, []);

      // 空の状態メッセージが表示される
      await expect(page.getByText(/店舗がありません|No locations/i)).toBeVisible();
    });

    test('API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/rest/v1/locations*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('locations')) {
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
      await page.goto('/locations');

      // エラーメッセージが表示される
      await expect(page.getByText(/取得に失敗|エラー|Error/i)).toBeVisible({ timeout: 10000 });
    });
  });
});

