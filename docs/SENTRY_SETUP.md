# Sentry設定ガイド

## 📋 概要

Sentryは、エラートラッキングとパフォーマンス監視を提供するサービスです。このガイドでは、RevAI ConciergeでSentryを設定する手順を説明します。

---

## 🚀 セットアップ手順

### 1. Sentryアカウントの作成

1. [Sentry](https://sentry.io)にアクセス
2. アカウントを作成（無料プランでも利用可能）
3. 新しいプロジェクトを作成
   - **プラットフォーム**: Next.js
   - **プロジェクト名**: `revai-concierge`（任意）

### 2. DSNの取得

プロジェクト作成後、DSN（Data Source Name）が表示されます：

```
https://xxx@xxx.ingest.sentry.io/xxx
```

このDSNをコピーして、環境変数に設定します。

---

## 🔧 環境変数の設定

### ローカル開発環境

`.env.local`ファイルに追加：

```env
# Sentry設定
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# アプリバージョン（オプション）
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 本番環境（Vercel）

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@xxx.ingest.sentry.io/xxx` | Production, Preview, Development |
| `SENTRY_DSN` | `https://xxx@xxx.ingest.sentry.io/xxx` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | Production（オプション） |

5. **Save**をクリック
6. アプリケーションを再デプロイ

---

## 📊 設定ファイル

Sentryは以下の設定ファイルで設定されています：

- `sentry.client.config.ts` - クライアントサイド（ブラウザ）の設定
- `sentry.server.config.ts` - サーバーサイド（API Routes）の設定
- `sentry.edge.config.ts` - Edge Runtime（Middleware）の設定

### 主な設定内容

- **エラートラッキング**: すべてのエラーが自動的にSentryに送信されます
- **パフォーマンス監視**: 10%のサンプリングレートでパフォーマンスデータを収集
- **機密情報フィルタリング**: パスワード、トークンなどの機密情報を自動的にマスク
- **セッションリプレイ**: エラー発生時のセッションを記録（開発環境では100%、本番環境では10%）

---

## 🔔 アラートの設定

### 1. エラーレートのアラート

1. Sentryダッシュボードで **Alerts** → **Create Alert Rule** をクリック
2. 以下の設定を入力：
   - **Name**: `High Error Rate`
   - **Conditions**: 
     - When an issue is seen more than **100** times in **1 hour**
   - **Actions**: 
     - Send email notification
     - Send Slack notification（オプション）

### 2. パフォーマンスのアラート

1. **Alerts** → **Create Alert Rule** をクリック
2. 以下の設定を入力：
   - **Name**: `Slow API Response`
   - **Conditions**:
     - When a transaction has a p95 duration greater than **5000ms**
   - **Actions**:
     - Send email notification

### 3. 可用性のアラート

1. **Alerts** → **Create Alert Rule** をクリック
2. 以下の設定を入力：
   - **Name**: `Health Check Failed`
   - **Conditions**:
     - When `/api/health` returns a status code other than **200**
   - **Actions**:
     - Send email notification

---

## 📈 ダッシュボードの確認

Sentryダッシュボードで以下を確認できます：

- **Issues**: 発生したエラーの一覧
- **Performance**: APIエンドポイントのパフォーマンス
- **Releases**: デプロイされたバージョン
- **Alerts**: 設定したアラートの状態

---

## 🔍 エラーの確認方法

### 1. Sentryダッシュボードで確認

1. Sentryダッシュボードにログイン
2. プロジェクトを選択
3. **Issues**タブでエラーを確認
4. エラーをクリックして詳細を確認：
   - スタックトレース
   - リクエスト情報
   - ユーザー情報
   - ブラウザ情報

### 2. コードでエラーを送信

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // 処理
} catch (error) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      section: 'api',
    },
    extra: {
      additionalInfo: '追加情報',
    },
  });
}
```

---

## 🛠️ トラブルシューティング

### DSNが設定されていない場合

エラーは発生しませんが、Sentryにエラーが送信されません。環境変数を確認してください。

### エラーが送信されない場合

1. 環境変数が正しく設定されているか確認
2. ブラウザのコンソールでエラーを確認
3. Sentryダッシュボードでプロジェクトの設定を確認

### 機密情報が送信されている場合

`beforeSend`フックで機密情報をフィルタリングしていますが、追加のフィルタリングが必要な場合は設定ファイルを編集してください。

---

## 📚 参考資料

- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Alert Rules](https://docs.sentry.io/product/alerts/)

---

## ✅ チェックリスト

- [ ] Sentryアカウントの作成
- [ ] プロジェクトの作成
- [ ] DSNの取得
- [ ] 環境変数の設定（ローカル）
- [ ] 環境変数の設定（本番環境）
- [ ] アラートルールの設定
- [ ] テストエラーの送信
- [ ] ダッシュボードの確認
