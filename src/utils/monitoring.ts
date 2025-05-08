import { supabase } from './supabase';
import nodemailer from 'nodemailer';
import { NextApiRequest, NextApiResponse } from 'next';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

type ErrorLog = {
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, any>;
  severity: ErrorSeverity;
};

// メール送信用のトランスポーター設定
const createTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async () => ({ messageId: 'test-id' }),
    };
  }

  if (typeof window === 'undefined') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
};

// エラーの重要度を判定する関数
function determineErrorSeverity(error: Error): ErrorSeverity {
  // エラーの種類に基づく判定
  if (error instanceof TypeError || error instanceof ReferenceError) {
    return 'high';
  }

  // エラーコードに基づく判定
  const code = (error as any).code;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return 'high';
  }

  // ステータスコードに基づく判定
  const statusCode = (error as any).statusCode;
  if (statusCode) {
    if (statusCode >= 500) return 'high';
    if (statusCode >= 400) return 'medium';
  }

  // エラーメッセージに基づく判定
  const message = error.message.toLowerCase();
  if (message.includes('critical') || message.includes('fatal')) {
    return 'critical';
  }
  if (message.includes('error') || message.includes('failed')) {
    return 'medium';
  }
  if (message.includes('warning') || message.includes('invalid')) {
    return 'medium';
  }

  // デフォルトの重要度
  return 'medium';
}

// エラーログを記録する関数
async function logError(error: Error, context?: Record<string, any>, severity?: ErrorSeverity) {
  const determinedSeverity = severity || determineErrorSeverity(error);
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
    context,
    severity: determinedSeverity,
  };

  // エラーログをデータベースに保存
  await supabase.from('error_logs').insert(errorLog);

  // 重要度が高い場合は管理者に通知
  if (determinedSeverity === 'high' || determinedSeverity === 'critical') {
    await notifyAdmin(errorLog);
  }
}

// 管理者に通知を送信する関数
async function notifyAdmin(errorLog: ErrorLog) {
  if (!process.env.ADMIN_EMAIL || typeof window !== 'undefined') return;

  const transporter = createTransporter();
  if (!transporter) return;

  const subject = `[${errorLog.severity.toUpperCase()}] Error Alert`;
  const text = `
Error Details:
Name: ${errorLog.error.name}
Message: ${errorLog.error.message}
Code: ${errorLog.error.code || 'N/A'}
Timestamp: ${errorLog.timestamp}
Severity: ${errorLog.severity}

Context:
${JSON.stringify(errorLog.context, null, 2)}

Stack Trace:
${errorLog.error.stack || 'N/A'}
`;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL,
    subject,
    text,
  });
}

// エラーモニタリングミドルウェア
function errorMonitoringMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 8);

    try {
      await handler(req, res);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // エラーログを記録
      await logError(error, {
        requestId,
        method: req.method,
        path: req.url,
        userId: req.user?.id,
        duration,
      });

      // エラーレスポンスを返す
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code || 'INTERNAL_ERROR',
        requestId,
      });
    }
  };
}

export { errorMonitoringMiddleware, logError }; 