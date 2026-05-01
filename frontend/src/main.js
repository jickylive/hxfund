/**
 * 黄氏家族寻根平台 - 主入口文件
 * 采用模块化架构
 */

import { initializeApp } from './app.js';
import { initializeQwenAI } from './components/qwen-ai.js';
import { GenealogyTree } from './js/components/genealogy-tree.js';
import { GenerationPoemComponent } from './js/components/generation-poem.js';
import { GuestbookComponent } from './js/components/guestbook.js';
import { QwenApiClient } from './js/utils/api-client.js';

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 初始化核心应用
    await initializeApp();

    // 初始化各功能模块
    await initializeQwenAI();

    // 初始化族谱相关组件
    const apiClient = new QwenApiClient();
    
    // 族谱树
    const tree = new GenealogyTree(apiClient);
    await tree.init();
    
    // 字辈诗
    const poems = new GenerationPoemComponent(apiClient);
    await poems.init();
    
    // 留言板
    const guestbook = new GuestbookComponent(apiClient);
    await guestbook.init();

    console.log('✅ 黄氏家族寻根平台已完全加载');
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
  }
});

// PWA注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pwa/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}