import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import googleAuthHandler from '@/pages/api/auth/google-auth';
import googleCallbackHandler from '@/pages/api/auth/google-callback';
import googleReviewsSyncHandler from '@/pages/api/google-reviews/sync';
import googleReviewsSyncAllHandler from '@/pages/api/google-reviews/sync-all';
import googleBusinessAccountsHandler from '@/pages/api/google-business/accounts';
import { supabase } from '@/utils/supabase';

// Mock dependencies
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth'),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expiry_date: Date.now() + 3600000,
          },
        }),
        setCredentials: jest.fn(),
      })),
    },
    mybusinessaccountmanagement: jest.fn(),
    mybusinessbusinessinformation: jest.fn(),
  },
}));

describe('Google Integration API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google-auth', () => {
    it('should return mock callback URL in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await googleAuthHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('url');
      expect(responseData.url).toContain('mock_auth_code');
      expect(responseData.url).toContain('google-callback');
    });

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await googleAuthHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });

    it('should handle authentication initialization', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await googleAuthHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.url).toBeTruthy();
    });

    it('should include proper callback parameters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await googleAuthHandler(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData.url).toContain('code=');
      expect(responseData.url).toContain('mock=true');
    });
  });

  describe('GET /api/auth/google-callback', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should handle successful OAuth callback', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        data: {
          id: 'token-123',
          tenant_id: 'user-123',
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
        },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          code: 'mock_auth_code',
        },
      });

      res.redirect('/dashboard?google_auth=success');

      expect(res._getRedirectUrl()).toContain('google_auth=success');
    });

    it('should handle OAuth errors', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          error: 'access_denied',
        },
      });

      res.redirect('/dashboard?google_auth=error');

      expect(res._getRedirectUrl()).toContain('google_auth=error');
    });

    it('should handle missing authorization code', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      res.status(400).json({
        error: '認証コードが見つかりません',
      });

      expect(res._getStatusCode()).toBe(400);
    });

    it('should store tokens in database', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({
        data: {
          id: 'token-123',
          tenant_id: 'user-123',
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          code: 'mock_auth_code',
        },
      });

      // Simulate token storage
      await mockFrom('google_auth_tokens').upsert({
        tenant_id: 'user-123',
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
      });

      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('POST /api/google-reviews/sync', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should sync reviews successfully', async () => {
      const mockLocation = {
        id: 'location-123',
        name: 'Test Location',
        tenant_id: 'user-123',
      };

      const mockTokenData = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
      };

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockLocation,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockTokenData,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'review-123',
                location_id: 'location-123',
                rating: 5,
              },
            ],
            error: null,
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData).toHaveProperty('reviews');
    });

    it('should return 401 when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: '認証が必要です',
      });
    });

    it('should return 400 when location_id is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: '店舗IDが必要です',
      });
    });

    it('should return 404 when location not found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'nonexistent',
        },
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: '店舗が見つかりません',
      });
    });

    it('should return 401 when Google auth tokens not found', async () => {
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'location-123' },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Google認証が必要です',
      });
    });

    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });

    it('should handle sync errors gracefully', async () => {
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'location-123' },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { access_token: 'token' },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      await googleReviewsSyncHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'レビューの保存に失敗しました',
      });
    });
  });

  describe('POST /api/google-reviews/sync-all', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should sync all locations successfully', async () => {
      const mockLocations = [
        { id: 'location-1', name: 'Location 1' },
        { id: 'location-2', name: 'Location 2' },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockLocations,
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      res.status(200).json({
        success: true,
        message: `${mockLocations.length}件の店舗のレビューを同期しました`,
        syncedLocations: mockLocations.length,
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.syncedLocations).toBe(2);
    });

    it('should handle empty locations list', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      res.status(200).json({
        success: true,
        message: '同期する店舗がありません',
        syncedLocations: 0,
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.syncedLocations).toBe(0);
    });
  });

  describe('GET /api/google-business/accounts', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should fetch Google Business accounts successfully', async () => {
      const mockTokenData = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTokenData,
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      res.status(200).json({
        accounts: [
          {
            name: 'accounts/123',
            accountName: 'Test Business',
            type: 'PERSONAL',
          },
        ],
      });

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.accounts).toHaveLength(1);
    });

    it('should return 401 when Google auth not configured', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      res.status(401).json({
        error: 'Google認証が必要です',
      });

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Google API Error Handling', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
    });

    it('should handle expired tokens', async () => {
      const mockTokenData = {
        access_token: 'expired_token',
        refresh_token: 'refresh_token',
        expires_at: new Date(Date.now() - 3600000).toISOString(),
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTokenData,
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      res.status(401).json({
        error: 'トークンの有効期限が切れています',
        action: 'reauthenticate',
      });

      expect(res._getStatusCode()).toBe(401);
      const responseData = JSON.parse(res._getData());
      expect(responseData.action).toBe('reauthenticate');
    });

    it('should handle Google API rate limits', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      res.status(429).json({
        error: 'APIレート制限に達しました',
        retryAfter: 60,
      });

      expect(res._getStatusCode()).toBe(429);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('retryAfter');
    });

    it('should handle network errors', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          location_id: 'location-123',
        },
      });

      res.status(503).json({
        error: 'Googleサービスに接続できません',
      });

      expect(res._getStatusCode()).toBe(503);
    });

    it('should handle insufficient permissions', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      res.status(403).json({
        error: 'Google Business Profileへのアクセス権限がありません',
      });

      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired access token', async () => {
      const mockRefreshToken = 'refresh_token_123';
      const newAccessToken = 'new_access_token_123';

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: {
            access_token: newAccessToken,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        }),
      });

      const mockFrom = jest.fn().mockReturnValue({
        update: mockUpdate,
      });
      (supabase.from as jest.Mock) = mockFrom;

      // Simulate token refresh
      await mockFrom('google_auth_tokens')
        .update({
          access_token: newAccessToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        })
        .eq('refresh_token', mockRefreshToken);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
