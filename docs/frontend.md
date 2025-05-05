# フロントエンド開発ガイド

## プロジェクト構造

```
src/
├── frontend/
│   ├── components/     # 再利用可能なコンポーネント
│   ├── pages/         # Next.jsページコンポーネント
│   ├── styles/        # スタイル関連ファイル
│   ├── utils/         # ユーティリティ関数
│   └── types/         # TypeScript型定義
```

## コンポーネント設計

### コンポーネントの種類

1. **ページコンポーネント**
   - `pages/`ディレクトリに配置
   - ルーティングの単位
   - データフェッチングとレイアウト管理

2. **レイアウトコンポーネント**
   - 共通のレイアウト構造
   - ナビゲーション
   - フッター

3. **UIコンポーネント**
   - 再利用可能なUI部品
   - スタイリング
   - インタラクション

### コンポーネントの作成

```typescript
import React from 'react';
import { useAuth } from '../utils/auth';

interface Props {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<Props> = ({ title, children }) => {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
};

export default Card;
```

## 状態管理

### グローバル状態

- Supabase Authを使用した認証状態
- ユーザー設定
- アプリケーション設定

### ローカル状態

- フォームの状態
- UIの表示/非表示
- ページネーション

## スタイリング

### Tailwind CSS

```typescript
// 例：ボタンコンポーネント
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary' }) => {
  const baseStyles = 'px-4 py-2 rounded font-medium';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]}`}>
      {children}
    </button>
  );
};
```

### カスタムスタイル

```css
/* styles/custom.css */
@layer components {
  .custom-input {
    @apply border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}
```

## データフェッチング

### Supabaseクライアント

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// データの取得
const fetchLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select('*');
  
  if (error) throw error;
  return data;
};
```

### SWRによるデータフェッチング

```typescript
import useSWR from 'swr';

const LocationsList = () => {
  const { data, error } = useSWR('locations', fetchLocations);

  if (error) return <div>エラーが発生しました</div>;
  if (!data) return <div>読み込み中...</div>;

  return (
    <ul>
      {data.map(location => (
        <li key={location.id}>{location.name}</li>
      ))}
    </ul>
  );
};
```

## フォーム処理

### React Hook Form

```typescript
import { useForm } from 'react-hook-form';

const LocationForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      await createLocation(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('name', { required: true })}
        className="custom-input"
      />
      {errors.name && <span>店舗名は必須です</span>}
      <button type="submit">保存</button>
    </form>
  );
};
```

## エラーハンドリング

### エラーバウンダリ

```typescript
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div role="alert">
    <p>エラーが発生しました:</p>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>再試行</button>
  </div>
);

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Routes />
  </ErrorBoundary>
);
```

## テスト

### コンポーネントテスト

```typescript
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### ユーティリティテスト

```typescript
import { formatDate } from '../utils/date';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2023-01-01');
    expect(formatDate(date)).toBe('2023/01/01');
  });
});
```

## パフォーマンス最適化

### コード分割

```typescript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>読み込み中...</div>,
});
```

### メモ化

```typescript
import { useMemo } from 'react';

const ExpensiveComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => heavyProcessing(item));
  }, [data]);

  return <div>{processedData}</div>;
};
```

## デプロイメント

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run start
```

## デバッグ

### 開発者ツール

- React Developer Tools
- Redux DevTools
- Networkタブ
- Consoleタブ

### ロギング

```typescript
const logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data),
};
``` 