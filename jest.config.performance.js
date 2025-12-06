const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Jest configuration for performance tests
const customJestConfig = {
  displayName: 'performance',
  testEnvironment: 'node',
  testMatch: ['**/tests/performance/**/*.test.ts'],
  testTimeout: 30000, // 30 seconds timeout for performance tests
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Verbose output for performance tests
  verbose: true,
  // Don't run tests in parallel for more accurate performance measurements
  maxWorkers: 1,
  // Disable coverage for performance tests
  collectCoverage: false,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

module.exports = createJestConfig(customJestConfig);
