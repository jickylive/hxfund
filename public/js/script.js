/**
 * 黄氏家族寻根平台 - Qwen AI 客户端脚本
 * 增强版 v3.1.0 - 支持认证、多轮对话
 */

document.addEventListener('DOMContentLoaded', () => {
    // Qwen AI 客户端
    const qwenMessages = document.getElementById('qwenMessages');
    const qwenInput = document.getElementById('qwenInput');
    const qwenSendBtn = document.getElementById('qwenSendBtn');
    const qwenTokens = document.getElementById('qwenTokens');
    const qwenModelSelect = document.getElementById('qwenModelSelect');
    const qwenTemperature = document.getElementById('qwenTemperature');
    const tempValue = document.getElementById('tempValue');

    let sessionId = null;
    let totalTokens = 0;
    let authToken = null;
    let tokenExpiresAt = null;
    let isSending = false;

    // 关键元素缺失时整个客户端无法工作，直接退出避免后续空指针
    if (!qwenMessages || !qwenInput || !qwenSendBtn) {
        console.error('Qwen AI 客户端初始化失败：缺少必要的 DOM 元素');
        return;
    }

    // 统一的 API 基础地址：生产走 API_CONFIG，本地开发认 localhost 与 127.0.0.1
    function getApiBaseUrl() {
        if (window.API_CONFIG?.baseURL) return window.API_CONFIG.baseURL;
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
        return 'https://api.hxfund.cn';
    }

    // HTML 转义：用户输入与 AI 响应进 innerHTML 前必须转义，防 XSS
    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // 安全解析本地配置：localStorage 损坏时回退 {} 并清除坏键，不让初始化中断
    function safeParseConfig(raw) {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            console.warn('本地配置解析失败，已重置:', e.message);
            try { localStorage.removeItem('qwenConfig'); } catch (_) {}
            return {};
        }
    }

    // 加载配置
    function loadConfig() {
        const config = safeParseConfig(localStorage.getItem('qwenConfig'));
        if (config.model && qwenModelSelect) qwenModelSelect.value = config.model;
        if (config.temperature) {
            if (qwenTemperature) qwenTemperature.value = config.temperature;
            if (tempValue) tempValue.textContent = config.temperature;
        }

        // 优先从 sessionStorage 加载 Token（更安全）
        const sessionToken = sessionStorage.getItem('authToken');
        const sessionExpires = sessionStorage.getItem('tokenExpiresAt');

        if (sessionToken && sessionExpires) {
            const expiresAt = parseInt(sessionExpires);
            if (expiresAt > Date.now()) {
                authToken = sessionToken;
                tokenExpiresAt = expiresAt;
                console.log('✓ 已加载 session 中的认证 Token');
                loadModels();
                return;
            }
        }

        // sessionStorage 无有效 Token，尝试从 localStorage 加载
        if (config.token && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
            authToken = config.token;
            tokenExpiresAt = config.tokenExpiresAt;
            console.log('✓ 已加载 localStorage 中的认证 Token');
        }

        loadModels();
    }

    // 保存配置
    function saveConfig() {
        const config = {
            model: qwenModelSelect ? qwenModelSelect.value : 'qwen3.5-plus',
            temperature: qwenTemperature ? qwenTemperature.value : '0.7',
            token: authToken,
            tokenExpiresAt: tokenExpiresAt
        };
        localStorage.setItem('qwenConfig', JSON.stringify(config));
        alert('配置已保存！');
    }

    // 温度值更新
    if (qwenTemperature) {
        qwenTemperature.addEventListener('input', () => {
            if (tempValue) tempValue.textContent = qwenTemperature.value;
        });
    }

    // 获取认证 Token
    async function getAuthToken() {
        // 如果已有有效 Token，直接返回
        if (authToken && tokenExpiresAt && tokenExpiresAt > Date.now()) {
            return authToken;
        }

        try {
            const apiBaseUrl = getApiBaseUrl();

            // 从服务器代理端点获取新 Token（不暴露 API Key）
            const response = await fetch(`${apiBaseUrl}/api/auth/client-token`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include' // 包含cookies和其他认证信息
            });

            if (!response.ok) {
                // 尝试解析错误响应
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    // 如果响应不是JSON，使用状态文本
                    errorData = { error: response.statusText, status: response.status };
                }
                
                throw new Error(`获取 Token 失败：${errorData.error || response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                authToken = data.token;
                tokenExpiresAt = Date.now() + data.expiresIn;

                // 保存 Token 到 sessionStorage（更安全，会话结束自动清除）
                sessionStorage.setItem('authToken', authToken);
                sessionStorage.setItem('tokenExpiresAt', tokenExpiresAt.toString());

                // 同时保存到 localStorage（用于持久化配置）
                const savedConfig = safeParseConfig(localStorage.getItem('qwenConfig'));
                savedConfig.token = authToken;
                savedConfig.tokenExpiresAt = tokenExpiresAt;
                localStorage.setItem('qwenConfig', JSON.stringify(savedConfig));

                console.log('✓ 已获取新的认证 Token');
                return authToken;
            } else {
                console.warn('Token 获取失败:', data.error);
                return null;
            }
        } catch (error) {
            // 只记日志不插消息：由调用方（发送/刷新按钮）统一展示，避免一次失败出两条气泡
            console.error('获取认证 Token 失败:', error.message);
            return null;
        }
    }

    // 加载模型列表
    async function loadModels() {
        try {
            const apiBaseUrl = getApiBaseUrl();

            const res = await fetch(`${apiBaseUrl}/api/models`, {
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            if (data.success) {
                if (!Array.isArray(data.models) || data.models.length === 0) {
                    throw new Error('模型列表数据格式异常：models 不是有效数组');
                }
                const currentModel = qwenModelSelect ? qwenModelSelect.value : '';
                if (qwenModelSelect) {
                    qwenModelSelect.innerHTML = data.models.map(m =>
                        `<option value="${escapeHtml(m.id)}" ${m.default ? 'selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.id)})${m.default ? ' - 默认' : ''}</option>`
                    ).join('');
                    if (currentModel && data.models.some(m => m.id === currentModel)) {
                        qwenModelSelect.value = currentModel;
                    }
                }

                // 获取认证 Token
                await getAuthToken();
            } else {
                console.warn('加载模型列表失败:', data.error || '未知错误');
                addMessage('ai', `⚠️ 模型列表加载失败：${data.error || '无法连接到服务'}`);
            }
        } catch (error) {
            console.error('加载模型列表失败:', error.message);

            // 区分真正的网络异常与数据格式问题，避免误导用户去查网络
            const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
            if (error.message.includes('404')) {
                addMessage('ai', `⚠️ 网络错误：API 端点不存在<br>无法加载模型列表，请检查网络连接或联系管理员。`);
            } else if (error.message.includes('Unexpected token <')) {
                addMessage('ai', `⚠️ 网络错误：收到非JSON响应<br>无法加载模型列表，请检查网络连接。`);
            } else if (isNetworkError) {
                addMessage('ai', `⚠️ 网络错误：Failed to fetch<br>无法加载模型列表，请检查网络连接。`);
            } else {
                addMessage('ai', `⚠️ 模型列表加载失败：${escapeHtml(error.message)}<br>请稍后重试或联系管理员。`);
            }
        }
    }


    // 添加消息（内容先转义再插 innerHTML，防 XSS；换行转 <br> 保留排版）
    function addMessage(role, content) {
        const div = document.createElement('div');
        div.className = `qwen-message ${role}-message`;
        div.innerHTML = `
            <div class="qwen-avatar ${role}-avatar">${role === 'user' ? '👤' : '🤖'}</div>
            <div class="qwen-content">
                <div class="qwen-name">${role === 'user' ? '您' : 'Qwen AI'}</div>
                <div class="qwen-text">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
            </div>
        `;
        qwenMessages.appendChild(div);
        qwenMessages.scrollTop = qwenMessages.scrollHeight;
    }

    // 调用后端 API (多轮对话，带认证)
    async function callConversationAPI(message, model, temperature) {
        // 确保有有效的 Token
        const token = await getAuthToken();

        // 如果获取不到 token，返回错误信息
        if (!token) {
            throw new Error('无法获取认证令牌，请检查网络连接或联系管理员');
        }

        const apiBaseUrl = getApiBaseUrl();

        // 构建请求头
        const headers = { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/conversation`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message,
                    sessionId,
                    model,
                    temperature: parseFloat(temperature)
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '请求失败' }));

                // Token 过期，尝试重新获取
                if (error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN') {
                    console.log('Token 已过期，尝试重新获取...');
                    authToken = null;
                    tokenExpiresAt = null;
                    const newToken = await getAuthToken();

                    if (newToken) {
                        // 重试请求
                        const retryResponse = await fetch(`${apiBaseUrl}/api/conversation`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + newToken,
                                'Cache-Control': 'no-cache'
                            },
                            body: JSON.stringify({
                                message,
                                sessionId,
                                model,
                                temperature: parseFloat(temperature)
                            })
                        });

                        if (!retryResponse.ok) {
                            throw new Error('请求失败，请刷新页面重试');
                        }
                        return retryResponse.json();
                    }
                }

                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('API 调用失败:', error.message);
            throw error;
        }
    }

    // 发送消息
    async function sendMessage() {
        // 防重复提交：请求在途时忽略再次点击
        if (isSending) return;
        const message = qwenInput.value.trim();
        if (!message) {
            qwenInput.classList.add('shake');
            setTimeout(() => qwenInput.classList.remove('shake'), 500);
            return;
        }
        isSending = true;
        qwenSendBtn.disabled = true;

        // 添加用户消息
        addMessage('user', message);

        const currentMessage = message;

        // 清空输入
        qwenInput.value = '';

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
        qwenMessages.appendChild(loadingDiv);
        qwenMessages.scrollTop = qwenMessages.scrollHeight;

        try {
            const model = qwenModelSelect ? qwenModelSelect.value : 'qwen3.5-plus';
            const temperature = qwenTemperature ? qwenTemperature.value : '0.7';

            const data = await callConversationAPI(currentMessage, model, temperature);

            // 移除加载状态（remove() 已删除过也不会抛错）
            loadingDiv.remove();

            if (data.success) {
                // 更新会话 ID
                sessionId = data.sessionId;

                // 添加 AI 响应
                addMessage('ai', data.response);

                // 更新 Token 统计（usage 可能缺失）
                totalTokens += data.usage?.total_tokens || 0;
                if (qwenTokens) qwenTokens.textContent = totalTokens;
            } else {
                addMessage('ai', `抱歉，出现错误：${data.error}`);
            }

        } catch (error) {
            loadingDiv.remove();
            addMessage('ai', `抱歉，出现错误：${error.message}`);
            
            // 如果是认证相关的错误，提示用户可能需要重新加载页面
            if (error.message.includes('认证令牌') || error.message.includes('Token')) {
                addMessage('ai', `💡 提示：如果问题持续，请尝试刷新页面重新连接。`);
            }
        } finally {
            isSending = false;
            qwenSendBtn.disabled = false;
        }
    }

    // 绑定事件
    qwenSendBtn.addEventListener('click', sendMessage);

    qwenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 添加刷新认证按钮功能
    const refreshTokenBtn = document.createElement('button');
    refreshTokenBtn.className = 'btn-outline';
    refreshTokenBtn.innerHTML = '<span>🔄 刷新连接</span>';
    refreshTokenBtn.style.marginLeft = '10px';
    refreshTokenBtn.style.padding = '8px 12px';
    refreshTokenBtn.style.fontSize = '0.9rem';
    
    const qwenInputFooter = document.querySelector('.qwen-input-footer');
    if (qwenInputFooter) {
        qwenInputFooter.appendChild(refreshTokenBtn);
        
        refreshTokenBtn.addEventListener('click', async () => {
            // 清除现有令牌
            authToken = null;
            tokenExpiresAt = null;
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('tokenExpiresAt');
            
            // 尝试获取新令牌
            const newToken = await getAuthToken();
            if (newToken) {
                addMessage('ai', '✅ 连接已刷新，可以继续使用 AI 服务。');
            } else {
                addMessage('ai', '❌ 连接刷新失败，请检查网络或稍后重试。');
            }
        });
    }

    // 初始化
    loadConfig();

    // 保存配置按钮
    const qwenSaveConfig = document.getElementById('qwenSaveConfig');
    if (qwenSaveConfig) {
        qwenSaveConfig.addEventListener('click', saveConfig);
    }

    console.log('✅ Qwen AI 客户端已加载 (增强版)');
});
