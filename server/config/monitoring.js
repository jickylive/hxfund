/**
 * 性能监控模块
 * 提供应用性能监控 (APM) 功能
 */

const logger = require('./logger');

/**
 * 性能指标收集器
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        avgResponseTime: 0,
      },
      endpoints: new Map(),
      database: {
        queries: 0,
        avgQueryTime: 0,
        slowQueries: 0,
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      cpu: {
        usage: 0,
      },
    };
    
    this.startTime = Date.now();
    this.startMonitoring();
  }
  
  /**
   * 开始监控
   */
  startMonitoring() {
    // 每 30 秒收集一次系统指标
    setInterval(() => this.collectSystemMetrics(), 30000);
    
    // 每 5 分钟记录一次汇总
    setInterval(() => this.logSummary(), 300000);
    
    logger.info('性能监控已启动');
  }
  
  /**
   * 记录请求
   */
  recordRequest(req, res, duration) {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    // 更新总请求统计
    this.metrics.requests.total++;
    if (res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }
    
    // 更新平均响应时间
    this.metrics.requests.avgResponseTime = 
      (this.metrics.requests.avgResponseTime * (this.metrics.requests.total - 1) + duration) / 
      this.metrics.requests.total;
    
    // 更新端点统计
    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        count: 0,
        success: 0,
        error: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
      });
    }
    
    const endpointStats = this.metrics.endpoints.get(endpoint);
    endpointStats.count++;
    
    if (res.statusCode < 400) {
      endpointStats.success++;
    } else {
      endpointStats.error++;
    }
    
    endpointStats.avgResponseTime = 
      (endpointStats.avgResponseTime * (endpointStats.count - 1) + duration) / 
      endpointStats.count;
    
    endpointStats.maxResponseTime = Math.max(endpointStats.maxResponseTime, duration);
    endpointStats.minResponseTime = Math.min(endpointStats.minResponseTime, duration);
  }
  
  /**
   * 记录数据库查询
   */
  recordDatabaseQuery(duration, isSlow = false) {
    this.metrics.database.queries++;
    
    this.metrics.database.avgQueryTime = 
      (this.metrics.database.avgQueryTime * (this.metrics.database.queries - 1) + duration) / 
      this.metrics.database.queries;
    
    if (isSlow) {
      this.metrics.database.slowQueries++;
    }
  }
  
  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    
    this.metrics.memory.used = memoryUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.memory.total = memoryUsage.heapTotal / 1024 / 1024; // MB
    this.metrics.memory.percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // CPU 使用率（简化版）
    const cpuUsage = process.cpuUsage();
    this.metrics.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000000; // 转换为秒
    
    // 内存警告
    if (this.metrics.memory.percentage > 80) {
      logger.warn('内存使用率过高', {
        percentage: this.metrics.memory.percentage.toFixed(2),
        used: this.metrics.memory.used.toFixed(2),
        total: this.metrics.memory.total.toFixed(2),
      });
    }
  }
  
  /**
   * 获取性能报告
   */
  getReport() {
    const uptime = (Date.now() - this.startTime) / 1000; // 秒
    
    return {
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
      },
      requests: {
        ...this.metrics.requests,
        rate: this.metrics.requests.total / (uptime / 60), // 每分钟请求数
      },
      endpoints: Array.from(this.metrics.endpoints.entries()).map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
      })),
      database: this.metrics.database,
      system: {
        memory: this.metrics.memory,
        cpu: this.metrics.cpu,
      },
    };
  }
  
  /**
   * 记录汇总日志
   */
  logSummary() {
    const report = this.getReport();
    
    logger.info('性能监控汇总', {
      uptime: report.uptime.formatted,
      requests: {
        total: report.requests.total,
        success: report.requests.success,
        error: report.requests.error,
        rate: report.requests.rate.toFixed(2),
        avgResponseTime: report.requests.avgResponseTime.toFixed(2),
      },
      database: {
        queries: report.database.queries,
        avgQueryTime: report.database.avgQueryTime.toFixed(2),
        slowQueries: report.database.slowQueries,
      },
      system: {
        memory: `${report.system.memory.used.toFixed(2)}MB / ${report.system.memory.total.toFixed(2)}MB (${report.system.memory.percentage.toFixed(2)}%)`,
      },
    });
  }
  
  /**
   * 格式化运行时间
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0) parts.push(`${secs}秒`);
    
    return parts.join(' ') || '0秒';
  }
  
  /**
   * 重置指标
   */
  reset() {
    this.metrics.requests = {
      total: 0,
      success: 0,
      error: 0,
      avgResponseTime: 0,
    };
    this.metrics.endpoints.clear();
    this.metrics.database = {
      queries: 0,
      avgQueryTime: 0,
      slowQueries: 0,
    };
    this.startTime = Date.now();
    
    logger.info('性能监控指标已重置');
  }
}

// 创建单例实例
const monitor = new PerformanceMonitor();

/**
 * 性能监控中间件
 */
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    monitor.recordRequest(req, res, duration);
    
    // 记录慢请求（> 3秒）
    if (duration > 3000) {
      logger.warn('慢请求检测', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
}

/**
 * 性能监控 API 路由
 */
function setupMonitoringRoutes(app) {
  /**
   * GET /api/monitoring/performance
   * 获取性能报告
   */
  app.get('/api/monitoring/performance', (req, res) => {
    const report = monitor.getReport();
    res.json({
      success: true,
      data: report,
    });
  });
  
  /**
   * POST /api/monitoring/reset
   * 重置性能指标
   */
  app.post('/api/monitoring/reset', (req, res) => {
    monitor.reset();
    res.json({
      success: true,
      message: '性能监控指标已重置',
    });
  });
  
  /**
   * GET /api/monitoring/health
   * 健康检查（增强版）
   */
  app.get('/api/monitoring/health', (req, res) => {
    const report = monitor.getReport();
    const isHealthy = report.system.memory.percentage < 90;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      healthy: isHealthy,
      data: {
        uptime: report.uptime.formatted,
        memory: report.system.memory,
        requests: report.requests,
      },
    });
  });
}

module.exports = {
  monitor,
  performanceMiddleware,
  setupMonitoringRoutes,
};
