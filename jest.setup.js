// jest-dom adds custom jest matchers for asserting on DOM nodes
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// モック
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            }
          }
        }
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
  },
}));

// fetch のモック
global.fetch = jest.fn();

// テスト環境用の環境変数設定
process.env.STRIPE_SECRET_KEY = 'test_key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'test_publishable_key';
process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';

// グローバルなモックの設定
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
}); 