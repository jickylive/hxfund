/**
 * 黄氏家族寻根平台 - Web Vitals 监控
 * 
 * 性能指标监控和上报
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// 性能指标上报函数
function sendToAnalytics(metric) {
  // 在生产环境中，可以将指标发送到分析服务
  console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}`, metric);

  // 发送到后端 API 进行收集（可选）
  if ('sendBeacon' in navigator) {
    // 准备上报数据
    const data = {
      metric: {
        name: metric.name,
        value: metric.value,
        id: metric.id,
        navigationType: metric.navigationType,
        attribution: metric.attribution || {}
      },
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        rtt: navigator.connection.rtt
      } : null
    };

    // 使用 sendBeacon 发送数据（非阻塞）
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon('/api/performance/metrics', blob);
  }
}

// 上报所有核心 Web Vitals 指标
function reportWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// 页面加载完成后开始监控
if ('requestIdleCallback' in window) {
  // 使用空闲回调以避免影响页面性能
  requestIdleCallback(() => {
    reportWebVitals();
  });
} else {
  // 降级处理
  setTimeout(() => {
    reportWebVitals();
  }, 0);
}

// 监控页面可见性变化，当页面重新变为可见时也上报
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // 延迟上报，确保页面完全加载
    setTimeout(reportWebVitals, 1000);
  }
});

// 监控页面卸载前的最终指标
window.addEventListener('beforeunload', () => {
  // 这里可以发送最后的指标数据
  // 注意：由于页面即将卸载，使用 sendBeacon 是最佳选择
});

// 导出函数供其他模块使用
export { reportWebVitals, sendToAnalytics };