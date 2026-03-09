/**
 * 安全中间件
 * 提供请求验证、CSRF 保护、安全头等安全功能
 */

const crypto = require('crypto');
const { maskObject, generateCSRFToken, verifyCSRFToken } = require('../config/security');
const logger = require('../config/logger');

/**
 * 敏感数据过滤中间件
 * 自动过滤请求和响应中的敏感数据
 */
function sensitiveDataFilter(req, res, next) {
  // 拦截响应，过滤敏感数据
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      // 尝试解析 JSON
      if (typeof data === 'string') {
        try {
          const jsonData = JSON.parse(data);
          const masked = maskObject(jsonData);
          data = JSON.stringify(masked);
        } catch (e) {
          // 不是 JSON，不做处理
        }
      } else if (typeof data === 'object') {
        data = maskObject(data);
      }
    } catch (error) {
      logger.warn('敏感数据过滤失败', { error: error.message });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * 请求日志脱敏中间件
 * 确保日志中不记录敏感信息
 */
function logSanitizer(req, res, next) {
  // 过滤请求体中的敏感数据
  if (req.body) {
    req.body = maskObject(req.body);
  }
  
  // 过滤查询参数中的敏感数据
  if (req.query) {
    req.query = maskObject(req.query);
  }
  
  next();
}

/**
 * 请求 ID 生成中间件
 * 为每个请求生成唯一 ID，便于追踪
 */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * 安全头增强中间件
 * 添加额外的安全头
 */
function securityHeaders(req, res, next) {
  // 已在主文件中使用 Helmet.js，这里添加额外的安全头
  
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');
  
  // 防止 MIME 类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS 保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 权限策略
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * 请求大小限制中间件
 */
function requestSizeLimit(maxSize = '10mb') {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: '请求体过大',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    
    next();
  };
}

/**
 * 解析大小字符串
 */
function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * (units[unit] || 1);
}

/**
 * 用户代理验证中间件
 * 拒绝已知的恶意用户代理
 */
function userAgentValidator(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  
  // 已知的恶意用户代理模式
  const maliciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /perl/i,
    /java/i,
  ];
  
  // 允许搜索引擎爬虫
  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
  ];
  
  // 检查是否是允许的爬虫
  const isAllowedBot = allowedBots.some(pattern => pattern.test(userAgent));
  
  // 检查是否是恶意爬虫
  const isMalicious = maliciousPatterns.some(pattern => {
    if (isAllowedBot) return false;
    return pattern.test(userAgent);
  });
  
  if (isMalicious) {
    logger.warn('检测到可疑的用户代理', { userAgent, ip: req.ip });
    return res.status(403).json({
      success: false,
      error: '访问被拒绝',
      code: 'FORBIDDEN_USER_AGENT'
    });
  }
  
  next();
}

/**
 * IP 白名单验证中间件
 */
function ipWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP 不在白名单中', { ip: clientIP, allowedIPs });
      return res.status(403).json({
        success: false,
        error: '访问被拒绝',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
}

/**
 * 请求频率限制增强
 * 基于用户和 IP 的双重限制
 */
function enhancedRateLimit(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 分钟
    maxRequests = 30,
    maxRequestsPerUser = 10,
    skipSuccessfulRequests = false,
  } = options;
  
  const requests = new Map();
  
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || req.session?.userId || 'anonymous';
    
    // 清理过期记录
    for (const [key, data] of requests.entries()) {
      if (now - data.timestamp > windowMs) {
        requests.delete(key);
      }
    }
    
    // IP 限制
    const ipKey = `ip:${ip}`;
    const ipData = requests.get(ipKey) || { count: 0, timestamp: now };
    
    if (ipData.count >= maxRequests) {
      logger.warn('IP 请求频率超限', { ip, count: ipData.count });
      return res.status(429).json({
        success: false,
        error: '请求过于频繁',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((windowMs - (now - ipData.timestamp)) / 1000)
      });
    }
    
    // 用户限制
    const userKey = `user:${userId}`;
    const userData = requests.get(userKey) || { count: 0, timestamp: now };
    
    if (userData.count >= maxRequestsPerUser) {
      logger.warn('用户请求频率超限', { userId, count: userData.count });
      return res.status(429).json({
        success: false,
        error: '请求过于频繁',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((windowMs - (now - userData.timestamp)) / 1000)
      });
    }
    
    // 更新计数
    ipData.count++;
    ipData.timestamp = now;
    requests.set(ipKey, ipData);
    
    userData.count++;
    userData.timestamp = now;
    requests.set(userKey, userData);
    
    // 成功请求后减少计数（可选）
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          ipData.count--;
          userData.count--;
        }
      });
    }
    
    next();
  };
}

module.exports = {
  sensitiveDataFilter,
  logSanitizer,
  requestId,
  securityHeaders,
  requestSizeLimit,
  userAgentValidator,
  ipWhitelist,
  enhancedRateLimit,
};
