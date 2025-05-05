# RevAI Concierge 概要

## プロジェクトの目的

RevAI Conciergeは、Googleレビューへの自動返信を生成・管理するためのWebアプリケーションです。AIを活用して、店舗ごとのトーンに合わせた適切な返信を生成し、効率的なレビュー管理を実現します。

## 主な機能

1. **レビュー管理**
   - レビューの一覧表示
   - ステータス管理（未対応、対応済み、無視）
   - 店舗ごとのフィルタリング

2. **AI返信生成**
   - 店舗ごとのトーン設定
   - 自動返信生成
   - 返信の編集と承認

3. **ダッシュボード**
   - レビュー統計の表示
   - 店舗ごとのパフォーマンス分析
   - 対応状況の可視化

4. **設定管理**
   - 店舗情報の管理
   - 返信トーンの設定
   - LINE通知の設定

## 技術スタック

### フロントエンド
- Next.js
- TypeScript
- Tailwind CSS
- Supabase Client

### バックエンド
- Supabase
- OpenAI API
- LINE Messaging API

### インフラストラクチャ
- Vercel (フロントエンド)
- Supabase (バックエンド)
- AWS Lambda (AI生成)

## システム要件

- Node.js 18.x以上
- npm 8.x以上
- Supabaseアカウント
- OpenAI APIキー
- LINE Messaging APIキー

## ライセンス

このプロジェクトは[MITライセンス](./LICENSE)の下で公開されています。 