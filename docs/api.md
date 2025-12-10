# APIリファレンス

## 認証

すべてのAPIリクエストには、有効なJWTトークンが必要です。トークンは`Authorization`ヘッダーで送信します：

```
Authorization: Bearer <your-jwt-token>
```

## エンドポイント一覧

| カテゴリ | エンドポイント | メソッド | 説明 |
|----------|----------------|----------|------|
| ヘルスチェック | `/api/health` | GET | サーバー状態確認 |
| AI返信 | `/api/ai-reply/generate` | POST | AI返信生成 |
| AI返信 | `/api/ai-reply/bulk-generate` | POST | バルクAI返信生成 |
| Google連携 | `/api/auth/google-auth` | GET | Google OAuth開始 |
| Google連携 | `/api/auth/google-callback` | GET | Google OAuthコールバック |
| MFA | `/api/auth/mfa/setup` | POST | MFAセットアップ |
| MFA | `/api/auth/mfa/verify` | POST | MFA検証 |
| MFA | `/api/auth/mfa/disable` | POST | MFA無効化 |
| MFA | `/api/auth/mfa/regenerate-backup-codes` | POST | バックアップコード再生成 |
| Google Business | `/api/google-business/accounts` | GET | アカウント一覧取得 |
| Google Business | `/api/google/business/locations` | GET | 店舗一覧取得 |
| Google Business | `/api/google/business/reviews` | GET | レビュー取得 |
| Google Business | `/api/google/business/reply` | POST | レビュー返信投稿 |
| レビュー同期 | `/api/google-reviews/sync` | POST | 店舗レビュー同期 |
| レビュー同期 | `/api/google-reviews/sync-all` | POST | 全店舗レビュー同期 |
| レビュー同期 | `/api/google-reviews/fetch` | GET | レビュー取得 |
| レビュー同期 | `/api/google-reviews/reply` | POST | レビュー返信 |
| 通知 | `/api/notifications/send` | POST | 通知送信 |
| 通知 | `/api/notifications/send-review-notification` | POST | レビュー通知送信 |
| 通知 | `/api/notifications/test` | POST | 通知テスト |
| オンボーディング | `/api/onboarding/complete` | POST | オンボーディング完了 |
| 組織 | `/api/organizations/invite` | POST | ユーザー招待 |
| 組織 | `/api/organizations/accept-invite` | POST | 招待承認 |
| サブスクリプション | `/api/subscriptions/create` | POST | サブスクリプション作成 |
| サブスクリプション | `/api/subscriptions/create-checkout-session` | POST | Stripeチェックアウト作成 |
| サブスクリプション | `/api/subscriptions/update` | PUT | サブスクリプション更新 |
| サブスクリプション | `/api/subscriptions/upgrade` | POST | プランアップグレード |
| サブスクリプション | `/api/subscriptions/cancel` | POST | サブスクリプションキャンセル |
| サブスクリプション | `/api/subscriptions/portal` | POST | Stripeポータル取得 |
| サブスクリプション | `/api/subscriptions/retry-payment` | POST | 支払い再試行 |
| サブスクリプション | `/api/subscriptions/create-invoice` | POST | 請求書作成 |
| サブスクリプション | `/api/subscriptions/webhook` | POST | Stripe Webhook |
| テナント | `/api/tenants` | GET/POST | テナント管理 |
| 利用状況 | `/api/usage-metrics` | GET | 利用メトリクス取得 |
| お問い合わせ | `/api/contact/submit` | POST | お問い合わせ送信 |

---

## AI返信生成

### 単体返信生成

```
POST /api/ai-reply/generate
```

**リクエストボディ**
```json
{
  "reviewId": "uuid",
  "reviewText": "string",
  "rating": 5,
  "tone": "formal" | "friendly" | "professional" | "casual" | "empathetic" | "enthusiastic",
  "locationName": "string"
}
```

**レスポンス**
```json
{
  "success": true,
  "reply": "生成された返信テキスト",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

### バルク返信生成

```
POST /api/ai-reply/bulk-generate
```

**リクエストボディ**
```json
{
  "reviews": [
    {
      "reviewId": "uuid",
      "reviewText": "string",
      "rating": 5,
      "authorName": "string"
    }
  ],
  "tone": "formal",
  "locationName": "string"
}
```

**レスポンス**
```json
{
  "success": true,
  "results": [
    {
      "reviewId": "uuid",
      "reply": "生成された返信テキスト",
      "success": true
    }
  ],
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0
  }
}
```

---

## MFA（2段階認証）

### MFAセットアップ

```
POST /api/auth/mfa/setup
```

**レスポンス**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "XXXXXXXXXXXXXXXX",
  "backupCodes": ["code1", "code2", "..."]
}
```

### MFA検証

```
POST /api/auth/mfa/verify
```

**リクエストボディ**
```json
{
  "code": "123456"
}
```

**レスポンス**
```json
{
  "success": true,
  "verified": true
}
```

### MFA無効化

```
POST /api/auth/mfa/disable
```

**リクエストボディ**
```json
{
  "code": "123456"
}
```

---

## Google Business連携

### 店舗一覧取得

```
GET /api/google/business/locations
```

**レスポンス**
```json
{
  "locations": [
    {
      "name": "locations/xxxxx",
      "title": "店舗名",
      "storefrontAddress": {
        "addressLines": ["住所"]
      }
    }
  ]
}
```

### レビュー取得

```
GET /api/google/business/reviews?locationId={locationId}
```

**レスポンス**
```json
{
  "reviews": [
    {
      "reviewId": "xxxxx",
      "reviewer": {
        "displayName": "レビュアー名"
      },
      "starRating": "FIVE",
      "comment": "レビュー内容",
      "createTime": "2025-01-01T00:00:00Z",
      "updateTime": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### レビュー返信投稿

```
POST /api/google/business/reply
```

**リクエストボディ**
```json
{
  "reviewName": "accounts/xxx/locations/xxx/reviews/xxx",
  "comment": "返信内容"
}
```

---

## サブスクリプション

### チェックアウトセッション作成

```
POST /api/subscriptions/create-checkout-session
```

**リクエストボディ**
```json
{
  "priceId": "price_xxxxx",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**レスポンス**
```json
{
  "sessionId": "cs_xxxxx",
  "url": "https://checkout.stripe.com/..."
}
```

### カスタマーポータル取得

```
POST /api/subscriptions/portal
```

**レスポンス**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### サブスクリプションキャンセル

```
POST /api/subscriptions/cancel
```

**リクエストボディ**
```json
{
  "subscriptionId": "sub_xxxxx",
  "cancelAtPeriodEnd": true
}
```

---

## 組織・ユーザー管理

### ユーザー招待

```
POST /api/organizations/invite
```

**リクエストボディ**
```json
{
  "email": "user@example.com",
  "role": "admin" | "member",
  "organizationId": "uuid"
}
```

**レスポンス**
```json
{
  "success": true,
  "invitationId": "uuid",
  "message": "招待メールを送信しました"
}
```

### 招待承認

```
POST /api/organizations/accept-invite
```

**リクエストボディ**
```json
{
  "token": "invitation-token"
}
```

---

## テナント管理

### テナント一覧取得

```
GET /api/tenants
```

**レスポンス**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "テナント名",
      "createdAt": "timestamp"
    }
  ]
}
```

### テナント作成

```
POST /api/tenants
```

**リクエストボディ**
```json
{
  "name": "テナント名"
}
```

---

## 利用状況メトリクス

```
GET /api/usage-metrics
```

**レスポンス**
```json
{
  "aiRepliesGenerated": 150,
  "aiRepliesLimit": 500,
  "reviewsProcessed": 300,
  "locationsConnected": 5,
  "period": "2025-01"
}
```

---

## お問い合わせ

```
POST /api/contact/submit
```

**リクエストボディ**
```json
{
  "name": "お名前",
  "email": "email@example.com",
  "company": "会社名",
  "message": "お問い合わせ内容"
}
```

**レスポンス**
```json
{
  "success": true,
  "message": "お問い合わせを受け付けました"
}
```

---

## ヘルスチェック

```
GET /api/health
```

**レスポンス**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:00:00Z",
  "checks": {
    "database": "ok"
  }
}
```

---

## エラーレスポンス

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  },
  "requestId": "uuid"
}
```

### エラーコード

| コード | 説明 |
|--------|------|
| 400 | リクエストが不正 |
| 401 | 認証が必要 |
| 403 | アクセス権限がない |
| 404 | リソースが見つからない |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

---

## レート制限

APIには以下のレート制限が適用されます：

| エンドポイント | 制限 |
|----------------|------|
| 認証系 (`/api/auth/*`) | 5分間に30リクエスト |
| API一般（認証済み） | 1分間に200リクエスト |
| API一般（未認証） | 1分間に30リクエスト |
| 書き込み系 (POST/PUT/DELETE) | 1分間に50リクエスト |
| Webhook | 1分間に300リクエスト |
| AI返信生成 | プランに応じた制限 |

レート制限に達した場合、`429 Too Many Requests`エラーが返されます。

詳細は`docs/RATE_LIMITING_AND_API_PROTECTION.md`を参照してください。

---

## 関連ドキュメント

- [エラーハンドリング](./API_ERROR_HANDLING.md)
- [レート制限詳細](./RATE_LIMITING_AND_API_PROTECTION.md)
- [ロギング](./LOGGING.md)
