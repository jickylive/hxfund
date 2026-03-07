/**
 * 黄氏家族寻根平台 - Qwen AI 主组件
 * 采用模块化架构，集成所有子模块
 */

import { MessageManager } from './utils/message-manager.js';
import { SessionManager } from './utils/session-manager.js';
import { QwenApiClient } from './utils/api-client.js';
import { ConfigManager } from './utils/config-manager.js';
import { EventManager } from './utils/event-manager.js';

export class QwenAI {
  constructor(options = {}) {
    // DOM元素引用
    this.containerId = options.containerId || 'qwenContainer';
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      throw new Error(`找不到ID为"${this.containerId}"的容器元素`);
    }

    // 初始化子模块
    this.messageManager = new MessageManager('qwenMessages');
    this.sessionManager = new SessionManager();
    this.apiClient = new QwenApiClient(options.apiBaseURL);
    this.configManager = new ConfigManager();
    this.eventManager = new EventManager();
    
    // 组件状态
    this.state = {
      isLoading: false,
      isConnected: false,
      currentSessionId: null,
      totalTokens: 0,
      errorMessage: null
    };
    
    // 绑定方法上下文
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleTemperatureChange = this.handleTemperatureChange.bind(this);
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  async init() {
    try {
      // 初始化配置
      this.configManager.initializeUI();
      
      // 绑定事件
      this.bindEvents();
      
      // 初始化UI
      this.initializeUI();
      
      // 加载模型列表
      await this.loadModels();
      
      // 连接到服务
      await this.connect();
      
      console.log('✅ Qwen AI 组件初始化完成');
      
      // 发布初始化完成事件
      this.eventManager.publish('qwen:initialized', {
        timestamp: Date.now(),
        containerId: this.containerId
      });
      
    } catch (error) {
      console.error('❌ Qwen AI 组件初始化失败:', error);
      this.showError(`初始化失败: ${error.message}`);
    }
  }

  /**
   * 绑定事件处理器
   */
  bindEvents() {
    // 发送消息事件
    const sendButton = document.getElementById('qwenSendBtn');
    const inputArea = document.getElementById('qwenInput');
    
    if (sendButton) {
      sendButton.addEventListener('click', this.handleSendMessage);
    }
    
    if (inputArea) {
      inputArea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }
    
    // 模型选择变化
    const modelSelect = document.getElementById('qwenModelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', this.handleModelChange);
    }
    
    // 温度变化
    const temperatureSlider = document.getElementById('qwenTemperature');
    if (temperatureSlider) {
      temperatureSlider.addEventListener('input', this.handleTemperatureChange);
    }
    
    // 配置保存
    const saveConfigBtn = document.getElementById('qwenSaveConfig');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        this.saveConfiguration();
      });
    }
  }

  /**
   * 初始化UI元素
   */
  initializeUI() {
    // 设置初始配置值
    const modelSelect = document.getElementById('qwenModelSelect');
    const temperatureSlider = document.getElementById('qwenTemperature');
    const temperatureValue = document.getElementById('tempValue');
    
    if (modelSelect) {
      modelSelect.value = this.configManager.get('model');
    }
    
    if (temperatureSlider && temperatureValue) {
      const temp = this.configManager.get('temperature');
      temperatureSlider.value = temp;
      temperatureValue.textContent = temp;
    }
  }

  /**
   * 连接到Qwen服务
   */
  async connect() {
    try {
      this.setState({ isLoading: true, errorMessage: null });
      
      // 获取认证令牌
      const token = await this.apiClient.getAuthToken();
      
      if (token) {
        this.setState({ isConnected: true, isLoading: false });
        console.log('✅ 已连接到Qwen服务');
        
        // 发布连接成功事件
        this.eventManager.publish('qwen:connected', {
          timestamp: Date.now(),
          token: token.substring(0, 8) + '...' // 只记录令牌前几位用于调试
        });
      } else {
        throw new Error('无法获取认证令牌');
      }
    } catch (error) {
      console.error('连接Qwen服务失败:', error);
      this.setState({ 
        isConnected: false, 
        isLoading: false, 
        errorMessage: error.message 
      });
      this.showError(`连接失败: ${error.message}`);
    }
  }

  /**
   * 加载模型列表
   */
  async loadModels() {
    try {
      const models = await this.apiClient.getModels();
      
      const modelSelect = document.getElementById('qwenModelSelect');
      if (modelSelect && models.success) {
        modelSelect.innerHTML = models.models.map(model => 
          `<option value="${model.id}" ${model.default ? 'selected' : ''}>
            ${model.name} (${model.id})${model.default ? ' - 默认' : ''}
           </option>`
        ).join('');
        
        // 设置默认模型
        const savedModel = this.configManager.get('model');
        if (savedModel && models.models.some(m => m.id === savedModel)) {
          modelSelect.value = savedModel;
        }
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
      this.showError(`模型列表加载失败: ${error.message}`);
    }
  }

  /**
   * 处理发送消息事件
   */
  async handleSendMessage() {
    const inputElement = document.getElementById('qwenInput');
    if (!inputElement) return;

    const message = inputElement.value.trim();
    if (!message) {
      this.showValidationError('请输入消息内容');
      return;
    }

    if (this.state.isLoading) {
      console.log('请求正在进行中，请稍候...');
      return;
    }

    try {
      this.setState({ isLoading: true });
      
      // 添加用户消息到界面
      this.messageManager.addMessage('user', message);
      
      // 清空输入框
      inputElement.value = '';
      
      // 显示打字指示器
      this.messageManager.showTypingIndicator();
      
      // 获取当前配置
      const model = document.getElementById('qwenModelSelect')?.value || this.configManager.get('model');
      const temperature = parseFloat(document.getElementById('qwenTemperature')?.value || this.configManager.get('temperature'));
      
      // 调用API
      const response = await this.apiClient.chat({
        message,
        model,
        temperature,
        sessionId: this.state.currentSessionId
      });
      
      // 隐藏打字指示器
      this.messageManager.hideTypingIndicator();
      
      if (response.success) {
        // 更新会话ID
        if (response.sessionId) {
          this.state.currentSessionId = response.sessionId;
        }
        
        // 添加AI响应
        this.messageManager.addMessage('ai', response.response, {
          tokensUsed: response.usage?.total_tokens,
          model: response.model
        });
        
        // 更新token统计
        if (response.usage?.total_tokens) {
          this.state.totalTokens += response.usage.total_tokens;
          const tokenCounter = document.getElementById('qwenTokens');
          if (tokenCounter) {
            tokenCounter.textContent = this.state.totalTokens;
          }
        }
        
        // 保存消息到会话历史
        this.sessionManager.addMessageToHistory('user', message);
        this.sessionManager.addMessageToHistory('assistant', response.response);
        
        console.log(`✅ 消息处理成功，使用模型: ${response.model}`);
        
        // 发布消息成功事件
        this.eventManager.publish('qwen:message:sent', {
          timestamp: Date.now(),
          messageId: response.messageId,
          model: response.model,
          tokensUsed: response.usage?.total_tokens
        });
      } else {
        throw new Error(response.error || '未知错误');
      }
    } catch (error) {
      // 隐藏打字指示器
      this.messageManager.hideTypingIndicator();
      
      console.error('发送消息失败:', error);
      this.messageManager.addMessage('ai', `❌ 发生错误: ${error.message}`);
      
      // 如果是认证相关错误，尝试重新连接
      if (error.message.includes('认证') || error.message.includes('token', 'Token')) {
        this.setState({ isConnected: false });
        setTimeout(() => this.connect(), 2000); // 2秒后重连
      }
      
      // 发布消息失败事件
      this.eventManager.publish('qwen:message:error', {
        timestamp: Date.now(),
        error: error.message,
        message: inputElement?.value
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * 处理模型选择变化
   */
  handleModelChange(event) {
    const newModel = event.target.value;
    this.configManager.set('model', newModel);
    
    console.log(`模型已切换到: ${newModel}`);
    
    // 发布模型切换事件
    this.eventManager.publish('qwen:model:changed', {
      timestamp: Date.now(),
      oldModel: this.configManager.get('model'),
      newModel: newModel
    });
  }

  /**
   * 处理温度变化
   */
  handleTemperatureChange(event) {
    const newTemp = parseFloat(event.target.value);
    const tempValue = document.getElementById('tempValue');
    
    if (tempValue) {
      tempValue.textContent = newTemp.toFixed(1);
    }
    
    this.configManager.set('temperature', newTemp);
    
    console.log(`温度已调整到: ${newTemp}`);
    
    // 发布温度调整事件
    this.eventManager.publish('qwen:temperature:changed', {
      timestamp: Date.now(),
      oldTemp: this.configManager.get('temperature'),
      newTemp: newTemp
    });
  }

  /**
   * 保存配置
   */
  saveConfiguration() {
    try {
      const model = document.getElementById('qwenModelSelect')?.value;
      const temperature = parseFloat(document.getElementById('qwenTemperature')?.value);
      
      if (model) this.configManager.set('model', model);
      if (!isNaN(temperature)) this.configManager.set('temperature', temperature);
      
      // 显示保存成功的反馈
      this.showMessage('配置已保存！', 'success');
      
      console.log('✅ 配置已保存');
      
      // 发布配置保存事件
      this.eventManager.publish('qwen:config:saved', {
        timestamp: Date.now(),
        config: this.configManager.getAll()
      });
    } catch (error) {
      console.error('保存配置失败:', error);
      this.showMessage(`保存失败: ${error.message}`, 'error');
    }
  }

  /**
   * 设置组件状态
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    
    // 更新UI状态
    this.updateUIState();
  }

  /**
   * 更新UI状态
   */
  updateUIState() {
    const sendButton = document.getElementById('qwenSendBtn');
    const statusIndicator = document.getElementById('qwenStatus');
    
    if (sendButton) {
      sendButton.disabled = this.state.isLoading;
      sendButton.textContent = this.state.isLoading ? '发送中...' : '发送';
    }
    
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${this.state.isConnected ? 'connected' : 'disconnected'}`;
      statusIndicator.title = this.state.isConnected ? '已连接' : '未连接';
    }
  }

  /**
   * 显示消息（成功或错误）
   */
  showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `notification notification-${type}`;
    messageDiv.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    this.showMessage(message, 'error');
    
    // 发布错误事件
    this.eventManager.publish('qwen:error', {
      timestamp: Date.now(),
      error: message
    });
  }

  /**
   * 显示验证错误
   */
  showValidationError(message) {
    this.showMessage(message, 'warning');
  }

  /**
   * 清空对话历史
   */
  async clearHistory() {
    try {
      this.messageManager.clearMessages();
      await this.sessionManager.clearSession();
      this.state.totalTokens = 0;
      
      // 更新token计数显示
      const tokenCounter = document.getElementById('qwenTokens');
      if (tokenCounter) {
        tokenCounter.textContent = '0';
      }
      
      console.log('✅ 对话历史已清空');
      
      // 添加欢迎消息
      this.messageManager.addMessage('ai', '对话历史已清空，您可以开始新的对话。');
      
      // 发布历史清空事件
      this.eventManager.publish('qwen:history:cleared', {
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('清空历史失败:', error);
      this.showError(`清空历史失败: ${error.message}`);
    }
  }

  /**
   * 重新连接
   */
  async reconnect() {
    console.log('尝试重新连接...');
    await this.connect();
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清理事件监听器
    const sendButton = document.getElementById('qwenSendBtn');
    const inputArea = document.getElementById('qwenInput');
    
    if (sendButton) {
      sendButton.removeEventListener('click', this.handleSendMessage);
    }
    
    if (inputArea) {
      inputArea.removeEventListener('keypress', this.handleSendMessage);
    }
    
    // 清理定时器和异步操作
    this.setState({ isLoading: false });
    
    console.log('Qwen AI 组件已销毁');
    
    // 发布销毁事件
    this.eventManager.publish('qwen:destroyed', {
      timestamp: Date.now()
    });
  }
}

// 自动初始化Qwen AI组件（如果页面中有相应元素）
document.addEventListener('DOMContentLoaded', () => {
  const qwenContainer = document.getElementById('qwenContainer');
  if (qwenContainer) {
    try {
      // 检查是否已经初始化过
      if (!window.qwenAIInstance) {
        window.qwenAIInstance = new QwenAI();
        console.log('Qwen AI 组件已自动初始化');
      }
    } catch (error) {
      console.error('Qwen AI 组件初始化失败:', error);
    }
  }
});

// 导出类以供其他模块使用
export default QwenAI;