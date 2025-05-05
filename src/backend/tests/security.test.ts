import { Request, Response } from 'express';
import { csrfProtection, sanitizeInput } from '../middleware/security';
import { validateRequest, ValidationRule } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimit';

describe('セキュリティ対策のテスト', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      body: {},
      query: {},
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('CSRF対策', () => {
    it('CSRFトークンが正しい場合、next()が呼ばれる', () => {
      const token = 'valid-token';
      mockReq.headers = { 'x-csrf-token': token };
      mockReq.cookies = { 'csrf-token': token };

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('CSRFトークンが無効な場合、403エラーが返される', () => {
      mockReq.headers = { 'x-csrf-token': 'invalid-token' };
      mockReq.cookies = { 'csrf-token': 'different-token' };

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: '403',
          message: 'CSRFトークンが無効です'
        }
      });
    });
  });

  describe('XSS対策', () => {
    it('HTMLタグを含む入力値がサニタイズされる', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      mockReq.body = { content: maliciousInput };
      mockReq.query = { search: maliciousInput };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).not.toContain('<script>');
      expect(mockReq.query.search).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('入力値のバリデーション', () => {
    const validationRules: ValidationRule[] = [
      { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'age', required: true, type: 'number' }
    ];

    it('必須項目が不足している場合、400エラーが返される', () => {
      mockReq.body = {};

      validateRequest(validationRules)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: '400',
          message: '入力値が不正です',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name', message: 'nameは必須です' }),
            expect.objectContaining({ field: 'age', message: 'ageは必須です' })
          ])
        }
      });
    });

    it('型が不正な場合、400エラーが返される', () => {
      mockReq.body = { name: 123, age: 'invalid' };

      validateRequest(validationRules)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: '400',
          message: '入力値が不正です',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name', message: 'nameは文字列である必要があります' }),
            expect.objectContaining({ field: 'age', message: 'ageは数値である必要があります' })
          ])
        }
      });
    });
  });

  describe('レート制限', () => {
    it('制限を超えた場合、429エラーが返される', () => {
      // レート制限を超えるリクエストをシミュレート
      for (let i = 0; i < 11; i++) {
        rateLimiter(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: '429',
          message: 'リクエスト制限を超えました。しばらく待ってから再度お試しください。'
        }
      });
    });
  });
}); 