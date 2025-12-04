# データベースマイグレーションガイド

## 📋 目次

- [マイグレーション概要](#マイグレーション概要)
- [本番環境へのマイグレーション手順](#本番環境へのマイグレーション手順)
- [マイグレーションファイル一覧](#マイグレーションファイル一覧)
- [ロールバック手順](#ロールバック手順)
- [インデックス確認](#インデックス確認)
- [トラブルシューティング](#トラブルシューティング)

---

## マイグレーション概要

このプロジェクトでは、Supabaseを使用してデータベースを管理しています。マイグレーションファイルは`supabase/migrations/`ディレクトリに配置されています。

### マイグレーション実行順序

マイグレーションファイルはタイムスタンプ順に実行されます：

1. `20240320000000_create_google_business_accounts.sql` - Google Businessアカウントテーブル作成
2. `20250507000000_create_google_auth_tokens.sql` - Google認証トークンテーブル作成
3. `20250507000001_fix_permissions.sql` - RLSポリシーの修正

---

## 本番環境へのマイグレーション手順

### 前提条件

- Supabase CLIがインストールされていること
- 本番環境のSupabaseプロジェクトにアクセス権限があること
- データベースのバックアップが取得されていること

### 手順

#### 1. バックアップの取得

```bash
# Supabaseダッシュボードから手動でバックアップを取得
# または、CLIを使用してバックアップを取得
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. マイグレーションの確認

```bash
# マイグレーションファイルの構文チェック
supabase db lint

# マイグレーションのプレビュー（実際には実行しない）
supabase db diff --schema public
```

#### 3. ステージング環境でのテスト

```bash
# ステージング環境に接続
supabase link --project-ref <staging-project-ref>

# マイグレーションを実行
supabase db push

# 動作確認
# - テーブルが正しく作成されているか
# - RLSポリシーが適切に設定されているか
# - インデックスが作成されているか
```

#### 4. 本番環境への適用

```bash
# 本番環境に接続
supabase link --project-ref <production-project-ref>

# マイグレーションを実行
supabase db push

# 実行結果を確認
supabase db diff --schema public
```

#### 5. マイグレーション後の確認

```sql
-- テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- RLSポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- インデックスの確認
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## マイグレーションファイル一覧

### パフォーマンスメトリクステーブル

**ファイル**: `supabase/migrations/20250127000001_create_performance_metrics.sql`

**説明**: APIリクエストのパフォーマンスメトリクスを記録するテーブルを作成します。

**実行方法**:
```bash
# Supabase CLIを使用
supabase db push

# または、SupabaseダッシュボードのSQLエディタで実行
```

**注意事項**:
- このテーブルは大量のデータを記録する可能性があるため、定期的なクリーンアップを推奨します
- パーティショニングを使用する場合は、月ごとのパーティションを作成してください

---

### 1. `20240320000000_create_google_business_accounts.sql`

**目的**: Google Businessアカウント情報を保存するテーブルを作成

**作成されるテーブル**:
- `google_business_accounts`

**RLSポリシー**:
- テナントは自身のアカウントのみアクセス可能

**インデックス**:
- `idx_google_business_accounts_tenant_id`
- `idx_google_business_accounts_account_id`

### 2. `20250507000000_create_google_auth_tokens.sql`

**目的**: Google OAuth認証トークンを保存するテーブルを作成

**作成されるテーブル**:
- `google_auth_tokens`
- `oauth_states`

**RLSポリシー**:
- ユーザーは自分のレコードのみアクセス可能（SELECT, INSERT, UPDATE, DELETE）

**インデックス**:
- `idx_google_auth_tokens_tenant_id`
- `idx_oauth_states_tenant_id`
- `idx_oauth_states_state`

### 3. `20250507000001_fix_permissions.sql`

**目的**: RLSポリシーを修正して、サービスロールからのアクセスを許可

**変更内容**:
- 既存のポリシーを削除
- 認証済みユーザーとサービスロールからのアクセスを許可
- 開発環境のため、匿名ユーザーからのアクセスも許可

**注意**: 本番環境では匿名ユーザーからのアクセスを許可しないことを推奨

---

## ロールバック手順

### マイグレーションのロールバック

```bash
# 特定のマイグレーションをロールバック
supabase migration down <migration-name>

# または、手動でSQLを実行
psql <connection-string> -f rollback_script.sql
```

### ロールバックスクリプトの例

```sql
-- 20250507000001_fix_permissions.sql のロールバック
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "サービスロールはフルアクセス可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.oauth_states;
DROP POLICY IF EXISTS "サービスロールはフルアクセス可能" ON public.oauth_states;
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.oauth_states;

-- 元のポリシーを復元
CREATE POLICY "ユーザーは自分のレコードのみ参照可能" ON public.google_auth_tokens
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "ユーザーは自分のレコードのみ挿入可能" ON public.google_auth_tokens
  FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "ユーザーは自分のレコードのみ更新可能" ON public.google_auth_tokens
  FOR UPDATE USING (auth.uid() = tenant_id);

CREATE POLICY "ユーザーは自分のレコードのみ削除可能" ON public.google_auth_tokens
  FOR DELETE USING (auth.uid() = tenant_id);
```

---

## インデックス確認

### 推奨インデックス

以下のインデックスが適切に設定されているか確認してください：

```sql
-- テナントIDによる検索が多いテーブル
CREATE INDEX IF NOT EXISTS idx_google_business_accounts_tenant_id 
ON public.google_business_accounts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_google_auth_tokens_tenant_id 
ON public.google_auth_tokens(tenant_id);

CREATE INDEX IF NOT EXISTS idx_oauth_states_tenant_id 
ON public.oauth_states(tenant_id);

-- 外部キーによる結合が多い場合
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id 
ON public.organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id 
ON public.subscriptions(organization_id);
```

### インデックスのパフォーマンス確認

```sql
-- 未使用のインデックスを確認
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

---

## トラブルシューティング

### よくある問題

#### 1. マイグレーションが失敗する

**原因**: 
- 既存のテーブルやポリシーと競合
- 権限不足

**解決方法**:
```sql
-- 既存のオブジェクトを確認
SELECT * FROM pg_tables WHERE schemaname = 'public';
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 必要に応じて削除
DROP TABLE IF EXISTS <table_name> CASCADE;
DROP POLICY IF EXISTS <policy_name> ON <table_name>;
```

#### 2. RLSポリシーが機能しない

**原因**:
- RLSが有効になっていない
- ポリシーが正しく設定されていない

**解決方法**:
```sql
-- RLSが有効か確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- RLSを有効化
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = '<table_name>';
```

#### 3. パフォーマンスの問題

**原因**:
- インデックスが不足
- クエリが最適化されていない

**解決方法**:
```sql
-- スロークエリを確認
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS <index_name> ON <table_name>(<column_name>);
```

---

## チェックリスト

### マイグレーション前

- [ ] データベースのバックアップを取得
- [ ] マイグレーションファイルの構文を確認
- [ ] ステージング環境でテスト実行
- [ ] ロールバック手順を確認

### マイグレーション後

- [ ] テーブルが正しく作成されているか確認
- [ ] RLSポリシーが適切に設定されているか確認
- [ ] インデックスが作成されているか確認
- [ ] アプリケーションが正常に動作するか確認
- [ ] パフォーマンスに問題がないか確認

---

## 参考資料

- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
