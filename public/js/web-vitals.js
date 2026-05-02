/**
 * 黄氏家族寻根平台 - Web Vitals 监控
 * 
 * 性能指标监控和上报
 * 
 * 降级实现：使用内联测量替代 web-vitals 库
 */

// 性能指标上报函数
function sendToAnalytics(metricName, value) {
  console.log(`[Web Vitals] ${metricName}: ${value}`);

  if ('sendBeacon' in navigator) {
    const data = {
      metric: { name: metricName, value },
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    try { navigator.sendBeacon('/api/performance/metrics', blob); } catch (e) { /* ignore */ }
  }
}

// 上报核心 Web Vitals 指标（降级实现）
function reportWebVitals() {
  // 使用 Performance API 获取基础指标
  try {
    const perfEntries = performance.getEntriesByType('navigation');
    if (perfEntries.length > 0) {
      const nav = perfEntries[0];
      // FCP: 首次内容绘制
      const fcp = performance.getEntriesByName('first-contentful-paint');
      if (fcp.length > 0) {
        sendToAnalytics('FCP', fcp[0].startTime);
      }
      // LCP: 最大内容绘制（需要 PerformanceObserver）
      // TTFB: 首字节时间
      sendToAnalytics('TTFB', nav.responseStart - nav.requestStart);
      sendToAnalytics('DOMReady', nav.domContentLoadedEventEnd - nav.startTime);
    }
  } catch (e) {
    console.warn('[Web Vitals] 测量失败:', e);
  }
}

// 页面加载完成后开始监控
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    reportWebVitals();
  });
} else {
  setTimeout(reportWebVitals, 0);
}

// 监控页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(reportWebVitals, 1000);
  }
});
