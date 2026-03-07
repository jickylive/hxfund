/**
 * 黄氏家族寻根平台 - 主入口文件
 * 采用模块化架构
 */

import { initializeApp } from './app.js';
import { initializeQwenAI } from './components/qwen-ai.js';

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 初始化核心应用
    await initializeApp();

    // 初始化各功能模块
    await initializeQwenAI();

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