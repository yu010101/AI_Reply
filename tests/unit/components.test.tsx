import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import Navigation from '@/components/layout/Navigation';
import ReplyTemplateManager from '@/components/reply/ReplyTemplateManager';

// モックの設定
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    push: jest.fn(),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    signOut: jest.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));

describe('Layout Component', () => {
  it('レイアウトコンポーネントが正しくレンダリングされる', () => {
    render(
      <AuthProvider>
        <Layout>
          <div data-testid="test-content">テストコンテンツ</div>
        </Layout>
      </AuthProvider>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
});

describe('Navigation Component', () => {
  it('ナビゲーションコンポーネントが正しくレンダリングされる', () => {
    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    expect(screen.getByText('RevAI Concierge')).toBeInTheDocument();
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('レビュー管理')).toBeInTheDocument();
    expect(screen.getByText('AI返信')).toBeInTheDocument();
    expect(screen.getByText('請求・プラン')).toBeInTheDocument();
    expect(screen.getByText('ログアウト')).toBeInTheDocument();
  });
});

describe('ReplyTemplateManager Component', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
  });

  it('返信テンプレート管理コンポーネントが正しくレンダリングされる', () => {
    render(
      <AuthProvider>
        <ReplyTemplateManager />
      </AuthProvider>
    );

    expect(screen.getByText('返信テンプレート管理')).toBeInTheDocument();
    expect(screen.getByText('テンプレート追加')).toBeInTheDocument();
  });
}); 