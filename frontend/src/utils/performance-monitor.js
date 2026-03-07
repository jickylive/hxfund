/**
 * 黄氏家族寻根平台 - 性能监控配置
 */

// 前端性能监控
export class FrontendPerformanceMonitor {
  static init() {
    // 监控页面加载性能
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          
          // 发送性能数据到后端
          this.sendMetrics({
            type: 'page_load',
            url: window.location.href,
            loadTime: perfData.loadEventEnd - perfData.fetchStart,
            domReady: perfData.domContentLoadedEventEnd - perfData.fetchStart,
            firstByte: perfData.responseStart - perfData.requestStart,
            ttfb: perfData.responseStart - perfData.navigationStart
          });
        }, 0);
      });
    }

    // 监控资源加载性能
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 500) { // 超过500ms的资源加载
            this.sendMetrics({
              type: 'slow_resource',
              name: entry.name,
              duration: entry.duration,
              entryType: entry.entryType
            });
          }
        });
      });
      
      resourceObserver.observe({ entryTypes: ['resource', 'navigation'] });
    }

    // 监控长任务
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // 超过50ms的任务
            this.sendMetrics({
              type: 'long_task',
              duration: entry.duration,
              name: entry.name
            });
          }
        });
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  }

  static sendMetrics(data) {
    // 使用 sendBeacon 发送性能数据（不会影响页面性能）
    if ('sendBeacon' in navigator) {
      try {
        navigator.sendBeacon('/api/performance/metrics', JSON.stringify({
          metric: data,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }));
      } catch (e) {
        console.warn('Failed to send performance metrics:', e);
      }
    }
  }
}

// 启动性能监控
if (typeof window !== 'undefined') {
  FrontendPerformanceMonitor.init();
}

// 后端性能监控中间件
export function performanceMonitoringMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // 记录慢请求
    if (duration > 1000) { // 超过1秒的请求
      console.log(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
      
      // 可以发送到监控系统
      // sendToMonitoringSystem({ type: 'slow_request', duration, method: req.method, path: req.path });
    }
  });

  next();
}