import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface User {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[useAuth] 認証状態を確認中...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[useAuth] セッション情報:', { session, error });
        
        if (error) throw error;

        if (session?.user) {
          console.log('[useAuth] ユーザー情報を設定:', session.user);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            tenantId: session.user.id,
            role: 'user',
          });
        }
      } catch (err) {
        console.error('[useAuth] 認証チェックエラー:', err);
        setError('認証に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useAuth] 認証状態変更:', { event: _event, session });
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          tenantId: session.user.id,
          role: 'user',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('[useAuth] ログイン試行:', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[useAuth] ログイン結果:', { data, error });

      if (error) throw error;

      if (data.user) {
        console.log('[useAuth] ユーザー情報を設定:', data.user);
        setUser({
          id: data.user.id,
          email: data.user.email!,
          tenantId: data.user.id,
          role: 'user',
        });
      }

      return { success: true };
    } catch (err) {
      console.error('[useAuth] ログインエラー:', err);
      setError('ログインに失敗しました');
      return { success: false, error: 'ログインに失敗しました' };
    }
  };

  const logout = async () => {
    try {
      console.log('[useAuth] ログアウト試行');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      console.log('[useAuth] ログアウト成功');
    } catch (err) {
      console.error('[useAuth] ログアウトエラー:', err);
      setError('ログアウトに失敗しました');
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
  };
}; 