/**
 * 黄氏家族寻根平台 - Qwen AI 客户端脚本
 * 简化版 v4.0.0 - 模型由后端 /api/health 下发，前端不展示参数配置
 *
 * 变更说明（2026-11-08）：
 * - 模型参数从 /api/health 获取（config.model），不再调 /api/models、不再展示模型下拉框
 * - 参数配置面板已从页面移除：温度固定 0.7（后端默认值），不再让用户改模型/温度
 * - 发送按钮加固：全部流程包在 try/finally 里，任何一步抛错都会恢复按钮可用状态，
 *   避免 isSending 卡死导致按钮永久无响应
 */

document.addEventListener('DOMContentLoaded', () => {
    // Qwen AI 客户端
    const qwenMessages = document.getElementById('qwenMessages');
    const qwenInput = document.getElementById('qwenInput');
    const qwenSendBtn = document.getElementById('qwenSendBtn');
    const qwenTokens = document.getElementById('qwenTokens');
    const qwenModelLabel = document.getElementById('qwenModelLabel');

    let sessionId = null;
    let totalTokens = 0;
    let authToken = null;
    let tokenExpiresAt = null;
    let isSending = false;
    // 当前模型：由后端 /api/health 下发；未取到时用后端默认值兜底
    let currentModel = 'deepseek-ai/DeepSeek-V4-Flash';
    const DEFAULT_TEMPERATURE = 0.7;

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

    // 模型 ID 转展示名：取斜杠后的最后一段，去掉横杠换成空格
    function modelDisplayName(modelId) {
        const short = String(modelId || '').split('/').pop();
        return short.replace(/-/g, ' ');
    }

    // 从 /api/health 获取后端当前模型（只读展示，不让用户改）
    // 加 5 秒超时：健康检查接口万一挂起不返回，标签也要及时落到默认模型，
    // 不能一直停在初始文案上
    async function loadHealthModel() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const apiBaseUrl = getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/health`, { signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.config?.model) {
                currentModel = data.config.model;
            }
            // 额度已用完：提示用户并禁用发送，等额度恢复再试
            if (data.config?.modelAvailable === false) {
                const reason = data.config?.quota?.reason || '免费额度已用完，请稍后再试';
                addMessage('ai', `⚠️ ${reason}`);
                qwenSendBtn.disabled = true;
                qwenSendBtn.title = reason;
            }
        } catch (error) {
            console.warn('从 /api/health 获取模型失败，使用默认模型:', error.message);
        } finally {
            clearTimeout(timeoutId);
        }
        if (qwenModelLabel) {
            qwenModelLabel.textContent = modelDisplayName(currentModel);
        }
    }

    // 安全解析本地配置：localStorage 损坏时回退 {} 并清除坏键，不让初始化中断
    function safeParseConfig(raw) {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            console.warn('本地配置解析失败，已重置:', e.message);
            try { localStorage.removeItem('qwenConfig'); } catch (removeError) { console.warn('清除损坏配置失败:', removeError.message); }
            return {};
        }
    }

    // 加载已保存的 Token（只存 Token，不再存模型/温度）
    function loadSavedToken() {
        // 优先从 sessionStorage 加载 Token（更安全）
        const sessionToken = sessionStorage.getItem('authToken');
        const sessionExpires = sessionStorage.getItem('tokenExpiresAt');

        if (sessionToken && sessionExpires) {
            const expiresAt = parseInt(sessionExpires);
            if (expiresAt > Date.now()) {
                authToken = sessionToken;
                tokenExpiresAt = expiresAt;
                console.log('✓ 已加载 session 中的认证 Token');
                return;
            }
        }

        // sessionStorage 无有效 Token，尝试从 localStorage 加载
        const config = safeParseConfig(localStorage.getItem('qwenConfig'));
        if (config.token && config.tokenExpiresAt && config.tokenExpiresAt > Date.now()) {
            authToken = config.token;
            tokenExpiresAt = config.tokenExpiresAt;
            console.log('✓ 已加载 localStorage 中的认证 Token');
        }
    }

    // 保存 Token（只存 Token）
    function saveToken() {
        const config = {
            token: authToken,
            tokenExpiresAt: tokenExpiresAt
        };
        try { localStorage.setItem('qwenConfig', JSON.stringify(config)); } catch (e) { console.warn('保存 Token 失败:', e.message); }
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
                // 注意：不要加 'Cache-Control' 请求头——它不是 CORS 安全列表头，
                // 会触发预检，而服务端 Allow-Headers 不含 cache-control，
                // 预检失败导致整个请求报 Failed to fetch（2026-11-07 事故）。
                headers: {
                    'Content-Type': 'application/json'
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

                // 同时保存到 localStorage（用于持久化）
                saveToken();

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

        // 构建请求头（不加 Cache-Control，见上文 CORS 预检说明）
        const headers = {
            'Content-Type': 'application/json'
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
                                'Authorization': 'Bearer ' + newToken
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
    // 加固：从置 isSending 到恢复按钮的全部流程都在 try/finally 里，
    // 中间任何一步抛错（DOM 操作、网络请求）都会恢复按钮可用状态，
    // 不会留下“按钮永久禁用、再次点击无响应”的死锁。
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

        let loadingDiv = null;
        try {
            // 添加用户消息
            addMessage('user', message);

            const currentMessage = message;

            // 清空输入
            qwenInput.value = '';

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
            qwenMessages.appendChild(loadingDiv);
            qwenMessages.scrollTop = qwenMessages.scrollHeight;

            const data = await callConversationAPI(currentMessage, currentModel, DEFAULT_TEMPERATURE);

            // 移除加载状态（remove() 已删除过也不会抛错）
            loadingDiv.remove();
            loadingDiv = null;

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
            if (loadingDiv) loadingDiv.remove();
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

    // 初始化：加载已保存的 Token，并从 /api/health 获取当前模型
    loadSavedToken();
    loadHealthModel();

    console.log('✅ Qwen AI 客户端已加载 (简化版 v4.0.0)');
});
