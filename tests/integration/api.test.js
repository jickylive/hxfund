/**
 * API 集成测试
 */

const request = require('supertest');
const app = require('../../server/index');

describe('API 集成测试', () => {
  describe('健康检查', () => {
    test('GET /api/health 应该返回健康状态', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('模型列表', () => {
    test('GET /api/models 应该返回支持的模型列表', async () => {
      const response = await request(app)
        .get('/api/models')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
    });

    test('模型列表应该包含默认模型', async () => {
      const response = await request(app)
        .get('/api/models')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.body).toHaveProperty('default');
      expect(response.body.default).toBe('qwen3.5-plus');
    });
  });

  describe('性能监控', () => {
    test('GET /api/monitoring/performance 应该返回性能报告', async () => {
      const response = await request(app)
        .get('/api/monitoring/performance')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('system');
    });

    test('GET /api/monitoring/health 应该返回健康状态', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('错误处理', () => {
    test('GET /api/nonexistent 应该返回404错误', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('AI对话（需要认证）', () => {
    test('POST /api/chat 应该需要认证', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('User-Agent', 'Mozilla/5.0')
        .send({ prompt: '你好' });

      // 可能返回401或403，取决于认证配置
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
    });
  });

  describe('会话管理（需要认证）', () => {
    test('GET /api/session/:sessionId 应该需要认证', async () => {
      const response = await request(app)
        .get('/api/session/test-session-id')
        .set('User-Agent', 'Mozilla/5.0');

      // 可能返回401或403，取决于认证配置
      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
    });
  });
});
