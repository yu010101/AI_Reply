# ビジネスロジック

## 概要

RevAI Conciergeは、Google Business Profileのレビュー管理を自動化するSaaSプラットフォームです。
AIを活用してレビューへの返信を自動生成し、マルチテナントアーキテクチャで複数の事業者をサポートします。

---

## 認証・認可

### 認証フロー

```
┌─────────────────────────────────────────────────────────────┐
│                       認証フロー                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ユーザー ──→ ログインページ ──→ Supabase Auth              │
│      │                              │                        │
│      │                              ↓                        │
│      │                        認証成功？                     │
│      │                         ／   ＼                       │
│      │                       Yes     No                      │
│      │                        │       │                      │
│      │                        ↓       ↓                      │
│      │              ダッシュボード  エラー表示               │
│      │                        │                              │
│      │                        ↓                              │
│      │                MFA有効？ ──→ MFA検証                 │
│      │                        │                              │
│      └────────────────────────┘                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ユーザー登録フロー

1. **フォーム入力**: メールアドレス、パスワード（6文字以上）
2. **バリデーション**:
   - メールアドレス形式チェック（正規表現）
   - パスワード確認の一致チェック
   - 既存アカウント重複チェック
3. **アカウント作成**: Supabase Authでユーザー作成
4. **確認メール送信**: 確認リンク付きメール送信
5. **メール認証**: リンククリックでアカウント有効化
6. **リダイレクト**: ログインページへ

### ログインフロー

1. **認証情報入力**: メールアドレス、パスワード
2. **Supabase認証**: `signInWithPassword()`
3. **セッション作成**: JWTトークン発行
4. **MFA確認**: MFA有効の場合、TOTP入力を要求
5. **ダッシュボードへリダイレクト**

### エラーケース

| エラー | 原因 | ユーザーへの表示 |
|--------|------|------------------|
| Invalid login credentials | パスワード不一致 | 「メールアドレスまたはパスワードが正しくありません」 |
| User not found | 未登録メール | 「メールアドレスまたはパスワードが正しくありません」 |
| Email not confirmed | 未認証アカウント | 「メールアドレスの確認が完了していません」 |
| Too many requests | レート制限 | 「しばらく待ってから再度お試しください」 |

---

## マルチテナント構造

### テナントモデル

```
┌─────────────────────────────────────────────────────────────┐
│                     テナント構造                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  テナント                                                    │
│  ├── 基本情報                                               │
│  │   ├── ID (UUID)                                          │
│  │   ├── 名前                                               │
│  │   ├── メールアドレス                                     │
│  │   ├── プラン (free/pro/enterprise)                       │
│  │   └── ステータス (active/suspended/cancelled)            │
│  │                                                          │
│  ├── ユーザー (複数)                                        │
│  │   ├── Admin (管理者)                                     │
│  │   └── Member (メンバー)                                  │
│  │                                                          │
│  ├── 店舗 (複数)                                            │
│  │   ├── Google Business Profile連携                        │
│  │   └── レビュー                                           │
│  │                                                          │
│  └── サブスクリプション                                     │
│      ├── Stripe Customer ID                                 │
│      ├── 現在のプラン                                       │
│      └── 利用量                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ロールと権限

| 権限 | Admin | Member |
|------|-------|--------|
| レビュー閲覧 | ✅ | ✅ |
| レビュー返信 | ✅ | ✅ |
| AI返信生成 | ✅ | ✅ |
| 店舗管理 | ✅ | ❌ |
| ユーザー管理 | ✅ | ❌ |
| サブスクリプション管理 | ✅ | ❌ |
| テナント設定変更 | ✅ | ❌ |
| Google連携設定 | ✅ | ❌ |

### データ分離（RLS）

```sql
-- テナントごとのデータ分離ポリシー
CREATE POLICY "tenant_isolation" ON reviews
  FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- 店舗データの分離
CREATE POLICY "location_tenant_isolation" ON locations
  FOR ALL
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

---

## レビュー管理

### レビュー取得フロー

```
┌─────────────────────────────────────────────────────────────┐
│                   レビュー取得フロー                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 定期バッチ実行 (AWS Lambda)                             │
│     └── 毎時実行                                            │
│                                                              │
│  2. 手動同期 (ダッシュボードから)                           │
│     └── 「レビュー同期」ボタン                              │
│                                                              │
│          ↓                                                  │
│                                                              │
│  3. Google Business API呼び出し                             │
│     ├── アクセストークン取得（リフレッシュ込み）            │
│     ├── 各店舗のレビュー取得                                │
│     └── 最終同期日時以降のレビューのみ                      │
│                                                              │
│          ↓                                                  │
│                                                              │
│  4. データベース保存                                         │
│     ├── 新規レビュー: INSERT                                │
│     ├── 既存レビュー: UPDATE（編集された場合）              │
│     └── ステータス: 'new'                                   │
│                                                              │
│          ↓                                                  │
│                                                              │
│  5. 通知送信（設定されている場合）                          │
│     ├── メール通知                                          │
│     └── Slack通知                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### レビューステータス

| ステータス | 説明 | 次のアクション |
|-----------|------|----------------|
| new | 新着レビュー | 確認・返信が必要 |
| pending | 確認中 | 返信作成中 |
| responded | 返信済み | 完了 |
| ignored | 無視 | アクション不要 |

### レビューデータ構造

```typescript
interface Review {
  id: string;                    // UUID
  location_id: string;           // 店舗ID
  google_review_id: string;      // Google側のID
  rating: number;                // 1-5
  comment: string | null;        // レビューコメント
  reviewer_name: string;         // 投稿者名
  review_date: string;           // 投稿日時
  status: 'new' | 'pending' | 'responded' | 'ignored';
  created_at: string;
  updated_at: string;
}
```

---

## AI返信生成

### 返信生成フロー

```
┌─────────────────────────────────────────────────────────────┐
│                   AI返信生成フロー                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. レビュー選択                                             │
│     └── ユーザーがレビューを選択                            │
│                                                              │
│  2. トーン選択                                               │
│     ├── 丁寧 (Polite)                                       │
│     ├── カジュアル (Casual)                                 │
│     ├── プロフェッショナル (Professional)                   │
│     └── カスタム                                            │
│                                                              │
│  3. 利用量チェック                                          │
│     ├── プラン上限確認                                      │
│     └── 超過時はエラー                                      │
│                                                              │
│  4. OpenAI API呼び出し                                      │
│     ├── モデル: GPT-4 / GPT-3.5                            │
│     ├── プロンプト構築                                      │
│     │   ├── レビュー内容                                   │
│     │   ├── 評価（星数）                                   │
│     │   ├── 店舗情報                                       │
│     │   └── トーン指定                                     │
│     └── 返信文生成                                         │
│                                                              │
│  5. 結果表示                                                │
│     ├── 生成された返信をプレビュー                          │
│     ├── 編集可能                                           │
│     └── 承認/再生成                                        │
│                                                              │
│  6. 返信投稿（オプション）                                  │
│     └── Google Business APIで直接投稿                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### トーン別プロンプト

| トーン | 特徴 | 使用シーン |
|--------|------|-----------|
| 丁寧 | 敬語、フォーマル | 高評価レビュー、公式対応 |
| カジュアル | フレンドリー | 常連客、カジュアルな店舗 |
| プロフェッショナル | ビジネスライク | クレーム対応、企業向け |
| 謝罪 | 誠意ある対応 | 低評価レビュー |

### AI返信データ構造

```typescript
interface Reply {
  id: string;
  review_id: string;
  content: string;              // 返信本文
  is_ai_generated: boolean;     // AI生成フラグ
  tone: string;                 // 使用トーン
  posted_to_google: boolean;    // Google投稿済みフラグ
  created_at: string;
  updated_at: string;
}
```

---

## サブスクリプション・課金

### プラン構成

| プラン | 月額 | AI返信数/月 | 店舗数 | 機能 |
|--------|------|------------|--------|------|
| Free | ¥0 | 10回 | 1店舗 | 基本機能 |
| Pro | ¥9,800 | 100回 | 5店舗 | 分析機能 |
| Enterprise | 要相談 | 無制限 | 無制限 | 優先サポート、API |

### 課金フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     課金フロー                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. プラン選択                                               │
│     └── 設定ページ → サブスクリプション管理                 │
│                                                              │
│  2. Stripeチェックアウト                                     │
│     ├── 支払い情報入力                                      │
│     └── 3Dセキュア認証（必要な場合）                        │
│                                                              │
│  3. Webhookで結果受信                                        │
│     ├── checkout.session.completed                           │
│     └── customer.subscription.created                        │
│                                                              │
│  4. データベース更新                                         │
│     ├── テナントのプラン更新                                │
│     └── 利用量カウンターリセット                            │
│                                                              │
│  5. 確認メール送信                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 利用量管理

```typescript
interface UsageTracking {
  tenant_id: string;
  month: string;                 // YYYY-MM形式
  ai_replies_count: number;      // AI返信使用回数
  ai_replies_limit: number;      // 上限
  locations_count: number;       // 店舗数
  locations_limit: number;       // 店舗上限
}
```

### 利用量超過時の動作

1. **警告**: 80%到達時に通知
2. **制限**: 100%到達時にAI返信機能を無効化
3. **アップグレード誘導**: 上位プランへの案内表示

---

## Google Business連携

### OAuth認証フロー

```
┌─────────────────────────────────────────────────────────────┐
│               Google OAuth認証フロー                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 認証開始                                                 │
│     └── 設定ページ「Googleアカウント連携」ボタン            │
│                                                              │
│  2. OAuth URL生成                                            │
│     ├── GET /api/auth/google-auth                           │
│     ├── CSRF対策のstateトークン生成                         │
│     └── oauth_statesテーブルに保存                          │
│                                                              │
│  3. Googleログイン画面                                       │
│     └── ユーザーが権限を許可                                │
│                                                              │
│  4. コールバック処理                                         │
│     ├── GET /api/auth/google-callback                       │
│     ├── stateトークン検証                                   │
│     ├── 認証コードをトークンに交換                          │
│     └── google_auth_tokensテーブルに保存                    │
│                                                              │
│  5. 連携完了                                                 │
│     └── 設定ページにリダイレクト                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 必要なスコープ

```
https://www.googleapis.com/auth/business.manage
https://www.googleapis.com/auth/plus.business.manage
```

### トークン管理

```typescript
interface GoogleAuthToken {
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number;           // Unixタイムスタンプ
  created_at: string;
  updated_at: string;
}
```

### トークンリフレッシュ

- アクセストークンの有効期限: 1時間
- API呼び出し前に有効期限チェック
- 期限切れの場合、refresh_tokenで自動更新
- refresh_tokenが無効な場合、再認証を要求

---

## 通知システム

### 通知タイプ

| タイプ | トリガー | チャネル |
|--------|----------|----------|
| 新着レビュー | レビュー同期時 | メール, Slack |
| 低評価アラート | 3星以下のレビュー | メール, Slack |
| 利用量警告 | 80%到達時 | メール |
| 利用量超過 | 100%到達時 | メール |
| プラン変更 | サブスクリプション変更時 | メール |

### 通知設定

```typescript
interface NotificationSettings {
  tenant_id: string;
  email_enabled: boolean;
  email_address: string;
  slack_enabled: boolean;
  slack_webhook_url: string;
  new_review_notify: boolean;
  low_rating_notify: boolean;
  low_rating_threshold: number;  // 1-5
}
```

---

## 分析・レポート

### ダッシュボード指標

| 指標 | 説明 | 計算方法 |
|------|------|----------|
| 総レビュー数 | 全店舗の合計 | COUNT(reviews) |
| 平均評価 | 全レビューの平均 | AVG(rating) |
| 返信率 | 返信済み/全体 | responded / total * 100 |
| AI返信数 | AI生成の返信数 | COUNT(is_ai_generated = true) |
| 月別推移 | 過去6ヶ月のトレンド | GROUP BY month |
| 評価分布 | 1-5星の割合 | GROUP BY rating |

### レポート機能（Proプラン以上）

- 週次レポート自動送信
- CSVエクスポート
- カスタム期間指定
- 店舗別比較

---

## エラーハンドリング

### エラーコード体系

| コード | カテゴリ | 説明 |
|--------|----------|------|
| AUTH_001 | 認証 | 未認証 |
| AUTH_002 | 認証 | セッション期限切れ |
| AUTH_003 | 認証 | MFA検証失敗 |
| PERM_001 | 権限 | アクセス権限なし |
| PERM_002 | 権限 | ロール不足 |
| VAL_001 | バリデーション | 必須フィールド不足 |
| VAL_002 | バリデーション | 形式エラー |
| LIMIT_001 | 制限 | 利用量超過 |
| LIMIT_002 | 制限 | レート制限 |
| EXT_001 | 外部連携 | Google API エラー |
| EXT_002 | 外部連携 | OpenAI API エラー |
| EXT_003 | 外部連携 | Stripe エラー |

### リトライ戦略

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,      // 1秒
  maxDelay: 30000,         // 30秒
  backoffMultiplier: 2,
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'SERVER_ERROR'
  ]
};
```

---

## 監査ログ

### 記録対象アクション

| アクション | 説明 | 詳細情報 |
|-----------|------|----------|
| user.login | ログイン | IP, User-Agent |
| user.logout | ログアウト | - |
| user.mfa_setup | MFA設定 | - |
| review.reply | レビュー返信 | review_id, is_ai |
| settings.update | 設定変更 | 変更フィールド |
| subscription.change | プラン変更 | old_plan, new_plan |
| google.connect | Google連携 | - |
| google.disconnect | Google連携解除 | - |

### 監査ログ構造

```typescript
interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}
```

---

## データ保持ポリシー

| データ種別 | 保持期間 | 削除方法 |
|-----------|----------|----------|
| レビューデータ | 無期限 | テナント削除時 |
| 監査ログ | 1年 | 自動削除 |
| セッションデータ | 7日 | 自動削除 |
| OAuthトークン | 無期限 | 連携解除時 |
| 一時ファイル | 24時間 | 自動削除 |
