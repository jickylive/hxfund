/**
 * AI 控制器
 * 处理所有AI相关的HTTP请求
 */

const aiService = require('../services/aiService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * AI 控制器
 */
const aiController = {
  /**
   * 单次对话
   * POST /api/chat
   */
  chat: asyncHandler(async (req, res) => {
    const { prompt, model, temperature } = req.body;

    logger.info('收到单次对话请求', { 
      model, 
      promptLength: prompt?.length 
    });

    const result = await aiService.chat(prompt, { model, temperature });

    res.json(result);
  }),

  /**
   * 多轮对话
   * POST /api/conversation
   */
  conversation: asyncHandler(async (req, res) => {
    const { message, sessionId, model, temperature } = req.body;

    logger.info('收到多轮对话请求', { 
      sessionId, 
      model, 
      messageLength: message?.length 
    });

    // 调用AI服务进行对话
    const result = await aiService.conversation(message, [], { model, temperature });

    res.json({
      ...result,
      sessionId: sessionId || 'new-session'
    });
  }),

  /**
   * 获取支持的模型列表
   * GET /api/models
   */
  getModels: asyncHandler(async (req, res) => {
    logger.info('获取模型列表请求');

    const models = aiService.getSupportedModels();
    const defaultModel = aiService.getDefaultModel();

    res.json({
      success: true,
      models,
      default: defaultModel
    });
  }),

  /**
   * 切换默认模型
   * POST /api/models/switch
   */
  switchModel: asyncHandler(async (req, res) => {
    const { model } = req.body;

    logger.info('切换模型请求', { model });

    // 验证模型
    if (!aiService.isValidModel(model)) {
      return res.status(400).json({
        success: false,
        error: '不支持的模型',
        code: 'INVALID_MODEL'
      });
    }

    // 更新默认模型
    aiService.defaultModel = model;

    res.json({
      success: true,
      message: `模型已切换为：${model}`,
      model
    });
  }),

  /**
   * 获取CLI状态
   * GET /api/ai/cli-status
   */
  getCLIStatus: asyncHandler(async (req, res) => {
    logger.info('获取CLI状态请求');

    const status = aiService.getCLIStatus();

    res.json({
      success: true,
      cli: status
    });
  }),

  /**
   * 流式响应（暂不支持）
   * POST /api/chat/stream
   */
  stream: asyncHandler(async (req, res) => {
    logger.warn('流式响应请求（暂不支持）');

    res.status(501).json({
      error: '流式响应暂不支持，CLI 工具不支持流式输出',
      code: 'STREAM_NOT_SUPPORTED',
      suggestion: '请使用 /api/chat 或 /api/conversation 端点'
    });
  })
};

module.exports = aiController;
