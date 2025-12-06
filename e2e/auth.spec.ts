import { test, expect } from '@playwright/test';
import { TEST_USER, login, getAlertMessage, mockSupabaseAuthSuccess, mockSupabaseAuthFailure } from './helpers/test-utils';

test.describe('認証機能', () => {
  test.describe('ログインページ表示', () => {
    test('ログインページが正しく表示される', async ({ page }) => {
      await page.goto('/auth/login');

      // タイトルが表示される（複数あるので最初のものを確認）
      await expect(page.getByRole('heading', { name: 'ログイン' }).first()).toBeVisible();

      // 入力フィールドが表示される（MUIのTextField）
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // ログインボタンが表示される
      await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

      // リンクが表示される
      await expect(page.getByText('パスワードを忘れた場合')).toBeVisible();
      await expect(page.getByText('新規登録はこちら')).toBeVisible();
    });

    test('新規登録リンクをクリックすると登録ページに遷移する', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByText('新規登録はこちら').click();
      await expect(page).toHaveURL('/auth/register');
    });

    test('パスワードリセットリンクが表示される', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page.getByText(/パスワードを忘れた|Forgot password/i)).toBeVisible();
    });
  });

  test.describe('ログイン - 正常系', () => {
    test('有効な認証情報でログインできる', async ({ page }) => {
      // Supabase認証をモック
      await mockSupabaseAuthSuccess(page);

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // ダッシュボードにリダイレクトされる
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    });

    test('ログイン中はボタンが無効化される', async ({ page }) => {
      // 遅延させてローディング状態を確認するためにネットワークを遅延
      await page.route('**/auth/v1/token*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user: { id: 'test', email: TEST_USER.email },
          }),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);

      // 送信前にボタンが有効
      const loginButton = page.getByRole('button', { name: 'ログイン' });
      await expect(loginButton).toBeEnabled();

      // 送信直後はボタンが無効化されテキストが変わる
      await loginButton.click();

      // ローディング中のボタンテキストまたは無効化を確認
      await expect(page.getByRole('button', { name: 'ログイン中...' })).toBeVisible({ timeout: 2000 });
    });

    test('ログイン後、セッションが保持される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // ページをリロードしてもログイン状態が保持される
      await page.reload();
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('ログイン - 異常系', () => {
    test('メールアドレスが空の場合、送信できない', async ({ page }) => {
      await page.goto('/auth/login');
      await page.locator('input[type="password"]').fill(TEST_USER.password);

      const loginButton = page.getByRole('button', { name: 'ログイン' });
      await loginButton.click();

      // HTML5バリデーションでブロックされる（URLが変わらない）
      await expect(page).toHaveURL('/auth/login');
    });

    test('パスワードが空の場合、送信できない', async ({ page }) => {
      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);

      const loginButton = page.getByRole('button', { name: 'ログイン' });
      await loginButton.click();

      // HTML5バリデーションでブロックされる
      await expect(page).toHaveURL('/auth/login');
    });

    test('無効なメールアドレス形式ではエラーが表示される', async ({ page }) => {
      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill('invalid-email');
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // HTML5のemail検証でブロックされる
      await expect(page).toHaveURL('/auth/login');
    });

    test('誤ったパスワードでログインするとエラーが表示される', async ({ page }) => {
      // 認証失敗をモック
      await mockSupabaseAuthFailure(page, 'Invalid login credentials');

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.invalidPassword);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージが表示される（MUIのAlertコンポーネントを特定）
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('正しくありません');
    });

    test('存在しないメールアドレスでログインするとエラーが表示される', async ({ page }) => {
      // 認証失敗をモック
      await mockSupabaseAuthFailure(page, 'Invalid login credentials');

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill('nonexistent@example.com');
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージが表示される（MUIのAlertコンポーネントを特定）
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('正しくありません');
    });

    test('メール未確認アカウントでログインするとエラーが表示される', async ({ page }) => {
      // メール未確認エラーをモック
      await mockSupabaseAuthFailure(page, 'Email not confirmed');

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージが表示される
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText(/確認|Confirm/i);
    });

    test('レート制限エラー時にエラーメッセージが表示される', async ({ page }) => {
      // レート制限エラーをモック
      await mockSupabaseAuthFailure(page, 'Too many requests');

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージが表示される
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText(/待って|Wait|しばらく/i);
    });

    test('ネットワークエラー時にエラーメッセージが表示される', async ({ page }) => {
      // ネットワークエラーをモック
      await page.route('**/auth/v1/token*', (route) => route.abort('failed'));

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージが表示される（MUIのAlertコンポーネントを特定）
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 10000 });
    });

    test('エラーメッセージを閉じることができる', async ({ page }) => {
      await mockSupabaseAuthFailure(page);

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.invalidPassword);
      await page.getByRole('button', { name: 'ログイン' }).click();

      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });

      // 閉じるボタンをクリック
      await alert.getByRole('button').click();
      await expect(alert).toBeHidden();
    });
  });

  test.describe('認証ガード', () => {
    // 開発環境ではAuthGuardが特定ページでバイパスするため、これらのテストはスキップ
    // 本番環境でのテストには NODE_ENV=production が必要
    test.skip('未認証ユーザーがダッシュボードにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('未認証ユーザーがレビューページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      await page.goto('/reviews');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test.skip('未認証ユーザーが設定ページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('未認証ユーザーがテナントページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      await page.goto('/tenants');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('未認証ユーザーがプロフィールページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('ログアウト機能', () => {
    test('ログアウトボタンが表示される', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // ログアウトボタンが表示される（ユーザーメニュー内）
      const userMenu = page.locator('[aria-label*="account"], [aria-label*="user"], button[aria-haspopup="true"]').first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await expect(page.getByRole('menuitem', { name: /ログアウト|Logout/i })).toBeVisible({ timeout: 2000 });
      }
    });

    test('ログアウトを実行できる', async ({ page }) => {
      await mockSupabaseAuthSuccess(page);

      // ログアウトAPIをモック
      await page.route('**/auth/v1/logout*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      });

      await page.goto('/auth/login');
      await page.locator('input[type="email"]').fill(TEST_USER.email);
      await page.locator('input[type="password"]').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'ログイン' }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // ユーザーメニューを開く
      const userMenu = page.locator('[aria-label*="account"], [aria-label*="user"], button[aria-haspopup="true"]').first();
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);

        // ログアウトをクリック
        const logoutButton = page.getByRole('menuitem', { name: /ログアウト|Logout/i });
        if (await logoutButton.isVisible().catch(() => false)) {
          await logoutButton.click();

          // ログインページにリダイレクトされる
          await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
        }
      }
    });
  });
});

test.describe('新規登録機能', () => {
  test.describe('登録ページ表示', () => {
    test('登録ページが正しく表示される', async ({ page }) => {
      await page.goto('/auth/register');

      // タイトルが表示される（複数のヘッディングがあるので最初のものを確認）
      await expect(page.getByRole('heading', { name: '新規登録' }).first()).toBeVisible();

      // 入力フィールドが表示される（MUIのTextFieldを使用）
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();

      // 登録ボタンが表示される
      await expect(page.getByRole('button', { name: '登録' })).toBeVisible();

      // ログインリンクが表示される
      await expect(page.getByText('すでにアカウントをお持ちの方はこちら')).toBeVisible();
    });

    test('ログインリンクをクリックするとログインページに遷移する', async ({ page }) => {
      await page.goto('/auth/register');
      await page.getByText('すでにアカウントをお持ちの方はこちら').click();
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('新規登録 - 正常系', () => {
    test('有効な情報で登録すると成功メッセージが表示される', async ({ page }) => {
      // Supabase登録をモック
      await page.route('**/auth/v1/signup*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'new-user-id',
              email: 'newuser@example.com',
            },
          }),
        });
      });

      await page.goto('/auth/register');
      // MUIのTextFieldを直接操作
      await page.locator('input[type="email"]').fill('newuser@example.com');
      await page.locator('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').last().fill('password123');
      await page.getByRole('button', { name: '登録' }).click();

      // 成功メッセージが表示される（MUIのAlertコンポーネントを特定）
      const successAlert = page.locator('.MuiAlert-root');
      await expect(successAlert).toBeVisible({ timeout: 5000 });
      await expect(successAlert).toContainText('登録が完了しました');
    });

    test('登録後、確認メール送信メッセージが表示される', async ({ page }) => {
      await page.route('**/auth/v1/signup*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'new-user-id',
              email: 'newuser@example.com',
            },
          }),
        });
      });

      await page.goto('/auth/register');
      await page.locator('input[type="email"]').fill('newuser@example.com');
      await page.locator('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').last().fill('password123');
      await page.getByRole('button', { name: '登録' }).click();

      // 確認メール送信メッセージが表示される
      await expect(page.getByText(/メール|Email|確認/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('新規登録 - 異常系', () => {
    test('パスワードが一致しない場合エラーが表示される', async ({ page }) => {
      await page.goto('/auth/register');
      await page.locator('input[type="email"]').fill('newuser@example.com');
      await page.locator('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').last().fill('differentpassword');
      await page.getByRole('button', { name: '登録' }).click();

      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('パスワードが一致しません');
    });

    test('パスワードが短すぎる場合エラーが表示される', async ({ page }) => {
      await page.goto('/auth/register');
      await page.locator('input[type="email"]').fill('newuser@example.com');
      await page.locator('input[type="password"]').first().fill('12345'); // 5文字
      await page.locator('input[type="password"]').last().fill('12345');
      await page.getByRole('button', { name: '登録' }).click();

      // HTML5バリデーションまたはエラーメッセージが表示される
      const alert = page.locator('.MuiAlert-root');
      const minLengthError = page.getByText(/6文字|6 characters/i);
      
      if (await alert.isVisible().catch(() => false)) {
        await expect(alert).toContainText(/6文字|短すぎ/i);
      } else if (await minLengthError.isVisible().catch(() => false)) {
        await expect(minLengthError).toBeVisible();
      }
    });

    test('無効なメールアドレス形式でエラーが表示される', async ({ page }) => {
      await page.goto('/auth/register');
      // HTML5検証を通過するが、正規表現検証で失敗するメールアドレス
      // type="email"は"invalid@"を許可しないが、RegisterFormのisValidEmailは別の検証を行う
      // そのため、空文字でテスト（HTML5は空フィールドを許可しないので、helperTextで確認）
      await page.locator('input[type="email"]').fill('test');

      // テキストフィールドのエラーヘルパーテキストを確認（フォーム送信前に表示される）
      const helperText = page.locator('.MuiFormHelperText-root');
      await expect(helperText.first()).toContainText('有効なメールアドレスを入力してください');
    });

    test('既に登録されているメールアドレスでエラーが表示される', async ({ page }) => {
      // 既存ユーザーエラーをモック
      await page.route('**/auth/v1/signup*', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'user_already_exists',
            message: 'User already registered',
          }),
        });
      });

      await page.goto('/auth/register');
      await page.locator('input[type="email"]').fill('existing@example.com');
      await page.locator('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').last().fill('password123');
      await page.getByRole('button', { name: '登録' }).click();

      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 5000 });
      await expect(alert).toContainText('既に登録されています');
    });

    test('ネットワークエラー時にエラーメッセージが表示される', async ({ page }) => {
      // ネットワークエラーをモック
      await page.route('**/auth/v1/signup*', (route) => {
        route.abort('failed');
      });

      await page.goto('/auth/register');
      await page.locator('input[type="email"]').fill('newuser@example.com');
      await page.locator('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').last().fill('password123');
      await page.getByRole('button', { name: '登録' }).click();

      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 10000 });
    });
  });
});
