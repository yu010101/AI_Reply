# システムアーキテクチャ

## 全体構成

RevAI Conciergeは、以下の主要コンポーネントで構成されています：

1. **フロントエンド（Next.js）**
   - ユーザーインターフェース
   - 認証管理
   - データ表示と操作

2. **バックエンド（Supabase）**
   - データベース
   - 認証
   - ストレージ

3. **AI生成サービス（AWS Lambda）**
   - レビュー返信の生成
   - トーン調整
   - 品質管理

4. **通知サービス（LINE）**
   - レビュー通知
   - ステータス更新通知

## データフロー

1. **レビュー取得フロー**
   ```
   ユーザー -> フロントエンド -> Supabase -> ダッシュボード表示
   ```

2. **返信生成フロー**
   ```
   ユーザー -> フロントエンド -> AWS Lambda -> OpenAI API -> フロントエンド
   ```

3. **通知フロー**
   ```
   Supabase -> LINE API -> ユーザー
   ```

## データベース設計

### locations テーブル
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'polite',
  line_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### reviews テーブル
```sql
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
```

### replies テーブル
```sql
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## セキュリティ設計

1. **認証**
   - Supabase Authを使用したユーザー認証
   - JWTトークンベースのセッション管理
   - パスワードポリシーの適用

2. **認可**
   - Row Level Security (RLS)の実装
   - ロールベースのアクセス制御
   - APIエンドポイントの保護

3. **データ保護**
   - 暗号化された通信（HTTPS）
   - 機密情報の環境変数管理
   - 定期的なセキュリティ監査

## スケーラビリティ

1. **水平スケーリング**
   - ステートレスなアーキテクチャ
   - キャッシュ戦略の実装
   - CDNの活用

2. **パフォーマンス最適化**
   - ページネーションの実装
   - 遅延読み込み
   - クエリの最適化

## 監視とロギング

1. **エラーモニタリング**
   - エラートラッキング
   - パフォーマンスメトリクス
   - ユーザーアクションログ

2. **アラート設定**
   - エラー通知
   - パフォーマンス閾値アラート
   - セキュリティイベント通知 