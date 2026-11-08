/**
 * AI 服务层
 * 封装所有AI相关的业务逻辑
 */

const { callQwenCli, isCliConfigured, getCliConfig } = require('../cli-wrapper');
const logger = require('../config/logger');

/**
 * 支持的模型列表（GitCode 免费模型，后端现走 GitCode API）
 */
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

/**
 * AI 服务类
 */
class AIService {
  constructor() {
    this.defaultModel = 'deepseek-ai/DeepSeek-V4-Flash';
    this.defaultTemperature = 0.7;
    this.maxPromptLength = 5000;
  }

  /**
   * 验证模型ID
   */
  isValidModel(model) {
    return SUPPORTED_MODELS.some(m => m.id === model);
  }

  /**
   * 验证温度值
   */
  isValidTemperature(temp) {
    const num = parseFloat(temp);
    return !isNaN(num) && num >= 0 && num <= 2;
  }

  /**
   * 验证并清理提示词
   */
  validateAndCleanPrompt(prompt) {
    if (typeof prompt !== 'string') {
      throw new Error('prompt 必须是非空字符串');
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      throw new Error('prompt 不能为空');
    }

    if (trimmedPrompt.length > this.maxPromptLength) {
      throw new Error(`prompt 长度不能超过 ${this.maxPromptLength} 字符`);
    }

    return trimmedPrompt;
  }

  /**
   * 检查CLI配置
   */
  checkCLIConfigured() {
    if (!isCliConfigured()) {
      throw new Error('CLI 未配置 API Key，请先运行 node qwen-code.js --init');
    }
  }

  /**
   * 单次对话
   */
  async chat(prompt, options = {}) {
    const startTime = Date.now();

    try {
      // 验证输入
      const cleanedPrompt = this.validateAndCleanPrompt(prompt);
      this.checkCLIConfigured();

      // 获取参数
      const model = options.model || this.defaultModel;
      const temperature = options.temperature !== undefined ? options.temperature : this.defaultTemperature;

      // 验证参数
      if (!this.isValidModel(model)) {
        throw new Error(`不支持的模型: ${model}`);
      }

      if (!this.isValidTemperature(temperature)) {
        throw new Error('温度值必须在 0-2 之间');
      }

      logger.info('AI 单次对话请求', { 
        model, 
        temperature, 
        promptLength: cleanedPrompt.length 
      });

      // 调用CLI
      const result = await callQwenCli(cleanedPrompt, { model, temperature });
      const responseTime = Date.now() - startTime;

      logger.info('AI 单次对话完成', { 
        responseTime: `${responseTime}ms`,
        usage: result.usage 
      });

      return {
        success: true,
        response: result.content,
        model,
        usage: result.usage,
        responseTime,
        source: 'qwen-code-cli'
      };
    } catch (error) {
      logger.error('AI 单次对话失败', { 
        error: error.message, 
        model: options.model 
      });
      throw error;
    }
  }

  /**
   * 多轮对话
   */
  async conversation(message, history = [], options = {}) {
    const startTime = Date.now();

    try {
      // 验证输入
      const cleanedMessage = this.validateAndCleanPrompt(message);
      this.checkCLIConfigured();

      // 获取参数
      const model = options.model || this.defaultModel;
      const temperature = options.temperature !== undefined ? options.temperature : this.defaultTemperature;

      // 验证参数
      if (!this.isValidModel(model)) {
        throw new Error(`不支持的模型: ${model}`);
      }

      if (!this.isValidTemperature(temperature)) {
        throw new Error('温度值必须在 0-2 之间');
      }

      logger.info('AI 多轮对话请求', { 
        model, 
        temperature, 
        messageLength: cleanedMessage.length,
        historyLength: history.length 
      });

      // 构建对话上下文
      let conversationContext = '';
      if (history.length > 0) {
        conversationContext = '对话历史:\n';
        history.forEach((msg, i) => {
          const role = msg.role === 'user' ? '用户' : '助手';
          conversationContext += `${i + 1}. ${role}: ${msg.content}\n`;
        });
        conversationContext += '\n当前问题：\n';
      }

      const fullPrompt = conversationContext + cleanedMessage;

      // 调用CLI
      const result = await callQwenCli(fullPrompt, { model, temperature });
      const responseTime = Date.now() - startTime;

      logger.info('AI 多轮对话完成', { 
        responseTime: `${responseTime}ms`,
        usage: result.usage 
      });

      return {
        success: true,
        response: result.content,
        model,
        usage: result.usage,
        responseTime,
        source: 'qwen-code-cli'
      };
    } catch (error) {
      logger.error('AI 多轮对话失败', { 
        error: error.message, 
        model: options.model 
      });
      throw error;
    }
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels() {
    return SUPPORTED_MODELS;
  }

  /**
   * 获取默认模型
   */
  getDefaultModel() {
    return this.defaultModel;
  }

  /**
   * 获取CLI配置状态
   */
  getCLIStatus() {
    return {
      configured: isCliConfigured(),
      config: getCliConfig()
    };
  }
}

// 创建单例实例
const aiService = new AIService();

module.exports = aiService;
