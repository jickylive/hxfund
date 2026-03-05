/**
 * 黄氏家族寻根平台 - Sentry 配置
 * 
 * 错误监控和性能追踪
 */

const Sentry = require('@sentry/node');

// 初始化 Sentry
function initSentry() {
  // 从环境变量获取 Sentry DSN
  const sentryDsn = process.env.SENTRY_DSN || null;
  
  if (!sentryDsn) {
    console.log('⚠️  Sentry DSN 未配置，错误监控将被禁用');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app: null }), // Will be set later
      // Automatically instrument Node.js native modules
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 采样 10% 的事务进行性能监控
    
    // Session Replays
    replaysSessionSampleRate: 0.1, // 采样 10% 的会话
    replaysOnErrorSampleRate: 1.0, // 在错误时 100% 捕获回放
    
    // Set sampling rates for different environments
    environment: process.env.NODE_ENV || 'development',
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // 过滤敏感信息
      if (event.request) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-api-key'];
        delete event.request.data;
      }
      
      return event;
    }
  });

  console.log('✅ Sentry 错误监控已初始化');
}

// 捕获未处理的异常
function setupGlobalHandlers() {
  process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    Sentry.captureException(err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    Sentry.captureException(reason);
  });
}

module.exports = {
  initSentry,
  setupGlobalHandlers,
  Sentry
};