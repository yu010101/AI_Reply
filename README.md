# RevAI Concierge

RevAI Conciergeは、Googleレビュー管理とAI返信生成機能を提供するSaaSアプリケーションです。
ビジネスオーナーやマーケティング担当者が、顧客レビューを効率的に管理し、高品質な返信を自動生成することができます。

## 主な機能

- **Googleレビュー連携**: 複数店舗のGoogleレビューを一元管理
- **AI返信生成**: OpenAI APIを活用した高品質な返信文の自動生成
- **返信テンプレート**: カスタマイズ可能な返信テンプレートの管理
- **分析ダッシュボード**: レビュー評価や返信率のグラフィカルな分析
- **通知システム**: 新着・低評価レビューのメール通知
- **サブスクリプション管理**: Stripe連携による複数プラン提供

## 技術スタック

- **フロントエンド**: Next.js, React, TypeScript, Material UI
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **決済**: Stripe
- **AI**: OpenAI (GPT-4)
- **メール**: Nodemailer
- **データ可視化**: Chart.js

## 開発環境のセットアップ

### 前提条件
- Node.js 16.x以上
- npm 8.x以上
- Supabaseアカウント
- OpenAIアカウント
- Stripeアカウント

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/revai-concierge.git
cd revai-concierge
```

2. 依存パッケージをインストール
```bash
npm install
```

3. 環境変数を設定
`.env.local`ファイルを作成し、以下の変数を設定：
```
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI設定
OPENAI_API_KEY=your_openai_api_key

# Stripe設定
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# メール設定
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_SECURE=false

# アプリ設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NOTIFICATION_API_KEY=your_notification_api_key

# Google API
GOOGLE_API_KEY=your_google_api_key
```

4. 開発サーバーを起動
```bash
npm run dev
```

5. ブラウザで[http://localhost:3000](http://localhost:3000)にアクセス

## データベース構造

Supabaseで以下のテーブルを作成する必要があります：

- `tenants`: テナント情報
- `users`: ユーザー情報
- `locations`: 店舗情報
- `reviews`: レビュー情報
- `replies`: 返信情報
- `reply_templates`: 返信テンプレート
- `subscriptions`: サブスクリプション情報
- `payments`: 支払い情報
- `usage_metrics`: 使用量メトリクス
- `notification_settings`: 通知設定
- `notification_logs`: 通知ログ

詳細なスキーマは`docs/database.md`を参照してください。

## 本番デプロイ

### Vercelへのデプロイ

1. [Vercel](https://vercel.com)にアカウントを作成
2. GitHubリポジトリと連携
3. 環境変数を設定
4. デプロイ

## テスト

```bash
# 単体テストを実行
npm test

# テストカバレッジレポートを生成
npm run test:coverage
```

## ライセンス

[MIT](LICENSE)

## お問い合わせ

サポートやフィードバックは[support@example.com](mailto:support@example.com)までお願いします。
