import { supabase } from '@/utils/supabase';
import { AuthError, AuthResponse, SignUpData, SignInData, ResetPasswordData, UpdatePasswordData, User } from '@/types/auth';
import { logError } from '@/utils/monitoring';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const signUpResult: any = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: 'user',
          },
        },
      });
      const user = signUpResult.user;
      const error = signUpResult.error;

      if (error) throw error;

      if (user) {
        // ユーザープロファイルの作成（オンボーディング未完了として設定）
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name: data.name,
          role: 'user',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return { user: this.transformUser(user), error: null };
    } catch (error) {
      await logError(error as Error, { action: 'signUp', email: data.email });
      return { user: null, error: this.handleError(error) };
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const signInResult: any = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      const user = signInResult.user;
      const error = signInResult.error;

      if (error) throw error;

      // 最終ログイン時間の更新
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      return { user: this.transformUser(user), error: null };
    } catch (error) {
      await logError(error as Error, { action: 'signIn', email: data.email });
      return { user: null, error: this.handleError(error) };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      await logError(error as Error, { action: 'signOut' });
      return { error: this.handleError(error) };
    }
  }

  async resetPassword(data: ResetPasswordData): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      await logError(error as Error, { action: 'resetPassword', email: data.email });
      return { error: this.handleError(error) };
    }
  }

  async updatePassword(data: UpdatePasswordData): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      await logError(error as Error, { action: 'updatePassword' });
      return { error: this.handleError(error) };
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user: this.transformUser(user), error: null };
    } catch (error) {
      await logError(error as Error, { action: 'getCurrentUser' });
      return { user: null, error: this.handleError(error) };
    }
  }

  private transformUser(user: any): User | null {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      emailVerified: user.email_confirmed_at != null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_sign_in_at,
      subscriptionStatus: user.user_metadata?.subscriptionStatus,
      subscriptionEndDate: user.user_metadata?.subscriptionEndDate,
    };
  }

  private handleError(error: any): AuthError {
    const authError = new Error(error.message) as AuthError;
    authError.code = error.code || 'AUTH_ERROR';
    authError.statusCode = error.status || 500;
    return authError;
  }
} 