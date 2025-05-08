import { Redis } from '@upstash/redis';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'ai-reply:';

// キャッシュの有効期限（秒）
export const CACHE_TTL = {
  SHORT: 60 * 5, // 5分
  MEDIUM: 60 * 60, // 1時間
  LONG: 60 * 60 * 24, // 1日
  WEEK: 60 * 60 * 24 * 7, // 1週間
};

// インメモリキャッシュ
const memoryCache: Record<string, { value: any; expiry: number }> = {};

// Redis接続
let redisClient: Redis | null = null;

// Redis接続を初期化
const initRedis = () => {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
    return null;
  }

  try {
    return new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    });
  } catch (error) {
    console.error('Redis初期化エラー:', error);
    return null;
  }
};

// キャッシュに保存
export const setCache = async <T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.MEDIUM,
  useRedis: boolean = true
): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const expiry = Date.now() + ttl * 1000;

  // インメモリキャッシュに保存
  memoryCache[cacheKey] = { value, expiry };

  // Redisが有効で接続されている場合はRedisにも保存
  if (useRedis) {
    try {
      if (!redisClient) {
        redisClient = initRedis();
      }

      if (redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(value), { ex: ttl });
      }
    } catch (error) {
      console.error('Redisキャッシュ保存エラー:', error);
    }
  }
};

// キャッシュから取得
export const getCache = async <T>(
  key: string,
  useRedis: boolean = true
): Promise<T | null> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();

  // まずインメモリキャッシュをチェック
  const memoryItem = memoryCache[cacheKey];
  if (memoryItem && memoryItem.expiry > now) {
    return memoryItem.value as T;
  }

  // インメモリにない場合はRedisをチェック
  if (useRedis) {
    try {
      if (!redisClient) {
        redisClient = initRedis();
      }

      if (redisClient) {
        const redisValue = await redisClient.get(cacheKey);
        if (redisValue) {
          // Redisから取得した値をインメモリにも保存
          const parsedValue = JSON.parse(redisValue as string);
          const ttl = await redisClient.ttl(cacheKey);
          const expiry = Date.now() + (ttl > 0 ? ttl * 1000 : CACHE_TTL.MEDIUM * 1000);
          memoryCache[cacheKey] = { value: parsedValue, expiry };
          return parsedValue;
        }
      }
    } catch (error) {
      console.error('Redisキャッシュ取得エラー:', error);
    }
  }

  return null;
};

// キャッシュから削除
export const deleteCache = async (
  key: string,
  useRedis: boolean = true
): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;

  // インメモリキャッシュから削除
  delete memoryCache[cacheKey];

  // Redisからも削除
  if (useRedis) {
    try {
      if (!redisClient) {
        redisClient = initRedis();
      }

      if (redisClient) {
        await redisClient.del(cacheKey);
      }
    } catch (error) {
      console.error('Redisキャッシュ削除エラー:', error);
    }
  }
};

// プレフィックスに基づくキャッシュの一括削除
export const deleteCacheByPrefix = async (
  prefix: string,
  useRedis: boolean = true
): Promise<void> => {
  const fullPrefix = `${CACHE_PREFIX}${prefix}`;

  // インメモリキャッシュから該当するプレフィックスを持つキーを削除
  Object.keys(memoryCache).forEach((key) => {
    if (key.startsWith(fullPrefix)) {
      delete memoryCache[key];
    }
  });

  // Redisからも削除
  if (useRedis) {
    try {
      if (!redisClient) {
        redisClient = initRedis();
      }

      if (redisClient) {
        const keys = await redisClient.keys(`${fullPrefix}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
    } catch (error) {
      console.error('Redisキャッシュ一括削除エラー:', error);
    }
  }
};

// インメモリキャッシュのクリーンアップ（定期的に期限切れのアイテムを削除）
const cleanupMemoryCache = () => {
  const now = Date.now();
  Object.keys(memoryCache).forEach((key) => {
    if (memoryCache[key].expiry < now) {
      delete memoryCache[key];
    }
  });
};

// 5分ごとにクリーンアップを実行
if (typeof window === 'undefined') { // サーバーサイドでのみ実行
  setInterval(cleanupMemoryCache, 5 * 60 * 1000);
} 