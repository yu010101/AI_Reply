import { test, expect } from '@playwright/test';

test.describe('お問い合わせページ', () => {
  test.describe('ページ表示 - 正常系', () => {
    test('お問い合わせページが正しく表示される', async ({ page }) => {
      await page.goto('/contact');

      // ページタイトルの確認
      await expect(page).toHaveTitle(/お問い合わせ.*RevAI Concierge/);

      // ヘッダーの確認
      await expect(page.getByRole('heading', { name: 'お問い合わせ', level: 1 })).toBeVisible();
      await expect(page.getByText('通常2営業日以内にご返信いたします')).toBeVisible();

      // フォームの確認
      await expect(page.getByLabel('お名前', { exact: true })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('会社名（任意）')).toBeVisible();
      await expect(page.getByLabel('お問い合わせ種別')).toBeVisible();
      await expect(page.getByLabel('お問い合わせ内容')).toBeVisible();
      await expect(page.getByRole('button', { name: '送信する' })).toBeVisible();
    });

    test('よくある質問セクションが表示される', async ({ page }) => {
      await page.goto('/contact');

      // FAQセクションの確認
      await expect(page.getByRole('heading', { name: 'よくある質問', level: 2 })).toBeVisible();

      // いくつかのFAQアイテムの確認
      await expect(page.getByText('サービスの利用開始までにどのくらい時間がかかりますか？')).toBeVisible();
      await expect(page.getByText('どのプランを選べばよいですか？')).toBeVisible();
      await expect(page.getByText('AI返信の精度はどの程度ですか？')).toBeVisible();
    });

    test('サイドバー情報が表示される', async ({ page }) => {
      await page.goto('/contact');

      // サイドバーの各カードの確認
      await expect(page.getByText('メールでのお問い合わせ')).toBeVisible();
      await expect(page.getByText('サポート時間')).toBeVisible();
      await expect(page.getByText('ご注意事項')).toBeVisible();
    });
  });

  test.describe('フォーム入力 - 正常系', () => {
    test('すべてのフィールドに入力できる', async ({ page }) => {
      await page.goto('/contact');

      // フォーム入力
      await page.getByLabel('お名前', { exact: true }).fill('山田太郎');
      await page.getByLabel('メールアドレス').fill('yamada@example.com');
      await page.getByLabel('会社名（任意）').fill('テスト株式会社');

      // お問い合わせ種別を選択
      await page.getByLabel('お問い合わせ種別').click();
      await page.getByRole('option', { name: 'サービスについて' }).click();

      await page.getByLabel('お問い合わせ内容').fill('サービスについて詳しく教えてください。導入を検討しています。');

      // 入力値の確認
      await expect(page.getByLabel('お名前', { exact: true })).toHaveValue('山田太郎');
      await expect(page.getByLabel('メールアドレス')).toHaveValue('yamada@example.com');
      await expect(page.getByLabel('会社名（任意）')).toHaveValue('テスト株式会社');
      await expect(page.getByLabel('お問い合わせ内容')).toHaveValue('サービスについて詳しく教えてください。導入を検討しています。');
    });

    test('必須フィールドのみで送信できる', async ({ page }) => {
      await page.goto('/contact');

      // 必須フィールドのみ入力
      await page.getByLabel('お名前', { exact: true }).fill('鈴木一郎');
      await page.getByLabel('メールアドレス').fill('suzuki@example.com');
      await page.getByLabel('お問い合わせ内容').fill('テストメッセージです。お問い合わせ内容を記載します。');

      // 送信ボタンをクリック
      await page.getByRole('button', { name: '送信する' }).click();

      // 成功メッセージの確認
      await expect(page.getByText('お問い合わせを受け付けました')).toBeVisible({ timeout: 10000 });

      // フォームがリセットされることを確認
      await expect(page.getByLabel('お名前', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('メールアドレス')).toHaveValue('');
      await expect(page.getByLabel('お問い合わせ内容')).toHaveValue('');
    });

    test('すべてのフィールドを入力して送信できる', async ({ page }) => {
      await page.goto('/contact');

      // すべてのフィールドを入力
      await page.getByLabel('お名前', { exact: true }).fill('佐藤花子');
      await page.getByLabel('メールアドレス').fill('sato@example.com');
      await page.getByLabel('会社名（任意）').fill('サンプル企業');

      await page.getByLabel('お問い合わせ種別').click();
      await page.getByRole('option', { name: '料金・プランについて' }).click();

      await page.getByLabel('お問い合わせ内容').fill('料金プランについて詳しく知りたいです。エンタープライズプランの機能を教えてください。');

      // 送信ボタンをクリック
      await page.getByRole('button', { name: '送信する' }).click();

      // 成功メッセージの確認
      await expect(page.getByText('お問い合わせを受け付けました')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('バリデーション - 異常系', () => {
    test('お名前が未入力の場合、エラーメッセージが表示される', async ({ page }) => {
      await page.goto('/contact');

      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('お問い合わせ内容').fill('テストメッセージです。');

      await page.getByRole('button', { name: '送信する' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('お名前は必須です')).toBeVisible();
    });

    test('メールアドレスが未入力の場合、エラーメッセージが表示される', async ({ page }) => {
      await page.goto('/contact');

      await page.getByLabel('お名前', { exact: true }).fill('テストユーザー');
      await page.getByLabel('お問い合わせ内容').fill('テストメッセージです。');

      await page.getByRole('button', { name: '送信する' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('メールアドレスは必須です')).toBeVisible();
    });

    test('メールアドレスの形式が不正な場合、エラーメッセージが表示される', async ({ page }) => {
      await page.goto('/contact');

      await page.getByLabel('お名前', { exact: true }).fill('テストユーザー');
      await page.getByLabel('メールアドレス').fill('invalid-email');
      await page.getByLabel('お問い合わせ内容').fill('テストメッセージです。');

      await page.getByRole('button', { name: '送信する' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
    });

    test('お問い合わせ内容が未入力の場合、エラーメッセージが表示される', async ({ page }) => {
      await page.goto('/contact');

      await page.getByLabel('お名前', { exact: true }).fill('テストユーザー');
      await page.getByLabel('メールアドレス').fill('test@example.com');

      await page.getByRole('button', { name: '送信する' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('お問い合わせ内容は必須です')).toBeVisible();
    });

    test('お問い合わせ内容が短すぎる場合、エラーメッセージが表示される', async ({ page }) => {
      await page.goto('/contact');

      await page.getByLabel('お名前', { exact: true }).fill('テストユーザー');
      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('お問い合わせ内容').fill('短い');

      await page.getByRole('button', { name: '送信する' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('お問い合わせ内容は10文字以上入力してください')).toBeVisible();
    });

    test('入力中にエラーメッセージがクリアされる', async ({ page }) => {
      await page.goto('/contact');

      // エラーを発生させる
      await page.getByRole('button', { name: '送信する' }).click();
      await expect(page.getByText('お名前は必須です')).toBeVisible();

      // 入力するとエラーが消える
      await page.getByLabel('お名前', { exact: true }).fill('テスト');
      await expect(page.getByText('お名前は必須です')).not.toBeVisible();
    });
  });

  test.describe('FAQ機能', () => {
    test('FAQアコーディオンを開閉できる', async ({ page }) => {
      await page.goto('/contact');

      const firstFaq = page.getByText('サービスの利用開始までにどのくらい時間がかかりますか？');
      await firstFaq.click();

      // 回答が表示される
      await expect(page.getByText('アカウント作成後、すぐにご利用いただけます')).toBeVisible();

      // 再度クリックして閉じる
      await firstFaq.click();
      await expect(page.getByText('アカウント作成後、すぐにご利用いただけます')).not.toBeVisible();
    });

    test('複数のFAQを同時に開ける', async ({ page }) => {
      await page.goto('/contact');

      // 複数のFAQを開く
      await page.getByText('サービスの利用開始までにどのくらい時間がかかりますか？').click();
      await page.getByText('どのプランを選べばよいですか？').click();

      // 両方の回答が表示される
      await expect(page.getByText('アカウント作成後、すぐにご利用いただけます')).toBeVisible();
      await expect(page.getByText('店舗数やレビューの件数に応じてプランをお選びください')).toBeVisible();
    });
  });

  test.describe('お問い合わせ種別', () => {
    test('すべてのお問い合わせ種別を選択できる', async ({ page }) => {
      await page.goto('/contact');

      const inquiryTypes = [
        'サービスについて',
        '技術的な問題',
        '料金・プランについて',
        '解約について',
        'その他',
      ];

      for (const type of inquiryTypes) {
        await page.getByLabel('お問い合わせ種別').click();
        await page.getByRole('option', { name: type }).click();
        // 選択されていることを確認（テキストが表示される）
        await expect(page.getByText(type)).toBeVisible();
      }
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示でフォームが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      await page.goto('/contact');

      // フォームが表示される
      await expect(page.getByLabel('お名前', { exact: true })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByRole('button', { name: '送信する' })).toBeVisible();
    });

    test('タブレット表示でフォームが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
      await page.goto('/contact');

      // フォームが表示される
      await expect(page.getByLabel('お名前', { exact: true })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByRole('button', { name: '送信する' })).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('フォームフィールドに適切なラベルが設定されている', async ({ page }) => {
      await page.goto('/contact');

      // すべてのフィールドにラベルがあることを確認
      await expect(page.getByLabel('お名前', { exact: true })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('会社名（任意）')).toBeVisible();
      await expect(page.getByLabel('お問い合わせ種別')).toBeVisible();
      await expect(page.getByLabel('お問い合わせ内容')).toBeVisible();
    });

    test('必須フィールドが適切にマークされている', async ({ page }) => {
      await page.goto('/contact');

      // required属性の確認
      const nameField = page.getByLabel('お名前', { exact: true });
      const emailField = page.getByLabel('メールアドレス');
      const messageField = page.getByLabel('お問い合わせ内容');

      await expect(nameField).toHaveAttribute('required', '');
      await expect(emailField).toHaveAttribute('required', '');
      await expect(messageField).toHaveAttribute('required', '');
    });
  });
});
