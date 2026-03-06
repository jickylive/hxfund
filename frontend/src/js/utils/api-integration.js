/**
 * 黄氏家族寻根平台 - API 集成优化模块
 * 提供统一的API调用接口和错误处理
 */

import { APIManager } from './api-manager.js';

class OptimizedAPIIntegration {
    constructor() {
        this.apiManager = new APIManager();
        this.requestQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1秒
    }

    // 带重试机制的请求
    async requestWithRetry(endpoint, options = {}, maxRetries = this.retryAttempts) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.apiManager.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                // 如果是最后一次尝试，抛出错误
                if (attempt === maxRetries) {
                    console.error(`API 请求失败 (endpoint: ${endpoint}):`, error.message);
                    throw error;
                }
                
                // 等待一段时间后重试
                await this.delay(this.retryDelay * Math.pow(2, attempt)); // 指数退避
            }
        }
        
        throw lastError;
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 并发控制的请求队列
    async queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { requestFn, resolve, reject } = this.requestQueue.shift();
            
            try {
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.isProcessing = false;
    }

    // 批量请求
    async batchRequests(requests) {
        const promises = requests.map(request => 
            this.requestWithRetry(request.endpoint, request.options).catch(err => ({ error: err }))
        );
        
        return Promise.all(promises);
    }

    // 缓存请求结果
    async cachedRequest(endpoint, options = {}, cacheDuration = 5 * 60 * 1000) { // 默认5分钟缓存
        const cacheKey = `api_cache_${endpoint}_${JSON.stringify(options)}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheDuration) {
                console.log(`从缓存获取: ${endpoint}`);
                return data;
            }
        }

        try {
            const data = await this.requestWithRetry(endpoint, options);
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
            return data;
        } catch (error) {
            // 如果请求失败但有缓存数据，返回缓存数据
            if (cached) {
                console.warn(`请求失败，返回缓存数据: ${endpoint}`);
                const { data } = JSON.parse(cached);
                return data;
            }
            throw error;
        }
    }

    // 获取模型列表（带缓存）
    async getModels() {
        return await this.cachedRequest('/api/models', {}, 10 * 60 * 1000); // 10分钟缓存
    }

    // 获取客户端Token（不缓存）
    async getClientToken() {
        return await this.requestWithRetry('/api/auth/client-token', {
            method: 'POST',
            credentials: 'include'
        });
    }

    // 对话API（带错误处理和重试）
    async conversation(data) {
        return await this.requestWithRetry('/api/conversation', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 带节流的API调用
    throttledConversation = this.throttle(async (data) => {
        return await this.conversation(data);
    }, 1000); // 1秒内最多一次请求

    // 节流函数实现
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 获取认证状态
    async getAuthStatus() {
        return await this.requestWithRetry('/api/auth/status');
    }

    // 健康检查
    async healthCheck() {
        try {
            const result = await this.requestWithRetry('/api/health');
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 错误处理装饰器
    withErrorHandler(fn, onError) {
        return async (...args) => {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                console.error('API 错误:', error);
                if (onError) {
                    onError(error);
                } else {
                    // 默认错误处理
                    this.handleDefaultError(error);
                }
                throw error;
            }
        };
    }

    // 默认错误处理
    handleDefaultError(error) {
        let errorMessage = '网络请求失败';
        
        if (error.message.includes('401') || error.message.includes('认证')) {
            errorMessage = '认证失效，请重新登录';
        } else if (error.message.includes('403')) {
            errorMessage = '访问被拒绝';
        } else if (error.message.includes('404')) {
            errorMessage = '请求的资源不存在';
        } else if (error.message.includes('500')) {
            errorMessage = '服务器内部错误';
        } else if (error.message.includes('超时')) {
            errorMessage = '请求超时，请检查网络连接';
        } else if (error.message.includes('网络') || error.message.includes('Network')) {
            errorMessage = '网络连接问题，请检查网络连接';
        }

        // 显示错误提示
        this.showErrorMessage(errorMessage);
    }

    // 显示错误信息（这里可以调用UI组件）
    showErrorMessage(message) {
        console.error('API Error:', message);
        // 可以在这里调用全局消息组件
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }

    // 获取API统计信息
    getStats() {
        return {
            queuedRequests: this.requestQueue.length,
            isProcessing: this.isProcessing,
            retryAttempts: this.retryAttempts
        };
    }
}

// 创建单例实例
const apiIntegration = new OptimizedAPIIntegration();

// 导出实例和类
export { apiIntegration, OptimizedAPIIntegration };