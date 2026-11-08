/**
 * 黄氏家族寻根平台 - Qwen AI API 服务
 * 基于阿里云百炼 Coding Plan 套餐
 *
 * API 文档：/api/docs
 * 健康检查：/api/health
 *
 * 部署说明:
 * 1. 复制 config/.env.example 为 config/.env
 * 2. 配置 QWEN_API_KEY
 * 3. 运行：npm start
 *
 * 统一使用 qwen-code.js CLI 工具调用 AI
 */

// 初始化 Sentry 错误监控（首先加载）
const { initSentry, setupGlobalHandlers, setupExpressIntegration } = require('./sentry');
initSentry();
setupGlobalHandlers();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
const https = require('https');
const http = require('http');

// 引入统一日志管理
const logger = require('./config/logger');
const httpLogger = require('./middleware/http-logger');

// 引入统一错误处理
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 引入安全中间件
const { 
  requestId, 
  securityHeaders, 
  userAgentValidator,
  enhancedRateLimit 
} = require('./middleware/security');

// 引入性能监控
const { performanceMiddleware, setupMonitoringRoutes } = require('./config/monitoring');

// 引入 CLI 封装模块 - 统一调用入口
const { callQwenCli, isCliConfigured, getCliConfig, CLI_PATH } = require('./cli-wrapper');

// 引入认证模块
const {
  authMiddleware,
  initAuthConfig,
  loadAuthConfig,
  generateTokenHandler,
  generateToken,
  safeEqual
} = require('./auth');

// 引入 Redis 会话存储
const sessionStore = require('./session-store');

// 引入 AI 免费额度跟踪（提供默认模型前先查额度）
const quotaService = require('./services/quotaService');

// 引入 Waline 评论系统
const walineRouter = require('./waline');

// 引入数据库路由
const databaseRouter = require('./routes/database');

// 引入族谱 API 路由
const genealogyRouter = require('./routes/genealogy');

// 引入 OpenAI 兼容 API 路由
const openaiRouter = require('./routes/openai');

// 引入 API 文档页面（模板从本文件提取）
const { renderDocs } = require('./routes/docs');

// 引入数据库连接管理器
const dbManager = require('./config/db-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// 生产环境位于 Cloudflare 之后：信任第一跳代理，使 req.ip 为真实客户端 IP
// 而非 Cloudflare 出口 IP（否则所有限流器会把全体访客算进同一个 IP 桶）。
// 本地开发无代理时该设置无副作用（直连地址不受影响）。
app.set('trust proxy', 1);

// 设置 Sentry Express 集成（在其他中间件之前）
setupExpressIntegration(app);

// ============================================
// 安全中间件
// ============================================

// 请求 ID 生成
app.use(requestId);

// 日志脱敏

// 安全头增强
app.use(securityHeaders);

// 用户代理验证
app.use(userAgentValidator);

// 压缩响应
app.use(compression());

// 安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://coding.dashscope.aliyuncs.com", "https://*.aliyuncs.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      scriptSrcAttr: ["'self'"],
    },
  },
}));

// 全局速率限制（IP 维度，固定窗口）
// 生效的限流策略共两层：
//   1) 本限流器：全体端点（health/docs/models 除外），每 IP 100 次 / 15 分钟
//   2) auth.js RateLimiter（authMiddleware 内）：已认证端点，普通 30 次/分钟、
//      聊天 10 次/分钟，每 IP
// 按用户的细分限制待用户体系（users 表）落地后引入，
// 见 middleware/security.js enhancedRateLimit 注释。
const limiter = enhancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  maxRequests: 100, // 每个IP最多100次请求
});
app.use(limiter);

// Sentry 请求追踪中间件（在其他中间件之前）
// 已通过 setupExpressIntegration 在 app 初始化时添加

// 初始化认证配置
initAuthConfig();

// CORS 配置 - 白名单机制（严格验证）
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的来源列表
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost:3000', 'https://127.0.0.1:3000'];

    // 允许不带 origin 的请求（如移动端、Postman、同源请求）
    if (!origin) return callback(null, true);

    // 严格验证域名：精确匹配或子域名匹配
    // 使用正则防止 evil-hxfund.cn 绕过
    const isExactMatch = allowedOrigins.indexOf(origin) !== -1;
    const isHxfundDomain = /^https?:\/\/([\w-]+\.)*hxfund\.cn(:\d+)?$/.test(origin);
    const isMy3wDomain = /^https?:\/\/([\w-]+\.)*my3w\.com(:\d+)?$/.test(origin); // 添加对my3w域名的支持
    const isApiHxfundDomain = origin === 'https://api.hxfund.cn'; // 添加对API域名的支持

    if (isExactMatch || isHxfundDomain || isMy3wDomain || isApiHxfundDomain) {
      callback(null, true);
    } else {
      callback(new Error('不允许的跨域请求'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Timestamp', 'X-Signature']
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// HTTP 请求日志中间件
app.use(httpLogger);

// 性能监控中间件
app.use(performanceMiddleware);

// 根路径路由 - 返回主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 提供静态文件（public 目录）- 放在所有特定路由之后
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================
// Waline 评论系统 API
// ============================================

// Waline API 路由（兼容 Waline 前端调用）
app.use('/api/waline', walineRouter);

// ============================================
// 数据库 API（RDS）
// ============================================

// 数据库 API 路由
app.use('/api/db', databaseRouter);

// 族谱 API 路由
app.use('/api/genealogy', genealogyRouter);

// ============================================
// OpenAI 兼容 API（/v1/*）
// ============================================

// OpenAI 兼容路由
app.use('/v1', openaiRouter);

// ============================================
// 配置与常量
// ============================================

// 支持的模型列表 (GitCode 免费模型，后端现走 GitCode API)
// 注意：百炼模型（qwen3.5-plus 等）不在 GitCode 上，调它们会返回“参数错误”，故不再列出
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

// 会话存储（使用 Redis，支持多实例部署）
// 降级方案：无 Redis 时使用内存存储

async function getSession(sessionId) {
  let session = await sessionStore.getSession(sessionId);
  
  if (!session) {
    session = {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    };
    await sessionStore.setSession(sessionId, session);
  } else {
    session.lastActiveAt = Date.now();
    await sessionStore.setSession(sessionId, session);
  }
  
  return session;
}

async function cleanupSessions() {
  // Redis 自动过期，无需清理
  if (!sessionStore.isRedisConnected()) {
    // 内存存储时清理过期会话
    const sessions = await sessionStore.getAllSessions();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    for (const session of sessions) {
      if (now - session.lastActiveAt > maxAge) {
        await sessionStore.deleteSession(session.id);
      }
    }
  }
}

// 每小时清理一次过期会话
setInterval(cleanupSessions, 60 * 60 * 1000);

// ============================================
// 输入验证工具函数
// ============================================

/**
 * 验证 UUID 格式
 */
function isValidUuid(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 验证模型 ID
 */
function isValidModel(model) {
  return SUPPORTED_MODELS.some(m => m.id === model);
}

/**
 * 验证温度值
 */
function isValidTemperature(temp) {
  const num = parseFloat(temp);
  return !isNaN(num) && num >= 0 && num <= 2;
}

/**
 * 计算消息总大小（字符数）
 */
function calculateSessionSize(messages) {
  return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
}

// ============================================
// API 路由
// ============================================

/**
 * POST /api/auth/token
 * 获取访问 Token（需要内置 API Key 验证）
 */
app.post('/api/auth/token', (req, res) => {
  const config = loadAuthConfig();
  const { apiKey: clientKey } = req.body;

  // 验证客户端密钥（防止未授权调用）
  if (!clientKey || !safeEqual(clientKey, config.serverApiKey)) {
    return res.status(403).json({
      success: false,
      error: '无效的客户端密钥',
      code: 'INVALID_CLIENT_KEY'
    });
  }

  generateTokenHandler(req, res);
});

/**
 * POST /api/auth/client-token
 * 客户端获取 Token 的代理端点（同源请求）
 * 前端通过此端点间接获取 Token，不暴露 API Key
 */
app.post('/api/auth/client-token', (req, res) => {
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

/**
 * GET /api/auth/status
 * 获取认证状态和速率限制信息
 */
app.get('/api/auth/status', (req, res) => {
  const config = loadAuthConfig();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const rateLimitStatus = require('./auth').rateLimiter.getStatus(clientIp);
  
  res.json({
    success: true,
    authenticated: true,
    rateLimit: rateLimitStatus,
    config: {
      tokenExpiresIn: config.tokenExpiresIn,
      rateLimitWindow: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
      maxChatRequests: config.rateLimit.maxChatRequests
    }
  });
});

/**
 * POST /api/chat
 * 单次对话请求 - 统一使用 CLI 调用（需要认证）
 */
app.post('/api/chat', authMiddleware(), async (req, res) => {
  const startTime = Date.now();

  try {
    const { prompt, model = 'deepseek-ai/DeepSeek-V4-Flash', temperature = 0.7 } = req.body;

    // 输入验证 - prompt
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'prompt 必须是非空字符串',
        code: 'INVALID_PROMPT'
      });
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return res.status(400).json({
        error: 'prompt 不能为空',
        code: 'INVALID_PROMPT'
      });
    }

    // 限制 prompt 长度（最多 5000 字符）
    if (trimmedPrompt.length > 5000) {
      return res.status(400).json({
        error: 'prompt 长度不能超过 5000 字符',
        code: 'PROMPT_TOO_LONG'
      });
    }

    // 验证模型
    if (!isValidModel(model)) {
      return res.status(400).json({
        error: '不支持的模型',
        code: 'INVALID_MODEL',
        availableModels: SUPPORTED_MODELS.map(m => m.id)
      });
    }

    // 验证温度值
    if (!isValidTemperature(temperature)) {
      return res.status(400).json({
        error: '温度值必须在 0-2 之间',
        code: 'INVALID_TEMPERATURE'
      });
    }

    // 检查 CLI 配置
    if (!isCliConfigured()) {
      return res.status(500).json({
        error: 'CLI 未配置 API Key，请先运行 node qwen-code.js --init',
        code: 'CLI_NOT_CONFIGURED'
      });
    }

    // 调用 CLI 前先查免费额度：超限直接返回明确提示
    const quota = await quotaService.checkQuota();
    if (!quota.available) {
      return res.status(429).json({
        success: false,
        error: quota.reason || '免费额度已用完，请稍后再试',
        code: 'QUOTA_EXHAUSTED',
        quota
      });
    }

    // 调用 CLI 获取 AI 响应
    const result = await callQwenCli(trimmedPrompt, { model, temperature });

    // 记录本次用量（成功调用才计）
    await quotaService.recordUsage(result.usage?.total_tokens || 0);
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      response: result.content,
      model,
      usage: result.usage,
      responseTime,
      source: 'qwen-code-cli'
    });

  } catch (error) {
    logger.error(`API 错误: /api/chat`, { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CLI_ERROR'
    });
  }
});

/**
 * POST /api/conversation
 * 多轮对话（带会话历史）- 统一使用 CLI 调用（需要认证）
 */
app.post('/api/conversation', authMiddleware(), async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, model = 'deepseek-ai/DeepSeek-V4-Flash', temperature = 0.7, sessionId: reqSessionId } = req.body;

    // 输入验证 - message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'message 必须是非空字符串',
        code: 'INVALID_MESSAGE'
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        error: 'message 不能为空',
        code: 'INVALID_MESSAGE'
      });
    }

    // 限制 message 长度（最多 5000 字符）
    if (trimmedMessage.length > 5000) {
      return res.status(400).json({
        error: 'message 长度不能超过 5000 字符',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // 验证模型
    if (!isValidModel(model)) {
      return res.status(400).json({
        error: '不支持的模型',
        code: 'INVALID_MODEL',
        availableModels: SUPPORTED_MODELS.map(m => m.id)
      });
    }

    // 验证温度值
    if (!isValidTemperature(temperature)) {
      return res.status(400).json({
        error: '温度值必须在 0-2 之间',
        code: 'INVALID_TEMPERATURE'
      });
    }

    // 验证 sessionId（如果提供）
    let sessionId;
    if (reqSessionId) {
      if (typeof reqSessionId !== 'string' || !isValidUuid(reqSessionId)) {
        return res.status(400).json({
          error: '无效的会话 ID 格式',
          code: 'INVALID_SESSION_ID'
        });
      }
      sessionId = reqSessionId;
    } else {
      sessionId = uuidv4();
    }

    // 检查 CLI 配置
    if (!isCliConfigured()) {
      return res.status(500).json({
        error: 'CLI 未配置 API Key，请先运行 node qwen-code.js --init',
        code: 'CLI_NOT_CONFIGURED'
      });
    }

    // 获取或创建会话
    const session = await getSession(sessionId);

    // 会话大小限制（最多 50KB 字符）
    const currentSize = calculateSessionSize(session.messages);
    if (currentSize + trimmedMessage.length > 50000) {
      // 自动清理旧消息，保留最近 10 条
      session.messages = session.messages.slice(-20);
      logger.info(`会话清理: ${sessionId} 已清理，保留最近 10 条消息`);
    }

    // 构建带历史的对话内容
    let conversationContext = '';
    if (session.messages.length > 0) {
      conversationContext = '对话历史:\n';
      session.messages.forEach((msg, i) => {
        const role = msg.role === 'user' ? '用户' : '助手';
        conversationContext += `${i + 1}. ${role}: ${msg.content}\n`;
      });
      conversationContext += '\n当前问题：\n';
    }

    const fullPrompt = conversationContext + trimmedMessage;

    // 调用 CLI 前先查免费额度：超限直接返回明确提示，不把请求发出去等上游报错
    const quota = await quotaService.checkQuota();
    if (!quota.available) {
      return res.status(429).json({
        success: false,
        error: quota.reason || '免费额度已用完，请稍后再试',
        code: 'QUOTA_EXHAUSTED',
        quota
      });
    }

    // 调用 CLI 获取 AI 响应
    const result = await callQwenCli(fullPrompt, { model, temperature });

    // 记录本次用量（成功调用才计）
    await quotaService.recordUsage(result.usage?.total_tokens || 0);

    // 添加消息到历史
    session.messages.push({ role: 'user', content: trimmedMessage });
    session.messages.push({ role: 'assistant', content: result.content });

    // 限制历史消息数量（最多 20 条，即 10 轮对话）
    if (session.messages.length > 40) {
      session.messages = session.messages.slice(-40);
    }

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      sessionId,
      response: result.content,
      model,
      usage: result.usage,
      responseTime,
      messageCount: session.messages.length,
      source: 'qwen-code-cli'
    });

  } catch (error) {
    logger.error(`API 错误: /api/conversation`, { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CLI_ERROR'
    });
  }
});

/**
 * POST /api/chat/stream
 * 流式响应（Server-Sent Events）- 暂不支持，CLI 不支持流式输出（需要认证）
 */
app.post('/api/chat/stream', authMiddleware(), async (req, res) => {
  res.status(501).json({
    error: '流式响应暂不支持，CLI 工具不支持流式输出',
    code: 'STREAM_NOT_SUPPORTED',
    suggestion: '请使用 /api/chat 或 /api/conversation 端点'
  });
});

/**
 * GET /api/session/:sessionId
 * 获取会话历史（需要认证）
 */
app.get('/api/session/:sessionId', authMiddleware(), async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const session = await sessionStore.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        messageCount: session.messages.length,
        messages: session.messages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取会话失败' });
  }
});

/**
 * DELETE /api/session/:sessionId
 * 删除会话（需要认证）
 */
app.delete('/api/session/:sessionId', authMiddleware(), async (req, res) => {
  const { sessionId } = req.params;

  try {
    await sessionStore.deleteSession(sessionId);
    res.json({ success: true, message: '会话已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除会话失败' });
  }
});

/**
 * GET /api/models
 * 获取支持的模型列表
 */
app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    models: SUPPORTED_MODELS,
    default: SUPPORTED_MODELS.find(m => m.default)?.id || 'deepseek-ai/DeepSeek-V4-Flash'
  });
});

/**
 * POST /api/performance/metrics
 * 接收前端性能指标（Web Vitals）
 */
app.post('/api/performance/metrics', (req, res) => {
  // 注意：由于使用 sendBeacon，可能无法获取到完整的响应
  try {
    // 这里可以将性能指标存储到数据库或转发到分析服务
    // 为了性能考虑，这里只做基本的日志记录
    
    // 注意：sendBeacon 请求通常没有标准的 Content-Type
    // 所以我们不强制要求认证
    
    // 如果需要，可以在这里添加数据验证和过滤逻辑
    logger.info('收到性能指标', { 
      metricName: req.body?.metric?.name, 
      metricValue: req.body?.metric?.value 
    });
    
    // 简单响应，sendBeacon 不关心响应内容
    res.status(204).end();
  } catch (error) {
    logger.error('处理性能指标失败', { error: error.message, stack: error.stack });
    res.status(204).end(); // 即使出错也要返回成功状态
  }
});

/**
 * POST /api/models/switch
 * 切换默认模型：未实现（501）
 * 此前仅返回"已切换"假成功——默认模型实际由环境变量 GITCODE_MODEL
 * 固定，运行时无法切换（需改配置后重启服务）。前端无此调用。
 */
app.post('/api/models/switch', authMiddleware(), (req, res) => {
  res.status(501).json({
    success: false,
    error: '模型切换未实现：默认模型由环境变量 GITCODE_MODEL 固定，修改配置后重启服务生效',
    code: 'NOT_IMPLEMENTED',
    currentModel: process.env.GITCODE_MODEL || process.env.QWEN_MODEL || 'unknown'
  });
});

/**
 * GET /api/health
 * 健康检查
 */
app.get('/api/health', async (req, res) => {
  const cliConfigured = isCliConfigured();
  const cliConfig = getCliConfig();
  const authConfig = loadAuthConfig();
  const redisConnected = sessionStore.isRedisConnected();
  const walineEnabled = true;

  // 获取会话数量
  let sessionsCount = 0;
  try {
    const sessions = await sessionStore.getAllSessions();
    sessionsCount = sessions.length;
  } catch (error) {
    sessionsCount = -1;
  }

  // 提供默认模型前先查免费额度：超限则 modelAvailable=false，前端据此提示用户稍后再试
  const modelStatus = await quotaService.getDefaultModelStatus(cliConfig?.model);

  res.json({
    status: 'ok',
    service: 'huangshi-genealogy-api',
    version: '3.2.0 (Redis + Security + Waline)',
    timestamp: new Date().toISOString(),
    config: {
      cliConfigured,
      cliPath: CLI_PATH,
      model: modelStatus.model,
      modelAvailable: modelStatus.available,
      quota: modelStatus.quota,
      baseURL: cliConfig?.baseURL || null,
      // 注意：不要在这里返回 apiKey 的任何片段（之前返回前 8 位是密钥泄露）。
      // 公开的健康检查端点只应暴露“是否已配置”这一布尔值。
      apiKeyConfigured: !!cliConfig?.apiKey,
      auth: {
        enabled: true,
        serverApiKeyConfigured: !!authConfig.serverApiKey,
        rateLimit: authConfig.rateLimit
      },
      redis: {
        connected: redisConnected,
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      waline: {
        enabled: walineEnabled,
        version: '1.0.0'
      },
      sessionsCount,
      port: PORT
    }
  });
});

// Sentry 错误处理中间件（放在所有路由之后）
// 已通过 setupExpressIntegration 在 app 初始化时添加

// ============================================
// 设置监控路由（必须在错误处理中间件之前）
// ============================================
setupMonitoringRoutes(app);

/**
 * GET /api/docs
 * API 文档（模板提取至 routes/docs.js，主入口只保留装配）
 */
app.get('/api/docs', (req, res) => {
  res.send(renderDocs(PORT));
});

// 404 处理
app.use(notFoundHandler);

// 统一错误处理
app.use(errorHandler);

// ============================================
// 启动服务器
// ============================================

async function startServer() {
  try {
    // 初始化数据库连接
    if (process.env.RDS_HOST && process.env.RDS_HOST !== 'your-rds-instance.mysql.rds.aliyuncs.com') {
      logger.info('正在初始化数据库连接...');
      await dbManager.initialize();
    } else {
      logger.warn('未配置 RDS，跳过数据库初始化');
    }

    const cliConfigured = isCliConfigured();
    const cliConfig = getCliConfig();

    // SSL 配置（开发环境）
    const sslEnabled = process.env.NODE_ENV === 'production' || process.env.DEV_SSL === 'true';
    let server;

    if (sslEnabled) {
      const sslCertPath = path.join(__dirname, '..', 'ssl', 'server.pem');
      const sslKeyPath = path.join(__dirname, '..', 'ssl', 'server.key');
      
      if (fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
        const sslOptions = {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath)
        };
        server = https.createServer(sslOptions, app);
      } else {
        logger.warn('SSL 证书不存在，使用 HTTP');
        server = http.createServer(app);
      }
    } else {
      server = http.createServer(app);
    }

    server.listen(PORT, () => {
      const protocol = sslEnabled ? 'https' : 'http';
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║   黄氏家族寻根平台 - API 服务 (CLI + Waline + RDS)         ║
╠═══════════════════════════════════════════════════════════╣
║  运行地址：${protocol}://localhost:${PORT}                         ║
║  API 文档：${protocol}://localhost:${PORT}/api/docs                ║
╠═══════════════════════════════════════════════════════════╣
║  AI API 端点：                                             ║
║    POST /api/chat          - 单次对话                     ║
║    POST /api/conversation  - 多轮对话（带历史）           ║
║    GET  /api/session/:id   - 获取会话历史                 ║
║    DELETE /api/session/:id - 删除会话                     ║
║    GET  /api/models        - 模型列表                     ║
╠═══════════════════════════════════════════════════════════╣
║  数据库 API 端点 (RDS):                                     ║
║    GET  /api/db/health             - 数据库健康检查        ║
║    GET  /api/db/family-tree        - 获取家族树            ║
║    GET  /api/db/generation-poems   - 获取字辈诗            ║
║    GET  /api/db/project-slides     - 获取项目幻灯片        ║
║    GET  /api/db/blockchain-records - 获取区块链存证        ║
║    GET  /api/db/guest-messages     - 获取留言              ║
║    POST /api/db/guest-messages     - 提交留言              ║
╠═══════════════════════════════════════════════════════════╣
║  Waline 评论 API 端点：                                     ║
║    GET    /api/waline/article     - 获取文章统计          ║
║    POST   /api/waline/article     - 更新文章统计          ║
║    GET    /api/waline/comment     - 获取评论列表          ║
║    POST   /api/waline/comment     - 添加评论              ║
╠═══════════════════════════════════════════════════════════╣
║  其他 API 端点：                                           ║
║    GET  /api/health        - 健康检查                     ║
║    GET  /api/auth/status   - 认证状态                     ║
║    POST /api/auth/token    - 获取 Token                   ║
╠═══════════════════════════════════════════════════════════╣
║  CLI 路径：${CLI_PATH}                              ║
║  CLI 配置：${cliConfigured ? '✓ 已配置' : '✗ 未配置'}${!cliConfigured ? ' 运行 node qwen-code.js --init' : ''}
║  默认模型：${cliConfig?.model || 'deepseek-ai/DeepSeek-V4-Flash'}                            ║
╠═══════════════════════════════════════════════════════════╣
║  统一使用 qwen-code.js CLI 工具调用 AI                      ║
╚═══════════════════════════════════════════════════════════╝
  `);

      if (!cliConfigured) {
        logger.warn('CLI 未配置 API Key，请先运行 node qwen-code.js --init');
      }
      
      logger.info(`黄氏家族寻根平台 API 服务已启动，端口: ${PORT}`);
      logger.info(`API 文档: ${protocol}://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('服务器启动失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 仅在直接运行时启动服务器；被 require 时只导出 app（供测试使用）
if (require.main === module) {
  startServer();
}

module.exports = app;

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在关闭...');
  try {
    await dbManager.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败', { error: error.message });
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在关闭...');
  try {
    await dbManager.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败', { error: error.message });
  }
  process.exit(0);
});

process.on('exit', () => {
  logger.info('服务已退出');
});
