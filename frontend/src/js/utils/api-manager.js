/**
 * 黄氏家族寻根平台 - API 管理器
 * 统一管理所有 API 调用
 */

export class APIManager {
    constructor() {
        this.baseURL = window.API_CONFIG?.baseURL || 'https://api.hxfund.cn';
        this.timeout = window.API_CONFIG?.timeout || 30000;
    }

    // 获取基础URL
    getBaseURL() {
        return this.baseURL;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            timeout: this.timeout
        };

        const requestOptions = {
            ...defaultOptions,
            ...options
        };

        // 添加认证头（如果提供token）
        if (options.token) {
            requestOptions.headers['Authorization'] = `Bearer ${options.token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }

    // 获取模型列表
    async getModels() {
        return await this.request('/api/models');
    }

    // 获取客户端认证 Token
    async getClientToken() {
        return await this.request('/api/auth/client-token', {
            method: 'POST',
            credentials: 'include'
        });
    }

    // 对话 API
    async conversation(data) {
        return await this.request('/api/conversation', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 单次对话 API
    async chat(data) {
        return await this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 获取会话历史
    async getSession(sessionId) {
        return await this.request(`/api/session/${sessionId}`);
    }

    // 删除会话
    async deleteSession(sessionId) {
        return await this.request(`/api/session/${sessionId}`, {
            method: 'DELETE'
        });
    }

    // 获取认证状态
    async getAuthStatus() {
        return await this.request('/api/auth/status');
    }

    // 获取健康检查
    async getHealth() {
        return await this.request('/api/health');
    }
}