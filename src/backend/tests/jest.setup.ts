import { config } from 'dotenv';
import { Pool } from 'pg';

// テスト環境用の環境変数を読み込む
config({ path: '.env.test' });

// テスト用のデータベース接続
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// テスト用のデータベースクエリ関数
export const query = async (text: string, params?: any[]) => {
  return testPool.query(text, params);
};

// テスト用のデータベースクリーンアップ
export const cleanup = async () => {
  await testPool.query('DELETE FROM replies');
  await testPool.query('DELETE FROM reviews');
  await testPool.query('DELETE FROM locations');
  await testPool.query('DELETE FROM users');
  await testPool.end();
}; 