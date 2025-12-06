# 開発ルール（包括版）

## 📋 目次

1. [コーディング規約](#コーディング規約)
2. [アーキテクチャ原則](#アーキテクチャ原則)
3. [データベース設計規則](#データベース設計規則)
4. [API設計規則](#api設計規則)
5. [フロントエンド開発規則](#フロントエンド開発規則)
6. [バックエンド開発規則](#バックエンド開発規則)
7. [セキュリティ規則](#セキュリティ規則)
8. [テスト規則](#テスト規則)
9. [パフォーマンス規則](#パフォーマンス規則)
10. [エラーハンドリング規則](#エラーハンドリング規則)
11. [ログ・監視規則](#ログ監視規則)
12. [デプロイメント規則](#デプロイメント規則)

---

## コーディング規約

### TypeScript

#### 型定義
- ✅ **必須**: すべての関数、変数、プロパティに型を定義
- ✅ **必須**: `any`型の使用を禁止（例外は`unknown`を使用）
- ✅ **推奨**: インターフェースは`I`プレフィックスなし（例: `User`、`Review`）
- ✅ **必須**: 共用体型を使用（例: `'pending' | 'responded' | 'ignored'`）

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: 'admin' | 'member';
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

#### 命名規則
- **変数・関数**: camelCase（例: `getUserProfile`, `isLoading`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`, `API_BASE_URL`）
- **クラス・インターフェース・型**: PascalCase（例: `UserService`, `ReviewType`）
- **ファイル名**: 
  - コンポーネント: PascalCase.tsx（例: `LoginForm.tsx`）
  - ページ: kebab-case.tsx（例: `login.tsx`）
  - ユーティリティ: camelCase.ts（例: `supabase.ts`）

### React

#### コンポーネント設計
- ✅ **必須**: 関数コンポーネントのみ使用（クラスコンポーネント禁止）
- ✅ **必須**: Props型を明示的に定義
- ✅ **推奨**: コンポーネントは単一責任の原則に従う
- ✅ **推奨**: 再利用可能なコンポーネントは`src/components/`に配置

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  disabled = false,
  variant = 'primary'
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
};

// ❌ Bad
export const Button = ({ label, onClick }: any) => {
  return <button onClick={onClick}>{label}</button>;
};
```

#### フック使用規則
- ✅ **必須**: カスタムフックは`use`で始まる（例: `useAuth`, `useReviews`）
- ✅ **必須**: フックはコンポーネントのトップレベルでのみ呼び出す
- ✅ **推奨**: 複雑なロジックはカスタムフックに分離

```typescript
// ✅ Good
function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchReviews().then(setReviews).finally(() => setLoading(false));
  }, []);
  
  return { reviews, loading };
}

// ❌ Bad
function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  
  // 条件分岐内でフックを呼び出している
  if (someCondition) {
    useEffect(() => {
      fetchReviews().then(setReviews);
    }, []);
  }
}
```

#### 状態管理
- ✅ **推奨**: ローカル状態は`useState`を使用
- ✅ **推奨**: グローバル状態はContext APIまたはZustandを使用
- ✅ **禁止**: Reduxは使用しない（過剰な複雑さを避けるため）

### インポート順序

```typescript
// 1. React関連
import { useState, useEffect } from 'react';

// 2. 外部ライブラリ（アルファベット順）
import { Box, Button } from '@mui/material';
import { format } from 'date-fns';

// 3. 内部モジュール（絶対パス、アルファベット順）
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase';

// 4. 相対パス（アルファベット順）
import { ReviewCard } from './ReviewCard';
import { ReviewList } from './ReviewList';

// 5. 型定義（最後）
import type { Review } from '@/types/review';
```

---

## アーキテクチャ原則

### ディレクトリ構造

```
/
├── pages/                    # Next.jsページ（ルーティング）
│   ├── api/                 # APIエンドポイント
│   │   ├── auth/           # 認証API
│   │   ├── reviews/        # レビューAPI
│   │   └── ...
│   ├── auth/                # 認証ページ
│   ├── dashboard.tsx        # ダッシュボード
│   └── ...
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   │   ├── auth/           # 認証コンポーネント
│   │   ├── layout/         # レイアウトコンポーネント
│   │   ├── review/         # レビューコンポーネント
│   │   └── ...
│   ├── hooks/              # カスタムフック
│   ├── services/           # ビジネスロジックサービス
│   ├── types/             # TypeScript型定義
│   ├── utils/             # ユーティリティ関数
│   └── constants/         # 定数定義
├── e2e/                    # Playwright E2Eテスト
├── docs/                   # ドキュメント
└── public/                 # 静的ファイル
```

### レイヤー分離

```
┌─────────────────────────────────────┐
│   Presentation Layer (Pages)        │  ← UIコンポーネント
├─────────────────────────────────────┤
│   Business Logic Layer (Services)   │  ← ビジネスロジック
├─────────────────────────────────────┤
│   Data Access Layer (Supabase)     │  ← データベースアクセス
└─────────────────────────────────────┘
```

### 依存関係の方向

- ✅ **許可**: Pages → Components → Services → Utils
- ✅ **許可**: Services → Supabase Client
- ❌ **禁止**: Utils → Services（循環依存を避ける）
- ❌ **禁止**: Components → Pages（逆方向の依存）

---

## データベース設計規則

### テーブル命名規則
- ✅ **必須**: 複数形を使用（例: `reviews`, `users`, `tenants`）
- ✅ **必須**: スネークケース（例: `google_auth_tokens`）
- ✅ **必須**: 主キーは`id`（UUID型）

### カラム命名規則
- ✅ **必須**: スネークケース（例: `created_at`, `user_id`）
- ✅ **必須**: 日時カラムは`_at`サフィックス（例: `created_at`, `updated_at`）
- ✅ **必須**: ブール値は`is_`または`has_`プレフィックス（例: `is_active`, `has_reply`）

### RLS (Row Level Security)
- ✅ **必須**: すべてのテーブルでRLSを有効化
- ✅ **必須**: テナント分離ポリシーを実装
- ✅ **必須**: ユーザーは自分のデータのみアクセス可能

```sql
-- ✅ Good: RLSポリシーの例
CREATE POLICY "Users can view own reviews" ON reviews
  FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE
  USING (tenant_id = auth.uid());
```

### マイグレーション規則
- ✅ **必須**: すべてのスキーマ変更はマイグレーションファイルで管理
- ✅ **必須**: マイグレーションファイル名は`YYYYMMDDHHMMSS_description.sql`形式
- ✅ **必須**: ロールバック可能なマイグレーションを作成
- ✅ **禁止**: 本番環境での直接SQL実行（マイグレーション経由のみ）

---

## API設計規則

### RESTful API規約

| メソッド | 用途 | 例 | ステータスコード |
|---------|------|-----|----------------|
| GET | リソース取得 | `GET /api/reviews` | 200 |
| POST | リソース作成 | `POST /api/reviews` | 201 |
| PUT | リソース全体更新 | `PUT /api/reviews/:id` | 200 |
| PATCH | リソース部分更新 | `PATCH /api/reviews/:id` | 200 |
| DELETE | リソース削除 | `DELETE /api/reviews/:id` | 204 |

### エンドポイント命名規則
- ✅ **必須**: リソース名は複数形（例: `/api/reviews`, `/api/users`）
- ✅ **必須**: ネストは2階層まで（例: `/api/reviews/:id/replies`）
- ✅ **禁止**: 動詞を含む（例: ❌ `/api/get-reviews`, ✅ `/api/reviews`）

### リクエスト・レスポンス形式

#### 成功レスポンス
```typescript
// 単一リソース
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    ...
  }
}

// リストリソース
{
  "success": true,
  "data": [
    { "id": "uuid", ... },
    { "id": "uuid", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

#### エラーレスポンス
```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      "field": "email",
      "reason": "invalid_format"
    },
    "timestamp": "2025-01-27T12:00:00.000Z"
  }
}
```

### 認証・認可
- ✅ **必須**: すべてのAPIエンドポイントで認証チェック
- ✅ **必須**: JWTトークンを`Authorization: Bearer <token>`ヘッダーで送信
- ✅ **必須**: テナント分離をRLSで実装
- ✅ **必須**: 権限チェックを実装（Admin/Member）

```typescript
// ✅ Good: APIエンドポイントでの認証チェック
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 認証チェック
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_001',
        message: '認証が必要です',
      }
    });
  }

  // 権限チェック
  const user = await getUser(session.user.id);
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERM_001',
        message: 'アクセス権限がありません',
      }
    });
  }

  // 処理続行
}
```

### バリデーション
- ✅ **必須**: リクエストボディのバリデーションを実装
- ✅ **必須**: 型安全性を確保（ZodまたはYupを使用）
- ✅ **必須**: エラーメッセージは日本語で返す

```typescript
import { z } from 'zod';

const createReviewSchema = z.object({
  location_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = createReviewSchema.parse(req.body);
    // 処理続行
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'バリデーションエラー',
          details: error.errors,
        }
      });
    }
  }
}
```

---

## フロントエンド開発規則

### コンポーネント設計原則

#### 単一責任の原則
- ✅ **必須**: 1つのコンポーネントは1つの責任のみ
- ✅ **推奨**: 複雑なコンポーネントは小さなコンポーネントに分割

```typescript
// ✅ Good: 責任が明確に分離されている
function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <div>
      {reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <ReviewHeader review={review} />
      <ReviewContent review={review} />
      <ReviewActions review={review} />
    </Card>
  );
}

// ❌ Bad: 1つのコンポーネントに複数の責任がある
function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <div>
      {reviews.map(review => (
        <Card>
          {/* ヘッダー、コンテンツ、アクションがすべて混在 */}
        </Card>
      ))}
    </div>
  );
}
```

#### Props設計
- ✅ **必須**: Props型を明示的に定義
- ✅ **推奨**: デフォルト値を設定可能にする
- ✅ **推奨**: 必須PropsとオプションPropsを明確に区別

```typescript
// ✅ Good
interface ButtonProps {
  label: string;              // 必須
  onClick: () => void;       // 必須
  disabled?: boolean;        // オプション
  variant?: 'primary' | 'secondary';  // オプション、デフォルト値あり
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  disabled = false,
  variant = 'primary'
}) => {
  // ...
};
```

### 状態管理規則

#### ローカル状態
- ✅ **推奨**: フォーム状態、UI状態は`useState`を使用
- ✅ **推奨**: 複雑なフォームは`react-hook-form`を使用

#### グローバル状態
- ✅ **推奨**: 認証状態はContext APIを使用
- ✅ **推奨**: サーバー状態はSWRまたはReact Queryを使用
- ✅ **禁止**: グローバル状態の過剰な使用を避ける

```typescript
// ✅ Good: Context APIで認証状態を管理
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### データフェッチ規則

#### SWR使用規則
- ✅ **推奨**: データフェッチにはSWRを使用
- ✅ **必須**: エラーハンドリングを実装
- ✅ **必須**: ローディング状態を表示

```typescript
// ✅ Good: SWRを使用したデータフェッチ
import useSWR from 'swr';

const fetcher = async (url: string) => {
  const { data, error } = await supabase.from('reviews').select('*');
  if (error) throw error;
  return data;
};

function ReviewsPage() {
  const { data: reviews, error, isLoading } = useSWR('/api/reviews', fetcher);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  if (!reviews) return <Empty />;

  return <ReviewList reviews={reviews} />;
}
```

### フォーム処理規則

#### バリデーション
- ✅ **必須**: クライアント側バリデーションを実装
- ✅ **必須**: サーバー側バリデーションも実装（二重チェック）
- ✅ **推奨**: `react-hook-form` + `zod`を使用

```typescript
// ✅ Good: react-hook-form + zodを使用
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

function ReviewForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  const onSubmit = async (data: ReviewFormData) => {
    // サーバーに送信
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('rating')} type="number" />
      {errors.rating && <span>{errors.rating.message}</span>}
      
      <textarea {...register('comment')} />
      {errors.comment && <span>{errors.comment.message}</span>}
      
      <button type="submit">送信</button>
    </form>
  );
}
```

---

## バックエンド開発規則

### APIエンドポイント実装規則

#### エラーハンドリング
- ✅ **必須**: try-catchでエラーをキャッチ
- ✅ **必須**: 統一されたエラーレスポンス形式を使用
- ✅ **必須**: 機密情報をログに出力しない

```typescript
// ✅ Good: 統一されたエラーハンドリング
import { handleApiError } from '@/utils/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 認証チェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: '認証が必要です',
        }
      });
    }

    // ビジネスロジック
    const result = await processRequest(req.body);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error, res);
  }
}
```

#### バリデーション
- ✅ **必須**: リクエストボディのバリデーション
- ✅ **必須**: クエリパラメータのバリデーション
- ✅ **必須**: 型安全性を確保

```typescript
import { z } from 'zod';

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const validatedQuery = querySchema.parse(req.query);
    // 処理続行
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'バリデーションエラー',
          details: error.errors,
        }
      });
    }
  }
}
```

### データベースアクセス規則

#### Supabaseクエリ
- ✅ **必須**: 必要なフィールドのみ取得（`select('id, name')`）
- ✅ **必須**: ページネーションを実装（`range()`を使用）
- ✅ **必須**: エラーハンドリングを実装

```typescript
// ✅ Good: 効率的なクエリ
const { data, error } = await supabase
  .from('reviews')
  .select('id, rating, comment, created_at')
  .eq('tenant_id', tenantId)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .range((page - 1) * limit, page * limit - 1);

if (error) {
  throw new Error(`レビュー取得エラー: ${error.message}`);
}

// ❌ Bad: 非効率なクエリ
const { data } = await supabase
  .from('reviews')
  .select('*');  // 全フィールド取得、フィルタなし
```

#### トランザクション
- ✅ **必須**: 複数のデータベース操作はトランザクションで実行
- ✅ **必須**: エラー時はロールバック

```typescript
// ✅ Good: トランザクション処理
const { data, error } = await supabase.rpc('create_review_with_reply', {
  review_data: reviewData,
  reply_data: replyData,
});

if (error) {
  throw new Error(`トランザクションエラー: ${error.message}`);
}
```

---

## セキュリティ規則

### 認証・認可
- ✅ **必須**: すべての保護ページで`AuthGuard`を使用
- ✅ **必須**: すべてのAPIエンドポイントで認証チェック
- ✅ **必須**: RLSポリシーでデータアクセスを制限
- ✅ **必須**: JWTトークンの有効期限を設定（デフォルト: 1時間）

### 入力サニタイズ
- ✅ **必須**: ユーザー入力はサニタイズ
- ✅ **必須**: SQLインジェクション対策（Supabaseが自動処理）
- ✅ **必須**: XSS対策（Reactが自動エスケープ）

```typescript
// ✅ Good: Supabaseが自動的にサニタイズ
const { data } = await supabase
  .from('reviews')
  .select('*')
  .eq('id', reviewId);  // パラメータ化クエリ

// ❌ Bad: 文字列結合（SQLインジェクションリスク）
const query = `SELECT * FROM reviews WHERE id = '${reviewId}'`;
```

### 環境変数管理
- ✅ **必須**: 機密情報は環境変数で管理
- ✅ **必須**: `.env.local`を`.gitignore`に追加
- ✅ **必須**: 本番環境の環境変数はVercelで設定

```bash
# ✅ Good: 環境変数の命名規則
NEXT_PUBLIC_SUPABASE_URL=...      # クライアント公開可能
SUPABASE_SERVICE_ROLE_KEY=...     # サーバーサイドのみ
OPENAI_API_KEY=...                # サーバーサイドのみ

# ❌ Bad: 機密情報をハードコード
const API_KEY = 'sk-1234567890';
```

---

## テスト規則

### E2Eテスト（Playwright）

#### テスト構造
- ✅ **必須**: `test.describe()`で機能ごとにグループ化
- ✅ **必須**: 正常系と異常系を分離
- ✅ **必須**: テスト名は日本語で記述（何をテストしているか明確に）

```typescript
// ✅ Good: 明確なテスト構造
test.describe('認証機能', () => {
  test.describe('ログイン - 正常系', () => {
    test('有効な認証情報でログインできる', async ({ page }) => {
      // テスト実装
    });
  });

  test.describe('ログイン - 異常系', () => {
    test('無効なパスワードでエラーが表示される', async ({ page }) => {
      // テスト実装
    });
  });
});
```

#### テストカバレッジ
- ✅ **必須**: すべての主要機能について正常系・異常系をテスト
- ✅ **必須**: エッジケースもテスト
- ✅ **推奨**: カバレッジ80%以上を目標

#### テストデータ
- ✅ **必須**: テストデータは`e2e/fixtures/`に配置
- ✅ **必須**: テスト間でデータを共有しない（独立性を保つ）
- ✅ **推奨**: モックデータを使用

---

## パフォーマンス規則

### フロントエンド
- ✅ **推奨**: コンポーネントのメモ化（`React.memo`, `useMemo`, `useCallback`）
- ✅ **推奨**: コード分割（動的インポート）
- ✅ **推奨**: 画像最適化（Next.js Imageコンポーネント）

### バックエンド
- ✅ **必須**: データベースクエリの最適化
- ✅ **必須**: N+1問題の回避
- ✅ **推奨**: キャッシュの活用（SWR、Redis）

---

## エラーハンドリング規則

### エラーコード体系
- ✅ **必須**: 統一されたエラーコードを使用
- ✅ **必須**: エラーメッセージは日本語で返す
- ✅ **必須**: 本番環境では機密情報をマスク

### エラーログ
- ✅ **必須**: すべてのエラーをログに記録
- ✅ **必須**: Sentryにエラーを送信
- ✅ **必須**: エラーログにはコンテキスト情報を含める

---

## ログ・監視規則

### ログレベル
- ✅ **必須**: 適切なログレベルを使用（error, warn, info, debug）
- ✅ **必須**: 本番環境ではdebugログを無効化
- ✅ **必須**: 機密情報をログに出力しない

### 監視
- ✅ **必須**: Sentryでエラー監視
- ✅ **推奨**: パフォーマンスメトリクスを記録
- ✅ **推奨**: アラート設定

---

## デプロイメント規則

### デプロイ前チェックリスト
- [ ] 型エラーなし（`npm run build`）
- [ ] Lintエラーなし（`npm run lint`）
- [ ] テスト通過（`npm test`）
- [ ] E2Eテスト通過（`npm run test:e2e`）
- [ ] 環境変数設定済み
- [ ] データベースマイグレーション済み
- [ ] セキュリティチェック完了

### デプロイ後チェックリスト
- [ ] ヘルスチェックエンドポイント確認
- [ ] 主要機能の動作確認
- [ ] エラーログ確認
- [ ] パフォーマンス確認

---

## 参考資料

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React公式ドキュメント](https://react.dev/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Playwright公式ドキュメント](https://playwright.dev/)

