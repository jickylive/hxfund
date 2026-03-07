/**
 * 黄氏家族寻根平台 - 应用核心模块
 */

import { setupNavigation } from './utils/navigation.js';
import { setupSmoothScroll } from './utils/scroll.js';
import { setupBackToTop } from './utils/back-to-top.js';
import { setupAnimations } from './utils/animations.js';

export async function initializeApp() {
  // 设置导航
  setupNavigation();
  
  // 设置平滑滚动
  setupSmoothScroll();
  
  // 设置回到顶部按钮
  setupBackToTop();
  
  // 设置动画效果
  setupAnimations();
  
  console.log('✅ 核心应用模块已初始化');
}