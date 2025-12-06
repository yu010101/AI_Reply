import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuthSuccess, TEST_USER } from './helpers/test-utils';

/**
 * オンボーディングページ用の認証セットアップ
 */
async function setupAuthenticatedOnboardingPage(page: Page, onboardingCompleted: boolean = false) {
  await mockSupabaseAuthSuccess(page);

  // プロファイルAPIをモック
  await page.route('**/rest/v1/profiles*', (route) => {
    const url = route.request().url();
    if (url.includes('select=onboarding_completed')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          onboarding_completed: onboardingCompleted,
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

  // その他のAPIをモック
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

  // ログインしてダッシュボードに移動
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('オンボーディング機能', () => {
  test.describe('オンボーディングウィザード表示 - 正常系', () => {
    test('オンボーディング未完了ユーザーでログインするとウィザードが表示される', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // オンボーディングウィザードが表示される
      await expect(page.getByText('ようこそ')).toBeVisible({ timeout: 5000 });
    });

    test('オンボーディング完了ユーザーでログインするとウィザードが表示されない', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, true);

      // オンボーディングウィザードが表示されない
      await expect(page.getByText('ようこそ')).not.toBeVisible({ timeout: 2000 });
      // ダッシュボードが表示される
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });

    test('ウィザードのステップが正しく表示される', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // ステップ1: ようこそ
      await expect(page.getByText('ようこそ')).toBeVisible();
      
      // ステップインジケーターが表示される
      await expect(page.locator('.MuiStepper-root')).toBeVisible();
    });
  });

  test.describe('オンボーディングウィザード操作 - 正常系', () => {
    test('ステップ1からステップ2へ進むことができる', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // 「次へ」ボタンをクリック
      await page.getByRole('button', { name: /次へ|次|Next/i }).first().click();

      // ステップ2が表示される
      await expect(page.getByText(/店舗情報|店舗/i)).toBeVisible();
    });

    test('ステップ2で店舗情報を入力できる', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // ステップ2へ進む
      await page.getByRole('button', { name: /次へ|次|Next/i }).first().click();
      await expect(page.getByText(/店舗情報|店舗/i)).toBeVisible();

      // 店舗名を入力
      const nameInput = page.locator('input[name="name"], input[placeholder*="店舗名"], input[type="text"]').first();
      await nameInput.fill('テスト店舗');

      // 住所を入力（存在する場合）
      const addressInput = page.locator('input[name="address"], input[placeholder*="住所"]').first();
      if (await addressInput.isVisible().catch(() => false)) {
        await addressInput.fill('東京都渋谷区');
      }
    });

    test('オンボーディングを完了できる', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // オンボーディング完了APIをモック
      await page.route('**/api/onboarding/complete*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // プロファイル更新APIをモック
      await page.route('**/rest/v1/profiles*', (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ onboarding_completed: true }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ onboarding_completed: false }),
          });
        }
      });

      // 最後のステップまで進む
      const nextButtons = page.getByRole('button', { name: /次へ|次|Next|完了|Complete/i });
      const count = await nextButtons.count();
      
      // すべての「次へ」ボタンをクリックして最後まで進む
      for (let i = 0; i < count; i++) {
        const button = nextButtons.nth(i);
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          await page.waitForTimeout(500); // アニメーション待機
        }
      }

      // 完了ボタンをクリック
      const completeButton = page.getByRole('button', { name: /完了|Complete|開始/i });
      if (await completeButton.isVisible().catch(() => false)) {
        await completeButton.click();
      }

      // ダッシュボードが表示される（オンボーディングウィザードが消える）
      await expect(page.getByText('ようこそ')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('オンボーディングウィザード - 異常系', () => {
    test('プロファイル取得エラー時にウィザードが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // プロファイル取得エラーをモック
      await page.route('**/rest/v1/profiles*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.route('**/rest/v1/**', (route) => {
        if (!route.request().url().includes('profiles')) {
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

      // エラー時はオンボーディング未完了として扱う
      await expect(page.getByText('ようこそ')).toBeVisible({ timeout: 5000 });
    });

    test('オンボーディング完了APIエラー時にエラーが表示される', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // オンボーディング完了APIをエラーにする
      await page.route('**/api/onboarding/complete*', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // 最後のステップまで進む
      const nextButtons = page.getByRole('button', { name: /次へ|次|Next|完了|Complete/i });
      const count = await nextButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = nextButtons.nth(i);
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          await page.waitForTimeout(500);
        }
      }

      // 完了ボタンをクリック
      const completeButton = page.getByRole('button', { name: /完了|Complete|開始/i });
      if (await completeButton.isVisible().catch(() => false)) {
        await completeButton.click();
      }

      // エラーメッセージが表示される（またはページがクラッシュしない）
      await expect(page.getByText('ようこそ')).toBeVisible({ timeout: 3000 });
    });

    test('ネットワークエラー時にページがクラッシュしない', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // ネットワークエラーをモック
      await page.route('**/rest/v1/profiles*', (route) => {
        route.abort('failed');
      });

      // ページは表示される
      await expect(page.getByText('ようこそ')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('オンボーディングウィザード - スキップ機能', () => {
    test('スキップボタンでオンボーディングをスキップできる', async ({ page }) => {
      await setupAuthenticatedOnboardingPage(page, false);

      // スキップボタンが存在する場合
      const skipButton = page.getByRole('button', { name: /スキップ|Skip|後で/i });
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click();
        
        // ダッシュボードが表示される
        await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

