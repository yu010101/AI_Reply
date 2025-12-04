import { NextApiRequest, NextApiResponse } from 'next';
import { errorMonitoringMiddleware, logError } from '../monitoring';
import { supabase } from '../supabase';
import nodemailer from 'nodemailer';

// モックの設定
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

// 環境変数の設定
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.NODE_ENV = 'test';

describe('Error Monitoring', () => {
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
      user: { id: 'test-user-id' },
      headers: {
        'user-agent': 'test-user-agent',
        'content-type': 'application/json',
      },
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Logging', () => {
    it('should log error with default severity', async () => {
      const error = new Error('Test error');
      await logError(error, { test: 'context' });

      expect(supabase.from).toHaveBeenCalledWith('error_logs');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        },
        context: { test: 'context' },
        severity: 'medium',
      }));
    });

    it('should log error with custom severity', async () => {
      const error = new Error('Critical error');
      await logError(error, { test: 'context' }, 'critical');

      expect(supabase.from).toHaveBeenCalledWith('error_logs');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'critical',
      }));
    });
  });

  describe('Admin Notification', () => {
    it('should send notification for high severity errors', async () => {
      const error = new TypeError('High severity error');
      await logError(error, { test: 'context' });

      expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('HIGH'),
          to: process.env.ADMIN_EMAIL,
        })
      );
    });

    it('should not send notification for low severity errors', async () => {
      const error = new Error('Low severity error');
      await logError(error, { test: 'context' }, 'low');

      expect(nodemailer.createTransport().sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Error Monitoring Middleware', () => {
    it('should handle successful request', async () => {
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        res.status(200).json({ success: true });
      };

      const wrappedHandler = errorMonitoringMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // 成功時はエラーログは記録されないが、SentryのsetContextは呼ばれる
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    });

    it('should handle error and log it', async () => {
      const error = new Error('Test error');
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        throw error;
      };

      const wrappedHandler = errorMonitoringMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(supabase.from).toHaveBeenCalledWith('error_logs');
      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        error: {
          name: 'Error',
          message: 'Test error',
        },
        context: expect.objectContaining({
          path: '/api/test',
          method: 'POST',
          userId: 'test-user-id',
        }),
      }));
    });

    it('should include request ID in error response', async () => {
      const error = new Error('Test error');
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        throw error;
      };

      const wrappedHandler = errorMonitoringMiddleware(handler);
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Test error',
        code: 'INTERNAL_ERROR',
        requestId: expect.any(String),
      }));
    });
  });

  describe('Error Severity Determination', () => {
    it('should set high severity for TypeError', async () => {
      const error = new TypeError('Type error');
      await logError(error);

      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'high',
      }));
    });

    it('should set medium severity for 400 status code', async () => {
      const error = new Error('Bad request');
      (error as any).statusCode = 400;
      await logError(error);

      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'medium',
      }));
    });

    it('should set high severity for 500 status code', async () => {
      const error = new Error('Server error');
      (error as any).statusCode = 500;
      await logError(error);

      expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'high',
      }));
    });
  });
}); 