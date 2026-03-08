/**
 * 黄氏家族寻根平台 - 主入口模块
 * 负责初始化所有组件和全局功能
 */

import { setupNavigation } from '../utils/navigation.js';
import { setupSmoothScroll } from '../utils/scroll.js';
import { setupBackToTop } from '../utils/back-to-top.js';
import { setupAnimations } from '../utils/animations.js';
import { initializeQwenAI } from '../components/qwen-ai.js';

// 导入并执行 Web Vitals 监控
import '../js/web-vitals.js';

// 页面加载完成后隐藏加载动画
window.addEventListener('load', () => {
    const pageLoader = document.getElementById('pageLoader');
    if (pageLoader) {
        // 确保所有资源加载完成后隐藏加载动画
        setTimeout(() => {
            pageLoader.classList.add('hidden');
            // 300ms 后从 DOM 中移除（等待过渡动画完成）
            setTimeout(() => {
                pageLoader.style.display = 'none';
            }, 600);
        }, 500); // 最少显示 500ms，确保视觉流畅
    }

    console.log('✅ 黄氏家族寻根平台已加载完成');

    // 注册 Service Worker（PWA）
    registerServiceWorker();
});

// 页面DOM加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', async () => {
    console.log('黄氏家族寻根平台 - 初始化中...');

    try {
        // 初始化导航功能
        setupNavigation();

        // 初始化滚动效果
        setupSmoothScroll();

        // 初始化回到顶部按钮
        setupBackToTop();

        // 初始化动画效果
        setupAnimations();

        // 初始化Qwen AI客户端
        await initializeQwenAI();

        console.log('黄氏家族寻根平台 - 初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 注册 Service Worker（PWA）
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/pwa/service-worker.js')
            .then((registration) => {
                console.log('[PWA] Service Worker 注册成功:', registration.scope);
            })
            .catch((error) => {
                console.error('[PWA] Service Worker 注册失败:', error);
            });
    }
}

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

// Promise拒绝处理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 定义全局命名空间
window.hxfund = window.hxfund || {};