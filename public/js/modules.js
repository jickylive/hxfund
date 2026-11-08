/**
 * 黄氏家族寻根平台 - 功能模块脚本（轻量版）
 * 处理家族树、PPT、区块链、留言墙等 UI 渲染
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // 模块一：家族世系树
    // =========================================

    // 渲染家族树节点
    function renderTreeNode(node, level = 0) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.dataset.level = level;

        const hasChildren = node.children && node.children.length > 0;

        nodeDiv.innerHTML = `
            <div class="tree-node-card" data-id="${node.id}">
                <div class="node-avatar">${node.avatar}</div>
                <div class="node-info">
                    <div class="node-name">${node.name}</div>
                    <div class="node-title">${node.title}</div>
                    <div class="node-period">${node.period}</div>
                </div>
                ${hasChildren ? '<span class="node-expand">▼</span>' : ''}
            </div>
            ${hasChildren ? `<div class="tree-node-children" style="display: ${level === 0 ? 'flex' : 'none'}"></div>` : ''}
        `;

        const card = nodeDiv.querySelector('.tree-node-card');
        card.addEventListener('click', () => {
            if (hasChildren) {
                const childrenContainer = nodeDiv.querySelector('.tree-node-children');
                const expandIcon = card.querySelector('.node-expand');

                if (childrenContainer.style.display === 'none') {
                    childrenContainer.style.display = 'flex';
                    expandIcon.textContent = '▼';
                } else {
                    childrenContainer.style.display = 'none';
                }
            }
            if (node.bio) showMemberDetail(node);
        });

        if (hasChildren) {
            const childrenContainer = nodeDiv.querySelector('.tree-node-children');
            node.children.forEach(child => {
                childrenContainer.appendChild(renderTreeNode(child, level + 1));
            });
        }

        return nodeDiv;
    }

    // 显示族人详情
    function showMemberDetail(member) {
        const modal = document.getElementById('modal');
        if (!modal) return;

        document.getElementById('modalName').textContent = member.title;
        document.getElementById('modalInfo').textContent = `${member.period} · ${member.name}`;
        document.getElementById('modalBio').textContent = member.bio || '暂无详细信息';
        document.getElementById('modalLoc').textContent = member.location || '未知';

        // 区块链存证：按姓名查 bcRecords，查到填哈希，查不到隐藏该区块
        const bcSection = document.getElementById('modalBcSection');
        const bcEl = document.getElementById('modalBc');
        const bcRecords = window.HuangshiData?.bcRecords || window.bcRecords;
        const record = bcRecords?.find(r => r.name === member.name);
        if (bcEl && record) {
            bcEl.textContent = record.hash;
            if (bcSection) bcSection.style.display = '';
        } else if (bcSection) {
            bcSection.style.display = 'none';
        }

        const modalImg = document.getElementById('modalImg');
        if (modalImg) {
            modalImg.alt = member.avatar;
            modalImg.loading = 'lazy';
            modalImg.src = 'data:image/svg+xml,' + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#8B4513" rx="10"/>
                    <text x="50" y="65" font-size="50" text-anchor="middle" fill="white">${member.avatar}</text>
                </svg>`
            );
        }

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // 初始化家族树
    const treeRoot = document.getElementById('treeRoot');
    if (treeRoot) {
        const data = window.HuangshiData?.familyTreeData || window.familyTreeData;
        if (data) {
            treeRoot.appendChild(renderTreeNode(data));

            document.getElementById('expandAll')?.addEventListener('click', () => {
                treeRoot.querySelectorAll('.tree-node-children').forEach(el => el.style.display = 'flex');
                treeRoot.querySelectorAll('.node-expand').forEach(el => el.textContent = '▼');
            });

            document.getElementById('collapseAll')?.addEventListener('click', () => {
                treeRoot.querySelectorAll('.tree-node-children').forEach(el => {
                    const parentLevel = parseInt(el.parentElement.dataset.level);
                    if (parentLevel >= 0) el.style.display = 'none';
                });
                treeRoot.querySelectorAll('.node-expand').forEach(el => el.textContent = '▼');
            });

            // 族人姓名搜索：输入即筛，高亮匹配卡片并滚动到首个结果
            const treeSearch = document.getElementById('treeSearch');
            const treeSearchCount = document.getElementById('treeSearchCount');
            treeSearch?.addEventListener('input', () => {
                const q = treeSearch.value.trim();
                const cards = treeRoot.querySelectorAll('.tree-node-card');
                cards.forEach(c => c.classList.remove('search-match'));
                if (!q) {
                    if (treeSearchCount) treeSearchCount.textContent = '';
                    return;
                }
                // 先展开全部，再匹配，避免结果藏在折叠分支里
                treeRoot.querySelectorAll('.tree-node-children').forEach(el => el.style.display = 'flex');
                let matches = 0;
                let first = null;
                cards.forEach(c => {
                    const name = c.querySelector('.node-name')?.textContent || '';
                    const title = c.querySelector('.node-title')?.textContent || '';
                    if (name.includes(q) || title.includes(q)) {
                        c.classList.add('search-match');
                        matches++;
                        if (!first) first = c;
                    }
                });
                if (treeSearchCount) treeSearchCount.textContent = matches ? `找到 ${matches} 位` : '未找到';
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            });
        }
    }

    // =========================================
    // 模块二：智能字辈计算器
    // =========================================

    const calcBtn = document.getElementById('calcBtn');
    const branchSelect = document.getElementById('branchSelect');
    const genInput = document.getElementById('genInput');
    const calcResult = document.getElementById('calcResult');

    if (calcBtn && branchSelect && genInput) {
        calcBtn.addEventListener('click', () => {
            const branch = branchSelect.value;
            const generation = parseInt(genInput.value);

            if (!generation || generation < 1 || generation > 999) {
                alert('请输入有效的代数（1-999）');
                return;
            }

            const poems = window.HuangshiData?.generationPoems || window.generationPoems;
            const data = poems?.[branch];
            if (!data) return;

            const charIndex = (generation - 1) % data.characters.length;
            const character = data.characters[charIndex];

            if (calcResult) {
                document.getElementById('resultChar').textContent = character;
                document.getElementById('resultContext').innerHTML = `
                    <strong>${data.name}</strong> 第${generation}世<br>
                    字辈诗：${data.poem}
                `;

                const sequenceEl = document.getElementById('genSequence');
                if (sequenceEl) {
                    const start = Math.max(0, charIndex - 3);
                    const end = Math.min(data.characters.length, charIndex + 4);
                    let seqHtml = '<div class="sequence-label">前后字辈</div><div class="sequence-characters">';
                    for (let i = start; i < end; i++) {
                        seqHtml += `<span class="seq-char ${i === charIndex ? 'current' : ''}">${data.characters[i]}</span>`;
                    }
                    sequenceEl.innerHTML = seqHtml + '</div>';
                }
                calcResult.classList.remove('hidden');
            }
        });
    }

    // =========================================
    // 模块三：项目愿景 PPT 展示
    // =========================================

    let currentSlide = 0;

    function renderPPT() {
        const pptTrack = document.getElementById('pptTrack');
        const pptIndicators = document.getElementById('pptIndicators');
        if (!pptTrack) return;

        const slides = window.HuangshiData?.pptSlides || window.pptSlides;
        if (!slides) return;

        pptTrack.innerHTML = slides.map((slide, index) => `
            <div class="ppt-slide" data-idx="${index}">
                <div class="ppt-slide-inner">
                    <div class="ppt-deco"></div>
                    <div class="ppt-slide-icon">${slide.icon}</div>
                    <h3 class="ppt-slide-title">${slide.title}</h3>
                    <p class="ppt-slide-subtitle">${slide.subtitle}</p>
                    <div class="ppt-slide-content">${slide.content}</div>
                    ${slide.tags ? `
                    <div class="ppt-slide-tags">
                        ${slide.tags.map(tag => `<span class="ppt-tag">${tag}</span>`).join('')}
                    </div>
                    ` : ''}
                    <div class="slide-num">${index + 1} / ${slides.length}</div>
                </div>
            </div>
        `).join('');

        pptIndicators.innerHTML = slides.map((_, index) =>
            `<button class="ppt-indicator ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="第${index + 1}页"></button>`
        ).join('');

        updatePPT();

        pptIndicators.querySelectorAll('.ppt-indicator').forEach(btn => {
            btn.addEventListener('click', () => {
                currentSlide = parseInt(btn.dataset.index);
                updatePPT();
            });
        });
    }

    function updatePPT() {
        const pptTrack = document.getElementById('pptTrack');
        const pptPageInfo = document.getElementById('pptPageInfo');
        const indicators = document.querySelectorAll('.ppt-indicator');
        if (!pptTrack) return;

        pptTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        indicators.forEach((btn, index) => btn.classList.toggle('active', index === currentSlide));
        if (pptPageInfo) pptPageInfo.textContent = `${currentSlide + 1} / ${window.HuangshiData?.pptSlides.length || window.pptSlides.length}`;
    }

    document.getElementById('pptPrev')?.addEventListener('click', () => {
        const slides = window.HuangshiData?.pptSlides || window.pptSlides;
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updatePPT();
    });

    document.getElementById('pptNext')?.addEventListener('click', () => {
        const slides = window.HuangshiData?.pptSlides || window.pptSlides;
        currentSlide = (currentSlide + 1) % slides.length;
        updatePPT();
    });

    renderPPT();

    // =========================================
    // 模块四：区块链存证
    // =========================================

    const bcStepsEl = document.getElementById('bcSteps');
    if (bcStepsEl) {
        const bcSteps = [
            { icon: '📝', title: '提交数据', desc: '录入族人信息' },
            { icon: '🔐', title: '生成哈希', desc: 'SHA-256 加密' },
            { icon: '⛓️', title: '上链存证', desc: '区块链网络确认' },
            { icon: '✅', title: '获取凭证', desc: '存证证书生成' }
        ];
        bcStepsEl.innerHTML = bcSteps.map((step, i) => `
            <div class="bc-step">
                <div class="bc-step-num">${i + 1}</div>
                <div class="bc-step-icon">${step.icon}</div>
                <div class="bc-step-title">${step.title}</div>
                <div class="bc-step-desc">${step.desc}</div>
            </div>
        `).join('');
    }

    const bcRecordsEl = document.getElementById('bcRecords');
    if (bcRecordsEl) {
        const records = window.HuangshiData?.bcRecords || window.bcRecords;
        if (records) {
            bcRecordsEl.innerHTML = `
            <h4>已存证记录</h4>
            ${records.map(record => `
                <div class="bc-record-item">
                    <span class="bc-record-id">${record.id}</span>
                    <span class="bc-record-name">${record.name}</span>
                    <span class="bc-record-hash">${record.hash.substring(0, 12)}...</span>
                    <span class="bc-record-status ${record.verified ? 'verified' : 'pending'}">
                        ${record.verified ? '✓ 已验证' : '⏳ 待验证'}
                    </span>
                </div>
            `).join('')}
        `;
        }
    }

    const bcVerifyBtn = document.getElementById('bcVerifyBtn');
    const bcInput = document.getElementById('bcInput');
    const bcResult = document.getElementById('bcResult');

    if (bcVerifyBtn && bcInput) {
        const records = window.HuangshiData?.bcRecords || window.bcRecords;

        bcVerifyBtn.addEventListener('click', () => {
            const input = bcInput.value.trim();
            if (!input) { alert('请输入族人 ID 或哈希值'); return; }

            const record = records?.find(r => r.id === input || r.hash.startsWith(input));

            if (bcResult) {
                bcResult.classList.remove('hidden');
                bcResult.innerHTML = record ? `
                    <div class="verify-result success">
                        <span class="verify-icon">✅</span>
                        <div class="verify-info">
                            <strong>验证成功</strong>
                            <p>族人 ID: ${record.id}</p>
                            <p>姓名：${record.name}</p>
                            <p>哈希值：${record.hash}</p>
                        </div>
                    </div>
                ` : `
                    <div class="verify-result fail">
                        <span class="verify-icon">❌</span>
                        <div class="verify-info">
                            <strong>未找到记录</strong>
                            <p>输入的 ID 或哈希值不存在于存证系统中</p>
                        </div>
                    </div>
                `;
            }
        });
    }

    // =========================================
    // 模块五：宗亲留言墙
    // =========================================

    // API 基础地址：留言墙必须调 api 子域，相对路径会走到 www 主机上 404
    const apiBaseUrl = window.API_CONFIG?.baseURL ||
        (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.hxfund.cn');

    // 格式化留言时间
    function formatGuestTime(createdAt) {
        const date = new Date(createdAt);
        if (isNaN(date.getTime())) return createdAt;
        const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 0 ? '今天' : `${days} 天前`;
    }

    // HTML 转义：留言内容进 innerHTML 前必须转义，防 XSS
    function escapeGuestHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // 渲染单条留言（含回复按钮；data-id/data-name 供回复定位用）
    // isReply 为 true 时是楼内回复；repliesHtml 只给顶级留言用，回复嵌在顶级楼内部
    function renderGuestItem(msg, isReply, repliesHtml) {
        const cls = isReply ? 'guest-item guest-reply-item' : 'guest-item';
        const replies = repliesHtml ? `<div class="guest-replies">${repliesHtml}</div>` : '';
        return `
            <div class="${cls}" data-id="${msg.id}">
                <div class="guest-header">
                    <span class="guest-name">${escapeGuestHtml(msg.user_name)}</span>
                    <span class="guest-location">📍 ${escapeGuestHtml(msg.location || '未知')}</span>
                </div>
                <div class="guest-content">${escapeGuestHtml(msg.content)}</div>
                <div class="guest-footer">
                    <span class="guest-time">${formatGuestTime(msg.created_at)}</span>
                    <button class="guest-reply" data-id="${msg.id}" data-name="${escapeGuestHtml(msg.user_name)}">回复</button>
                </div>
                ${replies}
            </div>
        `;
    }

    // Function to fetch and render guest messages from API
    // 后端返回楼中楼：顶级留言带 replies 数组；回复只挂一层，缩进显示
    async function renderGuestList() {
        const guestList = document.getElementById('guestList');
        if (!guestList) return;

        try {
            // Show loading state
            guestList.innerHTML = '<div class="guest-loading">加载留言中...</div>';

            // Fetch messages from API
            const response = await fetch(`${apiBaseUrl}/api/db/guest-messages?page=1&limit=20`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '获取留言失败');
            }

            const messages = data.data;

            if (!messages || messages.length === 0) {
                guestList.innerHTML = '<div class="guest-empty">暂无留言，成为第一个留言的宗亲吧！</div>';
                return;
            }

            guestList.innerHTML = messages.map(msg => {
                const replies = (msg.replies || []).map(r => renderGuestItem(r, true, '')).join('');
                return renderGuestItem(msg, false, replies);
            }).join('');
        } catch (error) {
            console.error('获取留言失败:', error);
            guestList.innerHTML = `<div class="guest-error">加载留言失败: ${error.message}</div>`;
        }
    }

    const postBtn = document.getElementById('postBtn');
    const guestInput = document.getElementById('guestInput');
    const guestNameInput = document.getElementById('guestName');
    const charCount = document.getElementById('charCount');
    const replyIndicator = document.getElementById('replyIndicator');
    const replyTargetName = document.getElementById('replyTargetName');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');

    // 当前回复目标：{ id: 顶级留言 id, name }；null 表示发顶级留言
    // 回复的回复也挂到同一顶级留言下，@用户名保留指向
    let replyTarget = null;

    function setReplyTarget(id, name) {
        replyTarget = id ? { id, name } : null;
        if (replyIndicator) {
            replyIndicator.style.display = replyTarget ? 'flex' : 'none';
        }
        if (replyTargetName && replyTarget) {
            replyTargetName.textContent = `正在回复 @${replyTarget.name}`;
        }
        if (postBtn) {
            postBtn.querySelector('span').textContent = replyTarget ? '发布回复' : '发布留言';
        }
    }

    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', () => setReplyTarget(null));
    }

    if (postBtn && guestInput) {
        postBtn.addEventListener('click', async () => {
            const content = guestInput.value.trim();
            const name = guestNameInput?.value.trim() || '匿名宗亲';

            if (!content) {
                alert('请输入留言内容');
                return;
            }
            if (content.length > 300) {
                alert('留言内容不能超过 300 字');
                return;
            }

            try {
                // Show loading state
                postBtn.disabled = true;
                postBtn.textContent = '提交中...';

                // Submit message to API（回复时带 parent_id）
                const response = await fetch(`${apiBaseUrl}/api/db/guest-messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_name: name,
                        content: content,
                        location: '未知',  // Default location if not provided
                        parent_id: replyTarget ? replyTarget.id : null
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Clear form
                    guestInput.value = '';
                    if (guestNameInput) guestNameInput.value = '';
                    if (charCount) charCount.textContent = '0/300';
                    setReplyTarget(null);

                    // Refresh the message list
                    await renderGuestList();

                    alert('留言提交成功，等待审核后显示！');
                } else {
                    throw new Error(result.error || '提交失败');
                }
            } catch (error) {
                console.error('提交留言失败:', error);
                alert(`留言提交失败: ${error.message}`);
            } finally {
                // Reset button state
                postBtn.disabled = false;
                postBtn.textContent = replyTarget ? '发布回复' : '发布留言';
            }
        });
    }

    if (guestInput && charCount) {
        guestInput.addEventListener('input', () => {
            charCount.textContent = `${guestInput.value.length}/300`;
        });
    }

    // 留言墙“回复”按钮：用事件委托绑在列表容器上，列表重新渲染后依然有效。
    // 点击后把回复目标设为该留言所在的顶级楼（回复的回复也挂同一楼），
    // 输入框上方显示“正在回复 @用户名”，提交时带 parent_id；不再是以前的纯 @ 提及。
    const guestListEl = document.getElementById('guestList');
    if (guestListEl) {
        guestListEl.addEventListener('click', (e) => {
            const replyBtn = e.target.closest('.guest-reply');
            if (!replyBtn) return;
            // 找到这条留言所在的顶级楼 id：回复挂在顶级楼下
            const item = replyBtn.closest('.guest-item');
            let topId = replyBtn.dataset.id;
            const parent = item?.parentElement?.closest('.guest-item');
            if (item?.classList.contains('guest-reply-item') && parent) {
                topId = parent.dataset.id;
            }
            const name = replyBtn.dataset.name || '宗亲';
            setReplyTarget(parseInt(topId, 10), name);
            if (guestInput) {
                guestInput.focus();
                if (!guestInput.value.includes(`@${name} `)) {
                    guestInput.value = `@${name} ` + guestInput.value;
                    if (charCount) charCount.textContent = `${guestInput.value.length}/300`;
                }
            }
            const guestForm = guestInput?.closest('section') || guestInput;
            guestForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // Initialize guest list when DOM is loaded
    renderGuestList();
});
