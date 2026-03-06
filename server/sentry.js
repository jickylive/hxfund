/**
 * 黄氏家族寻根平台 - Sentry 配置
 * 
 * 错误监控和性能追踪
 */

const Sentry = require('@sentry/node');

let sentryInitialized = false;

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

  sentryInitialized = true;
  console.log('✅ Sentry 错误监控已初始化');
}

// 设置 Express 中间件（在 app 创建后调用）
function setupExpressIntegration(app) {
  if (!sentryInitialized) {
    console.log('⚠️  Sentry 未初始化，跳过 Express 集成');
    return;
  }

  // 添加 Sentry Express 中间件
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler());
  
  console.log('✅ Sentry Express 集成已完成');
}

// 捕获未处理的异常
function setupGlobalHandlers() {
  process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    if (sentryInitialized) {
      Sentry.captureException(err);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    if (sentryInitialized) {
      Sentry.captureException(reason);
    }
  });
}

module.exports = {
  initSentry,
  setupGlobalHandlers,
  setupExpressIntegration,
  Sentry
};