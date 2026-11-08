/**
 * 安全中间件
 * 提供请求验证、CSRF 保护、安全头等安全功能
 */

const crypto = require('crypto');
const { maskObject } = require('../config/security');
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

// 注意：日志脱敏不在这里做。本模块曾提供 logSanitizer 中间件原地改写
// req.body/req.query，但它在 bodyParser 之前装配（body 分支是死代码），
// query 分支又会破坏读取原值的路由。脱敏现在统一在 httpLogger 记录时
// 对副本执行（见 middleware/http-logger.js）。

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
  // 跳过静态文件请求（CSS、JS、图片等）
  const staticExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i;
  const isStaticFile = staticExtensions.test(req.path);
  if (isStaticFile) {
    return next();
  }

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
 * 全局请求频率限制（IP 维度，固定窗口）
 *
 * 设计说明：
 * - 仅按 IP 限制。本服务暂无真实用户体系（users 表为空），此前的"用户维度"
 *   只能取到 'anonymous'，等于全体访客共享一个全局上限——与 Cloudflare 后
 *   缺少 trust proxy 叠加，是生产 429 误伤的根因之一。用户体系落地后再引入
 *   按用户限制。
 * - 固定窗口（windowStart + windowMs）到期清零。此前实现每次请求刷新
 *   timestamp，活跃 IP 的计数永不重置，触发上限后一直 429 直到服务重启。
 * - 生产位于 Cloudflare 后，需 app.set('trust proxy', 1)（index.js 已设置），
 *   否则 req.ip 是代理出口 IP，全体访客落入同一桶。
 */
function enhancedRateLimit(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 分钟
    maxRequests = 30,
    skipSuccessfulRequests = false,
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    // 跳过公开端点（健康检查、文档、模型列表），避免 Docker 健康检查
    // 与高频公开查询触发限流导致容器被判 unhealthy
    const skipPaths = ['/api/health', '/api/docs', '/api/models'];
    if (skipPaths.includes(req.path)) {
      return next();
    }

    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress;

    // 清理过期窗口
    for (const [key, data] of requests.entries()) {
      if (now - data.windowStart > windowMs) {
        requests.delete(key);
      }
    }

    // 固定窗口到期则重置计数
    const ipKey = `ip:${ip}`;
    let ipData = requests.get(ipKey);
    if (!ipData || now - ipData.windowStart >= windowMs) {
      ipData = { count: 0, windowStart: now };
      requests.set(ipKey, ipData);
    }

    if (ipData.count >= maxRequests) {
      logger.warn('IP 请求频率超限', { ip, count: ipData.count });
      return res.status(429).json({
        success: false,
        error: '请求过于频繁',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((ipData.windowStart + windowMs - now) / 1000)
      });
    }

    ipData.count++;

    // 成功请求后减少计数（可选）
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          ipData.count--;
        }
      });
    }

    next();
  };
}

module.exports = {
  sensitiveDataFilter,
  requestId,
  securityHeaders,
  requestSizeLimit,
  userAgentValidator,
  ipWhitelist,
  enhancedRateLimit,
};
