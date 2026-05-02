/**
 * 黄氏家族寻根平台 - 族谱可视化组件
 * 从 API 加载数据并渲染交互式族谱树
 */

export class GenealogyTree {
  constructor(apiClient) {
    this.api = apiClient;
    this.container = document.querySelector('#tree .container');
    this.treeRoot = document.getElementById('treeRoot');
    this.members = [];
    this.expanded = new Set();
    this.selectedMember = null;
  }

  /**
   * 初始化族谱树
   */
  async init() {
    if (!this.treeRoot) return;

    // 在 container 中插入工具栏，不覆盖 section-header
    const toolbar = document.createElement('div');
    toolbar.className = 'tree-toolbar';
    toolbar.innerHTML = `
      <button id="expandAll" class="btn btn-small">全部展开</button>
      <button id="collapseAll" class="btn btn-small">全部折叠</button>
      <button id="resetView" class="btn btn-small">重置视图</button>
      <span class="member-count" id="memberCount">加载中...</span>
    `;

    // 插入到 treeRoot 之前
    if (this.container) {
      this.container.insertBefore(toolbar, this.treeRoot);
    }

    try {
      await this.loadTree();
      this.bindEvents();
      console.log('✅ 族谱树加载完成');
    } catch (error) {
      console.error('❌ 族谱树加载失败:', error);
      this.treeRoot.innerHTML = `
        <div class="error-message">
          <p>族谱数据加载失败，请稍后重试</p>
          <button onclick="location.reload()" class="btn">重新加载</button>
        </div>
      `;
    }
  }

  /**
   * 从 API 加载族谱数据
   */
  async loadTree() {
    const response = await this.api.getFamilyTree();
    if (response.success) {
      this.members = response.data;
      this.expanded.add('root');
      this.render();
    }
  }

  /**
   * 渲染族谱树
   */
  render() {
    if (!this.members.length) {
      this.treeRoot.innerHTML = '<p class="empty-message">暂无族谱数据</p>';
      return;
    }

    const root = this.members.find(m => m.id === 'root') || this.members[0];
    this.treeRoot.innerHTML = this.renderNode(root, 0);

    const count = document.getElementById('memberCount');
    if (count) count.textContent = `共 ${this.members.length} 位族人`;
  }

  /**
   * 递归渲染节点
   */
  renderNode(member, depth) {
    const children = this.members.filter(m => m.parent_id === member.id);
    const hasChildren = children.length > 0;
    const isExpanded = this.expanded.has(member.id);

    let html = `
      <div class="tree-node" data-id="${member.id}" data-depth="${depth}">
        <div class="node-card ${member.level === 0 ? 'ancestor' : ''}">
          <div class="node-header" data-toggle="${member.id}">
            <span class="toggle-icon">${hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</span>
            <span class="node-avatar">${member.avatar || '👤'}</span>
            <div class="node-info">
              <h3 class="node-name">${member.name}</h3>
              <p class="node-title">${member.title || member.period || ''}</p>
            </div>
            <span class="node-level">第${member.level || 0}代</span>
          </div>
          ${member.bio ? `<div class="node-bio" style="${isExpanded ? 'display:block' : 'display:none'}">${member.bio}</div>` : ''}
          ${children.length > 0 && isExpanded ? `
            <div class="node-children">
              ${children.map(child => this.renderNode(child, depth + 1)).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 展开/折叠
    this.treeRoot.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        const id = toggle.dataset.toggle;
        this.toggleNode(id);
        return;
      }

      const card = e.target.closest('.node-card');
      if (card) {
        const id = card.closest('.tree-node').dataset.id;
        this.selectMember(id);
      }
    });

    // 全部展开
    document.getElementById('expandAll')?.addEventListener('click', () => {
      this.members.forEach(m => this.expanded.add(m.id));
      this.render();
    });

    // 全部折叠
    document.getElementById('collapseAll')?.addEventListener('click', () => {
      this.expanded.clear();
      this.expanded.add('root');
      this.render();
    });

    // 重置视图
    document.getElementById('resetView')?.addEventListener('click', () => {
      this.selectedMember = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /**
   * 切换节点展开/折叠
   */
  toggleNode(id) {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
    this.render();
  }

  /**
   * 选中成员
   */
  async selectMember(id) {
    this.selectedMember = id;

    // 高亮选中
    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
    const node = document.querySelector(`.tree-node[data-id="${id}"]`);
    if (node) node.classList.add('selected');

    // 加载详情
    try {
      const response = await this.api.getMember(id);
      if (response.success) {
        this.showMemberDetail(response.data);
      }
    } catch (error) {
      console.error('加载成员详情失败:', error);
    }
  }

  /**
   * 显示成员详情
   */
  showMemberDetail(member) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    const nameEl = document.getElementById('modalName');
    const titleEl = document.getElementById('modalInfo');
    const bioEl = document.getElementById('modalBio');
    const locEl = document.getElementById('modalLoc');
    const imgEl = document.getElementById('modalImg');

    if (nameEl) nameEl.textContent = member.name;
    if (titleEl) titleEl.textContent = member.title || member.period;
    if (bioEl) bioEl.textContent = member.bio;
    if (locEl) locEl.textContent = member.location;
    if (imgEl && member.avatar) imgEl.textContent = member.avatar;

    modal.classList.add('active');
  }
}
