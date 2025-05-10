import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';
// @ts-ignore
import { google } from 'googleapis';
import { getCache, setCache, CACHE_TTL } from './cache';

// API制限用の設定
const API_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 3,     // 1分あたりのリクエスト数を3に制限
  MAX_REQUESTS_PER_DAY: 5000,
  COOLDOWN_TIME: 1800 * 1000,     // クールダウン時間を30分に延長
  MAX_RETRIES: 3,                 // 最大リトライ回数
  INITIAL_RETRY_DELAY: 120000,    // 初回リトライ時の遅延を2分に設定
  MAX_RETRY_DELAY: 3600000,       // 最大リトライ遅延を1時間に設定
  QUOTA_BACKOFF_TIME: 1800 * 1000, // クォータ制限時の待機時間を30分に設定
  QUOTA_ERROR_PATTERN: /Quota exceeded/i
};

// クライアントIDの設定
const CLIENT_CONFIG = {
  MAX_CLIENTS: 5,           // 最大クライアント数
  ROTATION_INTERVAL: 300000, // ローテーション間隔を5分に短縮
  COOLDOWN_PERIOD: 1800000,  // クールダウン期間を30分に延長
  MIN_USAGE_INTERVAL: 30000, // 同一クライアントの最小使用間隔（30秒）
  MAX_CONSECUTIVE_FAILURES: 3, // 連続失敗の最大回数を3回に制限
  INITIAL_BACKOFF: 300000,   // 初回バックオフ時間（5分）
  MAX_BACKOFF: 3600000,    // 最大バックオフ時間（1時間）
  GLOBAL_COOLDOWN: 3600000, // グローバルクールダウン時間（1時間）
  REQUEST_INTERVAL: 30000   // リクエスト間隔（30秒）
};

// キャッシュの設定
const CACHE_CONFIG = {
  TTL: {
    SHORT: 5 * 60 * 1000,    // 5分
    MEDIUM: 30 * 60 * 1000,  // 30分
    LONG: 24 * 60 * 60 * 1000 // 24時間
  },
  KEYS: {
    ACCOUNTS: (tenantId: string) => `accounts:${tenantId}`,
    LOCATIONS: (tenantId: string, accountId: string) => `locations:${tenantId}:${accountId}`,
    REVIEWS: (tenantId: string, locationId: string, pageSize: number, pageToken?: string) => 
      `reviews:${tenantId}:${locationId}:${pageSize}:${pageToken || 'initial'}`
  },
  STRATEGIES: {
    ACCOUNTS: {
      TTL: 30 * 60 * 1000,    // 30分
      PRIORITY: 'high'
    },
    LOCATIONS: {
      TTL: 30 * 60 * 1000,    // 30分
      PRIORITY: 'high'
    },
    REVIEWS: {
      TTL: 5 * 60 * 1000,     // 5分
      PRIORITY: 'low'
    }
  }
};

// バッチ処理の設定
const BATCH_CONFIG = {
  MAX_BATCH_SIZE: 1,         // 1回のバッチで処理する最大リクエスト数を1に削減
  BATCH_DELAY: 120000,       // バッチ間の待機時間を2分に延長
  MAX_CONCURRENT_BATCHES: 1, // 同時に実行できるバッチの最大数
  RETRY_DELAY: 120000,       // エラー時のリトライ待機時間を2分に延長
  MAX_RETRIES: 3            // 最大リトライ回数
};

// バッチ処理用のキュー
class BatchQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing: boolean = false;
  private activeBatches: number = 0;
  private retryCount: number = 0;

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeBatches < BATCH_CONFIG.MAX_CONCURRENT_BATCHES) {
      const batch = this.queue.splice(0, BATCH_CONFIG.MAX_BATCH_SIZE);
      this.activeBatches++;

      try {
        console.log(`[BatchQueue] バッチ処理開始: ${batch.length}件のリクエスト`);
        await Promise.all(batch.map(task => task()));
        this.retryCount = 0; // 成功したらリトライカウントをリセット
        console.log(`[BatchQueue] バッチ処理完了: ${batch.length}件のリクエスト`);
      } catch (error) {
        console.error('[BatchQueue] バッチ処理エラー:', error);
        this.retryCount++;
        
        if (this.retryCount <= BATCH_CONFIG.MAX_RETRIES) {
          console.log(`[BatchQueue] リトライ ${this.retryCount}/${BATCH_CONFIG.MAX_RETRIES}: ${BATCH_CONFIG.RETRY_DELAY}ms後に再試行します`);
          await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.RETRY_DELAY));
          // 失敗したバッチを再度キューに追加
          this.queue.unshift(...batch);
        } else {
          console.error('[BatchQueue] 最大リトライ回数に達しました');
          // エラーを上位に伝播
          throw error;
        }
      } finally {
        this.activeBatches--;
        // バッチ間の待機
        if (this.queue.length > 0) {
          console.log(`[BatchQueue] 次のバッチまで ${BATCH_CONFIG.BATCH_DELAY}ms 待機します`);
          await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.BATCH_DELAY));
        }
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      setTimeout(() => this.process(), BATCH_CONFIG.BATCH_DELAY);
    }
  }
}

// バッチキューインスタンス
const batchQueue = new BatchQueue();

// APIリクエストをバッチ処理で実行
async function executeBatchRequest<T>(apiCall: () => Promise<T>): Promise<T> {
  return batchQueue.add(apiCall);
}

interface Client {
  id: string;
  secret: string;
  lastUsed: number;
  quotaLimited: boolean;
  quotaLimitedUntil: number;
  consecutiveFailures: number;
  requestCount: number;
  quotaResetTime: number;
}

class ClientManager {
  private clients: Client[] = [];
  private currentIndex: number = 0;
  private lastRotation: number = 0;
  private rotationInterval: number = 5 * 60 * 1000; // 5分

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    console.log('[ClientManager] クライアントIDの初期化を開始します');
    
    // 環境変数の状態をログ出力
    console.log('[ClientManager] 環境変数の状態:', {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '設定済み' : '未設定',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '設定済み' : '未設定',
      GOOGLE_CLIENT_ID_2: process.env.GOOGLE_CLIENT_ID_2 ? '設定済み' : '未設定',
      GOOGLE_CLIENT_SECRET_2: process.env.GOOGLE_CLIENT_SECRET_2 ? '設定済み' : '未設定',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV
    });

    // メインクライアントIDの追加
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const mainClientId = process.env.GOOGLE_CLIENT_ID;
      console.log('[ClientManager] メインクライアントIDを追加:', mainClientId.substring(0, 10) + '....com');
      this.clients.push({
        id: mainClientId,
        secret: process.env.GOOGLE_CLIENT_SECRET,
        lastUsed: 0,
        quotaLimited: false,
        quotaLimitedUntil: 0,
        consecutiveFailures: 0,
        requestCount: 0,
        quotaResetTime: 0
      });
    }

    // 追加クライアントIDの追加（重複チェックを改善）
    for (let i = 2; i <= 5; i++) {
      const clientId = process.env[`GOOGLE_CLIENT_ID_${i}`];
      const clientSecret = process.env[`GOOGLE_CLIENT_SECRET_${i}`];
      
      if (clientId && clientSecret) {
        // 重複チェック（より詳細なログを追加）
        const isDuplicate = this.clients.some(client => {
          const isDuplicate = client.id === clientId;
          if (isDuplicate) {
            console.log(`[ClientManager] 重複検出: クライアントID ${i} は既に登録済みのIDと重複しています`);
            console.log(`[ClientManager] 重複詳細:`, {
              newClientId: clientId.substring(0, 10) + '....com',
              existingClientId: client.id.substring(0, 10) + '....com'
            });
          }
          return isDuplicate;
        });

        if (isDuplicate) {
          console.log(`[ClientManager] 警告: クライアントID ${i} は重複しているためスキップします`);
          continue;
        }
        
        // クライアントIDの形式チェック
        if (!clientId.includes('.apps.googleusercontent.com')) {
          console.log(`[ClientManager] 警告: クライアントID ${i} の形式が不正です`);
          continue;
        }

        // クライアントシークレットの形式チェック
        if (!clientSecret.startsWith('GOCSPX-')) {
          console.log(`[ClientManager] 警告: クライアントシークレット ${i} の形式が不正です`);
          continue;
        }
        
        console.log(`[ClientManager] 追加クライアントID ${i} を追加:`, clientId.substring(0, 10) + '....com');
        this.clients.push({
          id: clientId,
          secret: clientSecret,
          lastUsed: 0,
          quotaLimited: false,
          quotaLimitedUntil: 0,
          consecutiveFailures: 0,
          requestCount: 0,
          quotaResetTime: 0
        });
      } else {
        console.log(`[ClientManager] 追加クライアントID ${i} が見つかりません`);
      }
    }

    // 最終的なクライアントIDの状態をログ出力
    console.log('[ClientManager] クライアントIDの最終状態:', {
      totalClients: this.clients.length,
      clientIds: this.clients.map(client => ({
        id: client.id.substring(0, 10) + '....com',
        lastUsed: new Date(client.lastUsed).toISOString(),
        quotaLimited: client.quotaLimited
      }))
    });
  }

  getNextClient(): { id: string; secret: string } {
    const now = Date.now();
    console.log(`[ClientManager] クライアント選択開始: 現在のインデックス=${this.currentIndex}, クライアント数=${this.clients.length}`);

    // ローテーション間隔をチェック
    if (now - this.lastRotation >= this.rotationInterval) {
      this.currentIndex = (this.currentIndex + 1) % this.clients.length;
      this.lastRotation = now;
      console.log(`[ClientManager] ローテーション間隔到達: 新しいインデックス=${this.currentIndex}`);
    }

    // 現在のクライアントを取得
    let selectedClient = this.clients[this.currentIndex];
    console.log(`[ClientManager] 現在のクライアント状態: ID=${selectedClient.id}, クォータ制限=${selectedClient.quotaLimited}, 連続失敗=${selectedClient.consecutiveFailures}`);

    // クライアントの使用間隔をチェック
    if (now - selectedClient.lastUsed < CLIENT_CONFIG.MIN_USAGE_INTERVAL) {
      console.log(`[ClientManager] 最小使用間隔未到達: 経過時間=${now - selectedClient.lastUsed}ms, 必要時間=${CLIENT_CONFIG.MIN_USAGE_INTERVAL}ms`);
      // 別のクライアントを探す
      for (let i = 0; i < this.clients.length; i++) {
        const nextIndex = (this.currentIndex + i) % this.clients.length;
        const nextClient = this.clients[nextIndex];
        if (now - nextClient.lastUsed >= CLIENT_CONFIG.MIN_USAGE_INTERVAL) {
          this.currentIndex = nextIndex;
          selectedClient = nextClient;
          console.log(`[ClientManager] 使用間隔のためクライアントIDを切り替え: 新しいインデックス=${this.currentIndex}`);
          break;
        }
      }
    }

    // クォータ制限をチェック
    if (selectedClient.quotaLimited && now < selectedClient.quotaLimitedUntil) {
      console.log(`[ClientManager] クォータ制限中: 解除まで${selectedClient.quotaLimitedUntil - now}ms`);
      // 別のクライアントを探す
      for (let i = 0; i < this.clients.length; i++) {
        const nextIndex = (this.currentIndex + i) % this.clients.length;
        const nextClient = this.clients[nextIndex];
        if (!nextClient.quotaLimited || now >= nextClient.quotaLimitedUntil) {
          this.currentIndex = nextIndex;
          selectedClient = nextClient;
          console.log(`[ClientManager] クォータ制限のためクライアントIDを切り替え: 新しいインデックス=${this.currentIndex}`);
          break;
        }
      }
    }

    // 使用時間を更新
    selectedClient.lastUsed = now;
    console.log(`[ClientManager] 選択されたクライアント: ID=${selectedClient.id}, 最終使用時間=${new Date(now).toISOString()}`);
    return { id: selectedClient.id, secret: selectedClient.secret };
  }

  setQuotaLimited(clientId: string) {
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      client.quotaLimited = true;
      client.consecutiveFailures++;
      
      // 連続失敗回数に応じて待機時間を指数関数的に延長
      const backoffTime = Math.min(
        CLIENT_CONFIG.INITIAL_BACKOFF * Math.pow(2, client.consecutiveFailures - 1),
        CLIENT_CONFIG.MAX_BACKOFF
      );
      
      // 連続失敗回数が上限に達した場合、より長い待機時間を設定
      if (client.consecutiveFailures >= CLIENT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
        // すべてのクライアントにグローバルクールダウンを適用
        this.clients.forEach(c => {
          c.quotaLimited = true;
          c.quotaLimitedUntil = Date.now() + CLIENT_CONFIG.GLOBAL_COOLDOWN;
        });
        console.log(`[ClientManager] 連続失敗回数が上限(${CLIENT_CONFIG.MAX_CONSECUTIVE_FAILURES}回)に達しました。グローバルクールダウンを設定します。`);
      } else {
        client.quotaLimitedUntil = Date.now() + backoffTime;
      }
      
      console.log(`[ClientManager] クライアントID ${clientId} にクォータ制限を設定しました（${new Date(client.quotaLimitedUntil).toISOString()}まで、連続失敗: ${client.consecutiveFailures}回、待機時間: ${backoffTime}ms）`);
    }
  }

  resetQuotaLimited(clientId: string) {
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      client.quotaLimited = false;
      client.quotaLimitedUntil = 0;
      client.consecutiveFailures = 0;
      console.log(`[ClientManager] クライアントID ${clientId} のクォータ制限を解除しました`);
    }
  }

  // API呼び出しを行う関数をラップして自動リトライを実装
  async executeWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    let lastError: any;

    while (retryCount <= API_LIMITS.MAX_RETRIES) {
      try {
        // リクエスト間隔を確保
        await new Promise(resolve => setTimeout(resolve, CLIENT_CONFIG.REQUEST_INTERVAL));
        
        // API呼び出しを実行
        const result = await apiCall();
        
        // 成功したらリトライカウントをリセット
        return result;
      } catch (error: any) {
        lastError = error;
        
        // クォータエラーかどうか確認
        if (error.message && API_LIMITS.QUOTA_ERROR_PATTERN.test(error.message)) {
          console.log(`[ClientManager] クォータ制限エラーを検出しました: ${error.message}`);
          const currentClient = this.clients[this.currentIndex];
          this.setQuotaLimited(currentClient.id);
          
          // 別のクライアントを試す
          this.getNextClient();
          await new Promise(resolve => setTimeout(resolve, CLIENT_CONFIG.REQUEST_INTERVAL));
          continue;
        }
        
        // その他のエラーの場合、指数バックオフで再試行
        retryCount++;
        if (retryCount <= API_LIMITS.MAX_RETRIES) {
          const delay = Math.min(
            API_LIMITS.INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1),
            API_LIMITS.MAX_RETRY_DELAY
          );
          console.log(`[ClientManager] リトライ ${retryCount}/${API_LIMITS.MAX_RETRIES}: ${delay}ms後に再試行します`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 最大リトライ回数に達した場合
    console.error(`[ClientManager] 最大リトライ回数(${API_LIMITS.MAX_RETRIES})に達しました`);
    throw lastError || new Error('APIリクエストが繰り返し失敗しました');
  }

  private async rotateClient() {
    const now = Date.now();
    console.log('[ClientManager] クライアントローテーション開始:', {
      currentClientIndex: this.currentIndex,
      totalClients: this.clients.length,
      lastRotation: this.lastRotation,
      timeSinceLastRotation: now - this.lastRotation
    });

    // 現在のクライアントの使用状況をログ
    if (this.clients[this.currentIndex]) {
      console.log('[ClientManager] 現在のクライアント使用状況:', {
        clientId: this.clients[this.currentIndex].id.substring(0, 10) + '....com',
        requestCount: this.clients[this.currentIndex].requestCount,
        lastUsed: this.clients[this.currentIndex].lastUsed,
        quotaResetTime: this.clients[this.currentIndex].quotaResetTime
      });
    }

    // ローテーション条件のチェック
    const shouldRotate = now - this.lastRotation >= this.rotationInterval;
    console.log('[ClientManager] ローテーション条件:', {
      shouldRotate,
      timeSinceLastRotation: now - this.lastRotation,
      rotationInterval: this.rotationInterval
    });

    if (shouldRotate) {
      this.currentIndex = (this.currentIndex + 1) % this.clients.length;
      this.lastRotation = now;
      console.log('[ClientManager] クライアントをローテーション:', {
        newClientIndex: this.currentIndex,
        newClientId: this.clients[this.currentIndex].id.substring(0, 10) + '....com'
      });
    }
  }
}

// クライアントマネージャーのインスタンス
const clientManager = new ClientManager();

// OAuth2クライアントの作成
export const createOAuth2Client = (): OAuth2Client => {
  try {
    const { id, secret } = clientManager.getNextClient();
    console.log('[ClientManager] OAuth2クライアントを作成:', {
      clientId: `${id.substring(0, 8)}...${id.substring(id.length - 4)}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
    });
    return new google.auth.OAuth2(
      id,
      secret,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`
    );
  } catch (error) {
    console.error('[ClientManager] OAuth2クライアントの作成に失敗:', error);
    throw error;
  }
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

// アカウント一覧を取得（バッチ処理対応）
export const getAccounts = async (tenantId: string, useCache: boolean = true): Promise<any[]> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_CONFIG.KEYS.ACCOUNTS(tenantId);
    const cachedAccounts = await fetchCache<any[]>(cacheKey, 'ACCOUNTS');
    if (cachedAccounts) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedAccounts;
    }
  }

  // キャッシュにない場合はAPIから取得（バッチ処理を使用）
  const accounts = await executeBatchRequest(async () => {
    return clientManager.executeWithRetry(async () => {
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
  });

  // 取得したデータをキャッシュに保存
  if (useCache && accounts.length > 0) {
    const cacheKey = CACHE_CONFIG.KEYS.ACCOUNTS(tenantId);
    await storeCache(cacheKey, accounts, 'ACCOUNTS');
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return accounts;
};

// 場所一覧を取得（バッチ処理対応）
export const getLocations = async (tenantId: string, accountId: string, useCache: boolean = true): Promise<any[]> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_CONFIG.KEYS.LOCATIONS(tenantId, accountId);
    const cachedLocations = await fetchCache<any[]>(cacheKey, 'LOCATIONS');
    if (cachedLocations) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedLocations;
    }
  }

  // キャッシュにない場合はAPIから取得（バッチ処理を使用）
  const locations = await executeBatchRequest(async () => {
    return clientManager.executeWithRetry(async () => {
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
  });

  // 取得したデータをキャッシュに保存
  if (useCache && locations.length > 0) {
    const cacheKey = CACHE_CONFIG.KEYS.LOCATIONS(tenantId, accountId);
    await storeCache(cacheKey, locations, 'LOCATIONS');
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return locations;
};

// レビュー一覧を取得（バッチ処理対応）
export const getReviews = async (
  tenantId: string, 
  locationId: string, 
  pageSize: number = 20, 
  pageToken?: string,
  useCache: boolean = true
): Promise<any> => {
  // キャッシュから取得を試みる
  if (useCache) {
    const cacheKey = CACHE_CONFIG.KEYS.REVIEWS(tenantId, locationId, pageSize, pageToken);
    const cachedReviews = await fetchCache<any>(cacheKey, 'REVIEWS');
    if (cachedReviews) {
      console.log(`[Cache] ${cacheKey} からキャッシュデータを使用します`);
      return cachedReviews;
    }
  }

  // キャッシュにない場合はAPIから取得（バッチ処理を使用）
  const reviews = await executeBatchRequest(async () => {
    return clientManager.executeWithRetry(async () => {
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
  });

  // 取得したデータをキャッシュに保存
  if (useCache && reviews) {
    const cacheKey = CACHE_CONFIG.KEYS.REVIEWS(tenantId, locationId, pageSize, pageToken);
    // レビューは頻繁に更新される可能性があるので短めのTTLを設定
    await storeCache(cacheKey, reviews, 'REVIEWS');
    console.log(`[Cache] ${cacheKey} にデータをキャッシュしました`);
  }

  return reviews;
};

// レビューに返信（バッチ処理対応）
export const replyToReview = async (tenantId: string, reviewId: string, replyText: string): Promise<any> => {
  return executeBatchRequest(async () => {
    return clientManager.executeWithRetry(async () => {
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
    });
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

// キャッシュの取得
async function fetchCache<T>(key: string, strategy: keyof typeof CACHE_CONFIG.STRATEGIES): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('*')
      .eq('cache_key', key)
      .single();

    if (error || !data) {
      return null;
    }

    // キャッシュの有効期限をチェック
    const expiryDate = new Date(data.expiry_date);
    if (new Date() >= expiryDate) {
      // 期限切れのキャッシュを削除
      await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', key);
      return null;
    }

    // キャッシュの有効性をチェック
    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    const strategyConfig = CACHE_CONFIG.STRATEGIES[strategy];
    
    if (cacheAge > strategyConfig.TTL) {
      console.log(`[Cache] ${key} のキャッシュが古いため無効化します（経過時間: ${cacheAge}ms）`);
      return null;
    }

    console.log(`[Cache] ${key} からキャッシュデータを使用します（経過時間: ${cacheAge}ms）`);
    return data.cache_data as T;
  } catch (error) {
    console.error('[Cache] キャッシュ取得エラー:', error);
    return null;
  }
}

// キャッシュの保存
async function storeCache<T>(key: string, data: T, strategy: keyof typeof CACHE_CONFIG.STRATEGIES): Promise<void> {
  try {
    const strategyConfig = CACHE_CONFIG.STRATEGIES[strategy];
    const expiryDate = new Date(Date.now() + strategyConfig.TTL);
    
    await supabase
      .from('api_cache')
      .upsert({
        cache_key: key,
        cache_data: data,
        expiry_date: expiryDate.toISOString(),
        created_at: new Date().toISOString(),
        priority: strategyConfig.PRIORITY
      });
      
    console.log(`[Cache] ${key} にデータをキャッシュしました（有効期限: ${expiryDate.toISOString()}）`);
  } catch (error) {
    console.error('[Cache] キャッシュ保存エラー:', error);
  }
} 