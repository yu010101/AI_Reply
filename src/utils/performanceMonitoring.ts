import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';
import { supabase } from './supabase';

// パフォーマンスメトリクスの型定義
interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: string;
  userId?: string;
}

// パフォーマンスメトリクスを記録する関数
export async function recordPerformanceMetric(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  userId?: string
) {
  try {
    const metric: PerformanceMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      userId,
    };

    // データベースに保存（performance_metricsテーブルが存在する場合）
    // テーブルが存在しない場合はログのみ記録
    try {
      await supabase.from('performance_metrics').insert(metric);
    } catch (dbError: any) {
      // テーブルが存在しない場合はログのみ記録
      if (dbError.code !== '42P01') { // 42P01: テーブルが存在しない
        logger.error('パフォーマンスメトリクスの保存に失敗', { error: dbError });
      }
    }

    // レスポンスタイムが長い場合は警告ログ（閾値を10秒に引き上げ）
    if (duration > 10000) {
      logger.warn('レスポンスタイムが長い', {
        endpoint,
        method,
        duration,
        statusCode,
      });
    }

    // レスポンスタイムが非常に長い場合はエラーログ（閾値を30秒に引き上げ）
    if (duration > 30000) {
      logger.error('レスポンスタイムが非常に長い', {
        endpoint,
        method,
        duration,
        statusCode,
      });
    }
  } catch (error) {
    logger.error('パフォーマンスメトリクスの記録に失敗', { error });
  }
}

// パフォーマンス監視ミドルウェア
export function performanceMonitoringMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const endpoint = req.url || 'unknown';
    const method = req.method || 'unknown';

    // レスポンス終了時にメトリクスを記録
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any): NextApiResponse {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // 非同期でメトリクスを記録（レスポンスをブロックしない）
      recordPerformanceMetric(
        endpoint,
        method,
        duration,
        statusCode,
        (req as any).user?.id
      ).catch(error => {
        logger.error('パフォーマンスメトリクスの記録に失敗', { error });
      });

      // 元のendメソッドを呼び出し
      return originalEnd(chunk, encoding);
    } as any;

    return handler(req, res);
  };
}

// データベース接続数の監視（Supabaseの場合は接続プールの状態を確認）
export async function checkDatabaseConnections() {
  try {
    // Supabaseの接続状態を確認
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) {
      logger.error('データベース接続エラー', { error });
      return {
        healthy: false,
        error: error.message,
      };
    }

    return {
      healthy: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('データベース接続チェックに失敗', { error });
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ヘルスチェックエンドポイント用の関数
export async function getHealthStatus() {
  const dbStatus = await checkDatabaseConnections();

  return {
    status: dbStatus.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus.healthy ? 'ok' : 'error',
    },
    ...(dbStatus.error && { error: dbStatus.error }),
  };
}
