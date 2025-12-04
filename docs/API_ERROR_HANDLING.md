# APIエラーハンドリングガイド

このドキュメントでは、統一されたAPIエラーハンドリングの使用方法について説明します。

## 📋 目次

- [概要](#概要)
- [エラーレスポンス形式](#エラーレスポンス形式)
- [使用方法](#使用方法)
- [エラーコード一覧](#エラーコード一覧)
- [ベストプラクティス](#ベストプラクティス)

---

## 概要

すべてのAPIエンドポイントで統一されたエラーレスポンス形式を使用することで、以下のメリットがあります：

1. ✅ **一貫性**: すべてのエンドポイントで同じ形式のエラーレスポンス
2. ✅ **デバッグの容易さ**: エラーコードとタイムスタンプで問題の追跡が容易
3. ✅ **セキュリティ**: 本番環境では機密情報をマスク
4. ✅ **型安全性**: TypeScriptで型安全なエラーハンドリング

---

## エラーレスポンス形式

すべてのエラーレスポンスは以下の形式です：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {},
    "timestamp": "2025-01-27T12:00:00.000Z"
  }
}
```

### フィールド説明

- `code`: エラーコード（`ApiErrorCode` enum）
- `message`: 人間が読めるエラーメッセージ
- `details`: 追加の詳細情報（本番環境では非表示）
- `timestamp`: エラーが発生した時刻（ISO 8601形式）

---

## 使用方法

### 基本的な使用例

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError, createNotFoundError, createValidationError } from '@/utils/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      throw createMethodNotAllowedError(['GET'], req.method || '');
    }
    
    const { id } = req.query;
    
    if (!id) {
      throw createValidationError('IDパラメータが必要です', {
        field: 'id',
        required: true,
      });
    }
    
    // リソースの取得
    const resource = await getResource(id as string);
    
    if (!resource) {
      throw createNotFoundError('リソース');
    }
    
    res.status(200).json({ data: resource });
  } catch (error) {
    handleApiError(res, error);
  }
}
```

### カスタムエラーの作成

```typescript
import { ApiError, ApiErrorCode } from '@/utils/apiErrorHandler';

// カスタムエラーコードを使用
throw new ApiError(
  'CUSTOM_ERROR_CODE',
  'カスタムエラーメッセージ',
  400,
  { customField: 'value' }
);
```

### ヘルパー関数の使用

```typescript
import {
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createRateLimitError,
  createDatabaseError,
  createExternalServiceError,
} from '@/utils/apiErrorHandler';

// 認証エラー
if (!session) {
  throw createUnauthorizedError('ログインが必要です');
}

// 認可エラー
if (!hasPermission) {
  throw createForbiddenError('この操作を実行する権限がありません');
}

// バリデーションエラー
if (!email || !isValidEmail(email)) {
  throw createValidationError('有効なメールアドレスを入力してください', {
    field: 'email',
    value: email,
  });
}

// リソースが見つからない
const user = await getUser(userId);
if (!user) {
  throw createNotFoundError('ユーザー');
}

// レート制限
if (rateLimiter.isLimited()) {
  throw createRateLimitError(rateLimiter.getRetryAfter());
}

// データベースエラー
try {
  await db.query(...);
} catch (dbError) {
  throw createDatabaseError('データベースクエリに失敗しました', {
    query: 'SELECT ...',
    error: dbError.message,
  });
}

// 外部サービスエラー
try {
  await externalApi.call();
} catch (apiError) {
  throw createExternalServiceError('Stripe', '決済処理に失敗しました');
}
```

---

## エラーコード一覧

### 認証・認可エラー (401-403)

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | アクセスが拒否された |
| `INVALID_TOKEN` | 401 | 無効なトークン |

### バリデーションエラー (400)

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `INVALID_INPUT` | 400 | 無効な入力 |
| `MISSING_REQUIRED_FIELD` | 400 | 必須フィールドが不足 |

### リソースエラー (404)

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `NOT_FOUND` | 404 | リソースが見つからない |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない |

### サーバーエラー (500)

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `INTERNAL_SERVER_ERROR` | 500 | 内部サーバーエラー |
| `DATABASE_ERROR` | 500 | データベースエラー |
| `EXTERNAL_SERVICE_ERROR` | 502 | 外部サービスエラー |

### その他

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `METHOD_NOT_ALLOWED` | 405 | メソッドが許可されていない |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限に達した |
| `CONFLICT` | 409 | 競合エラー |

---

## ベストプラクティス

### 1. エラーハンドリングの統一

すべてのAPIエンドポイントで `handleApiError` を使用：

```typescript
try {
  // API処理
} catch (error) {
  return handleApiError(res, error);
}
```

### 2. 適切なエラーコードの使用

エラーの種類に応じて適切なエラーコードを使用：

```typescript
// ❌ 悪い例
throw new ApiError('ERROR', 'エラー', 500);

// ✅ 良い例
throw createNotFoundError('ユーザー');
throw createValidationError('メールアドレスが無効です');
```

### 3. 機密情報の保護

エラーメッセージに機密情報を含めない：

```typescript
// ❌ 悪い例
throw new ApiError('ERROR', `APIキー ${apiKey} が無効です`, 401);

// ✅ 良い例
throw createUnauthorizedError('認証に失敗しました');
```

### 4. 詳細情報の提供

デバッグに役立つ詳細情報を `details` に含める：

```typescript
throw createValidationError('バリデーションエラー', {
  field: 'email',
  value: email,
  reason: '無効な形式',
});
```

### 5. ログ出力

エラーは自動的にログに記録されますが、必要に応じて追加のログを出力：

```typescript
try {
  await processPayment();
} catch (error) {
  console.error('[Payment] 決済処理エラー', {
    userId,
    amount,
    error: error.message,
  });
  throw createExternalServiceError('Stripe', '決済処理に失敗しました');
}
```

---

## 移行ガイド

既存のAPIエンドポイントを新しいエラーハンドリングに移行する場合：

### 移行前

```typescript
export default async function handler(req, res) {
  try {
    // 処理
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 移行後

```typescript
import { handleApiError, createNotFoundError } from '@/utils/apiErrorHandler';

export default async function handler(req, res) {
  try {
    // 処理
  } catch (error) {
    return handleApiError(res, error);
  }
}
```

---

## 関連ドキュメント

- [APIドキュメント](./api.md)
- [セキュリティガイド](./security.md)
