# RLS（Row Level Security）ポリシー確認ガイド

## 📋 目次

- [RLSポリシー概要](#rlsポリシー概要)
- [テーブル別RLSポリシー](#テーブル別rlsポリシー)
- [ポリシーの確認方法](#ポリシーの確認方法)
- [セキュリティチェック](#セキュリティチェック)
- [トラブルシューティング](#トラブルシューティング)

---

## RLSポリシー概要

Row Level Security (RLS)は、PostgreSQLのセキュリティ機能で、ユーザーがアクセスできる行を制御します。このプロジェクトでは、すべての主要なテーブルでRLSが有効になっています。

### RLSが有効なテーブル一覧

1. `organizations` - 組織（テナント）情報
2. `organization_users` - 組織ユーザー情報
3. `subscriptions` - サブスクリプション情報
4. `payment_history` - 支払い履歴
5. `stripe_customers` - Stripe顧客情報
6. `invitations` - 招待情報
7. `usage_limits` - 使用量制限
8. `event_logs` - イベントログ
9. `google_business_accounts` - Google Businessアカウント
10. `google_auth_tokens` - Google認証トークン
11. `oauth_states` - OAuth状態

---

## テーブル別RLSポリシー

### 1. `organizations` テーブル

**ポリシー**: 組織管理者は自分の組織を表示可能

```sql
CREATE POLICY "組織管理者は自分の組織を表示可能" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
    )
  );
```

**セキュリティレベル**: ⚠️ **要確認**
- INSERT/UPDATE/DELETEポリシーが設定されていない
- トリガー関数`check_user_permission()`で制御されているが、明示的なポリシーがない

**推奨修正**:
```sql
-- INSERTポリシー
CREATE POLICY "認証済みユーザーは組織を作成可能" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATEポリシー
CREATE POLICY "組織管理者は自分の組織を更新可能" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1  -- admin role
    )
  );

-- DELETEポリシー
CREATE POLICY "組織管理者は自分の組織を削除可能" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.organization_id = organizations.id
      AND organization_users.user_id = auth.uid()
      AND organization_users.role_id = 1  -- admin role
    )
  );
```

### 2. `organization_users` テーブル

**ポリシー**: ユーザーは自分の所属組織のユーザー一覧を表示可能

```sql
CREATE POLICY "ユーザーは自分の所属組織のユーザー一覧を表示可能" ON organization_users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );
```

**セキュリティレベル**: ⚠️ **要確認**
- INSERT/UPDATE/DELETEポリシーが設定されていない

**推奨修正**:
```sql
-- INSERTポリシー（管理者のみ）
CREATE POLICY "組織管理者はユーザーを追加可能" ON organization_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = NEW.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- UPDATEポリシー（管理者のみ）
CREATE POLICY "組織管理者はユーザー情報を更新可能" ON organization_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = organization_users.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );

-- DELETEポリシー（管理者のみ）
CREATE POLICY "組織管理者はユーザーを削除可能" ON organization_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = organization_users.organization_id
      AND user_id = auth.uid()
      AND role_id = 1  -- admin role
    )
  );
```

### 3. `subscriptions` テーブル

**ポリシー**: ユーザーは自分の所属組織のサブスクリプションを表示可能

```sql
CREATE POLICY "ユーザーは自分の所属組織のサブスクリプションを表示可能" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid()
    )
  );
```

**セキュリティレベル**: ⚠️ **要確認**
- INSERT/UPDATE/DELETEポリシーが設定されていない

### 4. `google_business_accounts` テーブル

**ポリシー**: テナントは自身のアカウントのみアクセス可能

```sql
CREATE POLICY "テナントは自身のアカウントのみアクセス可能" ON public.google_business_accounts
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());
```

**セキュリティレベル**: ✅ **良好**
- SELECT, INSERT, UPDATE, DELETEすべてが適切に制御されている

### 5. `google_auth_tokens` テーブル

**ポリシー**: 認証済みユーザーとサービスロールはアクセス可能

```sql
CREATE POLICY "認証済みユーザーはアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "サービスロールはフルアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- 開発環境のため（本番環境では削除推奨）
CREATE POLICY "匿名ユーザーもアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (auth.role() = 'anon');
```

**セキュリティレベル**: ⚠️ **要改善**
- 匿名ユーザーからのアクセスが許可されている（本番環境では削除推奨）
- テナントIDによる制限がない（すべての認証済みユーザーが全トークンにアクセス可能）

**推奨修正**:
```sql
-- 匿名ユーザーポリシーを削除（本番環境）
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.google_auth_tokens;

-- テナントIDによる制限を追加
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.google_auth_tokens;

CREATE POLICY "ユーザーは自分のトークンのみアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (tenant_id = auth.uid());
```

### 6. `oauth_states` テーブル

**ポリシー**: 認証済みユーザーとサービスロールはアクセス可能

**セキュリティレベル**: ⚠️ **要改善**
- 匿名ユーザーからのアクセスが許可されている（本番環境では削除推奨）
- テナントIDによる制限がない

**推奨修正**: `google_auth_tokens`と同様

---

## ポリシーの確認方法

### 1. すべてのRLSポリシーを確認

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 2. RLSが有効なテーブルを確認

```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 3. 特定のテーブルのポリシーを確認

```sql
SELECT * FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'organizations';
```

### 4. ポリシーのテスト

```sql
-- 認証済みユーザーとしてテスト
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';

-- クエリを実行してアクセス権限を確認
SELECT * FROM organizations;
SELECT * FROM organization_users;
```

---

## セキュリティチェック

### チェックリスト

#### 基本チェック

- [ ] すべての主要テーブルでRLSが有効になっている
- [ ] SELECT, INSERT, UPDATE, DELETEすべての操作にポリシーが設定されている
- [ ] 匿名ユーザーからのアクセスが適切に制限されている（本番環境）
- [ ] テナントIDやユーザーIDによる適切な制限が設定されている

#### 詳細チェック

- [ ] `organizations`テーブルにINSERT/UPDATE/DELETEポリシーが設定されている
- [ ] `organization_users`テーブルにINSERT/UPDATE/DELETEポリシーが設定されている
- [ ] `subscriptions`テーブルにINSERT/UPDATE/DELETEポリシーが設定されている
- [ ] `google_auth_tokens`テーブルで匿名ユーザーポリシーが削除されている（本番環境）
- [ ] `oauth_states`テーブルで匿名ユーザーポリシーが削除されている（本番環境）

#### セキュリティテスト

- [ ] 他のユーザーのデータにアクセスできないことを確認
- [ ] 認証されていないユーザーがデータにアクセスできないことを確認
- [ ] 管理者権限がないユーザーが組織設定を変更できないことを確認

---

## トラブルシューティング

### 問題1: ポリシーが機能しない

**症状**: ユーザーが自分のデータにアクセスできない

**原因**:
- RLSが有効になっていない
- ポリシーの条件が正しくない
- `auth.uid()`が正しく設定されていない

**解決方法**:
```sql
-- RLSが有効か確認
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = '<table_name>';

-- RLSを有効化
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = '<table_name>';

-- auth.uid()を確認
SELECT auth.uid();
```

### 問題2: 匿名ユーザーがアクセスできる

**症状**: 認証されていないユーザーがデータにアクセスできる

**原因**:
- 匿名ユーザー用のポリシーが設定されている

**解決方法**:
```sql
-- 匿名ユーザーポリシーを削除
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON <table_name>;
```

### 問題3: サービスロールがアクセスできない

**症状**: サーバーサイドのコードからデータにアクセスできない

**原因**:
- サービスロール用のポリシーが設定されていない

**解決方法**:
```sql
-- サービスロール用のポリシーを追加
CREATE POLICY "サービスロールはフルアクセス可能" ON <table_name>
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 推奨される改善

### 1. 不足しているポリシーの追加

以下のテーブルにINSERT/UPDATE/DELETEポリシーを追加することを推奨：

- `organizations`
- `organization_users`
- `subscriptions`
- `payment_history`
- `stripe_customers`
- `invitations`
- `usage_limits`
- `event_logs`

### 2. 本番環境での匿名ユーザーポリシーの削除

開発環境でのみ使用する匿名ユーザーポリシーを本番環境では削除：

```sql
-- 本番環境でのみ実行
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.google_auth_tokens;
DROP POLICY IF EXISTS "匿名ユーザーもアクセス可能" ON public.oauth_states;
```

### 3. テナントIDによる制限の追加

`google_auth_tokens`と`oauth_states`テーブルにテナントIDによる制限を追加：

```sql
-- より厳格なポリシーに変更
DROP POLICY IF EXISTS "認証済みユーザーはアクセス可能" ON public.google_auth_tokens;
CREATE POLICY "ユーザーは自分のトークンのみアクセス可能" ON public.google_auth_tokens
  FOR ALL USING (tenant_id = auth.uid());
```

---

## 参考資料

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security#best-practices)
