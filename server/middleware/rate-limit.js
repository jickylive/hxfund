/**
 * 黄氏家族寻根平台 - 速率限制中间件
 */

import rateLimit from 'express-rate-limit';

// 默认配置
const DEFAULT_RATE_LIMITS = {
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
};

// 通用速率限制器
const generalLimiter = rateLimit({
  ...DEFAULT_RATE_LIMITS,
  max: 100,
});

// 聊天接口速率限制器
const chatLimiter = rateLimit({
  ...DEFAULT_RATE_LIMITS,
  max: 30, // 聊天接口限制更严格
  message: '聊天请求过于频繁，请稍后再试'
});

// 登录接口速率限制器
const loginLimiter = rateLimit({
  ...DEFAULT_RATE_LIMITS,
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 5, // 登录尝试限制
  message: '登录尝试过于频繁，请稍后再试'
});

export const rateLimiter = {
  general: generalLimiter,
  chat: chatLimiter,
  login: loginLimiter
};