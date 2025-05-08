const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // next.config.jsとテスト環境用の.envファイルが配置されたディレクトリをセット
  dir: './',
});

// Jestのカスタム設定を設置する場所
const customJestConfig = {
  // テスト前に毎回実行されるスクリプトを追加
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // jsdomテスト環境を使用
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    // エイリアスを定義（tsconfig.jsonと合わせる）
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// createJestConfigを定義することによって、jest.config.jsファイルにアクセスした際に、
// Next.jsの設定を反映した設定オブジェクトを返す
module.exports = createJestConfig(customJestConfig); 