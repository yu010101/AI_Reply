# APIリファレンス

## 認証

すべてのAPIリクエストには、有効なJWTトークンが必要です。トークンは`Authorization`ヘッダーで送信します：

```
Authorization: Bearer <your-jwt-token>
```

## エンドポイント

### 店舗管理

#### 店舗一覧の取得
```
GET /api/locations
```

**レスポンス**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "tone": "string",
      "line_user_id": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

#### 店舗の作成
```
POST /api/locations
```

**リクエストボディ**
```json
{
  "name": "string",
  "tone": "string",
  "line_user_id": "string"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "tone": "string",
    "line_user_id": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### 店舗の更新
```
PUT /api/locations/:id
```

**リクエストボディ**
```json
{
  "name": "string",
  "tone": "string",
  "line_user_id": "string"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "tone": "string",
    "line_user_id": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### レビュー管理

#### レビュー一覧の取得
```
GET /api/reviews
```

**クエリパラメータ**
- `location_id`: 店舗ID（オプション）
- `status`: ステータス（pending/responded/ignored）
- `page`: ページ番号
- `limit`: 1ページあたりの件数

**レスポンス**
```json
{
  "data": [
    {
      "id": "uuid",
      "location_id": "uuid",
      "author": "string",
      "rating": "integer",
      "comment": "string",
      "status": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "pagination": {
    "total": "integer",
    "page": "integer",
    "limit": "integer"
  }
}
```

#### レビューの更新
```
PUT /api/reviews/:id
```

**リクエストボディ**
```json
{
  "status": "string"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "uuid",
    "location_id": "uuid",
    "author": "string",
    "rating": "integer",
    "comment": "string",
    "status": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 返信管理

#### 返信の生成
```
POST /api/replies/generate
```

**リクエストボディ**
```json
{
  "review_id": "uuid",
  "tone": "string"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "uuid",
    "review_id": "uuid",
    "content": "string",
    "status": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### 返信の更新
```
PUT /api/replies/:id
```

**リクエストボディ**
```json
{
  "content": "string",
  "status": "string"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "uuid",
    "review_id": "uuid",
    "content": "string",
    "status": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

## エラーレスポンス

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  }
}
```

### エラーコード

- `400`: リクエストが不正
- `401`: 認証が必要
- `403`: アクセス権限がない
- `404`: リソースが見つからない
- `500`: サーバーエラー

## レート制限

APIには以下のレート制限が適用されます：

- 認証済みユーザー: 1分あたり100リクエスト
- 未認証ユーザー: 1分あたり10リクエスト

レート制限に達した場合、`429 Too Many Requests`エラーが返されます。

## バージョニング

APIのバージョンはURLパスに含まれます：

```
/api/v1/...
```

現在のバージョンは`v1`です。 