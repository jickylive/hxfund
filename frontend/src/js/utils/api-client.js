/**
 * 黄氏家族寻根平台 - Qwen AI API 客户端
 * 负责与后端API通信
 */

export class QwenApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL || window.API_CONFIG?.baseURL || 'http://localhost:3000';
    this.authToken = null;
    this.tokenExpiresAt = null;
    
    // 请求队列，防止并发请求
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token, expiresAt) {
    this.authToken = token;
    this.tokenExpiresAt = expiresAt;
  }

  /**
   * 获取认证令牌
   */
  async getAuthToken() {
    // 检查令牌是否过期
    if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now()) {
      return this.authToken;
    }

    // 从sessionStorage获取令牌
    const sessionToken = sessionStorage.getItem('authToken');
    const sessionExpires = sessionStorage.getItem('tokenExpiresAt');

    if (sessionToken && sessionExpires) {
      const expiresAt = parseInt(sessionExpires);
      if (expiresAt > Date.now()) {
        this.authToken = sessionToken;
        this.tokenExpiresAt = expiresAt;
        return sessionToken;
      }
    }

    // 从localStorage获取令牌
    const saved = localStorage.getItem('qwenConfig');
    if (saved) {
      const config = JSON.parse(saved);
      if (config.token && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
        this.authToken = config.token;
        this.tokenExpiresAt = config.tokenExpiresAt;
        return config.token;
      }
    }

    // 如果都没有有效令牌，请求新令牌
    return await this.requestNewToken();
  }

  /**
   * 请求新令牌
   */
  async requestNewToken() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/client-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`获取令牌失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        this.authToken = data.token;
        this.tokenExpiresAt = Date.now() + data.expiresIn;

        // 保存到sessionStorage
        sessionStorage.setItem('authToken', this.authToken);
        sessionStorage.setItem('tokenExpiresAt', this.tokenExpiresAt.toString());

        // 保存到localStorage
        const savedConfig = JSON.parse(localStorage.getItem('qwenConfig') || '{}');
        savedConfig.token = this.authToken;
        savedConfig.tokenExpiresAt = this.tokenExpiresAt;
        localStorage.setItem('qwenConfig', JSON.stringify(savedConfig));

        return this.authToken;
      } else {
        throw new Error(data.error || '获取令牌失败');
      }
    } catch (error) {
      console.error('获取认证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 发送请求的内部方法
   * @private
   */
  async _makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * 带队列控制的请求方法
   */
  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 处理请求队列
   * @private
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { endpoint, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await this._makeRequest(endpoint, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 获取模型列表
   */
  async getModels() {
    return this.request('/api/models');
  }

  /**
   * 获取认证令牌（公共方法）
   */
  async getClientToken() {
    return this.request('/api/auth/client-token', {
      method: 'POST',
      credentials: 'include'
    });
  }

  /**
   * 对话API
   */
  async conversation(data) {
    return this.request('/api/conversation', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * 单次对话API
   */
  async chat(data) {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * 获取会话历史
   */
  async getSession(sessionId) {
    return this.request(`/api/session/${sessionId}`);
  }

  // ============================================
  // 族谱 API
  // ============================================

  /**
   * 获取族谱树
   */
  async getFamilyTree() {
    return this.request('/api/genealogy/members/tree');
  }

  /**
   * 获取成员详情
   */
  async getMember(memberId) {
    return this.request(`/api/genealogy/members/${memberId}`);
  }

  /**
   * 获取子成员列表
   */
  async getChildMembers(parentId) {
    return this.request(`/api/genealogy/members/${parentId}/children`);
  }

  /**
   * 添加成员 (需要认证)
   */
  async addMember(member) {
    return this.request('/api/genealogy/members', {
      method: 'POST',
      body: JSON.stringify(member)
    });
  }

  /**
   * 更新成员 (需要认证)
   */
  async updateMember(memberId, member) {
    return this.request(`/api/genealogy/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(member)
    });
  }

  /**
   * 删除成员 (需要认证)
   */
  async deleteMember(memberId) {
    return this.request(`/api/genealogy/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // 字辈诗 API
  // ============================================

  /**
   * 获取所有字辈诗
   */
  async getGenerationPoems() {
    return this.request('/api/genealogy/poems');
  }

  /**
   * 添加字辈诗 (需要认证)
   */
  async addGenerationPoem(poem) {
    return this.request('/api/genealogy/poems', {
      method: 'POST',
      body: JSON.stringify(poem)
    });
  }

  // ============================================
  // 项目愿景幻灯片 API
  // ============================================

  /**
   * 获取所有幻灯片
   */
  async getProjectSlides() {
    return this.request('/api/genealogy/slides');
  }

  /**
   * 添加幻灯片 (需要认证)
   */
  async addProjectSlide(slide) {
    return this.request('/api/genealogy/slides', {
      method: 'POST',
      body: JSON.stringify(slide)
    });
  }

  // ============================================
  // 留言簿 API
  // ============================================

  /**
   * 获取留言
   */
  async getGuestMessages() {
    return this.request('/api/genealogy/messages');
  }

  /**
   * 提交留言
   */
  async submitGuestMessage(message) {
    return this.request('/api/genealogy/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  }

  // ============================================
  // 区块链记录 API
  // ============================================

  /**
   * 获取区块链记录
   */
  async getBlockchainRecords() {
    return this.request('/api/genealogy/blockchain');
  }

  /**
   * 添加区块链记录 (需要认证)
   */
  async addBlockchainRecord(record) {
    return this.request('/api/genealogy/blockchain', {
      method: 'POST',
      body: JSON.stringify(record)
    });
  }

  // ============================================
  // AI 对话 API
  // ============================================

  /**
   * 获取用户对话列表
   */
  async getUserConversations(userId) {
    return this.request(`/api/genealogy/conversations/${userId}`);
  }

  /**
   * 获取对话内容
   */
  async getConversation(conversationId) {
    return this.request(`/api/genealogy/conversation/${conversationId}`);
  }

  // ============================================
  // 系统配置 API
  // ============================================

  /**
   * 获取系统配置
   */
  async getSystemConfig(key) {
    return this.request(`/api/genealogy/config/${key}`);
  }

  /**
   * 更新系统配置 (需要认证)
   */
  async updateSystemConfig(key, value, description) {
    return this.request(`/api/genealogy/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description })
    });
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return this.request('/api/genealogy/health');
  }
}