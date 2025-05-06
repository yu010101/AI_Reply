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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // レート制限をチェック
    if (rateLimiter.isLimited()) {
      console.log('[GoogleBusinessAPI] レート制限によりAPIリクエストをブロック');
      return res.status(429).json({ 
        error: '短期間に多くのリクエストが送信されました。しばらく待ってから再試行してください。',
        retryAfter: rateLimiter.getRetryAfter()
      });
    }
    
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

    // トークンを確認
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('access_token')
      .eq('tenant_id', userId)
      .single();
    
    console.log('[GoogleBusinessAPI] トークン確認結果:', {
      found: Boolean(tokenData),
      error: tokenError ? tokenError.message : null,
      tokenPrefix: tokenData?.access_token ? tokenData.access_token.substring(0, 10) + '...' : null
    });

    if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({ error: 'Google Business Profileとの連携が必要です' });
    }

    // まずはキャッシュされたアカウント情報を確認
    const { data: cachedAccounts } = await supabase
      .from('google_business_accounts')
      .select('*')
      .eq('tenant_id', userId);

    const isCacheValid = cachedAccounts && cachedAccounts.length > 0;
    
    if (isCacheValid) {
      // キャッシュが見つかった場合はそれを使用
      console.log('[GoogleBusinessAPI] キャッシュからアカウント情報を返します:', cachedAccounts.length);
      
      // キャッシュを返しつつ、バックグラウンドで最新データを取得（レート制限を考慮）
      if (!rateLimiter.isLimited()) {
        try {
          rateLimiter.increment();
          // 非同期でアカウント情報を更新（結果は待たない）
          getAccounts(userId).then(async (accounts) => {
            if (accounts && accounts.length > 0) {
              // 既存のアカウント情報を削除
              await supabase
                .from('google_business_accounts')
                .delete()
                .eq('tenant_id', userId);
              
              // 新しいアカウント情報を保存
              await supabase
                .from('google_business_accounts')
                .insert(
                  accounts.map(account => ({
                    tenant_id: userId,
                    account_id: account.name.split('/').pop(),
                    account_name: account.accountName,
                    display_name: account.displayName,
                    primary_owner: account.primaryOwner,
                    type: account.type,
                    role: account.role,
                    created_at: new Date().toISOString()
                  }))
                );
              console.log('[GoogleBusinessAPI] バックグラウンドでキャッシュを更新しました');
            }
          }).catch(err => {
            // クォータ制限エラーの場合は制限フラグを設定
            if (err.message && err.message.includes('Quota exceeded')) {
              rateLimiter.setQuotaLimited();
            }
            console.error('[GoogleBusinessAPI] バックグラウンド更新エラー:', err);
          });
        } catch (err) {
          // バックグラウンド処理のエラーは無視
          console.error('[GoogleBusinessAPI] バックグラウンド処理エラー:', err);
        }
      }
      
      // キャッシュされたデータを返す
      return res.status(200).json({ 
        accounts: cachedAccounts,
        cached: true
      });
    }

    try {
      // レート制限をインクリメント
      rateLimiter.increment();
      
      // アカウント情報を取得
      console.log('[GoogleBusinessAPI] アカウント情報取得開始');
      const accounts = await getAccounts(userId);
      console.log('[GoogleBusinessAPI] アカウント情報取得成功:', accounts.length + '件');
      
      // アカウント情報をキャッシュ
      if (accounts.length > 0) {
        // 既存のアカウント情報を削除
        await supabase
          .from('google_business_accounts')
          .delete()
          .eq('tenant_id', userId);
        
        // 新しいアカウント情報を保存
        await supabase
          .from('google_business_accounts')
          .insert(
            accounts.map(account => ({
              tenant_id: userId,
              account_id: account.name.split('/').pop(),
              account_name: account.accountName,
              display_name: account.displayName,
              primary_owner: account.primaryOwner,
              type: account.type,
              role: account.role,
              created_at: new Date().toISOString()
            }))
          );
      }
      
      return res.status(200).json({ accounts });
    } catch (error: any) {
      console.error('[GoogleBusinessAPI] アカウント情報取得エラー:', error);
      
      // キャッシュされたアカウント情報を返す
      if (isCacheValid) {
        return res.status(200).json({ 
          accounts: cachedAccounts,
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