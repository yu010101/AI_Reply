# 開発ルール

## 技術スタック

### フロントエンド
| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js (Pages Router) | 14.x |
| 言語 | TypeScript | 5.x |
| スタイリング | Tailwind CSS, Emotion | - |
| UIライブラリ | Material UI (@mui/material) | 5.x |
| 状態管理 | React Context, Hooks | - |
| データフェッチ | SWR, axios | - |
| チャート | Chart.js, react-chartjs-2 | - |

### バックエンド
| カテゴリ | 技術 | 用途 |
|---------|------|------|
| データベース | Supabase (PostgreSQL) | データ永続化 |
| 認証 | Supabase Auth | ユーザー認証 |
| サーバーレス | AWS Lambda | バッチ処理 |
| API | Next.js API Routes | RESTful API |
| 外部連携 | Google Business API | レビュー取得 |
| AI | OpenAI API | 返信生成 |
| 決済 | Stripe | サブスクリプション |

### テスト
| カテゴリ | 技術 | 用途 |
|---------|------|------|
| ユニット/統合 | Jest, React Testing Library | コンポーネントテスト |
| E2E | Playwright | エンドツーエンドテスト |
| API | ts-jest | APIテスト |

---

## ディレクトリ構造

```
/
├── src/
│   ├── components/        # 再利用可能なUIコンポーネント
│   │   ├── auth/         # 認証関連コンポーネント
│   │   ├── layout/       # レイアウトコンポーネント
│   │   ├── review/       # レビュー関連コンポーネント
│   │   ├── settings/     # 設定関連コンポーネント
│   │   └── subscription/ # サブスクリプション関連
│   ├── hooks/            # カスタムReactフック
│   ├── services/         # ビジネスロジックサービス
│   ├── types/            # TypeScript型定義
│   ├── utils/            # ユーティリティ関数
│   └── backend/          # バックエンドロジック
│       ├── functions/    # Lambda関数
│       └── middleware/   # ミドルウェア
├── pages/                # Next.jsページ（ルート）
│   ├── api/             # APIエンドポイント
│   └── auth/            # 認証ページ
├── contexts/            # React Context定義
├── utils/               # 共有ユーティリティ
├── e2e/                 # Playwrightテスト
├── docs/                # ドキュメント
└── public/              # 静的ファイル
```

---

## 命名規則

### ファイル名
| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase.tsx | `LoginForm.tsx`, `ReviewCard.tsx` |
| ページ | kebab-case.tsx | `login.tsx`, `verify-email.tsx` |
| フック | use + PascalCase.ts | `useAuth.ts`, `useReviews.ts` |
| ユーティリティ | camelCase.ts | `supabase.ts`, `formatDate.ts` |
| 型定義 | camelCase.d.ts | `auth.d.ts`, `review.d.ts` |
| テスト | *.spec.ts | `auth.spec.ts`, `dashboard.spec.ts` |

### コード内命名
| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `LoginForm`, `ReviewCard` |
| 関数/変数 | camelCase | `getUserProfile`, `isLoading` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| インターフェース/型 | PascalCase | `UserInterface`, `ReviewType` |
| Enumの値 | UPPER_SNAKE_CASE | `Status.PENDING`, `Role.ADMIN` |

---

## コーディング標準

### TypeScript
```typescript
// ✅ Good: 厳密な型定義
interface UserProps {
  id: string;
  email: string;
  role: 'admin' | 'member';
}

// ❌ Bad: any型の使用
const user: any = fetchUser();
```

### React コンポーネント
```typescript
// ✅ Good: 関数コンポーネント + Props型定義
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

// ❌ Bad: クラスコンポーネント、型なし
class Button extends React.Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
```

### インポート順序
```typescript
// 1. 外部ライブラリ
import { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';

// 2. 内部モジュール（絶対パス）
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase';

// 3. 相対パス
import { ReviewCard } from './ReviewCard';
```

---

## エラーハンドリング

### API呼び出し
```typescript
// ✅ Good: 適切なエラーハンドリング
const fetchReviews = async () => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*');

    if (error) {
      console.error('レビュー取得エラー:', error);
      throw new Error(`レビューの取得に失敗しました: ${error.message}`);
    }

    return data;
  } catch (error) {
    // ユーザーフレンドリーなエラーメッセージ
    setError('データの読み込みに失敗しました。再度お試しください。');
    return null;
  }
};
```

### フォームバリデーション
```typescript
// ✅ Good: クライアント側バリデーション
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // バリデーション
  if (!validateEmail(email)) {
    setError('有効なメールアドレスを入力してください');
    return;
  }

  if (password.length < 6) {
    setError('パスワードは6文字以上で入力してください');
    return;
  }

  // 送信処理
};
```

---

## セキュリティガイドライン

### 認証・認可
1. **すべての保護ページは `AuthGuard` でラップする**
2. **APIエンドポイントでセッション検証を必須とする**
3. **RLS (Row Level Security) を有効にする**

```typescript
// ページでの認証ガード
export default function DashboardPage() {
  return (
    <AuthGuard>
      <Layout>
        <Dashboard />
      </Layout>
    </AuthGuard>
  );
}

// APIでの認証チェック
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 処理続行
}
```

### 入力サニタイズ
```typescript
// ✅ Good: パラメータ化クエリ（Supabase が自動処理）
const { data } = await supabase
  .from('reviews')
  .select('*')
  .eq('id', reviewId);

// ❌ Bad: 文字列結合（SQLインジェクションリスク）
const query = `SELECT * FROM reviews WHERE id = '${reviewId}'`;
```

### 環境変数
```bash
# クライアント公開可能
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# サーバーサイドのみ（絶対に公開しない）
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

---

## Git ワークフロー

### ブランチ戦略
| ブランチ | 用途 | 命名規則 |
|---------|------|----------|
| main | 本番環境 | - |
| develop | 開発統合 | - |
| feature/* | 新機能 | `feature/add-review-filter` |
| fix/* | バグ修正 | `fix/login-redirect-error` |
| hotfix/* | 緊急修正 | `hotfix/security-patch` |

### コミットメッセージ
Conventional Commits形式を使用：

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type | 説明 |
|------|------|
| feat | 新機能追加 |
| fix | バグ修正 |
| docs | ドキュメントのみ変更 |
| style | コードスタイル変更（動作に影響なし） |
| refactor | リファクタリング |
| test | テスト追加・修正 |
| chore | ビルド・設定変更 |

例：
```
feat(auth): ログインフォームにMFA対応を追加

- TOTPベースの二要素認証を実装
- バックアップコード生成機能を追加
- 監査ログ記録を追加

Closes #123
```

---

## テスト方針

### テストピラミッド
```
         /\
        /E2E\        ← Playwright（少数・重要フロー）
       /──────\
      / 統合   \     ← Jest + RTL（コンポーネント結合）
     /──────────\
    /  ユニット   \   ← Jest（関数・ロジック）
   /──────────────\
```

### E2Eテスト（Playwright）
```typescript
// e2e/auth.spec.ts
test.describe('認証', () => {
  // 正常系
  test('有効な認証情報でログインできる', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  // 異常系
  test('無効なパスワードでエラーが表示される', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('wrongpassword');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page.getByRole('alert')).toContainText('パスワードが正しくありません');
  });
});
```

### テストファイル配置
```
e2e/
├── auth.spec.ts        # 認証テスト
├── dashboard.spec.ts   # ダッシュボードテスト
├── reviews.spec.ts     # レビュー管理テスト
├── settings.spec.ts    # 設定テスト
├── tenants.spec.ts     # テナント管理テスト
└── fixtures/           # テストデータ
```

---

## API設計

### RESTful API規約
| メソッド | 用途 | 例 |
|----------|------|-----|
| GET | リソース取得 | `GET /api/reviews` |
| POST | リソース作成 | `POST /api/reviews` |
| PUT | リソース全体更新 | `PUT /api/reviews/:id` |
| PATCH | リソース部分更新 | `PATCH /api/reviews/:id` |
| DELETE | リソース削除 | `DELETE /api/reviews/:id` |

### レスポンス形式
```typescript
// 成功時
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}

// エラー時
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "メールアドレスの形式が正しくありません",
    "details": { "field": "email" }
  }
}
```

### HTTPステータスコード
| コード | 説明 | 使用例 |
|--------|------|--------|
| 200 | 成功 | GET, PUT, PATCH成功 |
| 201 | 作成成功 | POST成功 |
| 400 | 不正なリクエスト | バリデーションエラー |
| 401 | 未認証 | ログインが必要 |
| 403 | 権限なし | アクセス権限不足 |
| 404 | 未検出 | リソースが存在しない |
| 500 | サーバーエラー | 内部エラー |

---

## パフォーマンス最適化

### フロントエンド
1. **コンポーネントのメモ化**
```typescript
import { memo, useMemo, useCallback } from 'react';

const ReviewCard = memo(({ review }: { review: Review }) => {
  return <div>{review.comment}</div>;
});
```

2. **データフェッチの最適化**
```typescript
// SWRを使用したキャッシュ
const { data, error, isLoading } = useSWR('/api/reviews', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1分間はキャッシュを使用
});
```

### バックエンド
1. **クエリ最適化**
```typescript
// ✅ Good: 必要なフィールドのみ取得
const { data } = await supabase
  .from('reviews')
  .select('id, rating, comment')
  .limit(10);

// ❌ Bad: 全フィールド取得
const { data } = await supabase
  .from('reviews')
  .select('*');
```

2. **N+1問題の回避**
```typescript
// ✅ Good: JOINを使用
const { data } = await supabase
  .from('reviews')
  .select(`
    id,
    rating,
    comment,
    locations (name)
  `);
```

---

## ログ・監視

### ログレベル
| レベル | 用途 |
|--------|------|
| error | エラー、例外 |
| warn | 警告、非推奨機能使用 |
| info | 重要な操作（ログイン、データ更新） |
| debug | デバッグ情報（開発環境のみ） |

### ログフォーマット
```typescript
console.log('[LoginForm] ログイン試行:', email);
console.error('[ReviewService] レビュー取得エラー:', error);
```

---

## デプロイメント

### 環境
| 環境 | ブランチ | URL |
|------|----------|-----|
| 開発 | develop | localhost:3000 |
| ステージング | staging | staging.example.com |
| 本番 | main | app.example.com |

### デプロイチェックリスト
- [ ] 型エラーなし（`npm run type-check`）
- [ ] Lintエラーなし（`npm run lint`）
- [ ] テスト通過（`npm test`）
- [ ] E2Eテスト通過（`npm run test:e2e`）
- [ ] 環境変数設定済み
- [ ] データベースマイグレーション済み
