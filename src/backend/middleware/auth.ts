import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  token: string;
  created_at: Date;
  updated_at: Date;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: '認証トークンが必要です' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '認証トークンが無効です' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      tenantId: string;
      email: string;
      role: string;
    };

    // ユーザーの存在確認
    const user = await db.query(
      'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
      [decoded.id, decoded.tenantId]
    );

    if (!user.rows[0]) {
      return res.status(401).json({ error: 'ユーザーが見つかりません' });
    }

    req.user = {
      ...decoded,
      token,
      created_at: user.rows[0].created_at,
      updated_at: user.rows[0].updated_at,
    };
    next();
  } catch (error) {
    console.error('認証エラー:', error);
    return res.status(401).json({ error: '認証に失敗しました' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '権限がありません' });
    }

    next();
  };
}; 