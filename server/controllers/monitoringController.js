/**
 * 监控控制器
 * 处理所有监控相关的HTTP请求
 */

const monitor = require('../config/monitoring');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * 监控控制器
 */
const monitoringController = {
  /**
   * 获取性能报告
   * GET /api/monitoring/performance
   */
  getPerformance: asyncHandler(async (req, res) => {
    logger.info('获取性能报告请求');

    const report = monitor.getReport();

    res.json({
      success: true,
      data: report
    });
  }),

  /**
   * 重置性能指标
   * POST /api/monitoring/reset
   */
  resetMetrics: asyncHandler(async (req, res) => {
    logger.info('重置性能指标请求');

    monitor.reset();

    res.json({
      success: true,
      message: '性能监控指标已重置'
    });
  }),

  /**
   * 健康检查（增强版）
   * GET /api/monitoring/health
   */
  getHealth: asyncHandler(async (req, res) => {
    logger.info('获取监控健康检查请求');

    const report = monitor.getReport();
    const isHealthy = report.system.memory.percentage < 90;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      healthy: isHealthy,
      data: {
        uptime: report.uptime.formatted,
        memory: report.system.memory,
        requests: report.requests
      }
    });
  }),

  /**
   * 获取端点统计
   * GET /api/monitoring/endpoints
   */
  getEndpoints: asyncHandler(async (req, res) => {
    logger.info('获取端点统计请求');

    const report = monitor.getReport();

    res.json({
      success: true,
      data: {
        endpoints: report.endpoints,
        count: report.endpoints.length
      }
    });
  }),

  /**
   * 获取系统资源使用情况
   * GET /api/monitoring/system
   */
  getSystem: asyncHandler(async (req, res) => {
    logger.info('获取系统资源请求');

    const report = monitor.getReport();

    res.json({
      success: true,
      data: {
        uptime: report.uptime,
        memory: report.system.memory,
        cpu: report.system.cpu
      }
    });
  })
};

module.exports = monitoringController;
