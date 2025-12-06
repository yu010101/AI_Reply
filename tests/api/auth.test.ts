import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import loginHandler from '@/pages/api/auth/login';
import signupHandler from '@/pages/api/auth/signup';
import { AuthService } from '@/services/auth';
import { supabase } from '@/utils/supabase';

// Mock dependencies
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/utils/security', () => ({
  securityMiddleware: (handler: any) => handler,
}));

jest.mock('@/utils/monitoring', () => ({
  errorMonitoringMiddleware: (handler: any) => handler,
  logError: jest.fn(),
}));

jest.mock('@/services/auth');

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { role: 'user' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_sign_in_at: '2024-01-01T00:00:00Z',
        email_confirmed_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        token: mockSession.access_token,
        user: mockUser,
      });
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return 400 when email is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password123',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'メールアドレスとパスワードは必須です',
        error: 'Missing credentials',
      });
    });

    it('should return 400 when password is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'メールアドレスとパスワードは必須です',
        error: 'Missing credentials',
      });
    });

    it('should return 401 with invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toMatchObject({
        message: '認証に失敗しました',
        error: 'Invalid login credentials',
      });
    });

    it('should return 401 when session is not created', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'セッションが作成できませんでした',
        error: 'No session created',
      });
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Method not allowed',
      });
    });

    it('should return 500 on unexpected errors', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toMatchObject({
        message: 'サーバーエラーが発生しました',
        error: 'Database connection failed',
      });
    });
  });

  describe('POST /api/auth/signup', () => {
    let mockAuthService: jest.Mocked<AuthService>;

    beforeEach(() => {
      mockAuthService = {
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
        updatePassword: jest.fn(),
        getCurrentUser: jest.fn(),
      } as any;

      (AuthService.getInstance as jest.Mock).mockReturnValue(mockAuthService);
    });

    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        role: 'user' as const,
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockAuthService.signUp.mockResolvedValue({
        user: mockUser,
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        },
      });

      await signupHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toEqual({
        user: mockUser,
      });
      expect(mockAuthService.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });
    });

    it('should return 400 when email already exists', async () => {
      const mockError = {
        message: 'User already registered',
        code: 'user_already_exists',
        statusCode: 400,
      };

      mockAuthService.signUp.mockResolvedValue({
        user: null,
        error: mockError as any,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        },
      });

      await signupHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'User already registered',
      });
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await signupHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });

    it('should handle service errors gracefully', async () => {
      mockAuthService.signUp.mockRejectedValue(new Error('Service unavailable'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await signupHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
      // Reset the singleton instance for testing
      (AuthService as any).instance = undefined;
      authService = AuthService.getInstance();
      jest.clearAllMocks();
    });

    describe('signUp', () => {
      it('should create user and profile successfully', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        (supabase.auth.signUp as jest.Mock).mockResolvedValue({
          user: mockUser,
          error: null,
        });

        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        const result = await authService.signUp({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

        expect(result.error).toBeNull();
        expect(result.user).toBeTruthy();
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: {
              name: 'Test User',
              role: 'user',
            },
          },
        });
        expect(mockFrom).toHaveBeenCalledWith('profiles');
      });
    });

    describe('signIn', () => {
      it('should sign in user and update last login', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
          user: mockUser,
          error: null,
        });

        const mockUpdate = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const mockFrom = jest.fn().mockReturnValue({
          update: mockUpdate,
        });
        (supabase.from as jest.Mock) = mockFrom;

        const result = await authService.signIn({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(result.error).toBeNull();
        expect(result.user).toBeTruthy();
        expect(mockFrom).toHaveBeenCalledWith('profiles');
        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    describe('resetPassword', () => {
      it('should send password reset email', async () => {
        (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
          error: null,
        });

        const result = await authService.resetPassword({
          email: 'test@example.com',
        });

        expect(result.error).toBeNull();
        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/reset-password'),
          })
        );
      });

      it('should handle errors when sending reset email', async () => {
        (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
          error: { message: 'User not found', code: 'user_not_found' },
        });

        const result = await authService.resetPassword({
          email: 'nonexistent@example.com',
        });

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toBe('User not found');
      });
    });

    describe('signOut', () => {
      it('should sign out user successfully', async () => {
        (supabase.auth.signOut as jest.Mock).mockResolvedValue({
          error: null,
        });

        const result = await authService.signOut();

        expect(result.error).toBeNull();
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });
    });

    describe('getCurrentUser', () => {
      it('should return current authenticated user', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-01-01T00:00:00Z',
          user_metadata: {
            role: 'user',
          },
        };

        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const result = await authService.getCurrentUser();

        expect(result.error).toBeNull();
        expect(result.user).toBeTruthy();
        expect(result.user?.id).toBe('user-123');
        expect(result.user?.email).toBe('test@example.com');
      });

      it('should return null user when not authenticated', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        });

        const result = await authService.getCurrentUser();

        expect(result.user).toBeNull();
        expect(result.error).toBeTruthy();
      });
    });
  });
});
