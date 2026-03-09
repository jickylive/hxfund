/**
 * HTTP 请求日志中间件
 * 记录所有 HTTP 请求的详细信息
 */

const logger = require('../config/logger');

/**
 * HTTP 请求日志中间件
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  
  // 记录请求信息
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length'),
  };

  // 记录查询参数（过滤敏感信息）
  if (req.query && Object.keys(req.query).length > 0) {
    requestInfo.query = req.query;
  }

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const responseInfo = {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    };

    // 根据状态码选择日志级别
    let level = 'http';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    }

    logger.http(`${req.method} ${req.url}`, {
      request: requestInfo,
      response: responseInfo,
    });
  });

  next();
}

module.exports = httpLogger;
