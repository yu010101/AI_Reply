import { Request, Response } from 'express';
import { ErrorResponse } from '../types';
import rateLimit from 'express-rate-limit';

// レート制限の設定
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分間
  max: (req: Request) => {
    // 認証済みユーザーは100リクエスト/分
    if (req.user) {
      return 100;
    }
    // 未認証ユーザーは10リクエスト/分
    return 10;
  },
  handler: (_req: Request, res: Response) => {
    const errorResponse: ErrorResponse = {
      error: {
        code: '429',
        message: 'リクエスト制限を超えました。しばらく待ってから再度お試しください。'
      }
    };
    res.status(429).json(errorResponse);
  }
}); 