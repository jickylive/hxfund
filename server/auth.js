/**
 * 黄氏家族寻根平台 - API 认证模块
 * 
 * 功能：
 * - API Key 验证
 * - JWT Token 生成和验证
 * - 速率限制
 * - 请求签名验证
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 配置文件路径
const CONFIG_DIR = path.join(__dirname, 'config');
const AUTH_CONFIG_FILE = path.join(CONFIG_DIR, 'auth.json');

// 默认配置
const DEFAULT_AUTH_CONFIG = {
  // 服务器内部 API Key（用于前端调用）
  serverApiKey: '',
  // JWT 密钥
  jwtSecret: '',
  // Token 有效期（毫秒）
  tokenExpiresIn: 24 * 60 * 60 * 1000, // 24 小时
  // 速率限制配置
  rateLimit: {
    windowMs: 60 * 1000, // 1 分钟窗口
    maxRequests: 30, // 每分钟最多 30 次请求
    maxChatRequests: 10 // 聊天接口每分钟最多 10 次
  },
  // 允许的 API Keys 列表（可用于外部服务）
  allowedApiKeys: []
};

/**
 * 生成随机字符串
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成 API Key
 */
function generateApiKey() {
  return 'hs_' + generateRandomString(32); // huangshi 前缀
}

/**
 * 恒定时间比较（防 timing 攻击）
 * 长度不同或非字符串直接返回 false
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 加载认证配置
 */
function loadAuthConfig() {
  try {
    if (fs.existsSync(AUTH_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(AUTH_CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_AUTH_CONFIG, ...config };
    }
  } catch (error) {
    console.error('读取认证配置失败:', error.message);
  }

  // 如果配置文件不存在，创建默认配置
  console.log('⚠️  认证配置文件不存在，将创建新配置');
  initAuthConfig();
  return { ...DEFAULT_AUTH_CONFIG };
}

/**
 * 初始化认证配置（仅在文件不存在时创建）
 */
function initAuthConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // 如果配置文件已存在，不覆盖
    if (fs.existsSync(AUTH_CONFIG_FILE)) {
      const existingConfig = JSON.parse(fs.readFileSync(AUTH_CONFIG_FILE, 'utf-8'));
      console.log('✓ 认证配置已加载（文件已存在）');
      return existingConfig;
    }

    const config = {
      ...DEFAULT_AUTH_CONFIG,
      serverApiKey: generateApiKey(),
      jwtSecret: generateRandomString(64),
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(AUTH_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✓ 认证配置已初始化');
    return config;
  } catch (error) {
    console.error('初始化认证配置失败:', error.message);
    return null;
  }
}

/**
 * 保存认证配置
 */
function saveAuthConfig(config) {
  try {
    fs.writeFileSync(AUTH_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存认证配置失败:', error.message);
    return false;
  }
}

/**
 * 生成 JWT Token
 */
function generateToken(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const expiresIn = Math.floor(Date.now() / 1000) + Math.floor(DEFAULT_AUTH_CONFIG.tokenExpiresIn / 1000);
  const tokenPayload = {
    ...payload,
    exp: expiresIn,
    iat: Math.floor(Date.now() / 1000)
  };

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64url');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * 验证 JWT Token
 */
function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Token 格式错误' };
    }

    const [headerEncoded, payloadEncoded, signature] = parts;
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64url');

    if (!safeEqual(signature, expectedSignature)) {
      return { valid: false, error: 'Token 签名无效' };
    }

    // 解析 payload
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf-8'));

    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token 已过期', expired: true };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: `Token 验证失败：${error.message}` };
  }
}

/**
 * 生成请求签名
 */
function generateSignature(method, path, timestamp, body, apiKey) {
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body) || '').digest('hex');
  const signString = `${method}:${path}:${timestamp}:${bodyHash}:${apiKey}`;
  return crypto.createHmac('sha256', apiKey).update(signString).digest('hex');
}

/**
 * 验证请求签名
 */
function verifySignature(method, path, timestamp, body, signature, apiKey) {
  // 检查时间戳（允许 5 分钟误差）
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) {
    return { valid: false, error: '请求时间戳过期' };
  }

  const expectedSignature = generateSignature(method, path, timestamp, body, apiKey);
  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false, error: '请求签名无效' };
  }

  return { valid: true };
}

/**
 * 速率限制器
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.chatRequests = new Map();
    
    // 每分钟清理一次
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * 检查请求是否超过限制
   */
  checkLimit(ip, isChatEndpoint = false) {
    const now = Date.now();
    const windowMs = DEFAULT_AUTH_CONFIG.rateLimit.windowMs;
    const maxRequests = isChatEndpoint 
      ? DEFAULT_AUTH_CONFIG.rateLimit.maxChatRequests 
      : DEFAULT_AUTH_CONFIG.rateLimit.maxRequests;

    // 清理过期记录
    const cleanup = (map) => {
      for (const [key, timestamps] of map.entries()) {
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
        if (validTimestamps.length === 0) {
          map.delete(key);
        } else {
          map.set(key, validTimestamps);
        }
      }
    };

    cleanup(this.requests);
    cleanup(this.chatRequests);

    // 获取当前窗口内的请求数
    const map = isChatEndpoint ? this.chatRequests : this.requests;
    const timestamps = map.get(ip) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs
      };
    }

    // 添加当前请求
    validTimestamps.push(now);
    map.set(ip, validTimestamps);

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length,
      resetAt: now + windowMs
    };
  }

  cleanup() {
    const now = Date.now();
    const windowMs = DEFAULT_AUTH_CONFIG.rateLimit.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }

    for (const [key, timestamps] of this.chatRequests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
      if (validTimestamps.length === 0) {
        this.chatRequests.delete(key);
      } else {
        this.chatRequests.set(key, validTimestamps);
      }
    }
  }

  /**
   * 获取速率限制状态
   */
  getStatus(ip) {
    const now = Date.now();
    const windowMs = DEFAULT_AUTH_CONFIG.rateLimit.windowMs;
    
    const generalRequests = (this.requests.get(ip) || []).filter(ts => now - ts < windowMs).length;
    const chatRequests = (this.chatRequests.get(ip) || []).filter(ts => now - ts < windowMs).length;

    return {
      general: {
        used: generalRequests,
        limit: DEFAULT_AUTH_CONFIG.rateLimit.maxRequests,
        remaining: Math.max(0, DEFAULT_AUTH_CONFIG.rateLimit.maxRequests - generalRequests)
      },
      chat: {
        used: chatRequests,
        limit: DEFAULT_AUTH_CONFIG.rateLimit.maxChatRequests,
        remaining: Math.max(0, DEFAULT_AUTH_CONFIG.rateLimit.maxChatRequests - chatRequests)
      }
    };
  }
}

// 导出单例
const rateLimiter = new RateLimiter();

/**
 * Express 认证中间件
 */
function authMiddleware(options = {}) {
  return (req, res, next) => {
    const config = loadAuthConfig();

    // 跳过健康检查和文档接口（公开接口）
    const skipPaths = ['/api/health', '/api/docs', '/api/models'];
    if (skipPaths.includes(req.path)) {
      return next();
    }

    // 获取请求头中的认证信息
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const timestampHeader = req.headers['x-timestamp'];
    const signatureHeader = req.headers['x-signature'];

    // CORS 预检请求直接通过
    if (req.method === 'OPTIONS') {
      return next();
    }

    // 验证 API Key 或 Token（同源请求也需要认证，防止 CSRF）
    if (!apiKeyHeader && !authHeader) {
      return res.status(401).json({
        success: false,
        error: '缺少认证信息',
        code: 'MISSING_AUTH'
      });
    }

    // 验证服务器 API Key
    if (apiKeyHeader && !safeEqual(apiKeyHeader, config.serverApiKey)) {
      return res.status(403).json({
        success: false,
        error: '无效的 API Key',
        code: 'INVALID_API_KEY'
      });
    }

    // 验证 JWT Token
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const result = verifyToken(token, config.jwtSecret);
      
      if (!result.valid) {
        return res.status(401).json({
          success: false,
          error: result.error,
          code: result.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
        });
      }
    }

    // 验证请求签名（如果提供了）
    if (signatureHeader && timestampHeader && apiKeyHeader) {
      const signatureResult = verifySignature(
        req.method,
        req.path,
        parseInt(timestampHeader),
        req.body,
        signatureHeader,
        apiKeyHeader
      );

      if (!signatureResult.valid) {
        return res.status(403).json({
          success: false,
          error: signatureResult.error,
          code: 'INVALID_SIGNATURE'
        });
      }
    }

    // 速率限制检查
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const isChatEndpoint = req.path === '/api/chat' || req.path === '/api/conversation';
    const rateLimitResult = rateLimiter.checkLimit(clientIp, isChatEndpoint);

    // 添加速率限制响应头
    res.set('X-RateLimit-Limit', String(isChatEndpoint 
      ? DEFAULT_AUTH_CONFIG.rateLimit.maxChatRequests 
      : DEFAULT_AUTH_CONFIG.rateLimit.maxRequests));
    res.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    res.set('X-RateLimit-Reset', String(rateLimitResult.resetAt));

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      });
    }

    // 认证通过，继续处理
    next();
  };
}

/**
 * 生成 Token API 处理器
 */
function generateTokenHandler(req, res) {
  const config = loadAuthConfig();
  const { apiKey } = req.body;

  // 验证 API Key
  if (!apiKey || !safeEqual(apiKey, config.serverApiKey)) {
    return res.status(403).json({
      success: false,
      error: '无效的 API Key',
      code: 'INVALID_API_KEY'
    });
  }

  // 生成 Token
  const token = generateToken(
    { 
      type: 'api_access',
      apiKey: apiKey.substring(0, 8) + '...' 
    },
    config.jwtSecret
  );

  res.json({
    success: true,
    token,
    expiresIn: DEFAULT_AUTH_CONFIG.tokenExpiresIn,
    tokenType: 'Bearer'
  });
}

module.exports = {
  // 配置管理
  loadAuthConfig,
  initAuthConfig,
  saveAuthConfig,
  generateApiKey,
  
  // Token 管理
  generateToken,
  verifyToken,
  generateTokenHandler,
  
  // 签名验证
  generateSignature,
  verifySignature,

  // 安全比较
  safeEqual,
  
  // 速率限制
  rateLimiter,
  
  // 中间件
  authMiddleware
};
