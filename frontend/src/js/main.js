/**
 * 黄氏家族寻根平台 - 主入口模块
 * 负责初始化所有组件和全局功能
 */

import { initializeNavigation } from './components/navigation.js';
import { initializeScrollEffects } from './components/scroll-effects.js';
import { initializePageLoader } from './components/page-loader.js';
import { initializeBackToTop } from './components/back-to-top.js';
import { initializeModals } from './components/modals.js';

// 页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', async () => {
    console.log('黄氏家族寻根平台 - 初始化中...');

    try {
        // 初始化页面加载动画
        await initializePageLoader();

        // 初始化导航功能
        initializeNavigation();

        // 初始化滚动效果
        initializeScrollEffects();

        // 初始化回到顶部按钮
        initializeBackToTop();

        // 初始化模态框
        initializeModals();

        // 初始化各功能模块
        await initializeFamilyTree();
        await initializeCalculator();
        await initializeBlockchain();
        await initializeGuestbook();
        
        // 初始化Qwen AI客户端
        await initializeQwenAI();

        console.log('黄氏家族寻根平台 - 初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

// Promise拒绝处理
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 导出常用工具函数
export { debounce, throttle } from './utils/helpers.js';

// 各义全局命名空间
window.hxfund = window.hxfund || {};