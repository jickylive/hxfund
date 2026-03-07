/**
 * 黄氏家族寻根平台 - API 客户端
 */

export class APIClient {
  constructor() {
    this.baseURL = window.API_CONFIG?.baseURL ||
                  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.hxfund.cn');
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

    // 添加认证头
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
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