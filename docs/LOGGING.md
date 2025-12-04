# ロギングガイド

このドキュメントでは、統一されたロギングシステムの使用方法について説明します。

## 📋 目次

- [概要](#概要)
- [ロガーの使用方法](#ロガーの使用方法)
- [ログレベル](#ログレベル)
- [機密情報のフィルタリング](#機密情報のフィルタリング)
- [ベストプラクティス](#ベストプラクティス)
- [移行ガイド](#移行ガイド)

---

## 概要

統一ロガー（`src/utils/logger.ts`）は以下の機能を提供します：

1. ✅ **ログレベルの管理**: DEBUG, INFO, WARN, ERROR
2. ✅ **機密情報の自動フィルタリング**: APIキー、トークン、パスワードなどを自動的にマスク
3. ✅ **環境に応じた出力**: 開発環境では詳細、本番環境では簡潔
4. ✅ **構造化ログ**: JSON形式でコンテキスト情報を含む
5. ✅ **タイムスタンプ**: すべてのログに自動的にタイムスタンプを追加

---

## ロガーの使用方法

### 基本的な使用例

```typescript
import { logger } from '@/utils/logger';

// DEBUGレベルのログ（開発環境のみ）
logger.debug('デバッグ情報', { userId: '123', action: 'login' });

// INFOレベルのログ
logger.info('ユーザーがログインしました', { userId: '123' });

// WARNレベルのログ
logger.warn('レート制限に近づいています', { userId: '123', requests: 95 });

// ERRORレベルのログ
logger.error('データベース接続エラー', { error: errorMessage });

// エラーオブジェクトをログに記録（スタックトレースを含む）
logger.errorWithStack(error, { context: 'API Handler' });
```

### ログレベルの選択

適切なログレベルを選択してください：

- **DEBUG**: 開発時の詳細な情報（本番環境では無効）
- **INFO**: 正常な動作の記録（例: ユーザーログイン、リクエスト処理）
- **WARN**: 警告（例: レート制限、非推奨機能の使用）
- **ERROR**: エラー（例: 例外、失敗した操作）

---

## ログレベル

### DEBUG

開発環境でのみ出力されます。本番環境では無効化されます。

```typescript
logger.debug('詳細なデバッグ情報', { data: someData });
```

### INFO

重要なイベントを記録します。

```typescript
logger.info('ユーザーがログインしました', { userId, ipAddress });
```

### WARN

警告レベルの問題を記録します。

```typescript
logger.warn('レート制限に近づいています', { userId, remainingRequests: 5 });
```

### ERROR

エラーを記録します。

```typescript
logger.error('データベース接続に失敗しました', { error: errorMessage });
logger.errorWithStack(error, { context: 'Database Connection' });
```

---

## 機密情報のフィルタリング

ロガーは自動的に以下の機密情報をマスクします：

- APIキー（`api_key`, `apikey`, `secret_key`など）
- トークン（`token`, `access_token`, `refresh_token`など）
- パスワード（`password`, `passwd`, `pwd`など）
- Stripeキー（`sk_`, `pk_`, `whsec_`で始まるもの）
- OpenAIキー（`sk-`で始まるもの）
- Supabaseキー（JWT形式のトークン）
- クレジットカード情報（`card_number`, `cvv`, `cvc`など）

### 例

```typescript
// 機密情報を含むログ
logger.info('APIリクエスト', {
  apiKey: 'sk-1234567890abcdef', // 自動的にマスクされる
  password: 'secret123', // 自動的にマスクされる
  userId: 'user123' // マスクされない
});

// 出力例（本番環境）:
// [2025-01-27T12:00:00.000Z] [INFO] APIリクエスト
// {
//   "apiKey": "sk-1***ef",
//   "password": "sec***123",
//   "userId": "user123"
// }
```

---

## ベストプラクティス

### 1. 適切なログレベルの使用

```typescript
// ❌ 悪い例
logger.error('ユーザーがログインしました'); // ERRORではなくINFO

// ✅ 良い例
logger.info('ユーザーがログインしました', { userId });
logger.error('ログインに失敗しました', { error: errorMessage });
```

### 2. コンテキスト情報の提供

```typescript
// ❌ 悪い例
logger.error('エラーが発生しました');

// ✅ 良い例
logger.error('データベース接続エラー', {
  userId,
  operation: 'createUser',
  error: error.message,
});
```

### 3. 機密情報の保護

```typescript
// ❌ 悪い例
logger.info('APIキー', { apiKey: process.env.API_KEY });

// ✅ 良い例
logger.info('APIリクエスト', { hasApiKey: !!process.env.API_KEY });
// または、ロガーが自動的にマスクするので、そのまま使用しても安全
logger.info('APIリクエスト', { apiKey: process.env.API_KEY }); // 自動的にマスクされる
```

### 4. エラーオブジェクトの記録

```typescript
// ❌ 悪い例
logger.error('エラー', { error: error.toString() });

// ✅ 良い例
logger.errorWithStack(error, { context: 'API Handler' });
```

### 5. パフォーマンスの考慮

```typescript
// ❌ 悪い例（高コストな操作を常に実行）
logger.debug('データ', { data: expensiveOperation() });

// ✅ 良い例（ログレベルをチェック）
if (logger.shouldLog(LogLevel.DEBUG)) {
  logger.debug('データ', { data: expensiveOperation() });
}
```

---

## 移行ガイド

### console.logからloggerへの移行

#### 移行前

```typescript
console.log('ユーザーがログインしました', { userId });
console.error('エラーが発生しました', error);
```

#### 移行後

```typescript
import { logger } from '@/utils/logger';

logger.info('ユーザーがログインしました', { userId });
logger.errorWithStack(error, { context: 'Login' });
```

### 段階的な移行

1. **新しいコード**: 必ず`logger`を使用
2. **既存のコード**: 段階的に`console.*`を`logger`に置き換え
3. **優先順位**: 
   - APIルート（`pages/api/**`）
   - ユーティリティ関数（`src/utils/**`）
   - コンポーネント（`src/components/**`）

---

## 設定

### ログレベルの変更

```typescript
import { logger, LogLevel } from '@/utils/logger';

// 本番環境でもDEBUGログを有効化（開発時のみ）
logger.setLevel(LogLevel.DEBUG);
```

### 機密情報フィルタリングの無効化（開発時のみ）

```typescript
// 開発環境でのみ使用
logger.setFilterSensitiveData(false);
```

---

## 関連ドキュメント

- [APIエラーハンドリングガイド](./API_ERROR_HANDLING.md)
- [セキュリティガイド](./security.md)
