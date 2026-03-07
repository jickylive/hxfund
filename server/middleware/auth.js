/**
 * 黄氏家族寻根平台 - 认证中间件
 */

import { loadAuthConfig, verifyToken } from './auth.js';

export function authenticateToken(options = {}) {
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
    if (apiKeyHeader && apiKeyHeader !== config.serverApiKey) {
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

    // 认证通过，继续处理
    next();
  };
}