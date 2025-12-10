import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supabase';
import { getAccounts } from '@/utils/googleBusinessProfile';
import { logger } from '@/utils/logger';

// レート制限用のシンプルな状態管理
const rateLimiter = {
  lastRequestTime: 0,
  requestCount: 0,
  RATE_LIMIT: 1,
  RATE_WINDOW: 10000,
  quotaLimitedUntil: 0,
  QUOTA_BACKOFF: 60000,

  isLimited(): boolean {
    const now = Date.now();
    if (now < this.quotaLimitedUntil) {
      return true;
    }
    if (now - this.lastRequestTime > this.RATE_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
      return false;
    }
    return this.requestCount >= this.RATE_LIMIT;
  },

  increment() {
    this.requestCount += 1;
    this.lastRequestTime = Date.now();
  },

  setQuotaLimited() {
    this.quotaLimitedUntil = Date.now() + this.QUOTA_BACKOFF;
  },

  getRetryAfter(): number {
    const now = Date.now();
    if (now < this.quotaLimitedUntil) {
      return Math.ceil((this.quotaLimitedUntil - now) / 1000);
    }
    return Math.ceil(this.RATE_WINDOW / 1000);
  }
};

const CACHE_TTL = 48 * 60 * 60 * 1000;

function isCacheValid(cachedAccounts: any[] | null): boolean {
  if (!cachedAccounts || cachedAccounts.length === 0) {
    return false;
  }
  const now = Date.now();
  const oldestCache = Math.min(...cachedAccounts.map(account => new Date(account.created_at).getTime()));
  return now - oldestCache < CACHE_TTL;
}

async function saveAccountsToCache(userId: string, accounts: any[]): Promise<void> {
  if (!accounts || accounts.length === 0) {
    return;
  }

  try {
    await supabase
      .from('google_business_accounts')
      .delete()
      .eq('tenant_id', userId);

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

    await supabase
      .from('google_business_accounts')
      .insert(cacheData as any);
  } catch (error) {
    logger.error('GoogleBusinessAPI: キャッシュ保存エラー', { error });
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
    // セッションからユーザー情報を取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: '認証されていません' });
    }

    const userId = session.user.id;

    // レート制限をチェック
    if (rateLimiter.isLimited()) {
      const { data: cachedAccounts } = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });

      if (isCacheValid(cachedAccounts)) {
        return res.status(200).json({
          accounts: cachedAccounts!.map(account => ({
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

      return res.status(429).json({
        error: 'APIレート制限に達しました。しばらく待ってから再試行してください。',
        retryAfter: rateLimiter.getRetryAfter()
      });
    }

    try {
      rateLimiter.increment();
      const accounts = await getAccounts(userId);

      saveAccountsToCache(userId, accounts).catch(error => {
        logger.error('GoogleBusinessAPI: キャッシュ保存エラー', { error });
      });

      return res.status(200).json({
        accounts,
        cached: false,
        fromApi: true,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('GoogleBusinessAPI: アカウント情報取得エラー', { error });

      const cacheResult: any = await supabase
        .from('google_business_accounts')
        .select('*')
        .eq('tenant_id', userId);
      const cachedAccounts = cacheResult?.data;

      if (isCacheValid(cachedAccounts)) {
        return res.status(200).json({
          accounts: cachedAccounts!.map((account: any) => ({
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

      if (error.message && error.message.includes('Quota exceeded')) {
        rateLimiter.setQuotaLimited();
        return res.status(429).json({
          error: 'Google APIのクォータ制限に達しました。',
          quotaError: true,
          retryAfter: rateLimiter.getRetryAfter()
        });
      }

      return res.status(500).json({ error: error.message || 'アカウント情報の取得に失敗しました' });
    }
  } catch (error: any) {
    logger.error('GoogleBusinessAPI: サーバーエラー', { error });
    return res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
}
