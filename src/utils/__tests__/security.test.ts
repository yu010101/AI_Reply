import { NextApiRequest, NextApiResponse } from 'next';
import { securityMiddleware } from '../security';
import { supabase } from '../supabase';

// モックの設定
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

describe('Security Middleware', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
      end: jest.fn(),
      statusCode: 200,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Logging', () => {
    it('should log successful request', async () => {
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      };

      const wrappedHandler = securityMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('security_logs');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ip: '127.0.0.1',
        method: 'POST',
        path: '/api/test',
        status: 200,
        userAgent: 'test-agent',
      }));
    });

    it('should log failed request', async () => {
      const error = new Error('Test error');
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        throw error;
      };

      const wrappedHandler = securityMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('security_logs');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ip: '127.0.0.1',
        method: 'POST',
        path: '/api/test',
        status: 500,
        userAgent: 'test-agent',
        error: 'Test error',
      }));
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      };

      // レート制限を超えるリクエストをシミュレート
      const wrappedHandler = securityMiddleware(handler);
      for (let i = 0; i < 101; i++) {
        await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      }

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      (supabase.insert as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      };

      const wrappedHandler = securityMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to log security event:',
        expect.any(Error)
      );
    });
  });
}); 