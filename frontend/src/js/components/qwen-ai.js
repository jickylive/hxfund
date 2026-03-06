/**
 * 黄氏家族寻根平台 - Qwen AI 客户端组件
 * 增强版 v3.2.0 - 支持认证、多轮对话、模块化设计
 */

import { APIManager } from '../utils/api-manager.js';
import { LocalStorageManager } from '../utils/storage-manager.js';
import { UIHelper } from '../utils/ui-helper.js';

class QwenAI {
    constructor() {
        this.qwenMessages = document.getElementById('qwenMessages');
        this.qwenInput = document.getElementById('qwenInput');
        this.qwenSendBtn = document.getElementById('qwenSendBtn');
        this.qwenTokens = document.getElementById('qwenTokens');
        this.qwenModelSelect = document.getElementById('qwenModelSelect');
        this.qwenTemperature = document.getElementById('qwenTemperature');
        this.tempValue = document.getElementById('tempValue');

        this.selectedImageFile = null;
        this.sessionId = null;
        this.totalTokens = 0;
        this.authToken = null;
        this.tokenExpiresAt = null;

        this.apiManager = new APIManager();
        this.storageManager = new LocalStorageManager();
        this.uiHelper = new UIHelper();

        this.init();
    }

    async init() {
        // 加载配置
        this.loadConfig();

        // 绑定事件
        this.bindEvents();

        // 加载模型列表
        await this.loadModels();
    }

    // 加载配置
    loadConfig() {
        const saved = this.storageManager.get('qwenConfig');
        if (saved) {
            const config = JSON.parse(saved);
            this.qwenModelSelect.value = config.model || 'qwen3.5-plus';
            this.qwenTemperature.value = config.temperature || '0.7';
            this.tempValue.textContent = config.temperature || '0.7';
        }

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
        if (saved) {
            const config = JSON.parse(saved);
            if (config.token && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
                this.authToken = config.token;
                this.tokenExpiresAt = config.tokenExpiresAt;
                console.log('✓ 已加载 localStorage 中的认证 Token');
            }
        }
    }

    // 保存配置
    saveConfig() {
        const config = {
            model: this.qwenModelSelect.value,
            temperature: this.qwenTemperature.value,
            token: this.authToken,
            tokenExpiresAt: this.tokenExpiresAt
        };
        this.storageManager.set('qwenConfig', JSON.stringify(config));
        alert('配置已保存！');
    }

    // 绑定事件
    bindEvents() {
        // 温度值更新
        this.qwenTemperature.addEventListener('input', () => {
            this.tempValue.textContent = this.qwenTemperature.value;
        });

        // 图片上传
        const qwenImageUpload = document.getElementById('qwenImageUpload');
        const qwenImagePreview = document.getElementById('qwenImagePreview');

        qwenImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.match('image.*')) {
                this.selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    qwenImagePreview.innerHTML = `<img src="${event.target.result}" alt="预览">`;
                    qwenImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // 发送按钮
        this.qwenSendBtn.addEventListener('click', () => this.sendMessage());

        // 回车发送
        this.qwenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 保存配置按钮
        const qwenSaveConfig = document.getElementById('qwenSaveConfig');
        if (qwenSaveConfig) {
            qwenSaveConfig.addEventListener('click', () => this.saveConfig());
        }
    }

    // 加载模型列表
    async loadModels() {
        try {
            const data = await this.apiManager.getModels();
            
            if (data.success) {
                const currentModel = this.qwenModelSelect.value;
                this.qwenModelSelect.innerHTML = data.models.map(m =>
                    `<option value="${m.id}" ${m.default ? 'selected' : ''}>${m.name} (${m.id})${m.default ? ' - 默认' : ''}</option>`
                ).join('');
                
                if (currentModel && data.models.some(m => m.id === currentModel)) {
                    this.qwenModelSelect.value = currentModel;
                }

                // 获取认证 Token
                await this.getAuthToken();
            } else {
                console.warn('加载模型列表失败:', data.error || '未知错误');
                this.addMessage('ai', `⚠️ 模型列表加载失败：${data.error || '无法连接到服务'}`);
            }
        } catch (error) {
            console.error('加载模型列表失败:', error.message);
            this.addMessage('ai', `⚠️ 网络错误：${error.message}<br>无法加载模型列表，请检查网络连接。`);
        }
    }

    // 获取认证 Token
    async getAuthToken() {
        // 如果已有有效 Token，直接返回
        if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > Date.now()) {
            return this.authToken;
        }

        try {
            const data = await this.apiManager.getClientToken();
            
            if (data.success) {
                this.authToken = data.token;
                this.tokenExpiresAt = Date.now() + data.expiresIn;

                // 保存 Token 到 sessionStorage（更安全，会话结束自动清除）
                sessionStorage.setItem('authToken', this.authToken);
                sessionStorage.setItem('tokenExpiresAt', this.tokenExpiresAt.toString());

                // 同时保存到 localStorage（用于持久化配置）
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
    async sendMessage() {
        const message = this.qwenInput.value.trim();
        if (!message && !this.selectedImageFile) {
            this.uiHelper.shakeElement(this.qwenInput);
            return;
        }

        // 添加用户消息
        let displayContent = message;
        if (this.selectedImageFile) {
            displayContent = `[图片：${this.selectedImageFile.name}] ${message}`;
        }
        this.addMessage('user', displayContent);

        // 保存当前图片引用
        const currentImage = this.selectedImageFile;
        const currentMessage = message;

        // 清空输入
        this.qwenInput.value = '';
        const qwenImagePreview = document.getElementById('qwenImagePreview');
        qwenImagePreview.style.display = 'none';
        this.selectedImageFile = null;

        // 显示加载状态
        const loadingDiv = document.createElement('div');
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

        try {
            const model = this.qwenModelSelect.value;
            const temperature = this.qwenTemperature.value;

            const data = await this.apiManager.conversation({
                message: currentMessage,
                sessionId: this.sessionId,
                model,
                temperature: parseFloat(temperature)
            });

            // 移除加载状态
            this.qwenMessages.removeChild(loadingDiv);

            if (data.success) {
                // 更新会话 ID
                this.sessionId = data.sessionId;

                // 添加 AI 响应
                this.addMessage('ai', data.response);

                // 更新 Token 统计
                this.totalTokens += data.usage.total_tokens || 0;
                this.qwenTokens.textContent = this.totalTokens;
            } else {
                this.addMessage('ai', `抱歉，出现错误：${data.error}`);
            }

        } catch (error) {
            this.qwenMessages.removeChild(loadingDiv);
            this.addMessage('ai', `抱歉，出现错误：${error.message}`);

            // 如果是认证相关的错误，提示用户可能需要重新加载页面
            if (error.message.includes('认证令牌') || error.message.includes('Token')) {
                this.addMessage('ai', `💡 提示：如果问题持续，请尝试刷新页面重新连接。`);
            }
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