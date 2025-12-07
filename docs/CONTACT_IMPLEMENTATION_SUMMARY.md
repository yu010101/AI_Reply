# お問い合わせページ実装サマリー

## 実装完了日
2025-12-07

## 作成されたファイル

### 1. メインページ
**ファイル**: `/pages/contact.tsx` (437行)

**実装内容**:
- プロフェッショナルなお問い合わせフォーム
- MUIコンポーネントを使用した統一されたデザイン
- レスポンシブレイアウト（デスクトップ、タブレット、モバイル対応）
- SEO最適化（タイトル、メタディスクリプション、OGPタグ）

**主な機能**:
- ✅ フォーム入力フィールド（必須/任意の区別あり）
  - お名前（必須）
  - メールアドレス（必須）
  - 会社名（任意）
  - お問い合わせ種別（ドロップダウン）
  - お問い合わせ内容（必須、textarea）
- ✅ リアルタイムバリデーション
- ✅ エラーメッセージ表示
- ✅ 成功メッセージ表示
- ✅ ローディング状態の表示
- ✅ FAQセクション（アコーディオン形式、8項目）
- ✅ サイドバー情報
  - メールサポート情報
  - サポート時間
  - 注意事項
- ✅ レスポンス時間の明示（2営業日以内）

### 2. APIエンドポイント
**ファイル**: `/pages/api/contact/submit.ts` (247行)

**実装内容**:
- サーバーサイドバリデーション
- レート制限機能（スパム対策）
- エラーハンドリング
- セキュアな実装

**主な機能**:
- ✅ POSTリクエストのみ受付
- ✅ 入力バリデーション
  - 必須フィールドチェック
  - メールアドレス形式検証
  - 文字数制限チェック
  - お問い合わせ種別の妥当性確認
- ✅ レート制限
  - IPアドレスベース
  - 1時間あたり5回まで
  - インメモリストア（本番環境ではRedis推奨）
- ✅ データサニタイゼーション
- ✅ コンソールログ出力（開発用）
- ✅ 本番環境向けの拡張ポイント
  - データベース保存（Supabase）
  - メール送信（Nodemailer/SendGrid/Resend）
  - Slack/Discord通知

### 3. E2Eテスト
**ファイル**: `/e2e/contact.spec.ts` (281行)

**テストカバレッジ**:
- ✅ ページ表示テスト（正常系）
  - フォーム要素の表示確認
  - FAQセクションの表示確認
  - サイドバー情報の表示確認
- ✅ フォーム入力テスト（正常系）
  - すべてのフィールド入力
  - 必須フィールドのみでの送信
  - フォームのリセット確認
- ✅ バリデーションテスト（異常系）
  - お名前未入力
  - メールアドレス未入力
  - メールアドレス形式エラー
  - お問い合わせ内容未入力
  - お問い合わせ内容が短すぎる
  - エラーメッセージのクリア動作
- ✅ FAQ機能テスト
  - アコーディオンの開閉
  - 複数FAQの同時表示
- ✅ お問い合わせ種別テスト
  - 全種別の選択確認
- ✅ レスポンシブデザインテスト
  - モバイル表示
  - タブレット表示
- ✅ アクセシビリティテスト
  - ラベルの確認
  - 必須属性の確認

### 4. ドキュメント
**ファイル**: `/docs/CONTACT_PAGE.md`

**内容**:
- 機能概要
- API仕様
- 環境変数設定
- メール通知実装ガイド
  - Nodemailer
  - SendGrid
  - Resend
- Supabaseデータベース保存ガイド
- Slack/Discord通知実装ガイド
- カスタマイズ方法
- セキュリティ考慮事項
- 本番環境チェックリスト
- トラブルシューティング

### 5. テストスクリプト
**ファイル**: `/scripts/test-contact-api.ts`

**内容**:
- APIテスト用のcurlコマンド生成
- バリデーションテストケース
- レート制限テスト方法
- E2Eテスト実行コマンド

### 6. ナビゲーション更新
**ファイル**: `/src/components/layout/Navigation.tsx`（更新）

**変更内容**:
- ContactSupportアイコンの追加
- お問い合わせメニュー項目の追加
- ルーティング設定

## お問い合わせ種別

1. **サービスについて** - service
2. **技術的な問題** - technical
3. **料金・プランについて** - pricing
4. **解約について** - cancellation
5. **その他** - other

## FAQトピック（8項目）

1. サービスの利用開始までにかかる時間
2. プラン選択のガイド
3. AI返信の精度
4. プラン変更・解約の柔軟性
5. データセキュリティ
6. 複数スタッフでの利用
7. 対応プラットフォーム
8. サポート体制

## セキュリティ機能

- ✅ レート制限（1時間に5回まで）
- ✅ 入力バリデーション（サーバーサイド）
- ✅ データサニタイゼーション
- ✅ XSS対策（Reactの自動エスケープ）
- ✅ CSRF対策（Next.jsのAPIルート）
- ✅ IPアドレスベースの制限

## パフォーマンス

- MUIコンポーネントによる最適化されたレンダリング
- クライアントサイドバリデーションによるUX向上
- 軽量な依存関係
- レスポンシブデザインによる全デバイス対応

## アクセシビリティ

- ✅ セマンティックHTML
- ✅ 適切なARIAラベル
- ✅ キーボードナビゲーション対応
- ✅ フォーカス管理
- ✅ エラーメッセージの適切な配置
- ✅ 必須フィールドの明確な表示

## 本番環境への統合（TODO）

現在、お問い合わせデータはコンソールに出力されています。本番環境では以下のいずれかを実装してください：

### オプション1: データベース保存
```typescript
// Supabaseに保存
const { error } = await supabase
  .from('contact_submissions')
  .insert([sanitizedData]);
```

### オプション2: メール通知
```typescript
// Resend（推奨）
await resend.emails.send({
  from: 'support@revai-concierge.com',
  to: process.env.SUPPORT_EMAIL,
  subject: '新規お問い合わせ',
  text: `お名前: ${sanitizedData.name}...`,
});
```

### オプション3: Slack通知
```typescript
await fetch(process.env.SLACK_WEBHOOK_URL, {
  method: 'POST',
  body: JSON.stringify({ text: '新規お問い合わせ' }),
});
```

## テスト実行方法

```bash
# E2Eテスト実行
npx playwright test e2e/contact.spec.ts

# UIモードで実行
npx playwright test e2e/contact.spec.ts --ui

# デバッグモード
npx playwright test e2e/contact.spec.ts --debug

# 特定のブラウザのみ
npx playwright test e2e/contact.spec.ts --project=chromium
```

## カスタマイズポイント

### FAQの追加・変更
`pages/contact.tsx`の`faqs`配列を編集

### お問い合わせ種別の追加
1. `pages/contact.tsx`の`inquiryTypes`配列に追加
2. `pages/api/contact/submit.ts`の`validInquiryTypes`配列に追加
3. `getInquiryTypeLabel`関数にラベルを追加

### レート制限の調整
`pages/api/contact/submit.ts`の定数を変更:
```typescript
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 時間枠
const MAX_REQUESTS_PER_WINDOW = 5; // 最大リクエスト数
```

### サポート時間の変更
`pages/contact.tsx`のサイドバーカードを編集

## 統計情報

- **総行数**: 965行
  - contact.tsx: 437行
  - submit.ts: 247行
  - contact.spec.ts: 281行
- **テストケース数**: 19個のテストシナリオ
- **FAQ項目数**: 8項目
- **フォームフィールド数**: 5個
- **お問い合わせ種別**: 5種類

## 次のステップ

1. [ ] 開発サーバーで動作確認
2. [ ] E2Eテスト実行と合格確認
3. [ ] メール通知機能の実装
4. [ ] データベースへの保存機能の実装
5. [ ] 本番環境での環境変数設定
6. [ ] レート制限のRedis移行（本番環境）
7. [ ] 自動返信メールの実装
8. [ ] 管理画面でのお問い合わせ管理機能の実装

## 参考リンク

- [詳細ドキュメント](/docs/CONTACT_PAGE.md)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [MUI Documentation](https://mui.com/)
- [Playwright Testing](https://playwright.dev/)
