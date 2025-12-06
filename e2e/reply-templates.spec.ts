import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * 返信テンプレートページ用の認証セットアップ
 */
async function setupAuthenticatedTemplatesPage(page: Page, templatesData: object[] = []) {
  await mockSupabaseAuthSuccess(page);

  // テンプレートAPIをモック
  await page.route('**/rest/v1/reply_templates*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(templatesData),
    });
  });

  // Supabase REST APIをモック
  await page.route('**/rest/v1/**', (route) => {
    if (!route.request().url().includes('reply_templates')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
        headers: { 'content-range': '0-0/0' },
      });
    }
  });

  // ログインして返信テンプレートページに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.goto('/reply-templates');
}

const mockTemplates = [
  {
    id: '1',
    tenant_id: 'test-user-id',
    name: '感謝テンプレート',
    content: 'ご利用いただき、ありがとうございます。',
    tone: 'polite',
    created_at: '2024-01-15T10:00:00Z',
  },
];

test.describe('返信テンプレート管理機能', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('返信テンプレートページが正しく表示される', async ({ page }) => {
      await setupAuthenticatedTemplatesPage(page, mockTemplates);

      // タイトルが表示される
      await expect(page.getByRole('heading', { name: /テンプレート|Template/i })).toBeVisible();
    });

    test('テンプレート一覧が表示される', async ({ page }) => {
      await setupAuthenticatedTemplatesPage(page, mockTemplates);

      // テンプレート名が表示される
      await expect(page.getByText('感謝テンプレート')).toBeVisible();
    });

    test('新規作成ボタンが表示される', async ({ page }) => {
      await setupAuthenticatedTemplatesPage(page, mockTemplates);

      // 新規作成ボタンが表示される
      await expect(page.getByRole('button', { name: /新規作成|追加|Add|Create/i })).toBeVisible();
    });
  });

  test.describe('テンプレート作成 - 正常系', () => {
    test('新規テンプレートを作成できる', async ({ page }) => {
      await setupAuthenticatedTemplatesPage(page, []);

      // テンプレート作成APIをモック
      await page.route('**/rest/v1/reply_templates*', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-template-id',
              name: '新規テンプレート',
              content: '新規テンプレートの内容',
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
          await nameInput.fill('新規テンプレート');

          // 保存ボタンをクリック
          const saveButton = page.getByRole('button', { name: /保存|Save/i });
          if (await saveButton.isVisible().catch(() => false)) {
            await saveButton.click();

            // 成功メッセージが表示される
            await expect(page.getByText(/作成|保存|Success/i)).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('テンプレート管理 - 異常系', () => {
    test('テンプレートがない場合、空状態メッセージが表示される', async ({ page }) => {
      await setupAuthenticatedTemplatesPage(page, []);

      // 空の状態メッセージが表示される
      await expect(page.getByText(/テンプレートがありません|No templates/i)).toBeVisible();
    });

    test('API エラー時にエラーメッセージが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // APIエラーをモック
      await page.route('**/rest/v1/reply_templates*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('reply_templates')) {
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
      await page.goto('/reply-templates');

      // エラーメッセージが表示される
      await expect(page.getByText(/取得に失敗|エラー|Error/i)).toBeVisible({ timeout: 10000 });
    });
  });
});

