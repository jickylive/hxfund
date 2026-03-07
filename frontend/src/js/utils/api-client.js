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

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    return this.request(`/api/session/${sessionId}`, {
      method: 'DELETE'
    });
  }
}