# RevAI Concierge 概要

## プロジェクトの目的

RevAI Conciergeは、Googleレビューへの自動返信を生成・管理するためのWebアプリケーションです。AIを活用して、店舗ごとのトーンに合わせた適切な返信を生成し、効率的なレビュー管理を実現します。

## 主な機能

### 1. レビュー管理
- レビューの一覧表示・フィルタリング
- ステータス管理（未対応、対応済み、無視）
- 店舗ごとのフィルタリング
- Google Business Profile連携によるレビュー同期

### 2. AI返信生成
- **単体返信生成**: レビューごとにAI返信を生成
- **バルク返信生成**: 複数レビューへの一括AI返信生成
- **トーンセレクター**: 6種類のトーン（フォーマル、フレンドリー、プロフェッショナル等）から選択
- 返信の編集・再生成・承認

### 3. 返信テンプレート管理
- カスタム返信テンプレートの作成・編集
- カテゴリ別テンプレート管理
- テンプレートを使った返信生成

### 4. ダッシュボード
- レビュー統計の表示（総数、平均評価、返信率）
- 店舗ごとのパフォーマンス分析
- 対応状況の可視化
- リアルタイム更新

### 5. レビュー分析
- AI返信分析（`/ai-reply-analytics`）
- レビュー分析（`/reviews/analytics`）
- 評価分布・トレンド分析

### 6. ユーザー・組織管理
- マルチテナント対応
- ユーザー招待機能
- ロールベースアクセス制御（オーナー、管理者、メンバー）

### 7. サブスクリプション管理
- Stripe連携による課金
- プラン管理（Free、Pro、Enterprise）
- 請求履歴・サブスクリプション履歴

### 8. 設定管理
- Google Business Profile連携設定
- 通知設定（メール・LINE）
- 2段階認証（MFA）設定
- アカウントセキュリティ設定

### 9. その他機能
- お問い合わせフォーム
- Cookie同意管理（GDPR対応）
- ページ遷移アニメーション
- レスポンシブデザイン

## 技術スタック

### フロントエンド
- Next.js 14
- TypeScript
- Material-UI (MUI)
- Tailwind CSS
- Framer Motion（アニメーション）
- Supabase Client

### バックエンド
- Supabase (PostgreSQL + Auth + RLS)
- OpenAI API (GPT-4)
- Stripe API（決済）
- Google Business Profile API
- LINE Messaging API
- Resend（メール送信）

### インフラストラクチャ
- Vercel (フロントエンド・API)
- Supabase (データベース・認証)
- Sentry（エラー監視）

### テスト
- Playwright（E2Eテスト）
- Jest（ユニットテスト）

## システム要件

- Node.js 18.x以上
- npm 8.x以上
- Supabaseアカウント
- OpenAI APIキー
- Stripe APIキー（課金機能使用時）
- Google Cloud Platform アカウント（Google Business Profile連携時）

## 主要ページ一覧

| パス | 説明 |
|------|------|
| `/` | ランディングページ |
| `/auth/login` | ログイン |
| `/auth/register` | 新規登録 |
| `/dashboard` | メインダッシュボード |
| `/reviews` | レビュー管理 |
| `/reviews/analytics` | レビュー分析 |
| `/locations` | 店舗管理 |
| `/reply-templates` | 返信テンプレート管理 |
| `/ai-reply-analytics` | AI返信分析 |
| `/settings` | 設定 |
| `/profile` | プロフィール |
| `/account/security` | セキュリティ設定 |
| `/account/billing` | 請求管理 |
| `/tenants` | テナント管理 |
| `/contact` | お問い合わせ |
| `/pricing` | 料金プラン |

## 実装状況

### 実装済み
- メール/パスワード認証
- Google Business Profile連携（レビュー取得・返信投稿）
- AI返信生成（単体・バルク）
- トーンセレクター
- 返信テンプレート管理
- ダッシュボード・分析
- Stripe決済連携
- 2段階認証（MFA）
- ユーザー招待
- マルチテナント
- お問い合わせフォーム
- Cookie同意

### 未実装（計画中）
- Googleログイン（ソーシャル認証）
- LINEログイン（ソーシャル認証）
- ダークモード
- 多言語対応
- 週次レポート自動送信
- CSVエクスポート

## ライセンス

このプロジェクトは[MITライセンス](./LICENSE)の下で公開されています。
