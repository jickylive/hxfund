/**
 * 黄氏家族寻根平台 - API 路由模块
 * 模块化API路由管理
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth.js');
const { rateLimiter } = require('../middleware/rate-limit.js');
const { validateRequest } = require('../middleware/validation.js');

const router = express.Router();

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'huangshi-genealogy-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '3.3.0'
  });
});

// 模型列表（GitCode 免费模型，后端现走 GitCode API；百炼模型不在 GitCode 上，调它们会返回“参数错误”）
router.get('/models', (req, res) => {
  const SUPPORTED_MODELS = [
    { id: 'deepseek-ai/DeepSeek-V4-Flash', name: 'DeepSeek V4 Flash', description: 'GitCode 免费，默认模型', default: true },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen3 32B', description: 'GitCode 免费' },
    { id: 'Qwen/Qwen3-30B-A3B', name: 'Qwen3 30B A3B', description: 'GitCode 免费' },
    { id: 'Qwen/Qwen3-30B-A3B-Instruct-2507', name: 'Qwen3 30B A3B Instruct', description: 'GitCode 免费' },
    { id: 'Qwen/Qwen3-30B-A3B-Thinking-2507', name: 'Qwen3 30B A3B Thinking', description: '思考模式，GitCode 免费' },
    { id: 'Qwen/Qwen3-4B-Instruct-2507', name: 'Qwen3 4B Instruct', description: '轻量快速，GitCode 免费' },
    { id: 'Qwen/Qwen2.5-VL-72B', name: 'Qwen2.5 VL 72B', description: '多模态，GitCode 免费' },
    { id: 'zai-org/GLM-5.1', name: 'GLM-5.1', description: 'GitCode 免费' },
  ];

  res.json({
    success: true,
    models: SUPPORTED_MODELS,
    default: SUPPORTED_MODELS.find(m => m.default)?.id || 'deepseek-ai/DeepSeek-V4-Flash'
  });
});

// 单次对话
router.post('/chat', 
  authenticateToken(), 
  rateLimiter.chat, 
  validateRequest(['prompt']), 
  async (req, res) => {
    try {
      const { prompt, model = 'deepseek-ai/DeepSeek-V4-Flash', temperature = 0.7 } = req.body;

      // 输入验证
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({
          error: 'prompt 必须是非空字符串',
          code: 'INVALID_PROMPT'
        });
      }

      if (prompt.trim().length > 5000) {
        return res.status(400).json({
          error: 'prompt 长度不能超过 5000 字符',
          code: 'PROMPT_TOO_LONG'
        });
      }

      // 调用Qwen API
      const { callQwenCli } = await import('../cli-wrapper.js');
      const result = await callQwenCli(prompt.trim(), { model, temperature });

      res.json({
        success: true,
        response: result.content,
        model,
        usage: result.usage,
        source: 'qwen-code-cli'
      });
    } catch (error) {
      console.error(`[API 错误] /api/chat: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CLI_ERROR'
      });
    }
  }
);

// 多轮对话
router.post('/conversation', 
  authenticateToken(), 
  rateLimiter.chat, 
  validateRequest(['message']), 
  async (req, res) => {
    try {
      const { message, model = 'deepseek-ai/DeepSeek-V4-Flash', temperature = 0.7, sessionId: reqSessionId } = req.body;

      // 输入验证
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'message 必须是非空字符串',
          code: 'INVALID_MESSAGE'
        });
      }

      if (message.trim().length > 5000) {
        return res.status(400).json({
          error: 'message 长度不能超过 5000 字符',
          code: 'MESSAGE_TOO_LONG'
        });
      }

      // 调用Qwen API
      const { callQwenCli } = await import('../cli-wrapper.js');
      const result = await callQwenCli(message.trim(), { model, temperature });

      res.json({
        success: true,
        response: result.content,
        model,
        usage: result.usage,
        sessionId: reqSessionId || 'temp-session-id', // 实际实现中应使用真实的会话管理
        source: 'qwen-code-cli'
      });
    } catch (error) {
      console.error(`[API 错误] /api/conversation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CLI_ERROR'
      });
    }
  }
);

// 认证相关路由
router.post('/auth/token', async (req, res) => {
  const { generateTokenHandler } = await import('../auth.js');
  generateTokenHandler(req, res);
});

router.post('/auth/client-token', async (req, res) => {
  const { loadAuthConfig } = await import('../auth.js');
  const config = loadAuthConfig();

  // 验证请求来源（同源检查）
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // 允许同源请求（localhost 或配置的域名）
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // 严格验证域名（防止绕过）
  const isExactMatch = origin && allowedOrigins.indexOf(origin) !== -1;
  const isHxfundDomain = origin && /^https?:\/\/([\w-]+\.)*hxfund\.cn(:\d+)?$/.test(origin);
  const isMy3wDomain = origin && /^https?:\/\/([\w-]+\.)*my3w\.com(:\d+)?$/.test(origin);
  const isApiHxfundDomain = origin === 'https://api.hxfund.cn';
  const isRefererValid = referer && (referer.includes('localhost') || referer.includes('hxfund.cn') || referer.includes('api.hxfund.cn'));

  // 允许不带 origin 的请求（同源请求）
  const isAllowed = !origin || isExactMatch || isHxfundDomain || isMy3wDomain || isApiHxfundDomain || isRefererValid;

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      error: '跨域请求禁止',
      code: 'CORS_FORBIDDEN'
    });
  }

  // 生成 Token（使用服务器 API Key）
  const { generateToken } = await import('../auth.js');
  const token = generateToken(
    {
      type: 'client_access',
      source: 'web'
    },
    config.jwtSecret
  );

  res.json({
    success: true,
    token,
    expiresIn: config.tokenExpiresIn,
    tokenType: 'Bearer'
  });
});

module.exports = router;
