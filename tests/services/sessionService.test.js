/**
 * 会话服务单元测试
 */

const sessionService = require('../../server/services/sessionService');

describe('SessionService', () => {
  describe('会话ID验证', () => {
    test('应该验证有效的会话ID', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      expect(sessionService.isValidSessionId(validId)).toBe(true);
    });

    test('应该拒绝无效的会话ID', () => {
      expect(sessionService.isValidSessionId('invalid-id')).toBe(false);
      expect(sessionService.isValidSessionId('')).toBe(false);
      expect(sessionService.isValidSessionId(null)).toBe(false);
    });
  });

  describe('会话大小计算', () => {
    test('应该正确计算会话大小', () => {
      const messages = [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' },
        { role: 'user', content: '介绍一下你自己' }
      ];

      const size = sessionService.calculateSessionSize(messages);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(2 + 19 + 6); // 每个消息的字符数之和
    });

    test('应该处理空消息数组', () => {
      const size = sessionService.calculateSessionSize([]);
      expect(size).toBe(0);
    });

    test('应该处理缺失内容的消息', () => {
      const messages = [
        { role: 'user', content: null },
        { role: 'assistant' }
      ];

      const size = sessionService.calculateSessionSize(messages);
      expect(size).toBe(0);
    });
  });

  describe('会话生成', () => {
    test('应该生成有效的会话ID', () => {
      const sessionId = sessionService.generateSessionId();
      expect(sessionService.isValidSessionId(sessionId)).toBe(true);
    });

    test('应该生成不同的会话ID', () => {
      const id1 = sessionService.generateSessionId();
      const id2 = sessionService.generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('会话操作（需要数据库）', () => {
    // 这些测试需要真实的数据库连接，暂时跳过
    test.skip('应该创建新会话', async () => {
      const session = await sessionService.getOrCreateSession();
      expect(session).toBeDefined();
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('messages');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('lastActiveAt');
    });

    test.skip('应该添加消息到会话', async () => {
      const session = await sessionService.getOrCreateSession();
      const updatedSession = await sessionService.addMessage(
        session.id,
        'user',
        '测试消息'
      );
      expect(updatedSession.messages.length).toBe(1);
      expect(updatedSession.messages[0].role).toBe('user');
      expect(updatedSession.messages[0].content).toBe('测试消息');
    });

    test.skip('应该获取会话', async () => {
      const session = await sessionService.getOrCreateSession();
      const retrievedSession = await sessionService.getSession(session.id);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.id).toBe(session.id);
    });

    test.skip('应该删除会话', async () => {
      const session = await sessionService.getOrCreateSession();
      const result = await sessionService.deleteSession(session.id);
      expect(result).toBe(true);
    });
  });

  describe('会话统计（需要数据库）', () => {
    test.skip('应该获取会话统计信息', async () => {
      const stats = await sessionService.getStats();
      expect(stats).toHaveProperty('sessionCount');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('avgMessagesPerSession');
      expect(stats).toHaveProperty('avgSizePerSession');
    });
  });
});
