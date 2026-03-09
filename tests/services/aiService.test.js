/**
 * AI 服务单元测试
 */

const aiService = require('../../server/services/aiService');

describe('AIService', () => {
  describe('模型验证', () => {
    test('应该验证有效的模型ID', () => {
      expect(aiService.isValidModel('qwen3.5-plus')).toBe(true);
      expect(aiService.isValidModel('qwen3-max-2026-01-23')).toBe(true);
      expect(aiService.isValidModel('glm-5')).toBe(true);
    });

    test('应该拒绝无效的模型ID', () => {
      expect(aiService.isValidModel('invalid-model')).toBe(false);
      expect(aiService.isValidModel('')).toBe(false);
      expect(aiService.isValidModel(null)).toBe(false);
    });
  });

  describe('温度值验证', () => {
    test('应该验证有效的温度值', () => {
      expect(aiService.isValidTemperature(0)).toBe(true);
      expect(aiService.isValidTemperature(0.7)).toBe(true);
      expect(aiService.isValidTemperature(1)).toBe(true);
      expect(aiService.isValidTemperature(2)).toBe(true);
    });

    test('应该拒绝无效的温度值', () => {
      expect(aiService.isValidTemperature(-1)).toBe(false);
      expect(aiService.isValidTemperature(2.1)).toBe(false);
      expect(aiService.isValidTemperature('invalid')).toBe(false);
      expect(aiService.isValidTemperature(null)).toBe(false);
    });
  });

  describe('提示词验证和清理', () => {
    test('应该验证有效的提示词', () => {
      const validPrompt = '这是一个测试提示词';
      const result = aiService.validateAndCleanPrompt(validPrompt);
      expect(result).toBe(validPrompt);
    });

    test('应该清理空白字符', () => {
      const promptWithSpaces = '  测试提示词  ';
      const result = aiService.validateAndCleanPrompt(promptWithSpaces);
      expect(result).toBe('测试提示词');
    });

    test('应该拒绝空提示词', () => {
      expect(() => {
        aiService.validateAndCleanPrompt('');
      }).toThrow('prompt 不能为空');

      expect(() => {
        aiService.validateAndCleanPrompt('   ');
      }).toThrow('prompt 不能为空');
    });

    test('应该拒绝过长的提示词', () => {
      const longPrompt = 'a'.repeat(5001);
      expect(() => {
        aiService.validateAndCleanPrompt(longPrompt);
      }).toThrow('prompt 长度不能超过 5000 字符');
    });

    test('应该拒绝非字符串提示词', () => {
      expect(() => {
        aiService.validateAndCleanPrompt(null);
      }).toThrow('prompt 必须是非空字符串');

      expect(() => {
        aiService.validateAndCleanPrompt(123);
      }).toThrow('prompt 必须是非空字符串');
    });
  });

  describe('获取模型信息', () => {
    test('应该返回支持的模型列表', () => {
      const models = aiService.getSupportedModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('description');
    });

    test('应该包含默认模型', () => {
      const models = aiService.getSupportedModels();
      const defaultModel = models.find(m => m.default);
      expect(defaultModel).toBeDefined();
      expect(defaultModel.id).toBe('qwen3.5-plus');
    });

    test('应该返回默认模型ID', () => {
      const defaultModel = aiService.getDefaultModel();
      expect(defaultModel).toBe('qwen3.5-plus');
    });
  });

  describe('CLI状态', () => {
    test('应该返回CLI配置状态', () => {
      const status = aiService.getCLIStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('config');
      expect(typeof status.configured).toBe('boolean');
    });
  });
});
