import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// 開発環境の判定
const isDevelopment = process.env.NODE_ENV === 'development';

// レート制限の設定
const rateLimiter = {
  requests: new Map<string, { count: number; timestamp: number }>(),
  windowMs: 60000, // 1分
  maxRequests: 5, // 1分あたりの最大リクエスト数を5に制限
  retryAfter: 180, // リトライまでの待機時間を180秒に延長

  isLimited(clientId: string): boolean {
    const now = Date.now();
    const request = this.requests.get(clientId);

    if (!request) {
      this.requests.set(clientId, { count: 1, timestamp: now });
      return false;
    }

    // 1分以上経過している場合はリセット
    if (now - request.timestamp > this.windowMs) {
      this.requests.set(clientId, { count: 1, timestamp: now });
      return false;
    }

    // リクエスト数が制限を超えている場合
    if (request.count >= this.maxRequests) {
      console.log(`[RateLimiter] クライアント ${clientId} のリクエスト制限に達しました: ${request.count}/${this.maxRequests}`);
      return true;
    }

    request.count++;
    return false;
  },

  getRetryAfter(): number {
    return this.retryAfter;
  }
};

// キャッシュの有効期限（3時間）
const CACHE_EXPIRY = 3 * 60 * 60 * 1000;

// キャッシュの状態を確認する関数
async function checkCacheStatus(userId: string): Promise<{ exists: boolean; valid: boolean; count: number; age: string }> {
  try {
    const { data: cachedAccounts, error } = await supabase
      .from('google_business_accounts')
      .select('updated_at')
      .eq('tenant_id', userId);

    if (error) {
      console.error('[GoogleBusinessAPI] キャッシュ確認エラー:', error);
      return { exists: false, valid: false, count: 0, age: 'なし' };
    }

    if (!cachedAccounts || cachedAccounts.length === 0) {
      return { exists: false, valid: false, count: 0, age: 'なし' };
    }

    const lastUpdate = new Date(cachedAccounts[0].updated_at);
    const now = new Date();
    const age = now.getTime() - lastUpdate.getTime();
    const isValid = age < CACHE_EXPIRY;

    console.log('[GoogleBusinessAPI] キャッシュ状態:', {
      exists: true,
      valid: isValid,
      count: cachedAccounts.length,
      age: `${Math.floor(age / 1000)}秒前`,
      lastUpdate: lastUpdate.toISOString()
    });

    return {
      exists: true,
      valid: isValid,
      count: cachedAccounts.length,
      age: `${Math.floor(age / 1000)}秒前`
    };
  } catch (error) {
    console.error('[GoogleBusinessAPI] キャッシュ確認エラー:', error);
    return { exists: false, valid: false, count: 0, age: 'なし' };
  }
}

// Google Business Profile APIの設定
const businessProfileApi = google.businessprofileperformance('v1');

// アカウント情報の型定義
interface GoogleBusinessAccount {
  name: string;
  displayName: string;
  accountName: string;
  type: string;
  locationCount: number;
  primaryOwner: string;
  role: string;
}

// アカウント情報を取得する関数
async function getAccounts(userId: string): Promise<GoogleBusinessAccount[]> {
  try {
    console.log('[GoogleBusinessAPI] トークン情報を取得開始:', { userId });
    
    // トークン情報を取得
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('access_token, refresh_token, expiry_date')
      .eq('tenant_id', userId)
      .single();

    if (tokenError) {
      console.error('[GoogleBusinessAPI] トークン取得エラー:', {
        error: tokenError,
        code: tokenError.code,
        message: tokenError.message,
        details: tokenError.details
      });
      throw new Error('トークンの取得に失敗しました');
    }

    if (!tokenData) {
      console.error('[GoogleBusinessAPI] トークンデータが見つかりません:', { userId });
      throw new Error('トークンデータが見つかりません');
    }

    console.log('[GoogleBusinessAPI] トークン取得成功:', {
      hasAccessToken: Boolean(tokenData.access_token),
      hasRefreshToken: Boolean(tokenData.refresh_token),
      expiryDate: tokenData.expiry_date
    });

    // トークンの有効期限を確認
    const expiryDate = new Date(tokenData.expiry_date);
    const now = new Date();
    console.log('[GoogleBusinessAPI] トークン有効期限:', {
      expiry: expiryDate.toISOString(),
      now: now.toISOString(),
      isValid: now < expiryDate
    });

    if (now >= expiryDate) {
      console.error('[GoogleBusinessAPI] トークンの有効期限切れ');
      throw new Error('トークンの有効期限が切れています');
    }

    console.log('[GoogleBusinessAPI] OAuth2クライアントを設定します');
    
    // OAuth2クライアントの設定
    const oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    console.log('[GoogleBusinessAPI] Google Business APIを呼び出します');
    
    // Google Business APIの呼び出し
    const businessProfile = google.businessprofileperformance({
      version: 'v1',
      auth: oauth2Client
    });

    try {
      const response = await businessProfile.accounts.list();
      console.log('[GoogleBusinessAPI] API応答:', {
        status: response.status,
        statusText: response.statusText,
        hasAccounts: Boolean(response.data.accounts),
        accountCount: response.data.accounts?.length || 0
      });
      
      if (!response.data.accounts) {
        console.log('[GoogleBusinessAPI] アカウントが見つかりません');
        return [];
      }
      
      return response.data.accounts.map(account => ({
        name: account.name || '',
        displayName: account.displayName || '',
        accountName: account.accountName || '',
        type: account.type || '',
        locationCount: account.locationCount || 0,
        primaryOwner: account.primaryOwner || '',
        role: account.role || ''
      }));
    } catch (apiError: any) {
      console.error('[GoogleBusinessAPI] API呼び出しエラー:', {
        error: apiError.message,
        code: apiError.code,
        status: apiError.status,
        response: apiError.response?.data
      });
      throw apiError;
    }
  } catch (error: any) {
    console.error('[GoogleBusinessAPI] アカウント取得エラー:', {
      error: error.message,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// アカウント情報をキャッシュに保存する関数
async function saveAccountsToCache(userId: string, accounts: GoogleBusinessAccount[]): Promise<void> {
  try {
    console.log('[GoogleBusinessAPI] キャッシュを更新します');
    
    // 既存のキャッシュを削除
    const { error: deleteError } = await supabase
      .from('google_business_accounts')
      .delete()
      .eq('tenant_id', userId);
    
    if (deleteError) {
      console.error('[GoogleBusinessAPI] キャッシュ削除エラー:', deleteError);
      throw new Error('キャッシュの削除に失敗しました');
    }
    
    // 新しいアカウント情報を保存
    const records = accounts.map(account => ({
      tenant_id: userId,
      account_id: account.name.split('/').pop() || '',
      display_name: account.displayName,
      account_name: account.accountName,
      type: account.type,
      location_count: account.locationCount,
      primary_owner: account.primaryOwner,
      role: account.role
    }));

    const { error: insertError } = await supabase
      .from('google_business_accounts')
      .insert(records);
      
    if (insertError) {
      console.error('[GoogleBusinessAPI] キャッシュ保存エラー:', insertError);
      throw new Error('キャッシュの保存に失敗しました');
    }

    console.log('[GoogleBusinessAPI] キャッシュを更新しました:', records.length + '件');
  } catch (error) {
    console.error('[GoogleBusinessAPI] キャッシュ更新エラー:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let userId: string;

    // 開発環境の場合、クエリパラメータからユーザーIDを取得
    if (isDevelopment) {
      userId = req.query.userId as string;
      console.log('[GoogleBusinessAPI] 開発環境: ユーザーIDをクエリパラメータから取得:', userId);
      
      if (!userId) {
        console.error('[GoogleBusinessAPI] 開発環境: ユーザーIDが指定されていません');
        return res.status(400).json({ error: '開発環境ではユーザーIDが必要です' });
      }
    } else {
      // 本番環境ではセッションからユーザーIDを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[GoogleBusinessAPI] セッション取得エラー:', sessionError);
        return res.status(401).json({ error: '認証が必要です' });
      }

      if (!session) {
        console.error('[GoogleBusinessAPI] セッションが見つかりません');
        return res.status(401).json({ error: '認証が必要です' });
      }

      userId = session.user.id;
    }

    // キャッシュの状態を確認
    const cacheStatus = await checkCacheStatus(userId);
    
    // キャッシュが有効な場合は、キャッシュを使用
    if (cacheStatus.exists && cacheStatus.valid) {
      console.log('[GoogleBusinessAPI] 有効なキャッシュを使用します');
      const { data: cachedAccounts, error: cacheError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);

      if (cacheError) {
        console.error('[GoogleBusinessAPI] キャッシュ取得エラー:', cacheError);
      } else if (cachedAccounts && cachedAccounts.length > 0) {
        return res.status(200).json({
          accounts: cachedAccounts.map(account => ({
            name: `accounts/${account.account_id}`,
            displayName: account.display_name,
            accountName: account.account_name,
            type: account.type,
            locationCount: account.location_count,
            primaryOwner: account.primary_owner,
            role: account.role,
            cached: true,
            lastUpdated: account.updated_at
          }))
        });
      }
    }

    // レート制限のチェック
    if (rateLimiter.isLimited(userId)) {
      const retryAfter = rateLimiter.getRetryAfter();
      console.log(`[GoogleBusinessAPI] レート制限により実行をスキップします`);
      console.log(`[GoogleBusinessAPI] 次のリクエストまで待機: ${retryAfter}秒`);
      
      return res.status(429).json({
        error: 'APIレート制限に達しました',
        retryAfter,
        message: `${retryAfter}秒後に再試行してください`
      });
    }

    try {
      // アカウント情報の取得
      const accounts = await getAccounts(userId);
      
      // キャッシュの更新
      await saveAccountsToCache(userId, accounts);
      
      return res.status(200).json({ accounts });
    } catch (error: any) {
      console.error('[GoogleBusinessAPI] API呼び出しエラー:', error);
      
      // クォータ制限エラーの場合
      if (error.code === 429 || error.message?.includes('quota')) {
        try {
          const { data: cachedAccounts, error: cacheError } = await supabase
            .from('google_business_accounts')
            .select('*')
            .eq('tenant_id', userId);
            
          if (cacheError) {
            console.error('[GoogleBusinessAPI] キャッシュ取得エラー:', cacheError);
            throw new Error('キャッシュの取得に失敗しました');
          }

          if (!cachedAccounts || cachedAccounts.length === 0) {
            return res.status(429).json({ error: 'APIの制限に達しました。キャッシュも利用できません' });
          }

          console.log('[GoogleBusinessAPI] エラー発生のためキャッシュを使用:', cachedAccounts.length + '件');
          return res.status(200).json({ 
            accounts: cachedAccounts.map(account => ({
              name: `accounts/${account.account_id}`,
              displayName: account.display_name,
              accountName: account.account_name,
              type: account.type,
              locationCount: account.location_count,
              primaryOwner: account.primary_owner,
              role: account.role
            }))
          });
        } catch (cacheError) {
          console.error('[GoogleBusinessAPI] キャッシュ処理エラー:', cacheError);
          return res.status(500).json({ error: 'キャッシュの取得に失敗しました' });
        }
      }

      return res.status(500).json({ error: '予期せぬエラーが発生しました' });
    }
  } catch (error) {
    console.error('[GoogleBusinessAPI] 予期せぬエラー:', error);
    return res.status(500).json({ error: '予期せぬエラーが発生しました' });
  }
} 