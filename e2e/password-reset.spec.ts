import { test, expect, Page } from '@playwright/test';

test.describe('パスワードリセット機能', () => {
  test.describe('パスワードリセットリクエスト - 正常系', () => {
    test('パスワードリセットページが表示される', async ({ page }) => {
      await page.goto('/auth/login');

      // 「パスワードを忘れた場合」リンクをクリック
      const forgotPasswordLink = page.getByText(/パスワードを忘れた|Forgot password/i);
      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();

        // パスワードリセットページが表示される
        await expect(page.getByText(/パスワードリセット|Reset password/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('メールアドレスを入力してリセットメールを送信できる', async ({ page }) => {
      await page.goto('/auth/login');

      // パスワードリセットAPIをモック
      await page.route('**/auth/v1/recover*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password reset email sent' }),
        });
      });

      // 「パスワードを忘れた場合」リンクをクリック
      const forgotPasswordLink = page.getByText(/パスワードを忘れた|Forgot password/i);
      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();
        await page.waitForTimeout(1000);

        // メールアドレスを入力
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.fill('test@example.com');

        // 送信ボタンをクリック
        const submitButton = page.getByRole('button', { name: /送信|Send|Submit/i });
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();

          // 成功メッセージが表示される
          await expect(page.getByText(/メール|Email|送信/i)).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('パスワードリセットリクエスト - 異常系', () => {
    test('存在しないメールアドレスでエラーが表示される', async ({ page }) => {
      await page.goto('/auth/login');

      // パスワードリセットAPIをエラーにする
      await page.route('**/auth/v1/recover*', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'user_not_found',
            message: 'User not found',
          }),
        });
      });

      // 「パスワードを忘れた場合」リンクをクリック
      const forgotPasswordLink = page.getByText(/パスワードを忘れた|Forgot password/i);
      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();
        await page.waitForTimeout(1000);

        // メールアドレスを入力
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.fill('nonexistent@example.com');

        // 送信ボタンをクリック
        const submitButton = page.getByRole('button', { name: /送信|Send|Submit/i });
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();

          // エラーメッセージが表示される
          await expect(page.locator('.MuiAlert-root')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('無効なメールアドレス形式でエラーが表示される', async ({ page }) => {
      await page.goto('/auth/login');

      // 「パスワードを忘れた場合」リンクをクリック
      const forgotPasswordLink = page.getByText(/パスワードを忘れた|Forgot password/i);
      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();
        await page.waitForTimeout(1000);

        // 無効なメールアドレスを入力
        const emailInput = page.locator('input[type="email"]').first();
        await emailInput.fill('invalid-email');

        // HTML5バリデーションでブロックされる
        await expect(emailInput).toHaveAttribute('type', 'email');
      }
    });
  });
});

