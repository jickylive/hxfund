/**
 * 黄氏家族寻根平台 - 留言板组件
 * 从 API 加载和提交留言
 */

export class GuestbookComponent {
  constructor(apiClient) {
    this.api = apiClient;
    this.container = document.getElementById('guestbook');
    this.messages = [];
  }

  async init() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="section-header">
        <h2>💬 留言板</h2>
        <p class="section-desc">留下您的家族故事或寻根经历，与全球宗亲分享</p>
      </div>
      <div class="guestbook-form">
        <input type="text" id="guestName" placeholder="您的姓名或称呼" required>
        <textarea id="guestInput" placeholder="分享您的家族故事..." rows="4" required></textarea>
        <button id="postBtn" class="btn">发表留言</button>
      </div>
      <div class="messages-list" id="guestList">
        <div class="loading">加载中...</div>
      </div>
    `;

    this.bindEvents();

    try {
      await this.loadMessages();
      console.log('✅ 留言板组件加载完成');
    } catch (error) {
      console.error('❌ 留言板加载失败:', error);
      this.container.querySelector('#guestList').innerHTML = `
        <p class="error-message">加载失败，请刷新重试</p>
      `;
    }
  }

  async loadMessages() {
    const response = await this.api.getGuestMessages();
    if (response.success) {
      this.messages = response.data;
      this.render();
    }
  }

  render() {
    const list = this.container.querySelector('#guestList');
    if (!this.messages.length) {
      list.innerHTML = '<p class="empty-message">暂无留言，快来发表第一条吧！</p>';
      return;
    }

    list.innerHTML = this.messages.map(msg => `
      <div class="message-card">
        <div class="message-header">
          <span class="message-author">${msg.author || msg.name}</span>
          <span class="message-date">${new Date(msg.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
        <div class="message-content">${msg.content}</div>
      </div>
    `).join('');
  }

  bindEvents() {
    const postBtn = this.container.querySelector('#postBtn');
    if (!postBtn) return;

    postBtn.addEventListener('click', async () => {
      const name = this.container.querySelector('#guestName').value.trim();
      const content = this.container.querySelector('#guestInput').value.trim();

      if (!name || !content) {
        alert('请填写姓名和内容');
        return;
      }

      try {
        postBtn.disabled = true;
        postBtn.textContent = '提交中...';

        await this.api.submitGuestMessage({ name, content });

        // 清空表单并重新加载
        this.container.querySelector('#guestName').value = '';
        this.container.querySelector('#guestInput').value = '';
        await this.loadMessages();

        alert('留言成功！');
      } catch (error) {
        console.error('提交留言失败:', error);
        alert('提交失败，请重试');
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = '发表留言';
      }
    });
  }
}
