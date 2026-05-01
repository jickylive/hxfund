/**
 * 黄氏家族寻根平台 - 速率限制中间件
 */

const rateLimit = require('express-rate-limit');
const winston = require('../config/logger');

// 默认配置
const DEFAULT_RATE_LIMITS = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
};

// 带日志审计的速率限制器生成器
function createLimiterWithLogging(options = {}) {
  return rateLimit({
    ...DEFAULT_RATE_LIMITS,
    ...options,
    handler: (req, res) => {
      // 记录限流日志
      winston.warn('API 限流触发', {
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        success: false,
        error: options.message || '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },
    skip: (req) => {
      // 健康检查端点跳过限流
      return req.path === '/api/health';
    }
  });
}

// 通用速率限制器
const generalLimiter = createLimiterWithLogging({
  max: 100,
});

// 聊天接口速率限制器
const chatLimiter = createLimiterWithLogging({
  max: 30, // 聊天接口限制更严格
  message: '聊天请求过于频繁，请稍后再试',
  windowMs: 15 * 60 * 1000,
});

// 登录接口速率限制器
const loginLimiter = createLimiterWithLogging({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 5, // 登录尝试限制
  message: '登录尝试过于频繁，请稍后再试',
});

module.exports = {
  rateLimiter: {
    general: generalLimiter,
    chat: chatLimiter,
    login: loginLimiter
  },
  createLimiterWithLogging
};
