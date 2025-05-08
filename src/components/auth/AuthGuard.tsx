import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [allowAccess, setAllowAccess] = useState(false);

  console.log('[AuthGuard] isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // 認証状態の詳細ログ
  useEffect(() => {
    console.log('[AuthGuard詳細] 認証状態変更:', { 
      isAuthenticated, 
      isLoading, 
      hasUser: Boolean(user),
      userId: user?.id,
      pathname: router.pathname,
      timestamp: new Date().toISOString()
    });

    // ローカルストレージの検証（認証と連携）
    try {
      if (typeof window !== 'undefined') {
        const authData = localStorage.getItem('supabase.auth.token');
        const mockData = localStorage.getItem('mockGoogleAuthToken');
        
        console.log('[AuthGuard詳細] ストレージ状態:', {
          hasAuthData: Boolean(authData),
          authDataLength: authData ? authData.length : 0,
          hasMockData: Boolean(mockData),
          mockDataLength: mockData ? mockData.length : 0
        });
        
        // 開発環境の場合は常にアクセスを許可する（オプション）
        if (process.env.NODE_ENV === 'development') {
          const devParam = router.query.dev === 'true';
          const fromCallback = router.query.google_auth === 'success';
          
          if (devParam || fromCallback) {
            console.log('[AuthGuard詳細] 開発環境のため認証をバイパスします');
            setAllowAccess(true);
          }
        }
      }
    } catch (error) {
      console.error('[AuthGuard詳細] ストレージ検証エラー:', error);
    }
  }, [isAuthenticated, isLoading, user, router.pathname, router.query]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('[AuthGuard詳細] 認証済み、現在のページ:', router.pathname);
        setAllowAccess(true);
      } else if (process.env.NODE_ENV === 'development' && (router.pathname.includes('/settings') || router.pathname.includes('/dashboard'))) {
        // 開発環境の場合、特定のページで認証をバイパス
        console.log('[AuthGuard詳細] 開発環境のため認証をバイパスします (特定ページ)');
        setAllowAccess(true);
      } else {
        console.log('[AuthGuard詳細] 未認証のためログインページへリダイレクト');
        router.push('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated || allowAccess ? <>{children}</> : null;
}; 