import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

// バッチサイズとAPIリクエスト間の遅延（ミリ秒）
const BATCH_SIZE = 5;
const API_DELAY = 300;

// 同期処理関数
async function syncLocationReviews(placeId: string, locationId: string, locationName?: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/google-reviews/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        placeId,
        locationId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '不明なエラー');
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error: any) {
    logger.error(`Location ${locationId} sync error`, { error, locationId });
    return { 
      success: false, 
      error: error.message || 'レビュー同期に失敗しました' 
    };
  }
}

// 配列を指定したサイズのバッチに分割する関数
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

// 指定したミリ秒待機する関数
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = session.user.id;
    const { tenantId, failedLocations } = req.body;
    const retryFailed = req.query.retryFailed === 'true';

    // ユーザーのテナントIDが指定されていない場合は、ユーザーIDをテナントIDとして使用
    const targetTenantId = tenantId || userId;

    let locations;
    
    // 失敗した店舗のみを再試行する場合
    if (retryFailed && Array.isArray(failedLocations) && failedLocations.length > 0) {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, google_place_id')
        .in('id', failedLocations)
        .not('google_place_id', 'is', null);

      if (error) {
        return res.status(500).json({ error: '店舗情報の取得に失敗しました', details: error });
      }
      
      locations = data;
    } else {
      // 全ての店舗を取得
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, google_place_id')
        .eq('tenant_id', targetTenantId)
        .not('google_place_id', 'is', null);

      if (error) {
        return res.status(500).json({ error: '店舗情報の取得に失敗しました', details: error });
      }
      
      locations = data;
    }

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: '同期可能な店舗がありません' });
    }

    // 店舗をバッチに分割
    const batches = batchArray(locations, BATCH_SIZE);
    
    // 各店舗のレビューを同期
    const results = [];
    let successCount = 0;
    let failCount = 0;

    // バッチ処理
    for (const batch of batches) {
      // バッチ内の複数店舗を並列処理
      const batchResults = await Promise.all(
        batch.map(async (location) => {
          if (!location.google_place_id) {
            return {
              locationId: location.id,
              locationName: location.name,
              error: 'Google Place IDが設定されていません'
            };
          }

          const syncResult = await syncLocationReviews(
            location.google_place_id, 
            location.id,
            location.name
          );

          if (syncResult.success) {
            successCount++;
            return {
              locationId: location.id,
              locationName: location.name,
              placeId: location.google_place_id,
              result: syncResult.result
            };
          } else {
            failCount++;
            return {
              locationId: location.id,
              locationName: location.name,
              placeId: location.google_place_id,
              error: syncResult.error
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      // バッチ間で待機してAPI制限を回避
      if (batches.indexOf(batch) < batches.length - 1) {
        await wait(API_DELAY);
      }
    }

    // 同期履歴を記録
    await supabase
      .from('sync_logs')
      .insert({
        tenant_id: targetTenantId,
        total_locations: locations.length,
        successful_locations: successCount,
        failed_locations: failCount,
        sync_date: new Date().toISOString()
      });

    return res.status(200).json({
      success: true,
      totalLocations: locations.length,
      successfulLocations: successCount,
      failedLocations: failCount,
      results
    });
  } catch (error: any) {
    logger.error('Server error', { error });
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message || '不明なエラー'
    });
  }
} 