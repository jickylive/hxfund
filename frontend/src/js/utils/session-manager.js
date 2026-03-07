/**
 * 黄氏家族寻根平台 - Qwen AI 会话管理器
 * 负责管理对话会话、历史记录和上下文
 */

export class SessionManager {
  constructor(storageKey = 'qwen-session') {
    this.storageKey = storageKey;
    this.currentSessionId = null;
    this.messageHistory = [];
    this.maxHistoryLength = 50; // 限制历史记录长度
  }

  /**
   * 初始化会话
   */
  async initialize() {
    // 尝试从存储中恢复会话
    await this.restoreSession();
  }

  /**
   * 创建新会话
   */
  async createNewSession() {
    this.currentSessionId = this.generateSessionId();
    this.messageHistory = [];
    
    // 保存会话到存储
    await this.saveSession();
    
    return this.currentSessionId;
  }

  /**
   * 恢复会话
   */
  async restoreSession() {
    try {
      const sessionData = localStorage.getItem(this.storageKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.currentSessionId = parsed.sessionId || null;
        this.messageHistory = parsed.messageHistory || [];
      }
    } catch (error) {
      console.warn('恢复会话失败:', error);
      // 如果解析失败，创建新会话
      await this.createNewSession();
    }
  }

  /**
   * 保存会话
   */
  async saveSession() {
    try {
      const sessionData = {
        sessionId: this.currentSessionId,
        messageHistory: this.messageHistory,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  }

  /**
   * 添加消息到历史记录
   */
  addMessageToHistory(role, content, timestamp = Date.now()) {
    const message = {
      id: this.generateMessageId(),
      role,
      content,
      timestamp
    };

    this.messageHistory.push(message);

    // 限制历史记录长度
    if (this.messageHistory.length > this.maxHistoryLength) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistoryLength);
    }

    // 保存会话
    this.saveSession();
  }

  /**
   * 获取会话上下文
   */
  getSessionContext(maxMessages = 10) {
    // 返回最近的几条消息作为上下文
    const recentMessages = this.messageHistory.slice(-maxMessages);
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * 设置会话ID
   */
  setCurrentSessionId(sessionId) {
    this.currentSessionId = sessionId;
    this.saveSession();
  }

  /**
   * 清空会话
   */
  async clearSession() {
    this.messageHistory = [];
    this.currentSessionId = null;
    await this.saveSession();
  }

  /**
   * 生成会话ID
   * @private
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息ID
   * @private
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取消息历史
   */
  getMessageHistory() {
    return [...this.messageHistory]; // 返回副本
  }

  /**
   * 获取历史消息数量
   */
  getHistoryCount() {
    return this.messageHistory.length;
  }
}