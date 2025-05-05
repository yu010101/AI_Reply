import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';

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
    const { tenantId } = req.body;

    // ユーザーのテナントIDが指定されていない場合は、ユーザーIDをテナントIDとして使用
    const targetTenantId = tenantId || userId;

    // テナントに所属する店舗を取得
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, google_place_id')
      .eq('tenant_id', targetTenantId)
      .not('google_place_id', 'is', null);

    if (locationsError) {
      return res.status(500).json({ error: '店舗情報の取得に失敗しました', details: locationsError });
    }

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: '同期可能な店舗がありません' });
    }

    // 各店舗のレビューを同期
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const location of locations) {
      try {
        if (!location.google_place_id) continue;

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/google-reviews/fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            placeId: location.google_place_id,
            locationId: location.id
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
        
        results.push({
          locationId: location.id,
          placeId: location.google_place_id,
          result
        });
      } catch (error) {
        console.error(`Location ${location.id} sync error:`, error);
        failCount++;
        results.push({
          locationId: location.id,
          placeId: location.google_place_id,
          error: 'レビュー同期に失敗しました'
        });
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
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
} 