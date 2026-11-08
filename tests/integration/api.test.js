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

      // 真检查：依赖都正常返回 200，DB 或 Redis 不可用返回 503（任务 6 起不再永远 200）。
      // 测试环境无 DB/Redis，所以这里接受两种状态，但都要返回结构完整的健康报告，
      // 且状态码与 status 字段一致。
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(['ok', 'unhealthy']).toContain(response.body.status);
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
      if (response.status === 200) {
        expect(response.body.status).toBe('ok');
        expect(response.body.checks.database).toBe('ok');
        expect(response.body.checks.redis).toBe('ok');
      } else {
        expect(response.body.status).toBe('unhealthy');
        expect(['ok', 'fail']).toContain(response.body.checks.database);
        expect(['ok', 'fail']).toContain(response.body.checks.redis);
      }
    });

    test('GET /api/health 不得泄露 API Key 的任何片段', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('User-Agent', 'Mozilla/5.0');

      // 503 时响应体同样包含完整 config（任务 6 的改动只改状态码，不改响应体结构）
      expect([200, 503]).toContain(response.status);
      // 之前返回 apiKey 前 8 位是密钥泄露；现在只允许布尔值
      expect(response.body.config).not.toHaveProperty('apiKeyPrefix');
      expect(response.body.config).toHaveProperty('apiKeyConfigured');
      expect(typeof response.body.config.apiKeyConfigured).toBe('boolean');
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
      expect(response.body.default).toBe('deepseek-ai/DeepSeek-V4-Flash');
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

  describe('AI对话（公开端点，无需认证）', () => {
    test('POST /api/chat 不再要求认证', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('User-Agent', 'Mozilla/5.0')
        .send({ prompt: '你好' });

      // /api/chat 已是公开端点（PR #30 删 client-token 后不再要求认证，靠限流 + 额度保护），
      // 未带认证不再返回 401/403；测试环境无 CLI 配置，会走到 500 CLI_NOT_CONFIGURED。
      // 注意：/api/chat 的错误响应体没有 success 字段，只有 error / code。
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
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
