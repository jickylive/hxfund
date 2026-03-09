/**
 * 缓存中间件和装饰器
 * 提供便捷的缓存使用方式
 */

const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

/**
 * 缓存装饰器工厂
 * 用于装饰函数，自动处理缓存
 */
function cacheDecorator(namespace, keyGenerator, ttl = null) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      try {
        // 生成缓存键
        const cacheKey = keyGenerator ? keyGenerator(...args) : propertyKey;

        // 尝试从缓存获取
        const cachedValue = await cacheService.get(namespace, cacheKey);
        if (cachedValue !== null) {
          logger.debug('缓存命中', { namespace, key: cacheKey });
          return cachedValue;
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);

        // 将结果存入缓存
        await cacheService.set(namespace, cacheKey, result, ttl);

        logger.debug('缓存已设置', { namespace, key: cacheKey });
        return result;
      } catch (error) {
        logger.error('缓存装饰器执行失败', { 
          error: error.message, 
          namespace,
          key: keyGenerator ? keyGenerator(...args) : propertyKey
        });
        // 出错时执行原方法
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * HTTP请求缓存中间件
 */
function httpCacheMiddleware(namespace, keyGenerator, ttl = 300) {
  return async (req, res, next) => {
    try {
      // 生成缓存键
      const cacheKey = keyGenerator(req);

      // 尝试从缓存获取
      const cachedResponse = await cacheService.get(namespace, cacheKey);
      if (cachedResponse !== null) {
        logger.debug('HTTP缓存命中', { namespace, key: cacheKey });
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // 存储原始的json方法
      const originalJson = res.json.bind(res);

      // 重写json方法，缓存响应
      res.json = function(data) {
        // 异步缓存响应（不阻塞响应）
        cacheService.set(namespace, cacheKey, data, ttl).catch(err => {
          logger.error('HTTP响应缓存失败', { error: err.message });
        });

        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('HTTP缓存中间件执行失败', { 
        error: error.message, 
        namespace 
      });
      next();
    }
  };
}

/**
 * 缓存失效中间件
 */
function cacheInvalidationMiddleware(namespace, keyGenerator) {
  return async (req, res, next) => {
    // 存储原始的json方法
    const originalJson = res.json.bind(res);

    // 重写json方法，处理缓存失效
    res.json = function(data) {
      // 异步失效缓存
      const cacheKey = keyGenerator(req);
      cacheService.delete(namespace, cacheKey).catch(err => {
        logger.error('缓存失效失败', { error: err.message });
      });

      // 也可以失效整个命名空间
      // cacheService.deleteNamespace(namespace).catch(err => {
      //   logger.error('命名空间缓存失效失败', { error: err.message });
      // });

      return originalJson(data);
    };

    next();
  };
}

/**
 * 预定义的缓存键生成器
 */
const cacheKeyGenerators = {
  // 基于URL路径
  byPath: (req) => req.path,

  // 基于URL路径和查询参数
  byPathAndQuery: (req) => {
    const query = JSON.stringify(req.query);
    return `${req.path}:${query}`;
  },

  // 基于URL路径和用户ID
  byPathAndUser: (req) => {
    const userId = req.user?.id || req.session?.userId || 'anonymous';
    return `${req.path}:${userId}`;
  },

  // 基于自定义函数
  custom: (generator) => generator,
};

/**
 * 预定义的缓存命名空间
 */
const cacheNamespaces = {
  API: 'api',
  MODEL: 'model',
  SESSION: 'session',
  DATABASE: 'database',
  USER: 'user',
  CONFIG: 'config',
};

/**
 * 缓存工具类
 */
const cacheUtils = {
  /**
   * 清除所有缓存
   */
  async clearAll() {
    return await cacheService.flushAll();
  },

  /**
   * 清除命名空间缓存
   */
  async clearNamespace(namespace) {
    return await cacheService.deleteNamespace(namespace);
  },

  /**
   * 获取缓存统计
   */
  async getStats() {
    return await cacheService.getStats();
  },

  /**
   * 预热缓存
   */
  async warmup(namespace, items, ttl = null) {
    const results = [];
    for (const [key, value] of Object.entries(items)) {
      const result = await cacheService.set(namespace, key, value, ttl);
      results.push({ key, success: result });
    }
    return results;
  },

  /**
   * 批量预加载
   */
  async preload(namespace, keys, loader, ttl = null) {
    const results = {};
    for (const key of keys) {
      let value = await cacheService.get(namespace, key);
      if (value === null && loader) {
        value = await loader(key);
        if (value !== null) {
          await cacheService.set(namespace, key, value, ttl);
        }
      }
      results[key] = value;
    }
    return results;
  }
};

module.exports = {
  cacheDecorator,
  httpCacheMiddleware,
  cacheInvalidationMiddleware,
  cacheKeyGenerators,
  cacheNamespaces,
  cacheUtils,
};
