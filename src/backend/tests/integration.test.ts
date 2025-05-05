import request from 'supertest';
import { app } from '../app';
import { db } from '../database';
import { AuthUser } from '../types/auth';

describe('統合テスト', () => {
  let authToken: string;
  let csrfToken: string;

  beforeAll(async () => {
    // テスト用のユーザーを作成
    await db.query<AuthUser>(
      `INSERT INTO users (email, password, role, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['test@example.com', 'password', 'admin', 'test-tenant-id']
    );

    // 認証トークンを取得
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password'
      });

    authToken = response.body.data.token;
    csrfToken = response.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    // テスト用のデータを削除
    await db.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  describe('店舗管理', () => {
    it('店舗の作成と取得が正常に動作する', async () => {
      // 店舗の作成
      const createResponse = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'テスト店舗',
          tone: '丁寧',
          line_user_id: 'test-line-id'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data).toHaveProperty('id');

      // 店舗一覧の取得
      const getResponse = await request(app)
        .get('/api/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data).toContainEqual(
        expect.objectContaining({
          name: 'テスト店舗',
          tone: '丁寧'
        })
      );
    });
  });

  describe('レビュー管理', () => {
    it('レビューの取得と更新が正常に動作する', async () => {
      // レビュー一覧の取得
      const getResponse = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .query({
          page: 1,
          limit: 10
        });

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty('data');
      expect(getResponse.body).toHaveProperty('pagination');

      // レビューの更新
      if (getResponse.body.data.length > 0) {
        const reviewId = getResponse.body.data[0].id;
        const updateResponse = await request(app)
          .put(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({
            status: 'responded'
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.status).toBe('responded');
      }
    });
  });

  describe('返信管理', () => {
    it('返信の生成と更新が正常に動作する', async () => {
      // レビューを取得
      const reviewsResponse = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken);

      if (reviewsResponse.body.data.length > 0) {
        const reviewId = reviewsResponse.body.data[0].id;

        // 返信の生成
        const generateResponse = await request(app)
          .post('/api/replies/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({
            review_id: reviewId,
            tone: '丁寧'
          });

        expect(generateResponse.status).toBe(201);
        expect(generateResponse.body.data).toHaveProperty('content');

        // 返信の更新
        const updateResponse = await request(app)
          .put(`/api/replies/${generateResponse.body.data.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({
            content: '更新された返信',
            status: 'published'
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.content).toBe('更新された返信');
        expect(updateResponse.body.data.status).toBe('published');
      }
    });
  });
}); 