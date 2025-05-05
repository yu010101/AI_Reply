# セットアップガイド

## 前提条件

- Node.js 18.x以上
- npm 8.x以上
- Git
- Supabaseアカウント
- OpenAI APIキー
- LINE Messaging APIキー

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/revai-concierge.git
cd revai-concierge
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定します：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI設定
OPENAI_API_KEY=your-openai-api-key

# LINE設定
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

### 4. Supabaseのセットアップ

1. Supabaseプロジェクトを作成
2. データベーステーブルを作成（`architecture.md`のSQLを実行）
3. Row Level Security (RLS)を設定
4. 認証設定を構成

### 5. 開発サーバーの起動

```bash
npm run dev
```

## データベースの初期設定

### 1. テーブルの作成

SupabaseのSQLエディタで以下のSQLを実行：

```sql
-- locationsテーブル
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'polite',
  line_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reviewsテーブル
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id),
  author TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- repliesテーブル
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. RLSポリシーの設定

```sql
-- locationsテーブルのRLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分の店舗のみアクセス可能"
ON locations FOR ALL
USING (auth.uid() = user_id);

-- reviewsテーブルのRLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは関連する店舗のレビューのみアクセス可能"
ON reviews FOR ALL
USING (
  location_id IN (
    SELECT id FROM locations
    WHERE user_id = auth.uid()
  )
);

-- repliesテーブルのRLS
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは関連するレビューの返信のみアクセス可能"
ON replies FOR ALL
USING (
  review_id IN (
    SELECT r.id FROM reviews r
    JOIN locations l ON r.location_id = l.id
    WHERE l.user_id = auth.uid()
  )
);
```

## テスト環境のセットアップ

### 1. テストデータの投入

```sql
-- テスト用店舗データ
INSERT INTO locations (name, tone, line_user_id)
VALUES
  ('テスト店舗1', 'polite', 'test_line_user_1'),
  ('テスト店舗2', 'casual', 'test_line_user_2');

-- テスト用レビューデータ
INSERT INTO reviews (location_id, author, rating, comment, status)
VALUES
  ((SELECT id FROM locations WHERE name = 'テスト店舗1'),
   'テストユーザー1', 5, '素晴らしいサービスでした！', 'pending'),
  ((SELECT id FROM locations WHERE name = 'テスト店舗2'),
   'テストユーザー2', 4, 'また利用したいです。', 'responded');
```

### 2. テストの実行

```bash
npm test
```

## トラブルシューティング

### よくある問題と解決策

1. **Supabase接続エラー**
   - 環境変数が正しく設定されているか確認
   - Supabaseプロジェクトがアクティブか確認
   - ネットワーク接続を確認

2. **認証エラー**
   - ユーザーが正しく作成されているか確認
   - パスワードが正しいか確認
   - セッションが有効か確認

3. **データベースエラー**
   - テーブルが正しく作成されているか確認
   - RLSポリシーが適切に設定されているか確認
   - 必要な権限があるか確認

## 次のステップ

- [フロントエンド開発ガイド](./frontend.md)を参照して開発を開始
- [APIリファレンス](./api.md)で利用可能なAPIを確認
- [デプロイメントガイド](./deployment.md)で本番環境へのデプロイ方法を確認 