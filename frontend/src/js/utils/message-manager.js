/**
 * 黄氏家族寻根平台 - Qwen AI 消息管理器
 * 负责处理消息的显示、滚动和UI更新
 */

export class MessageManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.typingIndicator = null;
  }

  /**
   * 添加消息到界面
   * @param {string} role - 'user' 或 'ai'
   * @param {string} content - 消息内容
   * @param {Object} metadata - 附加元数据
   */
  addMessage(role, content, metadata = {}) {
    if (!this.container) {
      console.error('消息容器不存在');
      return;
    }

    const messageDiv = this.createMessageElement(role, content, metadata);
    this.container.appendChild(messageDiv);
    
    // 自动滚动到底部
    this.scrollToBottom();
    
    return messageDiv;
  }

  /**
   * 创建消息元素
   * @private
   */
  createMessageElement(role, content, metadata) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `qwen-message ${role}-message`;
    
    // 添加时间戳
    const timestamp = new Date().toLocaleTimeString();
    
    // 添加消息内容
    messageDiv.innerHTML = `
      <div class="qwen-avatar ${role}-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="qwen-content">
        <div class="qwen-name">${role === 'user' ? '您' : 'Qwen AI'}</div>
        <div class="qwen-text">${this.escapeHtml(content)}</div>
        <div class="qwen-timestamp">${timestamp}</div>
      </div>
    `;

    // 添加元数据属性
    Object.entries(metadata).forEach(([key, value]) => {
      messageDiv.setAttribute(`data-${key}`, value);
    });

    return messageDiv;
  }

  /**
   * 显示打字指示器
   */
  showTypingIndicator() {
    if (!this.container) return;

    this.hideTypingIndicator();

    this.typingIndicator = document.createElement('div');
    this.typingIndicator.className = 'qwen-message ai-message typing-indicator';
    this.typingIndicator.innerHTML = `
      <div class="qwen-avatar ai-avatar">🤖</div>
      <div class="qwen-content">
        <div class="qwen-name">Qwen AI</div>
        <div class="qwen-text typing-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    this.container.appendChild(this.typingIndicator);
    this.scrollToBottom();
  }

  /**
   * 隐藏打字指示器
   */
  hideTypingIndicator() {
    if (this.typingIndicator && this.typingIndicator.parentNode) {
      this.typingIndicator.parentNode.removeChild(this.typingIndicator);
      this.typingIndicator = null;
    }
  }

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  /**
   * 清空所有消息
   */
  clearMessages() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.hideTypingIndicator();
  }

  /**
   * 转义HTML以防止XSS
   * @private
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}