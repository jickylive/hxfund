/**
 * 认证控制器
 * 处理所有认证相关的HTTP请求
 */

const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * 认证控制器
 */
const authController = {
  /**
   * 获取访问Token
   * POST /api/auth/token
   */
  getToken: asyncHandler(async (req, res) => {
    const { apiKey: clientKey } = req.body;

    logger.info('获取访问Token请求');

    // 验证客户端密钥
    if (!authService.validateAPIKey(clientKey)) {
      return res.status(403).json({
        success: false,
        error: '无效的客户端密钥',
        code: 'INVALID_CLIENT_KEY'
      });
    }

    // 生成Token
    const token = authService.generateJWTToken({
      type: 'access',
      timestamp: Date.now()
    });

    const config = authService.config;

    res.json({
      success: true,
      token,
      expiresIn: config.tokenExpiresIn,
      tokenType: 'Bearer'
    });
  }),

  /**
   * 客户端获取Token的代理端点
   * POST /api/auth/client-token
   */
  getClientToken: asyncHandler(async (req, res) => {
    logger.info('客户端获取Token请求');

    // 验证请求来源（同源检查）
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // 允许的来源列表
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    // 严格验证域名
    const isExactMatch = origin && allowedOrigins.indexOf(origin) !== -1;
    const isHxfundDomain = origin && /^https?:\/\/([\w-]+\.)*hxfund\.cn(:\d+)?$/.test(origin);
    const isMy3wDomain = origin && /^https?:\/\/([\w-]+\.)*my3w\.com(:\d+)?$/.test(origin);
    const isApiHxfundDomain = origin === 'https://api.hxfund.cn';
    const isRefererValid = referer && (referer.includes('localhost') || referer.includes('hxfund.cn') || referer.includes('api.hxfund.cn'));

    const isAllowed = !origin || isExactMatch || isHxfundDomain || isMy3wDomain || isApiHxfundDomain || isRefererValid;

    if (!isAllowed) {
      logger.warn('跨域请求禁止', { origin, referer });
      return res.status(403).json({
        success: false,
        error: '跨域请求禁止',
        code: 'CORS_FORBIDDEN'
      });
    }

    // 生成客户端Token
    const clientToken = authService.generateClientToken();

    res.json(clientToken);
  }),

  /**
   * 获取认证状态
   * GET /api/auth/status
   */
  getStatus: asyncHandler(async (req, res) => {
    logger.info('获取认证状态请求');

    const status = authService.getAuthStatus();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // 获取速率限制状态
    const rateLimitStatus = require('../auth').rateLimiter.getStatus(clientIp);

    res.json({
      success: true,
      authenticated: true,
      rateLimit: rateLimitStatus,
      config: status
    });
  }),

  /**
   * 刷新Token
   * POST /api/auth/refresh
   */
  refreshToken: asyncHandler(async (req, res) => {
    const { token } = req.body;

    logger.info('刷新Token请求');

    const newToken = authService.refreshToken(token);

    res.json(newToken);
  }),

  /**
   * 验证Token
   * POST /api/auth/verify
   */
  verifyToken: asyncHandler(async (req, res) => {
    const { token } = req.body;

    logger.info('验证Token请求');

    const decoded = authService.validateJWTToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: '无效的Token',
        code: 'INVALID_TOKEN'
      });
    }

    res.json({
      success: true,
      valid: true,
      decoded
    });
  }),

  /**
   * 生成API密钥
   * POST /api/auth/api-key
   */
  generateAPIKey: asyncHandler(async (req, res) => {
    logger.info('生成API密钥请求');

    const apiKey = authService.generateAPIKey();

    res.json({
      success: true,
      apiKey,
      message: 'API密钥已生成，请妥善保存'
    });
  }),

  /**
   * 验证API密钥
   * POST /api/auth/api-key/verify
   */
  verifyAPIKey: asyncHandler(async (req, res) => {
    const { apiKey } = req.body;

    logger.info('验证API密钥请求');

    const isValid = authService.validateAPIKey(apiKey);

    res.json({
      success: true,
      valid: isValid
    });
  })
};

module.exports = authController;
