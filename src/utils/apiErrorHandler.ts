/**
 * 統一されたAPIエラーハンドリングユーティリティ
 * 
 * すべてのAPIエンドポイントで統一されたエラーレスポンス形式を提供します。
 */

import { NextApiResponse } from 'next';
import { logger } from './logger';

export enum ApiErrorCode {
  // 認証・認可エラー (401-403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // バリデーションエラー (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // リソースエラー (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // サーバーエラー (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // レート制限エラー (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // その他
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    code: ApiErrorCode | string,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Errorクラスのスタックトレースを保持
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * エラーレスポンスを送信
 */
export function sendErrorResponse(
  res: NextApiResponse,
  error: Error | ApiError,
  logError: boolean = true
): void {
  // ログ出力（本番環境では機密情報をマスク）
  if (logError) {
    if (error instanceof ApiError) {
      logger.error(`API Error: ${error.code}`, {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });
    } else {
      logger.errorWithStack(error, {
        context: 'API Error Handler',
      });
    }
  }
  
  // ApiErrorの場合はそのまま使用
  if (error instanceof ApiError) {
    const response: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: process.env.NODE_ENV === 'production' ? undefined : error.details,
        timestamp: new Date().toISOString(),
      },
    };
    
    res.status(error.statusCode).json(response);
    return;
  }
  
  // 一般的なエラーの場合
  const statusCode = 500;
  const response: ApiErrorResponse = {
    error: {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'サーバーエラーが発生しました' 
        : error.message,
      details: process.env.NODE_ENV === 'production' ? undefined : {
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    },
  };
  
  res.status(statusCode).json(response);
}

/**
 * エラーハンドリングミドルウェア
 * 
 * 使用例:
 * ```typescript
 * export default async function handler(
 *   req: NextApiRequest,
 *   res: NextApiResponse
 * ) {
 *   try {
 *     // API処理
 *   } catch (error) {
 *     return handleApiError(res, error);
 *   }
 * }
 * ```
 */
export function handleApiError(
  res: NextApiResponse,
  error: unknown
): void {
  if (error instanceof ApiError) {
    sendErrorResponse(res, error);
    return;
  }
  
  if (error instanceof Error) {
    sendErrorResponse(res, error);
    return;
  }
  
  // 未知のエラー
  sendErrorResponse(
    res,
    new ApiError(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      '予期しないエラーが発生しました',
      500,
      { originalError: String(error) }
    )
  );
}

/**
 * 認証エラー
 */
export function createUnauthorizedError(message: string = '認証が必要です'): ApiError {
  return new ApiError(ApiErrorCode.UNAUTHORIZED, message, 401);
}

/**
 * 認可エラー
 */
export function createForbiddenError(message: string = 'アクセスが拒否されました'): ApiError {
  return new ApiError(ApiErrorCode.FORBIDDEN, message, 403);
}

/**
 * バリデーションエラー
 */
export function createValidationError(
  message: string,
  details?: any
): ApiError {
  return new ApiError(ApiErrorCode.VALIDATION_ERROR, message, 400, details);
}

/**
 * リソースが見つからないエラー
 */
export function createNotFoundError(
  resource: string = 'リソース',
  message?: string
): ApiError {
  return new ApiError(
    ApiErrorCode.NOT_FOUND,
    message || `${resource}が見つかりません`,
    404
  );
}

/**
 * メソッドが許可されていないエラー
 */
export function createMethodNotAllowedError(
  allowedMethods: string[],
  receivedMethod: string
): ApiError {
  return new ApiError(
    ApiErrorCode.METHOD_NOT_ALLOWED,
    `メソッド ${receivedMethod} は許可されていません。許可されているメソッド: ${allowedMethods.join(', ')}`,
    405,
    { allowedMethods, receivedMethod }
  );
}

/**
 * レート制限エラー
 */
export function createRateLimitError(
  retryAfter?: number
): ApiError {
  return new ApiError(
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    'レート制限に達しました。しばらく待ってから再試行してください。',
    429,
    retryAfter ? { retryAfter } : undefined
  );
}

/**
 * データベースエラー
 */
export function createDatabaseError(
  message: string = 'データベースエラーが発生しました',
  details?: any
): ApiError {
  return new ApiError(ApiErrorCode.DATABASE_ERROR, message, 500, details);
}

/**
 * 外部サービスエラー
 */
export function createExternalServiceError(
  serviceName: string,
  message?: string
): ApiError {
  return new ApiError(
    ApiErrorCode.EXTERNAL_SERVICE_ERROR,
    message || `${serviceName}との通信に失敗しました`,
    502,
    { serviceName }
  );
}
