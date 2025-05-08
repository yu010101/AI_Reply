# Google API 設定ガイド

このドキュメントでは、AI Replyアプリケーションで使用するGoogle OAuth認証とGoogle Business Profile APIの設定方法について説明します。

## 1. Google Cloud Consoleプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスします
2. 画面上部の「プロジェクト選択」をクリックし、「新しいプロジェクト」を選択
3. プロジェクト名を入力（例: "AI Reply"）して「作成」をクリック
4. プロジェクトが作成されたら、そのプロジェクトを選択

## 2. 必要なAPIの有効化

1. 左側のナビゲーションメニューから「APIとサービス」>「ライブラリ」を選択
2. 以下のAPIを検索して有効化します:
   - Google Business Profile API
   - Google MyBusiness API

## 3. OAuth同意画面の設定

1. 左側のナビゲーションメニューから「APIとサービス」>「認証情報」を選択
2. 上部の「OAuth同意画面」タブをクリック
3. ユーザータイプとして「外部」を選択し、「作成」をクリック
4. アプリ情報を入力:
   - アプリ名: "AI Reply"
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
5. 「保存して次へ」をクリック
6. スコープの追加で、以下を追加:
   - `https://www.googleapis.com/auth/business.manage`
   - `https://www.googleapis.com/auth/plus.business.manage`
7. 「保存して次へ」をクリック
8. テストユーザーとして、自分のメールアドレスを追加
9. 「保存して次へ」をクリック
10. 概要を確認し、「ダッシュボードに戻る」をクリック

## 4. OAuthクライアント認証情報の作成

1. 左側のナビゲーションメニューから「APIとサービス」>「認証情報」を選択
2. 「認証情報を作成」>「OAuthクライアントID」をクリック
3. アプリケーションタイプとして「ウェブアプリケーション」を選択
4. 名前を入力（例: "AI Reply Web Client"）
5. 「承認済みのリダイレクトURI」で「URIを追加」をクリックし、以下を入力:
   - 開発環境: `http://localhost:3000/api/auth/google-callback`
   - 本番環境: `https://あなたのドメイン/api/auth/google-callback`
6. 「作成」をクリック
7. 表示されたクライアントIDとクライアントシークレットをメモします

## 5. 環境変数の設定

1. プロジェクトのルートディレクトリに`.env.local`ファイルを作成または編集
2. 以下の環境変数を追加:

```
GOOGLE_CLIENT_ID=あなたのクライアントID
GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
MOCK_GOOGLE_AUTH=false
```

## 6. Supabaseテーブルの設定

1. Supabaseダッシュボード（https://app.supabase.io/）にアクセス
2. あなたのプロジェクトを選択
3. 左側メニューから「SQL Editor」を選択
4. 新しいクエリを作成し、プロジェクトの`supabase/migrations`ディレクトリ内のSQLファイルの内容をコピー&ペースト:
   - `20250507000000_create_google_auth_tokens.sql`
   - `20250507000001_fix_permissions.sql`
5. 「Run」ボタンをクリックしてSQLを実行

## 7. アプリケーションの再起動

設定が完了したら、アプリケーションを再起動して変更を適用します:

```bash
npm run dev
```

## トラブルシューティング

* **401 Unauthorized エラー**: クライアントIDとクライアントシークレットが正しいか確認
* **リダイレクトURI不一致エラー**: Google Cloud Consoleに登録したリダイレクトURIがアプリのURLと一致しているか確認
* **スコープ不足エラー**: 必要なスコープがOAuth同意画面で設定されているか確認
* **データベース権限エラー**: Supabaseのテーブル権限が正しく設定されているか確認 