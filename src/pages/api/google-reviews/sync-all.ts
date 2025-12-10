import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
// @ts-ignore
import { google } from 'googleapis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // トークン情報を取得
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('tenant_id', session.user.id)
      .single();

    if (tokenError || !tokenData) {
      return res.status(401).json({ error: 'Google認証が必要です' });
    }

    // トークンの有効期限をチェック
    const now = new Date();
    const expiryDate = new Date(tokenData.expiry_date);
    if (now >= expiryDate) {
      return res.status(401).json({ error: 'Google認証の有効期限が切れています。再認証してください。' });
    }

    // ユーザーの全店舗を取得
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, google_place_id')
      .eq('tenant_id', session.user.id);

    if (locationsError) {
      return res.status(500).json({ error: '店舗情報の取得に失敗しました' });
    }

    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: '店舗が登録されていません' });
    }

    // Google API クライアント設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });

    // アカウント一覧を取得
    let accounts;
    try {
      const accountsResponse = await mybusiness.accounts.list();
      accounts = accountsResponse.data.accounts || [];
    } catch (apiError: any) {
      console.error('Google API アカウント取得エラー:', apiError);
      return res.status(500).json({
        error: 'Google Business Profileアカウントの取得に失敗しました',
        details: apiError.message
      });
    }

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Google Business Profileアカウントが見つかりません' });
    }

    // 各店舗のレビューを同期
    const results = [];
    let totalReviews = 0;

    for (const location of locations) {
      if (!location.google_place_id) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: 'Google Place IDが設定されていません'
        });
        continue;
      }

      try {
        // Google Business Profile APIで店舗情報を確認
        const mybusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });
        const accountName = accounts[0].name;

        const locationsResponse = await mybusinessInfo.accounts.locations.list({
          parent: accountName!,
          readMask: 'name,title,metadata',
        });

        const googleLocations = locationsResponse.data.locations || [];
        const matchingLocation = googleLocations.find(
          (loc: any) => loc.metadata?.placeId === location.google_place_id
        );

        if (!matchingLocation) {
          results.push({
            locationId: location.id,
            locationName: location.name,
            success: false,
            error: 'Google Business Profileで店舗が見つかりません'
          });
          continue;
        }

        // TODO: 実際のレビュー取得実装
        // 現時点ではAPIの設定確認のみ
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: true,
          googleLocation: matchingLocation.title,
          reviewsCount: 0,
          note: 'レビュー取得機能は開発中です'
        });

      } catch (locationError: any) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: locationError.message || '店舗情報の取得に失敗しました'
        });
      }
    }

    // 同期結果を返す
    res.status(200).json({
      success: true,
      message: `${locations.length}件の店舗を確認しました`,
      totalReviews,
      results,
      note: 'レビュー取得機能は現在開発中です。Google Business Profile APIの追加設定が必要です。'
    });
  } catch (error: any) {
    console.error('Google Reviewの一括同期エラー:', error);
    res.status(500).json({
      error: 'レビューの同期中にエラーが発生しました',
      details: error.message
    });
  }
}
