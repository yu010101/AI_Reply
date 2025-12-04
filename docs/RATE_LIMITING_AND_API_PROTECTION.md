# レート制限とAPI保護ガイド

## 📋 目次

- [レート制限の概要](#レート制限の概要)
- [実装されているレート制限](#実装されているレート制限)
- [認証チェックの確認](#認証チェックの確認)
- [DDoS対策](#ddos対策)
- [改善推奨事項](#改善推奨事項)
- [チェックリスト](#チェックリスト)

---

## レート制限の概要

このアプリケーションでは、複数のレイヤーでレート制限を実装しています：

1. **IPベースのレート制限** - すべてのリクエストに対して適用
2. **組織ベースのAPI使用量制限** - サブスクリプションプランに基づく制限
3. **Google Business API用のカスタムレート制限** - 外部APIの制限に対応

---

## 実装されているレート制限

### 1. IPベースのレート制限 (`src/utils/security.ts`)

**実装**: `express-rate-limit`を使用

**設定**:
- ウィンドウ: 15分（デフォルト）
- 最大リクエスト数: 100リクエスト/IP（デフォルト）
- 環境変数で設定可能:
  - `RATE_LIMIT_WINDOW_MS` - ウィンドウ時間（ミリ秒）
  - `RATE_LIMIT_MAX` - 最大リクエスト数

**適用範囲**: 
- ⚠️ **要確認**: `securityMiddleware`が実際に使用されているか確認が必要
- 現在、すべてのAPIエンドポイントで自動的に適用されていない可能性

**推奨改善**:
```typescript
// すべてのAPIエンドポイントに適用するミドルウェアを作成
export const withRateLimit = (handler: ApiHandler) => {
  return securityMiddleware(handler);
};
```

### 2. 組織ベースのAPI使用量制限 (`src/middleware/apiLimitMiddleware.ts`)

**実装**: サブスクリプションプランに基づく使用量制限

**機能**:
- 認証チェック
- 組織へのアクセス権限チェック
- API使用量のチェックとインクリメント
- 使用量が80%を超えた場合の警告ヘッダー

**使用されているエンドポイント**:
- `pages/api/google/business/*` - `withBusinessProfileApiLimit`を使用

**設定**:
- プランごとの制限は`PLAN_LIMITS`定数で定義
- 使用量は`usage_metrics`テーブルで追跡

### 3. Google Business API用のカスタムレート制限 (`pages/api/google-business/accounts.ts`)

**実装**: カスタムレート制限ロジック

**設定**:
- レート制限: 10秒間に1回のリクエスト
- クォータ制限後の待機時間: 1分

**機能**:
- クォータ制限の検出と自動バックオフ
- キャッシュの活用（48時間有効）

---

## 認証チェックの確認

### 認証チェックが実装されているエンドポイント

以下のエンドポイントで認証チェックが実装されています：

#### ✅ 認証チェックあり

1. **Subscriptions関連**:
   - `/api/subscriptions/*` - すべて認証チェックあり

2. **Google Business関連**:
   - `/api/google-business/accounts` - 認証チェックあり
   - `/api/google/business/*` - `withBusinessProfileApiLimit`で認証チェック

3. **Google Reviews関連**:
   - `/api/google-reviews/*` - 認証チェックあり

4. **Organizations関連**:
   - `/api/organizations/*` - 認証チェックあり

5. **MFA関連**:
   - `/api/auth/mfa/*` - 認証チェックあり

6. **Notifications関連**:
   - `/api/notifications/*` - 認証チェックあり

7. **AI Reply関連**:
   - `/api/ai-reply/generate` - 認証チェックあり

8. **Usage Metrics**:
   - `/api/usage-metrics` - 認証チェックあり

9. **Tenants**:
   - `/api/tenants` - 認証チェックあり（トークンベース）

#### ⚠️ 要確認

1. **Webhookエンドポイント**:
   - `/api/subscriptions/webhook` - Stripe署名検証のみ（認証不要）

2. **公開エンドポイント**:
   - `/api/auth/*` - 認証エンドポイント自体は認証不要

### 認証チェックの実装パターン

#### パターン1: Supabaseセッションチェック（最も一般的）

```typescript
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return res.status(401).json({ error: '認証されていません' });
}

const userId = session.user.id;
```

#### パターン2: トークンベース認証

```typescript
const authHeader = req.headers.authorization;
if (!authHeader) {
  return res.status(401).json({ error: '認証トークンが必要です' });
}

const token = authHeader.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(token);
```

#### パターン3: ミドルウェアを使用

```typescript
export default withBusinessProfileApiLimit(handler);
```

---

## DDoS対策

### 現在の対策

1. **IPベースのレート制限** - 基本的なDDoS対策
2. **Vercelの組み込み保護** - Vercelが提供するDDoS対策
3. **セキュリティヘッダー** - `vercel.json`で設定

### 推奨される追加対策

1. **Cloudflareの導入**:
   - DDoS保護の強化
   - ボット検出とブロック
   - WAF（Web Application Firewall）の設定

2. **レート制限の強化**:
   - エンドポイントごとの個別制限
   - ユーザーごとの制限
   - 異常なトラフィックパターンの検出

3. **IPホワイトリスト/ブラックリスト**:
   - 悪意のあるIPアドレスのブロック
   - 信頼できるIPアドレスの優先処理

---

## 改善推奨事項

### 1. 統一された認証ミドルウェアの作成

現在、各エンドポイントで個別に認証チェックを実装していますが、統一されたミドルウェアを作成することを推奨します：

```typescript
// src/middleware/authMiddleware.ts
export const requireAuth = (handler: ApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }
    
    // セッション情報をリクエストに追加
    (req as any).user = session.user;
    
    return handler(req, res);
  };
};
```

### 2. レート制限の統一適用

すべてのAPIエンドポイントにレート制限を適用：

```typescript
// next.config.js または middleware.ts
export function middleware(request: NextRequest) {
  // レート制限の適用
  // ...
}
```

### 3. エンドポイントごとの個別制限

重要なエンドポイントにはより厳しい制限を設定：

```typescript
// 認証エンドポイント: 5回/分
// AI生成エンドポイント: 10回/分
// データ取得エンドポイント: 100回/分
```

### 4. レート制限の監視とログ

レート制限に達したリクエストをログに記録：

```typescript
await logger.warn('Rate limit exceeded', {
  ip: getClientIp(req),
  endpoint: req.url,
  userId: session?.user?.id
});
```

---

## チェックリスト

### レート制限

- [x] IPベースのレート制限が実装されている ✅ `src/utils/security.ts`
- [x] 組織ベースのAPI使用量制限が実装されている ✅ `src/middleware/apiLimitMiddleware.ts`
- [x] Google Business API用のカスタムレート制限が実装されている ✅ `pages/api/google-business/accounts.ts`
- [ ] すべてのAPIエンドポイントにレート制限が適用されている ⚠️ 要確認
- [ ] エンドポイントごとの個別制限が設定されている
- [ ] レート制限の監視とログが実装されている

### 認証チェック

- [x] 主要なAPIエンドポイントで認証チェックが実装されている ✅
- [x] 組織へのアクセス権限チェックが実装されている ✅
- [ ] 統一された認証ミドルウェアが使用されている ⚠️ 要改善
- [ ] すべての保護が必要なエンドポイントで認証チェックが実装されている

### DDoS対策

- [x] IPベースのレート制限が実装されている ✅
- [x] Vercelの組み込み保護が有効 ✅
- [x] セキュリティヘッダーが設定されている ✅ `vercel.json`
- [ ] Cloudflareなどの追加保護が検討されている
- [ ] 異常なトラフィックパターンの検出が実装されている

---

## 推奨される次のステップ

1. **統一された認証ミドルウェアの実装**
   - `src/middleware/authMiddleware.ts`を作成
   - すべての保護が必要なエンドポイントで使用

2. **レート制限の統一適用**
   - Next.jsの`middleware.ts`を使用してすべてのAPIリクエストに適用
   - エンドポイントごとの個別制限を設定

3. **監視とアラートの設定**
   - レート制限に達したリクエストの監視
   - 異常なトラフィックパターンの検出とアラート

4. **テストの実施**
   - レート制限の動作確認
   - 認証チェックの動作確認
   - DDoS対策の効果確認

---

## 参考資料

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
