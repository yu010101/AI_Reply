# 環境変数リファレンス

このドキュメントでは、RevAI Conciergeで使用されるすべての環境変数について説明します。

## 📋 目次

- [必須環境変数](#必須環境変数)
- [オプション環境変数](#オプション環境変数)
- [環境変数のバリデーション](#環境変数のバリデーション)
- [本番環境での設定](#本番環境での設定)
- [トラブルシューティング](#トラブルシューティング)

---

## 必須環境変数

以下の環境変数は、アプリケーションを正常に動作させるために**必須**です。

### Supabase設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | `https://xxx.supabase.co` | クライアントサイドで公開されます |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | `eyJhbGc...` | クライアントサイドで公開されます |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー | `eyJhbGc...` | **機密情報** - サーバーサイドのみ |

### Stripe設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公開可能キー | `pk_test_...` | クライアントサイドで公開されます |
| `STRIPE_SECRET_KEY` | Stripeシークレットキー | `sk_test_...` | **機密情報** - サーバーサイドのみ |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhookシークレット | `whsec_...` | **機密情報** - Webhook検証用 |

### OpenAI設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `OPENAI_API_KEY` | OpenAI APIキー | `sk-...` | **機密情報** - AI返信生成に使用 |

### Google OAuth設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 クライアントID | `xxx.apps.googleusercontent.com` | Google OAuth認証に使用 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 クライアントシークレット | `GOCSPX-...` | **機密情報** |
| `NEXT_PUBLIC_APP_URL` | アプリケーションのベースURL | `https://your-domain.com` | OAuthコールバックURLに使用 |

---

## オプション環境変数

以下の環境変数は、特定の機能を使用する場合のみ必要です。

### LINE Messaging API設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API チャネルアクセストークン | `xxx...` | LINE通知機能を使用する場合 |
| `LINE_CHANNEL_SECRET` | LINE Messaging API チャネルシークレット | `xxx...` | **機密情報** - LINE通知機能を使用する場合 |

### SMTP設定（メール通知用）

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `SMTP_HOST` | SMTPサーバーのホスト名 | `smtp.gmail.com` | メール通知機能を使用する場合 |
| `SMTP_PORT` | SMTPサーバーのポート番号 | `587` | 通常は587（STARTTLS）または465（TLS） |
| `SMTP_USER` | SMTP認証ユーザー名 | `user@example.com` | **機密情報** |
| `SMTP_PASSWORD` | SMTP認証パスワード | `password` | **機密情報** |
| `SMTP_SECURE` | SMTP接続のセキュリティ設定 | `false` | `true`: TLS, `false`: STARTTLS |

### Sentry設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN（クライアントサイド） | `https://xxx@xxx.ingest.sentry.io/xxx` | エラートラッキング用 |
| `SENTRY_DSN` | Sentry DSN（サーバーサイド） | `https://xxx@xxx.ingest.sentry.io/xxx` | エラートラッキング用 |
| `NEXT_PUBLIC_APP_VERSION` | アプリケーションのバージョン | `1.0.0` | Sentryでリリースを追跡する場合 |

詳細は`docs/SENTRY_SETUP.md`を参照してください。

### その他の設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `NOTIFICATION_API_KEY` | 通知APIキー | `xxx...` | 外部通知サービスを使用する場合 |
| `GOOGLE_API_KEY` | Google Maps APIキー | `AIza...` | Google Maps機能を使用する場合 |
| `NEXT_PUBLIC_IMAGE_DOMAINS` | 外部画像ドメイン（カンマ区切り） | `images.unsplash.com,cdn.example.com` | Next.js Imageコンポーネントで使用する外部画像ドメイン |

### 開発環境設定

| 変数名 | 説明 | 例 | 備考 |
|--------|------|-----|------|
| `MOCK_GOOGLE_AUTH` | モック認証を使用するか | `false` | **本番環境では必ず `false`** |
| `DEV_USER_ID` | 開発環境用の固定ユーザーID | `xxx...` | 開発時のみ使用 |

---

## 環境変数のバリデーション

アプリケーションのビルド前に、環境変数のバリデーションを実行できます：

```bash
npm run validate-env
```

このコマンドは以下をチェックします：

1. ✅ 必須環境変数がすべて設定されているか
2. ✅ 環境変数の値が正しい形式か
3. ✅ 本番環境で開発用の設定が有効になっていないか
4. ⚠️ クライアントサイドで公開される環境変数に機密情報が含まれていないか

### バリデーションエラーの例

```bash
❌ 環境変数のバリデーションに失敗しました:

  ❌ 必須環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL
     SupabaseプロジェクトのURL
     例: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

💡 解決方法:
  1. .env.local ファイルを作成し、必要な環境変数を設定してください
  2. .env.example ファイルを参考にしてください
  3. 環境変数の設定方法については README.md を参照してください
```

---

## 本番環境での設定

### Vercelでの設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables に移動
4. 各環境変数を追加（Production, Preview, Development で個別に設定可能）

### 環境変数の優先順位

1. `.env.local` (ローカル開発環境)
2. `.env.development` / `.env.production` (環境別設定)
3. `.env` (デフォルト設定)
4. Vercel環境変数（本番環境）

### セキュリティベストプラクティス

1. ✅ **機密情報は絶対にGitにコミットしない**
   - `.env.local` は `.gitignore` に含まれています
   - `.env.example` にはプレースホルダーのみ記載

2. ✅ **NEXT_PUBLIC_ で始まる変数はクライアントサイドで公開される**
   - 機密情報を含めないこと
   - ブラウザの開発者ツールで確認可能

3. ✅ **本番環境では開発用の設定を無効化**
   - `MOCK_GOOGLE_AUTH=false`
   - `DEV_USER_ID` は設定しない

4. ✅ **環境変数の値を定期的にローテーション**
   - APIキーやシークレットは定期的に更新

---

## トラブルシューティング

### 環境変数が読み込まれない

**原因**: 環境変数ファイルの優先順位や命名規則の問題

**解決方法**:
1. `.env.local` ファイルが存在するか確認
2. 環境変数名にタイポがないか確認
3. アプリケーションを再起動

### バリデーションエラーが発生する

**原因**: 環境変数の値が正しい形式でない、または必須環境変数が不足

**解決方法**:
1. `npm run validate-env` を実行してエラーを確認
2. `.env.example` を参考に正しい形式で設定
3. 必須環境変数がすべて設定されているか確認

### 本番環境でエラーが発生する

**原因**: 環境変数が本番環境で設定されていない

**解決方法**:
1. Vercelダッシュボードで環境変数を確認
2. 環境変数が Production 環境に設定されているか確認
3. アプリケーションを再デプロイ

---

## 関連ドキュメント

- [セットアップガイド](./setup.md)
- [デプロイメントガイド](./deployment.md)
- [セキュリティガイド](./security.md)
