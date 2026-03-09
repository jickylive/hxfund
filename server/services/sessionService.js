/**
 * 会话服务层
 * 封装所有会话相关的业务逻辑
 */

const sessionStore = require('../session-store');
const logger = require('../config/logger');

/**
 * 会话配置
 */
const SESSION_CONFIG = {
  maxMessageCount: 40,        // 最大消息数量（20轮对话）
  maxSessionSize: 50000,      // 最大会话大小（字符数）
  cleanupThreshold: 20,       // 清理阈值（保留最近的消息数）
  defaultTTL: 24 * 60 * 60,   // 默认过期时间（秒）
};

/**
 * 会话服务类
 */
class SessionService {
  constructor() {
    this.config = SESSION_CONFIG;
  }

  /**
   * 验证会话ID格式
   */
  isValidSessionId(sessionId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * 计算会话大小
   */
  calculateSessionSize(messages) {
    return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  }

  /**
   * 创建或获取会话
   */
  async getOrCreateSession(sessionId = null) {
    try {
      let id = sessionId;

      // 如果没有提供会话ID，生成新的
      if (!id) {
        id = this.generateSessionId();
      } else if (!this.isValidSessionId(id)) {
        throw new Error('无效的会话 ID 格式');
      }

      // 获取会话
      let session = await sessionStore.getSession(id);

      // 如果会话不存在，创建新会话
      if (!session) {
        session = {
          id: id,
          messages: [],
          createdAt: Date.now(),
          lastActiveAt: Date.now()
        };
        await sessionStore.setSession(id, session);
        logger.info('创建新会话', { sessionId: id });
      } else {
        // 更新最后活跃时间
        session.lastActiveAt = Date.now();
        await sessionStore.setSession(id, session);
      }

      return session;
    } catch (error) {
      logger.error('获取或创建会话失败', { 
        error: error.message, 
        sessionId 
      });
      throw error;
    }
  }

  /**
   * 添加消息到会话
   */
  async addMessage(sessionId, role, content) {
    try {
      const session = await this.getOrCreateSession(sessionId);
      
      // 检查会话大小
      const currentSize = this.calculateSessionSize(session.messages);
      const newSize = currentSize + content.length;

      if (newSize > this.config.maxSessionSize) {
        // 自动清理旧消息
        session.messages = session.messages.slice(-this.config.cleanupThreshold);
        logger.info('会话大小超限，自动清理', { 
          sessionId, 
          originalSize: currentSize,
          newSize: this.calculateSessionSize(session.messages)
        });
      }

      // 添加消息
      session.messages.push({ role, content });

      // 限制消息数量
      if (session.messages.length > this.config.maxMessageCount) {
        session.messages = session.messages.slice(-this.config.maxMessageCount);
      }

      // 更新会话
      await sessionStore.setSession(sessionId, session);

      return session;
    } catch (error) {
      logger.error('添加消息到会话失败', { 
        error: error.message, 
        sessionId,
        role 
      });
      throw error;
    }
  }

  /**
   * 获取会话
   */
  async getSession(sessionId) {
    try {
      if (!this.isValidSessionId(sessionId)) {
        throw new Error('无效的会话 ID 格式');
      }

      const session = await sessionStore.getSession(sessionId);
      
      if (!session) {
        throw new Error('会话不存在');
      }

      return session;
    } catch (error) {
      logger.error('获取会话失败', { 
        error: error.message, 
        sessionId 
      });
      throw error;
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    try {
      if (!this.isValidSessionId(sessionId)) {
        throw new Error('无效的会话 ID 格式');
      }

      await sessionStore.deleteSession(sessionId);
      logger.info('删除会话成功', { sessionId });
      
      return true;
    } catch (error) {
      logger.error('删除会话失败', { 
        error: error.message, 
        sessionId 
      });
      throw error;
    }
  }

  /**
   * 获取所有会话
   */
  async getAllSessions() {
    try {
      const sessions = await sessionStore.getAllSessions();
      return sessions;
    } catch (error) {
      logger.error('获取所有会话失败', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const sessions = await this.getAllSessions();
      const now = Date.now();
      let cleanedCount = 0;

      for (const session of sessions) {
        if (now - session.lastActiveAt > maxAge) {
          await this.deleteSession(session.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('清理过期会话完成', { 
          cleanedCount,
          maxAge: `${maxAge / 1000 / 60}分钟`
        });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('清理过期会话失败', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * 获取会话统计信息
   */
  async getStats() {
    try {
      const sessions = await this.getAllSessions();
      const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
      const totalSize = sessions.reduce((sum, session) => sum + this.calculateSessionSize(session.messages), 0);

      return {
        sessionCount: sessions.length,
        totalMessages,
        totalSize,
        avgMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
        avgSizePerSession: sessions.length > 0 ? totalSize / sessions.length : 0,
      };
    } catch (error) {
      logger.error('获取会话统计信息失败', { 
        error: error.message 
      });
      throw error;
    }
  }
}

// 创建单例实例
const sessionService = new SessionService();

module.exports = sessionService;
