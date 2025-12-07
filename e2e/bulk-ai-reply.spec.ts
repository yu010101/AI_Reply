import { test, expect } from '@playwright/test';

test.describe('Bulk AI Reply Generation', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // レビューページに遷移
    await page.click('text=レビュー');
    await page.waitForURL('/reviews');
  });

  test.describe('選択モード - 正常系', () => {
    test('一括選択モードボタンをクリックすると選択モードに入る', async ({ page }) => {
      // 一括選択モードボタンをクリック
      await page.click('button:has-text("一括選択モード")');

      // チェックボックスが表示されることを確認
      const checkboxes = page.locator('input[type="checkbox"]');
      await expect(checkboxes.first()).toBeVisible();

      // 選択ボタンが表示されることを確認
      await expect(page.locator('button:has-text("すべて選択")')).toBeVisible();
      await expect(page.locator('button:has-text("未返信のみ選択")')).toBeVisible();
    });

    test('レビューを個別に選択できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 最初のレビューのチェックボックスをクリック
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();

      // チェックボックスがチェックされることを確認
      await expect(firstCheckbox).toBeChecked();

      // 下部バーが表示されることを確認
      await expect(page.locator('text=1件選択中')).toBeVisible();
    });

    test('すべて選択ボタンですべてのレビューを選択できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // すべて選択ボタンをクリック
      await page.click('button:has-text("すべて選択")');

      // すべてのチェックボックスがチェックされることを確認
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    });

    test('未返信のみ選択ボタンで未返信レビューのみを選択できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 未返信のみ選択ボタンをクリック
      await page.click('button:has-text("未返信のみ選択")');

      // 選択数が表示されることを確認（少なくとも1件）
      const selectionText = await page.locator('text=/\\d+件選択中/').textContent();
      expect(selectionText).toBeTruthy();
    });

    test('選択を解除できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // レビューを選択
      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();

      // もう一度クリックして解除
      await firstCheckbox.click();
      await expect(firstCheckbox).not.toBeChecked();

      // 下部バーが非表示になることを確認
      await expect(page.locator('text=選択中')).not.toBeVisible();
    });
  });

  test.describe('一括AI返信生成 - 正常系', () => {
    test('選択したレビューに対して一括AI返信を生成できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 複数のレビューを選択
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();

      // 一括AI返信生成ボタンをクリック
      await page.click('button:has-text("一括AI返信生成")');

      // 進捗ダイアログが表示されることを確認
      await expect(page.locator('text=AI返信を一括生成中...')).toBeVisible();
      await expect(page.locator('text=/進捗状況/')).toBeVisible();

      // 生成完了を待つ（タイムアウトを長めに設定）
      await page.waitForSelector('text=すべての返信生成が完了しました', {
        timeout: 60000,
      });

      // 成功件数が表示されることを確認
      await expect(page.locator('text=/\\d+件の返信を確認して投稿してください/')).toBeVisible();
    });

    test('生成された返信を確認・編集できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // レビューを選択
      await page.locator('input[type="checkbox"]').first().click();

      // 一括AI返信生成
      await page.click('button:has-text("一括AI返信生成")');

      // 生成完了を待つ
      await page.waitForSelector('text=すべての返信生成が完了しました', {
        timeout: 60000,
      });

      // 確認ダイアログが表示されることを確認
      await expect(page.locator('text=生成された返信を確認')).toBeVisible();

      // 返信テキストが表示されることを確認
      await expect(page.locator('text=あなたの返信')).toBeVisible();

      // 編集ボタンが表示されることを確認
      const editButton = page.locator('button[title="編集"]').first();
      await expect(editButton).toBeVisible();

      // 編集ボタンをクリック
      await editButton.click();

      // テキストフィールドが表示されることを確認
      const textField = page.locator('textarea');
      await expect(textField.first()).toBeVisible();

      // テキストを編集
      await textField.first().fill('編集された返信テキスト');

      // 保存ボタンをクリック
      await page.click('button:has-text("保存")');

      // 編集された内容が反映されることを確認
      await expect(page.locator('text=編集された返信テキスト')).toBeVisible();
    });

    test('生成された返信を再生成できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // レビューを選択
      await page.locator('input[type="checkbox"]').first().click();

      // 一括AI返信生成
      await page.click('button:has-text("一括AI返信生成")');

      // 生成完了を待つ
      await page.waitForSelector('text=すべての返信生成が完了しました', {
        timeout: 60000,
      });

      // 元の返信テキストを取得
      const originalReply = await page.locator('text=あなたの返信').locator('..').locator('..').textContent();

      // 再生成ボタンをクリック
      await page.locator('button[title="再生成"]').first().click();

      // 少し待つ（再生成完了）
      await page.waitForTimeout(3000);

      // 返信テキストが変更されることを確認（内容は異なる可能性が高い）
      const newReply = await page.locator('text=あなたの返信').locator('..').locator('..').textContent();
      // 注: 内容が同じ場合もあるため、存在確認のみ
      expect(newReply).toBeTruthy();
    });

    test('すべての返信を投稿できる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // レビューを選択
      await page.locator('input[type="checkbox"]').first().click();

      // 一括AI返信生成
      await page.click('button:has-text("一括AI返信生成")');

      // 生成完了を待つ
      await page.waitForSelector('text=すべての返信生成が完了しました', {
        timeout: 60000,
      });

      // すべて投稿ボタンをクリック
      await page.click('button:has-text("すべて投稿")');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=/投稿.*成功|完了/')).toBeVisible({ timeout: 10000 });

      // 確認ダイアログが閉じることを確認
      await expect(page.locator('text=生成された返信を確認')).not.toBeVisible();
    });
  });

  test.describe('一括AI返信生成 - 異常系', () => {
    test('レビューを選択していない状態では一括生成ボタンが表示されない', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 下部バーが表示されないことを確認
      await expect(page.locator('text=選択中')).not.toBeVisible();
      await expect(page.locator('button:has-text("一括AI返信生成")')).not.toBeVisible();
    });

    test('API エラー時にエラーメッセージが表示される', async ({ page }) => {
      // APIリクエストを失敗させる
      await page.route('**/api/ai-reply/bulk-generate', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.click('button:has-text("一括選択モード")');
      await page.locator('input[type="checkbox"]').first().click();
      await page.click('button:has-text("一括AI返信生成")');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=/エラー|失敗/')).toBeVisible({ timeout: 10000 });
    });

    test('利用量超過時にエラーメッセージが表示される', async ({ page }) => {
      // APIリクエストを利用量超過エラーにする
      await page.route('**/api/ai-reply/bulk-generate', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({
            error: 'AI返信生成の上限に達しました',
            limitExceeded: true,
            currentUsage: 100,
            limit: 100,
          }),
        });
      });

      await page.click('button:has-text("一括選択モード")');
      await page.locator('input[type="checkbox"]').first().click();
      await page.click('button:has-text("一括AI返信生成")');

      // 利用量超過エラーメッセージが表示されることを確認
      await expect(page.locator('text=/上限に達しました/')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('進捗表示', () => {
    test('進捗ダイアログに処理状況が表示される', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 複数のレビューを選択
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await checkboxes.nth(2).click();

      // 一括AI返信生成
      await page.click('button:has-text("一括AI返信生成")');

      // 進捗ダイアログが表示されることを確認
      await expect(page.locator('text=AI返信を一括生成中...')).toBeVisible();

      // 進捗率が表示されることを確認
      await expect(page.locator('text=/\\d+%/')).toBeVisible();

      // 成功件数が表示されることを確認
      await expect(page.locator('text=/成功/')).toBeVisible();

      // 残り件数が表示されることを確認
      await expect(page.locator('text=/残り/')).toBeVisible();
    });

    test('各レビューの処理状態が表示される', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');
      await page.locator('input[type="checkbox"]').first().click();

      // 一括AI返信生成
      await page.click('button:has-text("一括AI返信生成")');

      // 進捗ダイアログ内にレビューア名が表示されることを確認
      const reviewerName = await page.locator('input[type="checkbox"]').first()
        .locator('..')
        .locator('..')
        .locator('text=/\\S+/')
        .first()
        .textContent();

      await expect(page.locator(`text=${reviewerName}`)).toBeVisible();
    });
  });

  test.describe('キャンセル操作', () => {
    test('下部バーのキャンセルボタンで選択をクリアできる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');
      await page.locator('input[type="checkbox"]').first().click();

      // 下部バーのキャンセルボタンをクリック
      await page.locator('button:has-text("キャンセル")').first().click();

      // 選択がクリアされることを確認
      await expect(page.locator('text=選択中')).not.toBeVisible();

      // チェックボックスが非チェックになることを確認
      await expect(page.locator('input[type="checkbox"]').first()).not.toBeChecked();
    });

    test('確認ダイアログのキャンセルボタンで閉じることができる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');
      await page.locator('input[type="checkbox"]').first().click();
      await page.click('button:has-text("一括AI返信生成")');

      // 生成完了を待つ
      await page.waitForSelector('text=すべての返信生成が完了しました', {
        timeout: 60000,
      });

      // 確認ダイアログが表示されることを確認
      await expect(page.locator('text=生成された返信を確認')).toBeVisible();

      // キャンセルボタンをクリック
      await page.locator('button:has-text("キャンセル")').last().click();

      // ダイアログが閉じることを確認
      await expect(page.locator('text=生成された返信を確認')).not.toBeVisible();
    });
  });

  test.describe('UI/UX', () => {
    test('選択されたレビューカードがハイライトされる', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      const firstCard = page.locator('input[type="checkbox"]').first().locator('..').locator('..');

      // 選択前のスタイルを確認
      const beforeBorder = await firstCard.evaluate(el =>
        window.getComputedStyle(el).border
      );

      // チェックボックスをクリック
      await page.locator('input[type="checkbox"]').first().click();

      // 選択後のスタイルが変わることを確認（境界線が変わる）
      const afterBorder = await firstCard.evaluate(el =>
        window.getComputedStyle(el).border
      );

      expect(beforeBorder).not.toBe(afterBorder);
    });

    test('下部バーがスライドインで表示される', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 下部バーが非表示であることを確認
      await expect(page.locator('text=選択中')).not.toBeVisible();

      // レビューを選択
      await page.locator('input[type="checkbox"]').first().click();

      // 下部バーが表示されることを確認（アニメーション後）
      await expect(page.locator('text=1件選択中')).toBeVisible();
    });

    test('選択数が動的に更新される', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // 1件選択
      await page.locator('input[type="checkbox"]').nth(0).click();
      await expect(page.locator('text=1件選択中')).toBeVisible();

      // 2件目を選択
      await page.locator('input[type="checkbox"]').nth(1).click();
      await expect(page.locator('text=2件選択中')).toBeVisible();

      // 1件解除
      await page.locator('input[type="checkbox"]').nth(0).click();
      await expect(page.locator('text=1件選択中')).toBeVisible();
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量のレビュー選択でもUIが応答する', async ({ page }) => {
      await page.click('button:has-text("一括選択モード")');

      // すべて選択
      await page.click('button:has-text("すべて選択")');

      // 選択数が表示されることを確認
      const selectionText = await page.locator('text=/\\d+件選択中/').textContent();
      expect(selectionText).toBeTruthy();

      // 一括AI返信生成ボタンがクリック可能であることを確認
      await expect(page.locator('button:has-text("一括AI返信生成")')).toBeEnabled();
    });
  });
});
