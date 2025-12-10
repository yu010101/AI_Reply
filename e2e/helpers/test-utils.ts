import { Page, expect } from '@playwright/test';

/**
 * テスト用ユーザー情報
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  invalidPassword: 'wrongpassword',
};

/**
 * ログイン処理を実行
 */
export async function login(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  await page.goto('/auth/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
}

/**
 * ログイン成功を待機
 */
export async function waitForLoginSuccess(page: Page) {
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * ログイン後のダッシュボードへ移動
 */
export async function loginAndNavigateToDashboard(page: Page) {
  await login(page);
  await waitForLoginSuccess(page);
}

/**
 * アラートメッセージを取得
 */
export async function getAlertMessage(page: Page): Promise<string> {
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 5000 });
  return await alert.textContent() || '';
}

/**
 * ローディング完了を待機
 */
export async function waitForLoadingComplete(page: Page) {
  // CircularProgressが消えるまで待機
  const loading = page.locator('[role="progressbar"]');
  await expect(loading).toBeHidden({ timeout: 30000 });
}

/**
 * ネットワークリクエストをモック
 */
export async function mockApiResponse(page: Page, url: string, response: object, status: number = 200) {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * ネットワークエラーをモック
 */
export async function mockNetworkError(page: Page, url: string) {
  await page.route(url, (route) => {
    route.abort('failed');
  });
}

/**
 * Supabase認証をモック（成功）
 */
export async function mockSupabaseAuthSuccess(page: Page) {
  await page.route('**/auth/v1/token*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: TEST_USER.email,
          role: 'authenticated',
        },
      }),
    });
  });
}

/**
 * Supabase認証をモック（失敗）
 */
export async function mockSupabaseAuthFailure(page: Page, errorMessage: string = 'Invalid login credentials') {
  await page.route('**/auth/v1/token*', (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: errorMessage,
      }),
    });
  });
}

/**
 * Cookie同意バナーを閉じる
 * Cookie同意バナーが表示されている場合は「必要なCookieのみ」をクリックして閉じる
 */
export async function dismissCookieBanner(page: Page) {
  try {
    const cookieBanner = page.getByRole('button', { name: '必要なCookieのみ' });
    const isVisible = await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await cookieBanner.click();
      // バナーが閉じるまで待機
      await page.waitForTimeout(300);
    }
  } catch {
    // バナーが表示されていない場合は何もしない
  }
}

/**
 * ページに遷移してCookieバナーを閉じる
 */
export async function gotoAndDismissCookie(page: Page, url: string) {
  await page.goto(url);
  await dismissCookieBanner(page);
}
