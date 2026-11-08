/**
 * OpenAI 兼容 API 路由
 * 提供与 OpenAI API 兼容的接口，支持 /v1/models 和 /v1/chat/completions
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const quotaService = require('../services/quotaService');
const router = express.Router();

// 支持的模型列表（与 aiService.js 保持一致；GitCode 免费模型，后端现走 GitCode API）
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

// 获取默认模型
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash';

/**
 * GET /v1/models - 获取模型列表
 * OpenAI 兼容格式
 */
router.get('/models', (req, res) => {
  const models = SUPPORTED_MODELS.map(m => ({
    id: m.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'huangshi-genealogy',
  }));

  res.json({
    object: 'list',
    data: models,
  });
});

/**
 * GET /v1/models/:model_id - 获取单个模型信息
 */
router.get('/models/:model_id', (req, res) => {
  const modelId = req.params.model_id;
  const model = SUPPORTED_MODELS.find(m => m.id === modelId);

  if (!model) {
    return res.status(404).json({
      error: {
        message: `Model '${modelId}' not found`,
        type: 'invalid_request_error',
        param: null,
        code: 'model_not_found',
      },
    });
  }

  res.json({
    id: model.id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'huangshi-genealogy',
  });
});

/**
 * POST /v1/chat/completions - 对话补全
 * OpenAI 兼容格式
 *
 * 需要认证（X-API-Key 或 Bearer Token），与 /api/chat 一致，
 * 防止未认证调用消耗 GitCode 免费额度。
 * /v1/models 保持公开（与 /api/models 一致），供客户端发现模型。
 */
router.post('/chat/completions', authenticateToken(), async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, max_tokens, stream = false, ...extraParams } = req.body;

    // 验证必填参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages must be a non-empty array',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'invalid_parameter_error',
        },
      });
    }

    // 获取模型（使用默认模型）
    const chatModel = model || DEFAULT_MODEL;

    // 验证温度
    const validTemp = typeof temperature === 'number' && temperature >= 0 && temperature <= 2
      ? temperature
      : 0.7;

    // 验证 max_tokens
    const validMaxTokens = max_tokens ? Math.min(max_tokens, 8192) : 8192;

    // 构建提示词
    const prompt = buildPromptFromMessages(messages);

    // 调用 CLI 前先查免费额度：超限直接返回明确提示
    const quota = await quotaService.checkQuota();
    if (!quota.available) {
      return res.status(429).json({
        error: {
          message: quota.reason || '免费额度已用完，请稍后再试',
          type: 'rate_limit_error',
          param: null,
          code: 'quota_exhausted',
        },
        quota,
      });
    }

    // 调用 CLI
    const { callQwenCli } = await import('../cli-wrapper.js');
    const result = await callQwenCli(prompt, { model: chatModel, temperature: validTemp });

    // 记录本次用量（成功调用才计）
    await quotaService.recordUsage(result.usage?.total_tokens || 0);

    if (stream) {
      // 流式响应
      return streamResponse(res, result, chatModel, validMaxTokens);
    }

    // 非流式响应
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: chatModel,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.usage?.prompt_tokens || 0,
        completion_tokens: result.usage?.completion_tokens || 0,
        total_tokens: result.usage?.total_tokens || 0,
      },
      ...extraParams,
    });
  } catch (error) {
    console.error(`[OpenAI API 错误] /v1/chat/completions: ${error.message}`);
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'server_error',
        param: null,
        code: 'internal_error',
      },
    });
  }
});

/**
 * 从消息数组构建提示词
 */
function buildPromptFromMessages(messages) {
  // 过滤系统消息并构建上下文
  const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  
  if (userMessages.length === 0) {
    return '';
  }

  // 只使用最后一条用户消息作为 prompt（简化处理，完整实现可保留历史）
  const lastUserMessage = [...userMessages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage) {
    return '';
  }

  return lastUserMessage.content;
}

/**
 * 流式响应
 */
function streamResponse(res, result, model, maxTokens) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const chunks = splitContent(result.content);
  let index = 0;

  const sendChunk = () => {
    if (index < chunks.length) {
      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: index,
            delta: {
              content: chunks[index],
            },
            finish_reason: null,
          },
        ],
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      index++;
      setTimeout(sendChunk, 20); // 模拟流式输出
    } else {
      // 发送最后一个 chunk，标记完成
      const finalChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: index,
            delta: {},
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0,
        },
      };

      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  };

  sendChunk();
}

/**
 * 将内容拆分成小块
 */
function splitContent(content) {
  // 按字符拆分，模拟逐字输出
  const chunks = [];
  const chunkSize = 3; // 每次发送 3 个字符
  
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }
  
  return chunks;
}

module.exports = router;
