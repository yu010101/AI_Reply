# パフォーマンステストレポート

## 📊 パフォーマンステストの概要

このドキュメントでは、RevAI Conciergeのパフォーマンステスト結果と推奨事項をまとめています。

---

## 🎯 パフォーマンス目標

### ページ読み込み速度

- **First Contentful Paint (FCP)**: < 1.8秒
- **Largest Contentful Paint (LCP)**: < 2.5秒
- **Time to Interactive (TTI)**: < 3.8秒
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### API応答時間

- **平均レスポンスタイム**: < 500ms
- **95パーセンタイル**: < 1000ms
- **99パーセンタイル**: < 2000ms

### バンドルサイズ

- **初期JavaScriptバンドル**: < 200KB (gzip圧縮後)
- **初期CSSバンドル**: < 50KB (gzip圧縮後)
- **総バンドルサイズ**: < 1MB (gzip圧縮後)

---

## 📦 バンドルサイズ分析

### Next.jsビルド出力

ビルド出力を確認するには：

```bash
npm run build
```

ビルド出力には以下の情報が含まれます：

- 各ルートのバンドルサイズ
- First Load JSサイズ
- 静的ページと動的ページの識別

### バンドルサイズの最適化

#### 1. コード分割

Next.jsは自動的にコード分割を行いますが、以下の方法でさらに最適化できます：

```typescript
// 動的インポートを使用
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false, // サーバーサイドレンダリングを無効化（必要に応じて）
});
```

#### 2. ツリーシェイキング

未使用のコードを削除するため、以下の設定を確認：

- `package.json`の`sideEffects`フィールド
- Webpackの最適化設定（Next.jsが自動的に処理）

#### 3. 依存関係の最適化

大きな依存関係を確認：

```bash
# バンドルサイズを分析
npx @next/bundle-analyzer
```

**大きな依存関係**:
- `@mui/material` - Material UIコンポーネントライブラリ
- `googleapis` - Google APIクライアント
- `chart.js` - チャートライブラリ

**推奨事項**:
- 必要なコンポーネントのみをインポート
- チャートライブラリは動的インポートを検討

---

## 🖼️ 画像最適化

### Next.js Image コンポーネントの使用

Next.jsの`Image`コンポーネントを使用することで、自動的に画像最適化が行われます：

```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="説明"
  width={500}
  height={300}
  loading="lazy"
  placeholder="blur"
/>
```

### 画像ドメインの設定

`next.config.js`で外部画像ドメインを設定：

```javascript
images: {
  domains: ['localhost', 'your-image-domain.com'],
  formats: ['image/webp', 'image/avif'],
},
```

### 現在の画像設定

**設定済み**:
- `domains: ['localhost']` - ローカル開発環境

**推奨事項**:
- 本番環境で使用する画像ホスティングサービスのドメインを追加
- WebP形式のサポートを有効化
- AVIF形式のサポートを検討（Next.js 12.2以降）

### 画像最適化チェックリスト

- [x] Next.js Imageコンポーネントを使用 ✅
- [ ] 外部画像ドメインの設定 ⚠️ 本番環境で設定が必要
- [ ] WebP形式のサポート ⚠️ 設定推奨
- [ ] 画像の遅延読み込み ✅ `loading="lazy"`を使用
- [ ] 画像のプレースホルダー ✅ `placeholder="blur"`を使用

---

## ⚡ API応答時間の監視

### パフォーマンス監視の実装

`src/utils/performanceMonitoring.ts`で実装：

- すべてのAPIリクエストのレスポンスタイムを記録
- 5秒を超える場合は警告ログ
- 10秒を超える場合はエラーログ

### ヘルスチェックエンドポイント

`/api/health`エンドポイントでアプリケーションの状態を確認：

```bash
curl https://your-domain.com/api/health
```

### API応答時間の目標

| エンドポイント | 目標応答時間 | 警告閾値 | エラー閾値 |
|---------------|------------|---------|-----------|
| 認証API | < 500ms | > 2s | > 5s |
| データ取得API | < 1000ms | > 3s | > 10s |
| AI生成API | < 5000ms | > 10s | > 30s |
| Webhook | < 200ms | > 1s | > 5s |

---

## 🔍 パフォーマンステストツール

### 1. Lighthouse

Google Chromeの開発者ツールでLighthouseを使用：

```bash
# Chrome DevToolsで実行
# または
npx lighthouse https://your-domain.com --view
```

### 2. WebPageTest

オンラインツールで詳細なパフォーマンステスト：

```
https://www.webpagetest.org/
```

### 3. Next.js Analytics

Vercelにデプロイしている場合、自動的にAnalyticsが有効になります。

### 4. カスタムパフォーマンス監視

`src/utils/performanceMonitoring.ts`を使用してカスタムメトリクスを記録。

---

## 📈 パフォーマンス改善の推奨事項

### 高優先度

1. **画像最適化の設定**
   - 外部画像ドメインの設定
   - WebP形式のサポート
   - 画像の遅延読み込み（既に実装済み）

2. **コード分割の最適化**
   - 大きなコンポーネントの動的インポート
   - チャートライブラリの動的インポート

3. **API応答時間の監視**
   - パフォーマンスメトリクスの記録（既に実装済み）
   - スロークエリの特定と最適化

### 中優先度

1. **キャッシュ戦略の最適化**
   - APIレスポンスのキャッシュ
   - 静的アセットのキャッシュ

2. **データベースクエリの最適化**
   - N+1クエリ問題の解決
   - インデックスの追加

3. **CDNの活用**
   - 静的アセットのCDN配信
   - 画像のCDN配信

### 低優先度

1. **Service Workerの実装**
   - オフライン対応
   - キャッシュ戦略の改善

2. **HTTP/2 Server Push**
   - 重要なリソースの事前プッシュ

---

## 🧪 パフォーマンステストの実行方法

### 1. ビルドサイズの確認

```bash
npm run build
```

ビルド出力で各ルートのバンドルサイズを確認。

### 2. バンドルアナライザーの使用

```bash
# バンドルアナライザーをインストール（推奨）
npm install --save-dev @next/bundle-analyzer

# package.jsonにスクリプトを追加
"analyze": "ANALYZE=true next build"
```

### 3. Lighthouseテストの実行

```bash
# Chrome DevToolsで実行
# または
npx lighthouse http://localhost:3000 --view
```

### 4. API応答時間のテスト

```bash
# ヘルスチェック
curl -w "@curl-format.txt" https://your-domain.com/api/health

# curl-format.txtの内容:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

---

## 📊 パフォーマンスメトリクスの記録

### データベースへの記録

`performance_metrics`テーブルに記録（テーブルが存在する場合）：

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
```

### ダッシュボードでの可視化

パフォーマンスメトリクスを可視化するダッシュボードを作成することを推奨：

- レスポンスタイムの推移
- エンドポイントごとのパフォーマンス
- エラーレートとの相関

---

## ✅ チェックリスト

### リリース前の確認

- [x] バンドルサイズの確認 ✅ ビルド出力で確認可能
- [x] API応答時間の監視設定 ✅ `performanceMonitoring.ts`
- [x] 画像最適化の確認 ✅ Next.js Imageコンポーネント使用
- [ ] 外部画像ドメインの設定 ⚠️ 本番環境で設定が必要
- [ ] WebP形式のサポート ⚠️ 設定推奨
- [ ] Lighthouseスコアの確認 ⚠️ 本番環境で確認推奨
- [ ] バンドルアナライザーの実行 ⚠️ 推奨

---

## 📚 参考資料

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
