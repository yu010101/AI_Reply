# テストカバレッジレポート

## 📊 現在のカバレッジ状況

### 全体カバレッジ

```
Statements: 82.86%
Branches:    63.36%
Functions:   73.17%
Lines:       83.77%
```

**目標**: 80%以上 ✅ **達成済み**

---

## 📁 ファイル別カバレッジ

### API Routes

| ファイル | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| `pages/api/webhooks/stripe.ts` | 82.29% | 51.02% | 100% | 82.97% |

**未カバー行**: 62, 75-81, 192-200, 220-228, 248-256, 276-284, 295, 349

### Utils

| ファイル | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| `utils/logger.ts` | 59.45% | 38.88% | 42.1% | 61.42% |
| `utils/monitoring.ts` | 88.57% | 88.23% | 100% | 90.62% |
| `utils/security.ts` | 100% | 73.33% | 100% | 100% |
| `utils/usage-metrics.ts` | 100% | 83.33% | 100% | 100% |

---

## ✅ テストが存在する機能

### ユニットテスト

1. **エラーモニタリング** (`src/utils/__tests__/monitoring.test.ts`)
   - エラーログの記録
   - エラーの重要度判定
   - 管理者への通知
   - エラーモニタリングミドルウェア

2. **セキュリティ** (`src/utils/__tests__/security.test.ts`)
   - セキュリティユーティリティ関数

3. **使用量メトリクス** (`src/utils/__tests__/usage-metrics.test.ts`)
   - 使用量メトリクスの記録と取得

4. **Stripe Webhook** (`src/pages/api/webhooks/__tests__/stripe.test.ts`)
   - Webhookイベントの処理
   - 統合テスト (`stripe.integration.test.ts`)

5. **バックエンド統合テスト** (`src/backend/tests/integration.test.ts`)
   - 店舗管理
   - レビュー管理

6. **バックエンドセキュリティテスト** (`src/backend/tests/security.test.ts`)
   - セキュリティ機能のテスト

### E2Eテスト (Playwright)

1. **認証** (`e2e/auth.spec.ts`)
   - ログイン
   - 認証済みユーザーのリダイレクト

2. **ダッシュボード** (`e2e/dashboard.spec.ts`)
   - キーメトリクスの表示
   - ナビゲーションメニュー

3. **レビュー** (`e2e/reviews.spec.ts`)
   - レビューページの表示
   - 空の状態の表示

4. **設定** (`e2e/settings.spec.ts`)
   - 設定タブの表示

5. **テナント** (`e2e/tenants.spec.ts`)
   - テナントページの表示
   - 空の状態の表示

---

## ⚠️ テストが不足している重要な機能

### 高優先度（リリース前に推奨）

1. **認証API** (`pages/api/auth/*`)
   - Google OAuth認証 (`google-auth.ts`, `google-callback.ts`)
   - ログイン/サインアップ (`login.ts`, `signup.ts`)
   - MFA設定 (`mfa/setup.ts`, `mfa/verify.ts`, `mfa/disable.ts`)

2. **サブスクリプションAPI** (`pages/api/subscriptions/*`)
   - サブスクリプション作成 (`create.ts`)
   - サブスクリプション更新 (`update.ts`)
   - サブスクリプションキャンセル (`cancel.ts`)
   - チェックアウトセッション作成 (`create-checkout-session.ts`)

3. **Google Business API** (`pages/api/google-business/*`, `pages/api/google/business/*`)
   - アカウント取得 (`accounts.ts`)
   - レビュー取得 (`reviews.ts`)
   - レビュー返信 (`reply.ts`)
   - ロケーション取得 (`locations.ts`)

4. **AI返信生成** (`pages/api/ai-reply/generate.ts`)
   - AI返信の生成ロジック

5. **通知API** (`pages/api/notifications/*`)
   - 通知送信 (`send.ts`)
   - レビュー通知 (`send-review-notification.ts`)

6. **組織管理API** (`pages/api/organizations/*`)
   - ユーザー招待 (`invite.ts`)
   - 招待承認 (`accept-invite.ts`)

### 中優先度

1. **ロガー** (`utils/logger.ts`)
   - カバレッジ: 59.45%（改善の余地あり）
   - 機密情報フィルタリングのテスト
   - ログレベルのテスト

2. **パフォーマンス監視** (`utils/performanceMonitoring.ts`)
   - 新規追加された機能のテストが必要

3. **認証ミドルウェア** (`middleware/authMiddleware.ts`)
   - `requireAuth`
   - `requireRole`
   - `requireOrganizationAccess`

4. **レート制限ミドルウェア** (`middleware.ts`, `middleware/apiLimitMiddleware.ts`)
   - IPベースのレート制限
   - 組織ベースのレート制限

### 低優先度

1. **コンポーネントテスト**
   - Reactコンポーネントのユニットテスト
   - 現在はE2Eテストのみ

---

## 📝 テストカバレッジ改善の推奨事項

### 1. 重要なAPIエンドポイントのテスト追加

```typescript
// 例: pages/api/auth/google-callback.test.ts
describe('Google OAuth Callback', () => {
  it('should handle successful OAuth callback', async () => {
    // テスト実装
  });
  
  it('should handle OAuth errors', async () => {
    // テスト実装
  });
});
```

### 2. ロガーのテストカバレッジ向上

`utils/logger.ts`のカバレッジを80%以上に改善：
- 機密情報フィルタリングのテスト
- 各ログレベルのテスト
- 環境変数による動作変更のテスト

### 3. パフォーマンス監視のテスト追加

`utils/performanceMonitoring.ts`のテストを作成：
- パフォーマンスメトリクスの記録
- データベース接続チェック
- ヘルスチェックエンドポイント

### 4. 認証ミドルウェアのテスト追加

`middleware/authMiddleware.ts`のテストを作成：
- 認証チェック
- 認可チェック
- エラーハンドリング

---

## 🎯 テストカバレッジ目標

### 短期目標（リリース前）

- [ ] 重要なAPIエンドポイントのテストカバレッジ: 80%以上
- [ ] ロガーのテストカバレッジ: 80%以上
- [ ] 認証・認可ミドルウェアのテスト: 100%

### 中期目標（リリース後）

- [ ] 全体のテストカバレッジ: 85%以上
- [ ] ブランチカバレッジ: 75%以上
- [ ] すべてのAPIエンドポイントにテストを追加

---

## 🔍 テスト実行方法

### ユニットテスト

```bash
# すべてのテストを実行
npm test

# カバレッジレポートを生成
npm run test:coverage

# 特定のテストファイルを実行
npm test -- src/utils/__tests__/monitoring.test.ts

# ウォッチモード
npm run test:watch
```

### E2Eテスト

```bash
# すべてのE2Eテストを実行
npx playwright test

# 特定のテストファイルを実行
npx playwright test e2e/auth.spec.ts

# UIモードで実行
npx playwright test --ui

# レポートを表示
npx playwright show-report
```

---

## 📊 カバレッジレポートの確認

カバレッジレポートは以下のコマンドで生成されます：

```bash
npm run test:coverage
```

レポートは`coverage/`ディレクトリに生成され、`coverage/lcov-report/index.html`をブラウザで開くことで詳細を確認できます。

---

## ✅ チェックリスト

### リリース前の確認

- [x] テストカバレッジレポートの生成 ✅
- [x] カバレッジが80%以上か確認 ✅ (82.86%)
- [ ] 重要な機能のテストが不足していないか確認 ⚠️ 要対応
- [ ] 認証APIのテスト追加
- [ ] サブスクリプションAPIのテスト追加
- [ ] Google Business APIのテスト追加
- [ ] AI返信生成APIのテスト追加

---

## 📚 参考資料

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
