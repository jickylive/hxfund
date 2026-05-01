/**
 * 黄氏家族寻根平台 - 字辈诗组件
 * 从 API 加载字辈诗数据
 */

export class GenerationPoemComponent {
  constructor(apiClient) {
    this.api = apiClient;
    this.container = document.getElementById('generation');
  }

  async init() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="section-header">
        <h2>📜 字辈诗</h2>
        <p class="section-desc">字辈诗是家族传承的重要文化符号，每一首诗都承载着先祖的智慧与期望</p>
      </div>
      <div class="poems-grid" id="poemsGrid">
        <div class="loading">加载中...</div>
      </div>
    `;

    try {
      await this.loadPoems();
      console.log('✅ 字辈诗组件加载完成');
    } catch (error) {
      console.error('❌ 字辈诗加载失败:', error);
      this.container.querySelector('.poems-grid').innerHTML = `
        <p class="error-message">加载失败，请刷新重试</p>
      `;
    }
  }

  async loadPoems() {
    const response = await this.api.getGenerationPoems();
    if (response.success) {
      this.render(response.data);
    }
  }

  render(poems) {
    const grid = this.container.querySelector('.poems-grid');
    if (!poems.length) {
      grid.innerHTML = '<p class="empty-message">暂无字辈诗数据</p>';
      return;
    }

    grid.innerHTML = poems.map(poem => `
      <div class="poem-card">
        <h3 class="poem-branch">${poem.branch_name}</h3>
        <div class="poem-verse">${poem.poem}</div>
        <div class="poem-chars">
          ${poem.characters.split('').map(c => `<span class="char">${c}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
}
