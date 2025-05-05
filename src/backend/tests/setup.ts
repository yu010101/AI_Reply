import { config } from 'dotenv';

// テスト環境用の環境変数を読み込む
config({ path: '.env.test' });

// テスト用のモック設定
jest.mock('../database', () => ({
  query: jest.fn(),
}));

// テスト用のRedisモック
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  }));
}); 