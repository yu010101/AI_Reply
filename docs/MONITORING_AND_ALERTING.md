# 監視とアラートガイド

## 📋 目次

- [監視システムの概要](#監視システムの概要)
- [エラーモニタリング](#エラーモニタリング)
- [パフォーマンス監視](#パフォーマンス監視)
- [データベース監視](#データベース監視)
- [アラート設定](#アラート設定)
- [チェックリスト](#チェックリスト)

---

## 監視システムの概要

このアプリケーションでは、複数のレイヤーで監視を実装しています：

1. **Sentry** - エラートラッキングとパフォーマンス監視
2. **カスタムロガー** - 構造化ログと機密情報フィルタリング
3. **データベースログ** - エラーログとパフォーマンスメトリクスの保存
4. **メール通知** - 重要なエラーの管理者への通知

---

## エラーモニタリング

### Sentryの設定

Sentryは以下のファイルで設定されています：

- `sentry.client.config.ts` - クライアントサイド（ブラウザ）の設定
- `sentry.server.config.ts` - サーバーサイド（API Routes）の設定
- `sentry.edge.config.ts` - Edge Runtime（Middleware）の設定

### 環境変数

```env
# Sentry DSN（必須）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# アプリバージョン（オプション）
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### エラーログの記録

`src/utils/monitoring.ts`の`logError`関数を使用：

```typescript
import { logError } from '@/utils/monitoring';

try {
  // 処理
} catch (error) {
  await logError(error, {
    context: 'additional context',
    userId: user.id,
  });
}
```

### エラーの重要度

- **critical** - システム全体に影響する致命的なエラー
- **high** - 重要な機能が動作しないエラー
- **medium** - 一部の機能に影響するエラー
- **low** - 軽微なエラー

### エラーログの保存先

1. **Sentry** - すべてのエラーがSentryに送信される
2. **データベース** - `error_logs`テーブルに保存
3. **メール通知** - high/criticalレベルのエラーは管理者に通知

---

## パフォーマンス監視

### レスポンスタイムの監視

`src/utils/performanceMonitoring.ts`で実装：

- すべてのAPIリクエストのレスポンスタイムを記録
- 5秒を超える場合は警告ログ
- 10秒を超える場合はエラーログ

### パフォーマンスメトリクスの記録

```typescript
import { recordPerformanceMetric } from '@/utils/performanceMonitoring';

await recordPerformanceMetric(
  '/api/endpoint',
  'GET',
  duration,
  statusCode,
  userId
);
```

### パフォーマンスメトリクスの保存

`performance_metrics`テーブルに保存（テーブルが存在する場合）：

```sql
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);
```

---

## データベース監視

### 接続状態の確認

`checkDatabaseConnections()`関数でデータベースの接続状態を確認：

```typescript
import { checkDatabaseConnections } from '@/utils/performanceMonitoring';

const status = await checkDatabaseConnections();
if (!status.healthy) {
  // アラートを送信
}
```

### ヘルスチェックエンドポイント

`/api/health`エンドポイントでアプリケーションの状態を確認：

```bash
curl https://your-domain.com/api/health
```

**レスポンス例**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:00:00Z",
  "checks": {
    "database": "ok"
  }
}
```

### Supabaseの監視

Supabaseダッシュボードで以下を監視：

- データベース接続数
- クエリパフォーマンス
- ストレージ使用量
- APIリクエスト数

---

## アラート設定

### メール通知

重要なエラー（high/critical）は自動的に管理者にメール通知されます。

**環境変数**:
```env
ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
```

### Sentryアラート

Sentryダッシュボードでアラートを設定：

1. **エラーレートのアラート**
   - 1時間に100件以上のエラーが発生した場合
   - 5分間に10件以上のcriticalエラーが発生した場合

2. **パフォーマンスのアラート**
   - レスポンスタイムが5秒を超えるリクエストが10%を超えた場合
   - エンドポイントごとのパフォーマンス低下

3. **可用性のアラート**
   - ヘルスチェックエンドポイントが5分間連続で失敗した場合

### Vercelの監視

Vercelダッシュボードで以下を監視：

- デプロイメントの状態
- 関数の実行時間
- エラーレート
- 帯域幅の使用量

### Slack通知（推奨）

SentryとSlackを連携してリアルタイム通知を設定：

1. SentryダッシュボードでSlack統合を設定
2. 通知チャンネルを選択
3. アラートルールを設定

---

## チェックリスト

### エラーモニタリング

- [x] Sentryが設定されている ✅ `sentry.*.config.ts`
- [x] エラーログがデータベースに保存される ✅ `src/utils/monitoring.ts`
- [x] 重要なエラーが管理者に通知される ✅ メール通知実装済み
- [ ] SentryのDSNが環境変数に設定されている ⚠️ 要設定
- [ ] Sentryのアラートルールが設定されている

### パフォーマンス監視

- [x] レスポンスタイムが記録される ✅ `src/utils/performanceMonitoring.ts`
- [x] ヘルスチェックエンドポイントが実装されている ✅ `/api/health`
- [ ] パフォーマンスメトリクステーブルが作成されている ⚠️ 要作成
- [ ] パフォーマンスダッシュボードが設定されている

### データベース監視

- [x] データベース接続状態の確認が実装されている ✅ `checkDatabaseConnections()`
- [ ] Supabaseの監視ダッシュボードが設定されている
- [ ] データベース接続数のアラートが設定されている

### アラート設定

- [x] メール通知が実装されている ✅ `notifyAdmin()`
- [ ] Sentryのアラートルールが設定されている
- [ ] Slack通知が設定されている（推奨）
- [ ] アラートの重要度が適切に設定されている

---

## 推奨される次のステップ

### 1. Sentryの設定

1. [Sentry](https://sentry.io)でアカウントを作成
2. プロジェクトを作成してDSNを取得
3. 環境変数にDSNを設定
4. アラートルールを設定

### 2. パフォーマンスメトリクステーブルの作成

```sql
-- SupabaseのSQLエディタで実行
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
```

### 3. ダッシュボードの作成

パフォーマンスメトリクスを可視化するダッシュボードを作成：

- レスポンスタイムの推移
- エラーレートの推移
- エンドポイントごとのパフォーマンス
- ユーザーごとの使用状況

### 4. アラートルールの設定

以下のアラートルールを設定することを推奨：

1. **エラーレート**
   - 1時間に100件以上のエラー → Warning
   - 1時間に500件以上のエラー → Critical

2. **レスポンスタイム**
   - 5秒を超えるリクエストが10%を超える → Warning
   - 10秒を超えるリクエストが5%を超える → Critical

3. **可用性**
   - ヘルスチェックが5分間連続で失敗 → Critical
   - データベース接続エラーが発生 → Critical

---

## 参考資料

- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [Next.js Monitoring](https://nextjs.org/docs/advanced-features/measuring-performance)
