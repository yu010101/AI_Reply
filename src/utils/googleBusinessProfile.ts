import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';
// @ts-ignore
import { google } from 'googleapis';
import { getCache, setCache, CACHE_TTL } from './cache';

// API制限用の設定
const API_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_DAY: 5000,
  COOLDOWN_TIME: 60 * 1000, // 1分のクールダウン時間（ミリ秒）
  MAX_RETRIES: 5, // 最大リトライ回数
  INITIAL_RETRY_DELAY: 1000, // 初回リトライ時の遅延（ミリ秒）
  MAX_RETRY_DELAY: 30000, // 最大リトライ遅延（30秒）
  QUOTA_BACKOFF_TIME: 60 * 1000, // クォータ制限時の待機時間（1分）
  QUOTA_ERROR_PATTERN: /Quota exceeded/i // クォータエラーの検出パターン
};

// キャッシュキー
const CACHE_KEYS = {
  ACCOUNTS: (tenantId: string) => `accounts:${tenantId}`,
  LOCATIONS: (tenantId: string, accountId: string) => `locations:${tenantId}:${accountId}`,
  REVIEWS: (tenantId: string, locationId: string, pageSize: number, pageToken?: string) => 
    `reviews:${tenantId}:${locationId}:${pageSize}:${pageToken || 'initial'}`
};

// レート制限のための状態管理
class RateLimiter {
  private requestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastResetTime: number = Date.now();
  private dailyResetTime: number = new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000; // 翌日の0時
  private isLimited: boolean = false;
  private quotaLimitedUntil: number = 0;
  private retryAttempts: number = 0;
  private clientIdIndex: number = 0;
  private clientIds: string[] = [];

  constructor() {
    // 日次リセットタイマーを設定
    setInterval(() => {
      const now = Date.now();
      if (now >= this.dailyResetTime) {
        this.dailyRequestCount = 0;
        this.dailyResetTime = new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000;
      }
    }, 60 * 1000); // 1分ごとにチェック

    // 環境変数から複数のクライアントIDを読み込み
    this.loadClientIds();
  }

  // クライアントIDのローテーション
  private loadClientIds() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      this.clientIds.push(clientId);
    }
    
    // 追加のクライアントIDを環境変数から読み込む
    for (let i = 2; i <= 5; i++) {
      const additionalClientId = process.env[`GOOGLE_CLIENT_ID_${i}`];
      const additionalClientSecret = process.env[`GOOGLE_CLIENT_SECRET_${i}`];
      if (additionalClientId && additionalClientSecret) {
        this.clientIds.push(additionalClientId);
      }
    }

    console.log(`[RateLimiter] ${this.clientIds.length}個のクライアントIDを読み込みました`);
  }

  // 次のクライアントIDとシークレットを取得
  getNextClientCredentials(): { clientId: string, clientSecret: string } {
    if (this.clientIds.length <= 1) {
      // デフォルトのクレデンシャルを返す
      return { 
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
      };
    }

    // クライアントIDをローテーション
    this.clientIdIndex = (this.clientIdIndex + 1) % this.clientIds.length;
    const nextClientId = this.clientIds[this.clientIdIndex];
    
    let clientSecret = '';
    if (this.clientIdIndex === 0) {
      clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    } else {
      clientSecret = process.env[`GOOGLE_CLIENT_SECRET_${this.clientIdIndex + 1}`] || '';
    }

    console.log(`[RateLimiter] クライアントID ${this.clientIdIndex + 1}/${this.clientIds.length} を使用します`);
    return { clientId: nextClientId, clientSecret };
  }

  async recordRequest(): Promise<boolean> {
    const now = Date.now();
    
    // クォータ制限中の場合
    if (now < this.quotaLimitedUntil) {
      this.isLimited = true;
      const remainingTime = Math.ceil((this.quotaLimitedUntil - now) / 1000);
      console.log(`[RateLimiter] クォータ制限中: あと${remainingTime}秒待機します`);
      return false;
    }
    
    // 1分ごとにリセット
    if (now - this.lastResetTime >= 60 * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      this.isLimited = false;
    }

    // リミットチェック
    if (this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE || 
        this.dailyRequestCount >= API_LIMITS.MAX_REQUESTS_PER_DAY) {
      this.isLimited = true;
      
      // リミット超過をログに記録
      await supabase
        .from('api_limit_logs')
        .insert({
          api_name: 'Google Business Profile API',
          limit_type: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? 'minute' : 'daily',
          request_count: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? this.requestCount : this.dailyRequestCount,
          limit_value: this.requestCount >= API_LIMITS.MAX_REQUESTS_PER_MINUTE ? API_LIMITS.MAX_REQUESTS_PER_MINUTE : API_LIMITS.MAX_REQUESTS_PER_DAY,
          timestamp: new Date().toISOString()
        });
      
      return false;
    }

    // リクエストカウントを増加
    this.requestCount++;
    this.dailyRequestCount++;
    return true;
  }

  isRateLimited(): boolean {
    const now = Date.now();
    // クォータ制限またはレート制限のいずれかがアクティブ
    return this.isLimited || now < this.quotaLimitedUntil;
  }

  // API呼び出しを行う関数をラップして自動リトライを実装
  async executeWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    let lastError: any;

    while (retryCount <= API_LIMITS.MAX_RETRIES) {
      try {
        // APIリクエスト記録
        if (!await this.recordRequest()) {
          // レート制限中の場合は待機
          await this.waitForCooldown();
          continue; // 再試行
        }

        // API呼び出しを実行
        const result = await apiCall();
        
        // 成功したらリトライカウントをリセット
        this.retryAttempts = 0;
        return result;
      } catch (error: any) {
        lastError = error;
        
        // クォータエラーかどうか確認
        if (error.message && API_LIMITS.QUOTA_ERROR_PATTERN.test(error.message)) {
          console.log(`[RateLimiter] クォータ制限エラーを検出しました: ${error.message}`);
          this.setQuotaLimited();
          
          // 複数のクライアントIDがある場合は切り替える
          if (this.clientIds.length > 1) {
            this.getNextClientCredentials();
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
            continue; // 別のクライアントIDで再試行
          }
          
          // クォータ制限の場合は待機してから再試行
          await this.waitForCooldown();
          continue;
        }
        
        // その他のエラーの場合、指数バックオフで再試行
        retryCount++;
        if (retryCount <= API_LIMITS.MAX_RETRIES) {
          // 指数バックオフ計算
          const delay = Math.min(
            API_LIMITS.INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1),
            API_LIMITS.MAX_RETRY_DELAY
          );
          console.log(`[RateLimiter] リトライ ${retryCount}/${API_LIMITS.MAX_RETRIES}: ${delay}ms後に再試行します`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 最大リトライ回数に達した場合
    console.error(`[RateLimiter] 最大リトライ回数(${API_LIMITS.MAX_RETRIES})に達しました`);
    throw lastError || new Error('APIリクエストが繰り返し失敗しました');
  }

  setQuotaLimited() {
    // クォータ制限が発生した場合、一定時間リクエストをブロック
    this.quotaLimitedUntil = Date.now() + API_LIMITS.QUOTA_BACKOFF_TIME;
    console.log(`[RateLimiter] クォータ制限を設定しました。${new Date(this.quotaLimitedUntil).toISOString()}まで待機します`);
  }

  async waitForCooldown(): Promise<void> {
    const now = Date.now();
    
    // クォータ制限がアクティブな場合
    if (now < this.quotaLimitedUntil) {
      const waitTime = Math.min(this.quotaLimitedUntil - now, API_LIMITS.QUOTA_BACKOFF_TIME);
      console.log(`[RateLimiter] クォータ制限のため ${waitTime}ms 待機します`);
      return new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // 通常のレート制限の場合
    if (this.isLimited) {
      console.log(`[RateLimiter] レート制限のため ${API_LIMITS.COOLDOWN_TIME}ms 待機します`);
      return new Promise(resolve => setTimeout(resolve, API_LIMITS.COOLDOWN_TIME));
    }
  }

  getRetryAfter(): number {
    const now = Date.now();
    
    // クォータ制限中の場合
    if (now < this.quotaLimitedUntil) {
      return Math.ceil((this.quotaLimitedUntil - now) / 1000);
    }
    
    // 通常のレート制限の場合
    return Math.ceil(API_LIMITS.COOLDOWN_TIME / 1000);
  }
}

// シングルトンインスタンス
const rateLimiter = new RateLimiter();

// OAuth2クライアントの作成
export const createOAuth2Client = (): OAuth2Client => {
  // クライアントIDとシークレットをローテーション
  const { clientId, clientSecret } = rateLimiter.getNextClientCredentials();
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
  );
};

// トークンを取得
export const getAuthToken = async (tenantId: string): Promise<{ token: string; isValid: boolean }> => {
  try {
    // トークン情報をデータベースから取得
    const { data, error } = await supabase
      .from('google_auth_tokens')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return { token: '', isValid: false };
    }

    // トークンの有効期限をチェック
    const expiryDate = new Date(data.expiry_date);
    const now = new Date();
    
    if (now >= expiryDate) {
      // リフレッシュトークンを使用して新しいトークンを取得
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: data.refresh_token
      });

      const tokenResponse = await oauth2Client.getAccessToken();
      const accessToken = tokenResponse.token || '';
      
      // 新しいトークンと有効期限を保存
      if (accessToken) {
        const { credentials } = oauth2Client;
        // 有効期限がなければ現在時刻から1時間後を設定
        const expiryMillis = credentials.expiry_date || Date.now() + 3600000;
        // 必ず数値型のミリ秒タイムスタンプからDateオブジェクトを経由してISOフォーマットの文字列に変換する
        const expiryDate = new Date(Number(expiryMillis)).toISOString();
        
        await supabase
          .from('google_auth_tokens')
          .update({
            access_token: accessToken,
            expiry_date: expiryDate
          })
          .eq('id', data.id);

        return { token: accessToken, isValid: true };
      }
      
      return { token: '', isValid: false };
    }
    
    return { token: data.access_token, isValid: true };
  } catch (error) {
    console.error('トークン取得エラー:', error);
    return { token: '', isValid: false };
  }
};

// Business Profile API初期化
export const initializeBusinessProfileApi = async (tenantId: string) => {
  const { token, isValid } = await getAuthToken(tenantId);
  
  if (!isValid) {
    throw new Error('Google認証が必要です');
  }
  
  const auth = createOAuth2Client();
  auth.setCredentials({ access_token: token });
  
  return google.mybusinessqanda({ version: 'v1', auth });
};

// アカウント一覧を取得（キャッシュ機能付き）
export const getAccounts = async (tenantId: string, useCache: boolean = true): Promise<any[]> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_KEYS.ACCOUNTS(tenantId);
    const cachedAccounts = await getCache<any[]>(cacheKey);
    if (cachedAccounts) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedAccounts;
    }
  }

  // キャッシュにない場合はAPIから取得
  const accounts = await rateLimiter.executeWithRetry(async () => {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessAccountsService = google.mybusinessaccountmanagement({ version: 'v1', auth });
    
    const response = await businessAccountsService.accounts.list();
    return response.data.accounts || [];
  });

  // 取得したデータをキャッシュに保存（1時間有効）
  if (useCache && accounts.length > 0) {
    const cacheKey = CACHE_KEYS.ACCOUNTS(tenantId);
    await setCache(cacheKey, accounts, CACHE_TTL.MEDIUM);
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return accounts;
};

// 場所一覧を取得（キャッシュ機能付き）
export const getLocations = async (tenantId: string, accountId: string, useCache: boolean = true): Promise<any[]> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_KEYS.LOCATIONS(tenantId, accountId);
    const cachedLocations = await getCache<any[]>(cacheKey);
    if (cachedLocations) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedLocations;
    }
  }

  // キャッシュにない場合はAPIから取得
  const locations = await rateLimiter.executeWithRetry(async () => {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessLocationsService = google.mybusinessbusinessinformation({ version: 'v1', auth });
    
    const response = await businessLocationsService.accounts.locations.list({
      parent: `accounts/${accountId}`
    });
    
    return response.data.locations || [];
  });

  // 取得したデータをキャッシュに保存（1時間有効）
  if (useCache && locations.length > 0) {
    const cacheKey = CACHE_KEYS.LOCATIONS(tenantId, accountId);
    await setCache(cacheKey, locations, CACHE_TTL.MEDIUM);
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return locations;
};

// レビュー一覧を取得（キャッシュ機能付き）
export const getReviews = async (
  tenantId: string, 
  locationId: string, 
  pageSize: number = 20, 
  pageToken?: string,
  useCache: boolean = true
): Promise<any> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_KEYS.REVIEWS(tenantId, locationId, pageSize, pageToken);
    const cachedReviews = await getCache<any>(cacheKey);
    if (cachedReviews) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedReviews;
    }
  }

  // キャッシュにない場合はAPIから取得
  const reviews = await rateLimiter.executeWithRetry(async () => {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessReviewsService = google.mybusinessplaceactions({ version: 'v1', auth });
    
    const response = await businessReviewsService.locations.reviews.list({
      parent: locationId,
      pageSize,
      pageToken
    });
    
    return response.data;
  });

  // 取得したデータをキャッシュに保存（短時間のみ有効）
  if (useCache && reviews) {
    const cacheKey = CACHE_KEYS.REVIEWS(tenantId, locationId, pageSize, pageToken);
    // レビューは頻繁に更新される可能性があるので短めのTTLを設定
    await setCache(cacheKey, reviews, CACHE_TTL.SHORT);
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return reviews;
};

// レビューに返信（リトライ機能付き）
export const replyToReview = async (tenantId: string, reviewId: string, replyText: string): Promise<any> => {
  return rateLimiter.executeWithRetry(async () => {
    const auth = createOAuth2Client();
    const { token, isValid } = await getAuthToken(tenantId);
    
    if (!isValid) {
      throw new Error('Google認証が必要です');
    }
    
    auth.setCredentials({ access_token: token });
    const businessReviewsService = google.mybusinessplaceactions({ version: 'v1', auth });
    
    const response = await businessReviewsService.locations.reviews.updateReply({
      name: reviewId,
      requestBody: {
        comment: replyText
      }
    });
    
    // 返信ログを記録
    await supabase
      .from('reply_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        reply_content: replyText,
        is_successful: true,
        reply_date: new Date().toISOString()
      });
    
    return response.data;
  }).catch(async (error) => {
    // エラーログを記録
    await supabase
      .from('reply_logs')
      .insert({
        tenant_id: tenantId,
        review_id: reviewId,
        reply_content: replyText,
        is_successful: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        reply_date: new Date().toISOString()
      });
    
    throw error;
  });
}; 