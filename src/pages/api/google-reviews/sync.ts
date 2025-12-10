import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
// @ts-ignore
import { google } from 'googleapis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 認証済みユーザーかチェック
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // リクエストボディからlocation_idを取得
    const { location_id } = req.body;
    if (!location_id) {
      return res.status(400).json({ error: '店舗IDが必要です' });
    }

    // 店舗情報を取得
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', location_id)
      .eq('tenant_id', session.user.id)
      .single();

    if (locationError || !location) {
      return res.status(404).json({ error: '店舗が見つかりません' });
    }

    // Google Place IDが設定されているか確認
    if (!location.google_place_id) {
      return res.status(400).json({ error: 'Google Place IDが設定されていません' });
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

    // Google My Business APIでレビューを取得
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
    const accountsResponse = await mybusiness.accounts.list();
    const accounts = accountsResponse.data.accounts || [];

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Google Business Profileアカウントが見つかりません' });
    }

    // レビューを取得（最初のアカウントを使用）
    const accountName = accounts[0].name;

    // Google Business Profile APIでレビューを取得
    const mybusinessInfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });

    // ロケーション一覧からマッチするものを探す
    const locationsResponse = await mybusinessInfo.accounts.locations.list({
      parent: accountName!,
      readMask: 'name,title,metadata',
    });

    const googleLocations = locationsResponse.data.locations || [];
    const matchingLocation = googleLocations.find(
      (loc: any) => loc.metadata?.placeId === location.google_place_id
    );

    if (!matchingLocation) {
      return res.status(404).json({
        error: 'Google Business Profileでこの店舗が見つかりません',
        details: 'Google Place IDが正しいか確認してください'
      });
    }

    // レビューAPIでレビューを取得
    // Note: 実際のレビュー取得にはGoogle My Business APIの reviews.list を使用
    // 現時点ではAPIの制限により、シミュレーションとしてエラーを返す

    // TODO: Google Business Profile API v1でのレビュー取得実装
    // 現在のAPIではレビュー取得に別のエンドポイントが必要
    return res.status(200).json({
      success: true,
      message: 'Google Business Profile APIへの接続を確認しました',
      location: {
        name: matchingLocation.title,
        placeId: location.google_place_id,
      },
      note: 'レビュー取得機能は現在開発中です。Google Business Profile APIの設定が必要です。'
    });

  } catch (error: any) {
    console.error('Google Reviewの同期エラー:', error);

    // APIエラーの詳細を返す
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'Google APIエラー',
        details: error.response.data?.error?.message || error.message
      });
    }

    res.status(500).json({ error: 'レビューの同期中にエラーが発生しました' });
  }
}
