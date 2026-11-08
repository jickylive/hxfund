/**
 * 黄氏家族寻根平台 - Qwen AI 组件
 * 简化版 v4.0.0 - 模型由后端 /api/health 下发，前端不展示参数配置
 */

import { APIClient } from '../utils/api-client.js';
import { StorageManager } from '../utils/storage-manager.js';

class QwenAI {
  constructor() {
    this.qwenMessages = document.getElementById('qwenMessages');
    this.qwenInput = document.getElementById('qwenInput');
    this.qwenSendBtn = document.getElementById('qwenSendBtn');
    this.qwenTokens = document.getElementById('qwenTokens');
    this.qwenModelLabel = document.getElementById('qwenModelLabel');

    this.sessionId = null;
    this.totalTokens = 0;
    this.authToken = null;
    this.tokenExpiresAt = null;
    this.isSending = false;
    // 当前模型：由后端 /api/health 下发；未取到时用后端默认值兜底
    this.currentModel = 'deepseek-ai/DeepSeek-V4-Flash';
    this.DEFAULT_TEMPERATURE = 0.7;

    this.apiClient = new APIClient();
    this.storageManager = new StorageManager();

    this.init();
  }

  async init() {
    // 加载已保存的 Token
    this.loadSavedToken();

    // 绑定事件
    this.bindEvents();

    // 从 /api/health 获取当前模型
    await this.loadHealthModel();
  }

  // 加载已保存的 Token（只存 Token，不再存模型/温度）
  loadSavedToken() {
    // 优先从 sessionStorage 加载 Token（更安全）
    const sessionToken = sessionStorage.getItem('authToken');
    const sessionExpires = sessionStorage.getItem('tokenExpiresAt');

    if (sessionToken && sessionExpires) {
      const expiresAt = parseInt(sessionExpires);
      if (expiresAt > Date.now()) {
        this.authToken = sessionToken;
        this.tokenExpiresAt = expiresAt;
        console.log('✓ 已加载 session 中的认证 Token');
        return;
      }
    }

    // sessionStorage 无有效 Token，尝试从 localStorage 加载
    const saved = this.storageManager.get('qwenConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.token && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
          this.authToken = config.token;
          this.tokenExpiresAt = config.tokenExpiresAt;
          console.log('✓ 已加载 localStorage 中的认证 Token');
        }
      } catch (_) { /* 配置损坏则无 Token */ }
    }
  }

  // 模型 ID 转展示名
  modelDisplayName(modelId) {
    const short = String(modelId || '').split('/').pop();
    return short.replace(/-/g, ' ');
  }

  // 从 /api/health 获取后端当前模型（只读展示，不让用户改）
  async loadHealthModel() {
    try {
      const data = await this.apiClient.getHealth();
      if (data.config?.model) {
        this.currentModel = data.config.model;
      }
    } catch (error) {
      console.warn('从 /api/health 获取模型失败，使用默认模型:', error.message);
    }
    if (this.qwenModelLabel) {
      this.qwenModelLabel.textContent = this.modelDisplayName(this.currentModel);
    }
  }

  // 绑定事件
  bindEvents() {
    // 发送按钮
    if (this.qwenSendBtn) {
      this.qwenSendBtn.addEventListener('click', () => this.sendMessage());
    }

    // 回车发送
    if (this.qwenInput) {
      this.qwenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  // 获取认证 Token
  async getAuthToken() {
    // 如果已有有效 Token，直接返回
    if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now()) {
      return this.authToken;
    }

    try {
      const data = await this.apiClient.getClientToken();

      if (data.success) {
        this.authToken = data.token;
        this.tokenExpiresAt = Date.now() + data.expiresIn;

        // 保存 Token 到 sessionStorage（更安全，会话结束自动清除）
        sessionStorage.setItem('authToken', this.authToken);
        sessionStorage.setItem('tokenExpiresAt', this.tokenExpiresAt.toString());

        // 同时保存到 localStorage（用于持久化）
        const savedConfig = JSON.parse(this.storageManager.get('qwenConfig') || '{}');
        savedConfig.token = this.authToken;
        savedConfig.tokenExpiresAt = this.tokenExpiresAt;
        this.storageManager.set('qwenConfig', JSON.stringify(savedConfig));

        console.log('✓ 已获取新的认证 Token');
        return this.authToken;
      } else {
        console.warn('Token 获取失败:', data.error);
        return null;
      }
    } catch (error) {
      console.error('获取认证 Token 失败:', error.message);
      this.addMessage('ai', `⚠️ 网络连接问题：${error.message}<br>请检查网络连接或稍后重试。`);
      return null;
    }
  }

  // 添加消息
  addMessage(role, content) {
    if (!this.qwenMessages) return;

    const div = document.createElement('div');
    div.className = `qwen-message ${role}-message`;
    div.innerHTML = `
      <div class="qwen-avatar ${role}-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="qwen-content">
        <div class="qwen-name">${role === 'user' ? '您' : 'Qwen AI'}</div>
        <div class="qwen-text">${content.replace(/\n/g, '<br>')}</div>
      </div>
    `;
    this.qwenMessages.appendChild(div);
    this.qwenMessages.scrollTop = this.qwenMessages.scrollHeight;
  }

  // 发送消息
  // 加固：从置 isSending 到恢复按钮的全部流程都在 try/finally 里，
  // 中间任何一步抛错都会恢复按钮可用状态，不会留下死锁。
  async sendMessage() {
    if (!this.qwenInput) return;
    if (this.isSending) return;

    const message = this.qwenInput.value.trim();
    if (!message) {
      this.qwenInput.classList.add('shake');
      setTimeout(() => this.qwenInput.classList.remove('shake'), 500);
      return;
    }

    this.isSending = true;
    if (this.qwenSendBtn) this.qwenSendBtn.disabled = true;

    let loadingDiv = null;
    try {
      // 添加用户消息
      this.addMessage('user', message);

      const currentMessage = message;

      // 清空输入
      this.qwenInput.value = '';

      // 显示加载状态
      loadingDiv = document.createElement('div');
      loadingDiv.className = 'qwen-message ai-message';
      loadingDiv.innerHTML = `
        <div class="qwen-avatar ai-avatar">🤖</div>
        <div class="qwen-content">
          <div class="qwen-name">Qwen AI</div>
          <div class="qwen-text"><i>正在思考中...</i></div>
        </div>
      `;
      this.qwenMessages.appendChild(loadingDiv);
      this.qwenMessages.scrollTop = this.qwenMessages.scrollHeight;

      const data = await this.apiClient.conversation({
        message: currentMessage,
        sessionId: this.sessionId,
        model: this.currentModel,
        temperature: this.DEFAULT_TEMPERATURE
      });

      // 移除加载状态
      if (loadingDiv) this.qwenMessages.removeChild(loadingDiv);
      loadingDiv = null;

      if (data.success) {
        // 更新会话 ID
        this.sessionId = data.sessionId;

        // 添加 AI 响应
        this.addMessage('ai', data.response);

        // 更新 Token 统计
        this.totalTokens += data.usage?.total_tokens || 0;
        if (this.qwenTokens) {
          this.qwenTokens.textContent = this.totalTokens;
        }
      } else {
        this.addMessage('ai', `抱歉，出现错误：${data.error}`);
      }

    } catch (error) {
      if (loadingDiv && loadingDiv.parentNode) this.qwenMessages.removeChild(loadingDiv);
      this.addMessage('ai', `抱歉，出现错误：${error.message}`);

      // 如果是认证相关的错误，提示用户可能需要重新加载页面
      if (error.message.includes('认证令牌') || error.message.includes('Token')) {
        this.addMessage('ai', `💡 提示：如果问题持续，请尝试刷新页面重新连接。`);
      }
    } finally {
      this.isSending = false;
      if (this.qwenSendBtn) this.qwenSendBtn.disabled = false;
    }
  }
}

// 初始化 Qwen AI 客户端
let qwenAIInstance = null;

export async function initializeQwenAI() {
  if (!qwenAIInstance) {
    qwenAIInstance = new QwenAI();
    console.log('Qwen AI 客户端已初始化');
  }
  return qwenAIInstance;
}

// 导出实例以便外部使用
export { qwenAIInstance };
