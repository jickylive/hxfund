/**
 * OpenAI 兼容 API 路由
 * 提供与 OpenAI API 兼容的接口，支持 /v1/models 和 /v1/chat/completions
 */

const express = require('express');
const router = express.Router();

// 支持的模型列表（与 aiService.js 保持一致）
const SUPPORTED_MODELS = [
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', description: '多模态，默认模型', default: true },
  { id: 'qwen3-max-2026-01-23', name: 'Qwen3 Max', description: '最强推理能力' },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', description: '代码专用' },
  { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', description: '代码增强' },
  { id: 'glm-5', name: 'GLM-5', description: '支持思考模式' },
  { id: 'glm-4.7', name: 'GLM-4.7', description: '支持思考模式' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', description: '支持思考模式' },
  { id: 'Qwen/Qwen3.5-397B-A17B', name: 'Qwen3.5-397B-A17B (GitCode)', description: 'GitCode OpenAI兼容模型' },
  { id: 'Qwen3-235B-A22B', name: 'Qwen3-235B-A22B (SCNET)', description: 'SCNET OpenAI兼容模型' },
];

// 获取默认模型
const DEFAULT_MODEL = 'qwen3.5-plus';

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
 */
router.post('/chat/completions', async (req, res) => {
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

    // 调用 CLI
    const { callQwenCli } = await import('../cli-wrapper.js');
    const result = await callQwenCli(prompt, { model: chatModel, temperature: validTemp });

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
