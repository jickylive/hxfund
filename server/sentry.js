/**
 * 黄氏家族寻根平台 - Sentry 配置
 *
 * 错误监控和性能追踪（@sentry/node v10 API）。
 *
 * 注意：本文件 2026-11-08 按 v10 重写。此前用的是已删除的 v7 API：
 *   - `new Sentry.Integrations.Http(...)` 与 `Sentry.autoDiscoverNodePerformanceMonitoringIntegrations()`
 *     在 v10 里是 undefined，配上 DSN 会在 init 时抛 TypeError、服务直接起不来；
 *   - `Sentry.Handlers.requestHandler / tracingHandler / errorHandler` 在 v10 里同样不存在；
 *   - `replaysSessionSampleRate` 是浏览器 Replay 的选项，Node 端无效，已删掉。
 * v10 的写法：integration 是函数（httpIntegration / expressIntegration），
 * 性能监控自动发现已内置；Express 错误处理用 Sentry.setupExpressErrorHandler(app)，
 * 且必须在全部路由之后挂载（见 setupExpressIntegration 的注释）。
 */

const Sentry = require('@sentry/node');

let sentryInitialized = false;

// 初始化 Sentry
// DSN 未配置时不初始化、不报错（保留原有行为）；初始化本身失败也不应抛错，
// 调用方（server/index.js）另有 try/catch 兜底。
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
      // HTTP 请求追踪（v10 函数式 integration，替代已删除的 new Sentry.Integrations.Http）
      Sentry.httpIntegration(),
      // Express 自动埋点（请求 + 性能追踪，替代已删除的 Sentry.Handlers.requestHandler/tracingHandler）
      Sentry.expressIntegration()
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1, // 采样 10% 的事务进行性能监控

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

// 设置 Express 集成（在 app 创建后、全部路由之后调用）
// v10：requestHandler / tracingHandler 已由 expressIntegration 自动接管，无需手动挂载；
// 这里只挂错误处理中间件。必须放在全部路由之后、应用自身 errorHandler 之前，
// 否则路由里抛出的错误到不了 Sentry（Express 按注册顺序执行，
// 挂早了只能捕获到它之前注册的中间件的错误）。
function setupExpressIntegration(app) {
  if (!sentryInitialized) {
    console.log('⚠️  Sentry 未初始化，跳过 Express 集成');
    return;
  }

  // 添加 Sentry Express 错误处理中间件
  Sentry.setupExpressErrorHandler(app);

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
