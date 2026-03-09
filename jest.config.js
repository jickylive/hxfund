/**
 * Jest 测试配置
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // 覆盖率配置
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/**/*.test.js',
    '!server/node_modules/**'
  ],

  // 覆盖率报告
  coverageReporters: ['text', 'lcov', 'html'],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1'
  },

  // 测试超时时间
  testTimeout: 10000,

  // 清除模拟
  clearMocks: true,

  // 重置模拟
  resetMocks: true,

  // 恢复模拟
  restoreMocks: true,

  // 详细输出
  verbose: true
};
