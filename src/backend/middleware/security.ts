import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { AuthUser, TokenPayload } from '../types/auth';
import { db } from '../database';
import { ErrorResponse } from '../types';
import xss from 'xss';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// レート制限の設定（環境変数で上書き可能）
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || String(60 * 1000)), // デフォルト1分
  max: parseInt(process.env.RATE_LIMIT_API_MAX || '200'), // デフォルト200リクエスト/分
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // RateLimit-* ヘッダーを返す
  legacyHeaders: false, // X-RateLimit-* ヘッダーを無効化
});

// 認証ミドルウェア
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({
        error: {
          code: '401',
          message: '認証が必要です'
        }
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    const result = await db.query<AuthUser>(
      'SELECT * FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      res.status(401).json({
        error: {
          code: '401',
          message: 'ユーザーが見つかりません'
        }
      });
      return;
    }

    const user = result.rows[0];
    req.user = {
      ...user,
      token
    };
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: '401',
        message: '認証に失敗しました'
      }
    });
  }
};

// テナントミドルウェア
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant access required' });
      return;
    }

    // テナントの存在確認
    const result = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (!result.rows[0]) {
      res.status(403).json({ error: 'Invalid tenant' });
      return;
    }

    req.tenant = result.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 権限チェックミドルウェア
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({
        error: {
          code: '403',
          message: 'アクセス権限がありません'
        }
      });
      return;
    }
    next();
  };
};

// CORS設定
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// CSRFトークンの検証
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.cookies['csrf-token'];

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    const errorResponse: ErrorResponse = {
      error: {
        code: '403',
        message: 'CSRFトークンが無効です'
      }
    };
    res.status(403).json(errorResponse);
    return;
  }

  next();
};

// XSS対策
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }

  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key] as string);
      }
    });
  }

  next();
}; 