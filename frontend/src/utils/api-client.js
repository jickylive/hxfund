/**
 * 黄氏家族寻根平台 - API 客户端
 */

export class APIClient {
  constructor() {
    this.baseURL = window.API_CONFIG?.baseURL ||
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://api.hxfund.cn');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // 添加认证头：token 存在 sessionStorage 裸键，或 localStorage 的 qwenConfig JSON 里；
    // 裸 localStorage.getItem('authToken') 从未被写入，之前是死代码
    let token = sessionStorage.getItem('authToken');
    if (!token) {
      try {
        const saved = JSON.parse(localStorage.getItem('qwenConfig') || '{}');
        if (saved.token && saved.tokenExpiresAt && saved.tokenExpiresAt > Date.now()) {
          token = saved.token;
        }
      } catch (_) { /* 配置损坏则无 token */ }
    }
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getModels() {
    return this.request('/api/models');
  }

  async getHealth(signal) {
    return this.request('/api/health', signal ? { signal } : {});
  }

  async getClientToken() {
    return this.request('/api/auth/client-token', {
      method: 'POST',
      credentials: 'include'
    });
  }

  async conversation(data) {
    return this.request('/api/conversation', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}