/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式和错误分类
 */

const logger = require('../config/logger');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误类型定义
 */
const ErrorTypes = {
  // 客户端错误 (4xx)
  BAD_REQUEST: { statusCode: 400, code: 'BAD_REQUEST' },
  UNAUTHORIZED: { statusCode: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { statusCode: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { statusCode: 404, code: 'NOT_FOUND' },
  CONFLICT: { statusCode: 409, code: 'CONFLICT' },
  VALIDATION_ERROR: { statusCode: 422, code: 'VALIDATION_ERROR' },
  RATE_LIMIT_EXCEEDED: { statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' },
  
  // 服务器错误 (5xx)
  INTERNAL_ERROR: { statusCode: 500, code: 'INTERNAL_ERROR' },
  SERVICE_UNAVAILABLE: { statusCode: 503, code: 'SERVICE_UNAVAILABLE' },
  DATABASE_ERROR: { statusCode: 500, code: 'DATABASE_ERROR' },
  EXTERNAL_API_ERROR: { statusCode: 502, code: 'EXTERNAL_API_ERROR' },
};

/**
 * 创建应用错误
 */
function createAppError(message, errorType) {
  const { statusCode, code } = errorType;
  return new AppError(message, statusCode, code);
}

/**
 * 错误处理中间件
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('错误处理', {
    error: error.message,
    code: error.code || 'UNKNOWN',
    statusCode: error.statusCode || 500,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // 如果是应用错误，直接使用
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 处理数据库错误
  if (err.code && err.code.startsWith('ER_')) {
    error = createAppError('数据库操作失败', ErrorTypes.DATABASE_ERROR);
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = createAppError('无效的 JSON 格式', ErrorTypes.BAD_REQUEST);
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    error = createAppError('无效的令牌', ErrorTypes.UNAUTHORIZED);
  }
  if (err.name === 'TokenExpiredError') {
    error = createAppError('令牌已过期', ErrorTypes.UNAUTHORIZED);
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    error = createAppError('数据验证失败', ErrorTypes.VALIDATION_ERROR);
  }

  // 默认错误
  if (!error.statusCode) {
    error = createAppError('服务器内部错误', ErrorTypes.INTERNAL_ERROR);
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    }),
  });
}

/**
 * 404 处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = createAppError(
    `路径 ${req.originalUrl} 不存在`,
    ErrorTypes.NOT_FOUND
  );
  next(error);
}

/**
 * 异步错误捕获包装器
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ErrorTypes,
  createAppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
