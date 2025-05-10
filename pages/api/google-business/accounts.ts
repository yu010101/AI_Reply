import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { getAccounts } from '@/utils/googleBusinessProfile';

// レート制限用のシンプルな状態管理
const rateLimiter = {
  lastRequestTime: 0,
  requestCount: 0,
  RATE_LIMIT: 1, // 10秒間に1回のリクエストに制限
  RATE_WINDOW: 10000, // 10秒
  // クォータ制限の発生を追跡
  quotaLimitedUntil: 0,
  QUOTA_BACKOFF: 60000, // クォータ制限後の待機時間（1分）
  
  isLimited(): boolean {
    const now = Date.now();
    
    // クォータ制限中の場合
    if (now < this.quotaLimitedUntil) {
      return true;
    }
    
    // ウィンドウ時間より古いリクエストはリセット
    if (now - this.lastRequestTime > this.RATE_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
      return false;
    }
    // リクエスト数が制限を超えている場合
    return this.requestCount >= this.RATE_LIMIT;
  },
  
  increment() {
    this.requestCount += 1;
    this.lastRequestTime = Date.now();
  },
  
  setQuotaLimited() {
    // クォータ制限が発生した場合、一定時間リクエストをブロック
    this.quotaLimitedUntil = Date.now() + this.QUOTA_BACKOFF;
    console.log(`[RateLimiter] クォータ制限を設定しました。${new Date(this.quotaLimitedUntil).toISOString()}まで待機します`);
  },
  
  getRetryAfter(): number {
    const now = Date.now();
    
    // クォータ制限中の場合
    if (now < this.quotaLimitedUntil) {
      return Math.ceil((this.quotaLimitedUntil - now) / 1000);
    }
    
    // 通常のレート制限の場合
    return Math.ceil(this.RATE_WINDOW / 1000);
  }
};

// キャッシュの有効期限（48時間）
const CACHE_TTL = 48 * 60 * 60 * 1000;

// キャッシュの有効性をチェック
function isCacheValid(cachedAccounts: any[] | null): boolean {
  if (!cachedAccounts || cachedAccounts.length === 0) {
    return false;
  }

  const now = Date.now();
  const oldestCache = Math.min(...cachedAccounts.map(account => new Date(account.created_at).getTime()));
  return now - oldestCache < CACHE_TTL;
}

// キャッシュの状態をチェック
async function checkCacheStatus(userId: string) {
  const { data: cachedAccounts, error: cacheError } = await supabase
    .from('google_business_accounts')
    .select('*')
    .eq('tenant_id', userId)
    .order('created_at', { ascending: false });

  if (cacheError) {
    console.error('[GoogleBusinessAPI] キャッシュ取得エラー:', cacheError);
    return { exists: false, valid: false };
  }

  const valid = isCacheValid(cachedAccounts);
  console.log('[GoogleBusinessAPI] キャッシュ状態:', { 
    exists: Boolean(cachedAccounts && cachedAccounts.length > 0),
    valid,
    count: cachedAccounts?.length || 0,
    age: cachedAccounts && cachedAccounts.length > 0 
      ? Math.round((Date.now() - new Date(cachedAccounts[0].created_at).getTime()) / (60 * 1000)) + '分前'
      : 'なし'
  });

  return { exists: Boolean(cachedAccounts && cachedAccounts.length > 0), valid };
}

// アカウント情報をキャッシュに保存する関数
async function saveAccountsToCache(userId: string, accounts: any[]): Promise<void> {
  if (!accounts || accounts.length === 0) {
    console.log('[GoogleBusinessAPI] キャッシュするアカウントがありません');
    return;
  }
  
  try {
    // 既存のキャッシュを削除
    await supabase
      .from('google_business_accounts')
      .delete()
      .eq('tenant_id', userId);
    
    // 新しいアカウント情報を保存
    const cacheData = accounts.map(account => ({
      tenant_id: userId,
      account_id: account.name.split('/').pop() || '',
      account_name: account.accountName || '',
      display_name: account.displayName || '',
      primary_owner: account.primaryOwner || '',
      type: account.accountType || 'LOCATION_GROUP',
      role: account.role || '',
      location_count: account.locationCount || 0,
      created_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('google_business_accounts')
      .insert(cacheData);
      
    if (error) {
      console.error('[GoogleBusinessAPI] キャッシュ保存エラー:', error);
    } else {
      console.log('[GoogleBusinessAPI] キャッシュを更新しました:', cacheData.length + '件');
    }
  } catch (error) {
    console.error('[GoogleBusinessAPI] キャッシュ保存中にエラーが発生しました:', error);
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
    // 開発環境かどうかを確認
    const isDevEnv = process.env.NODE_ENV === 'development';
    
    // 開発環境の場合、固定のIDを使用して認証をバイパス
    let userId: string;
    
    if (isDevEnv) {
      console.log('[GoogleBusinessAPI] 開発環境のため認証をバイパスします');
      // 開発環境用の固定ID
      userId = process.env.DEV_USER_ID || 'ce223858-240b-4888-9087-fddf947dd020';
    } else {
      // 本番環境では通常の認証フロー
      // セッションからユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
  
      if (!session) {
        return res.status(401).json({ error: '認証されていません' });
      }
  
      userId = session.user.id;
    }

    console.log('[GoogleBusinessAPI] ユーザーID:', userId);
    
    // レート制限をチェック
    if (rateLimiter.isLimited()) {
      console.log('[GoogleBusinessAPI] レート制限により実行をスキップします');
      console.log(`[GoogleBusinessAPI] 次のリクエストまで待機: ${rateLimiter.getRetryAfter()}秒`);
      
      // キャッシュされたデータが存在するか確認
      const { data: cachedAccounts, error: cacheError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
      
      if (cacheError) {
        console.error('[GoogleBusinessAPI] キャッシュ取得エラー:', cacheError);
        return res.status(500).json({ error: 'キャッシュの取得に失敗しました' });
      }
      
      const cacheValid = isCacheValid(cachedAccounts);
      
      // キャッシュがある場合はそれを返す
      if (cacheValid && cachedAccounts) {
        console.log('[GoogleBusinessAPI] レート制限中のためキャッシュを使用します:',  
          cachedAccounts.length + '件');
        
        return res.status(200).json({ 
          accounts: cachedAccounts.map(account => ({
            name: `accounts/${account.account_id}`,
            displayName: account.display_name,
            accountName: account.account_name,
            accountType: account.type || 'LOCATION_GROUP',
            locationCount: account.location_count || 0,
            primaryOwner: account.primary_owner,
            role: account.role,
            cached: true,
            lastUpdated: account.created_at
          })),
          cached: true,
          retryAfter: rateLimiter.getRetryAfter()
        });
      }
      
      // キャッシュがない場合はレート制限エラーを返す
      return res.status(429).json({
        error: 'APIレート制限に達しました。しばらく待ってから再試行してください。',
        retryAfter: rateLimiter.getRetryAfter()
      });
    }

    // 通常のAPIリクエストでGoogleからデータを取得
    try {
      // ログ出力
      console.log('[GoogleBusinessAPI] Google Business APIを呼び出します');
      
      // キャッシュを確認
      const { data: cachedAccounts, error: cacheError } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
        
      const cacheValid = isCacheValid(cachedAccounts);
      console.log('[GoogleBusinessAPI] キャッシュ状態:', { 
        exists: Boolean(cachedAccounts && cachedAccounts.length > 0),
        valid: cacheValid,
        count: cachedAccounts?.length || 0,
        age: cachedAccounts && cachedAccounts.length > 0 
          ? Math.round((Date.now() - new Date(cachedAccounts[0].created_at).getTime()) / (60 * 1000)) + '分前'
          : 'なし'
      });
      
      // APIが制限されている場合や最大試行回数を超えた場合はキャッシュを返す
      if (rateLimiter.isLimited() && cacheValid && cachedAccounts) {
        return res.status(200).json({ 
          accounts: cachedAccounts.map(account => ({
            name: `accounts/${account.account_id}`,
            displayName: account.display_name,
            accountName: account.account_name,
            accountType: account.type || 'LOCATION_GROUP',
            locationCount: account.location_count || 0,
            primaryOwner: account.primary_owner,
            role: account.role,
            cached: true,
            lastUpdated: account.created_at
          })),
          cached: true,
          cacheAge: cachedAccounts.length > 0 
            ? Math.round((Date.now() - new Date(cachedAccounts[0].created_at).getTime()) / (60 * 1000))
            : null
        });
      }
      
      // 通常のAPIリクエスト処理（レート制限されていない場合）
      rateLimiter.increment();
      
      // Google Business ProfileからAPIを使用してアカウントを取得
      const accounts = await getAccounts(userId);
      
      // APIで取得したアカウント情報をキャッシュ（バックグラウンド処理）
      saveAccountsToCache(userId, accounts).catch(error => {
        console.error('[GoogleBusinessAPI] キャッシュ保存エラー:', error);
      });
      
      // APIレスポンスを先に返す（キャッシュ保存を待たない）
      return res.status(200).json({ 
        accounts,
        cached: false,
        fromApi: true,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[GoogleBusinessAPI] アカウント情報取得エラー:', error);
      
      // キャッシュされたアカウント情報を返す
      const { data: cachedAccounts } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);
        
      const cacheValid = isCacheValid(cachedAccounts);
        
      if (cacheValid && cachedAccounts) {
        return res.status(200).json({ 
          accounts: cachedAccounts.map(account => ({
            name: `accounts/${account.account_id}`,
            displayName: account.display_name,
            accountName: account.account_name,
            accountType: account.type || 'LOCATION_GROUP',
            locationCount: account.location_count || 0,
            primaryOwner: account.primary_owner,
            role: account.role,
            cached: true,
            lastUpdated: account.created_at
          })),
          cached: true,
          error: error.message
        });
      }
      
      // レート制限エラーかどうかをチェック
      if (error.message && error.message.includes('Quota exceeded')) {
        // クォータ制限を設定
        rateLimiter.setQuotaLimited();
        
        return res.status(429).json({
          error: 'Google APIのクォータ制限に達しました。しばらく待ってから再試行してください。',
          quotaError: true,
          retryAfter: rateLimiter.getRetryAfter()
        });
      }
      
      return res.status(500).json({ error: error.message || 'アカウント情報の取得に失敗しました' });
    }
  } catch (error: any) {
    console.error('[GoogleBusinessAPI] サーバーエラー:', error);
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
} 