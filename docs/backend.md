# バックエンド開発ガイド

## プロジェクト構造

```
src/
├── backend/
│   ├── functions/     # AWS Lambda関数
│   ├── scripts/       # ユーティリティスクリプト
│   ├── types/         # TypeScript型定義
│   └── utils/         # ユーティリティ関数
```

## Supabase設定

### データベース設計

詳細は[アーキテクチャドキュメント](./architecture.md)を参照してください。

### 認証設定

1. **認証プロバイダー**
   - Email/Password
   - Google
   - LINE

2. **認証ポリシー**
   ```sql
   -- ユーザーは自分のデータのみアクセス可能
   CREATE POLICY "ユーザーは自分のデータのみアクセス可能"
   ON public.locations
   FOR ALL
   USING (auth.uid() = user_id);
   ```

### ストレージ設定

1. **バケット設定**
   - `public`: 公開ファイル
   - `private`: 認証が必要なファイル

2. **ストレージポリシー**
   ```sql
   -- 公開バケット
   CREATE POLICY "公開ファイルは誰でもアクセス可能"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'public');

   -- プライベートバケット
   CREATE POLICY "認証済みユーザーのみアクセス可能"
   ON storage.objects FOR ALL
   USING (auth.role() = 'authenticated');
   ```

## AWS Lambda関数

### 関数の構造

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateReply } from '../utils/openai';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { reviewId, tone } = JSON.parse(event.body || '{}');
    
    const reply = await generateReply(reviewId, tone);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ data: reply }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### 環境変数

```env
# .env
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

## LINE通知

### Webhook設定

```typescript
import { Client } from '@line/bot-sdk';

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

export const sendNotification = async (
  userId: string,
  message: string
) => {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: message,
    });
  } catch (error) {
    console.error('LINE通知エラー:', error);
  }
};
```

## データベース操作

### クエリビルダー

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// データの取得
const getLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select('*');
  
  if (error) throw error;
  return data;
};

// データの作成
const createLocation = async (location: Location) => {
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// データの更新
const updateLocation = async (id: string, updates: Partial<Location>) => {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

## エラーハンドリング

### エラークラス

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 使用例
const handleError = (error: Error) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: {
          message: error.message,
          details: error.details,
        },
      }),
    };
  }
  
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: {
        message: 'Internal Server Error',
      },
    }),
  };
};
```

## ロギング

### ロガー設定

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// 使用例
logger.info('処理開始', { userId: '123' });
logger.error('エラー発生', { error: error.message });
```

## テスト

### ユニットテスト

```typescript
import { expect } from 'chai';
import { generateReply } from '../utils/openai';

describe('generateReply', () => {
  it('should generate a reply', async () => {
    const review = {
      comment: '素晴らしいサービスでした！',
      rating: 5,
    };
    
    const reply = await generateReply(review, 'polite');
    
    expect(reply).to.be.a('string');
    expect(reply.length).to.be.greaterThan(0);
  });
});
```

### 統合テスト

```typescript
import { expect } from 'chai';
import { handler } from '../functions/generate-reply';

describe('generate-reply handler', () => {
  it('should return a reply', async () => {
    const event = {
      body: JSON.stringify({
        reviewId: '123',
        tone: 'polite',
      }),
    };
    
    const response = await handler(event);
    
    expect(response.statusCode).to.equal(200);
    expect(JSON.parse(response.body)).to.have.property('data');
  });
});
```

## デプロイメント

### AWS Lambdaデプロイ

```bash
# ビルド
npm run build

# デプロイ
npm run deploy
```

### Supabaseデプロイ

```bash
# マイグレーション
supabase db push

# 関数のデプロイ
supabase functions deploy
```

## モニタリング

### ログ監視

- AWS CloudWatch
- Supabase Logs
- LINE Messaging API Logs

### メトリクス

- リクエスト数
- エラー率
- レスポンスタイム
- データベース接続数 