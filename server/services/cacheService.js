/**
 * 缓存服务层
 * 基于Redis的高性能缓存实现
 */

const redis = require('redis');
const logger = require('../config/logger');

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  defaultTTL: 300,        // 默认过期时间（秒）
  maxRetries: 3,          // 最大重试次数
  retryDelay: 100,        // 重试延迟（毫秒）
  keyPrefix: 'cache:',    // 键前缀
};

/**
 * 缓存服务类
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = CACHE_CONFIG;
  }

  /**
   * 初始化Redis连接
   */
  async initialize() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.config.maxRetries) {
              logger.error('Redis重连失败，已达到最大重试次数');
              return new Error('Redis重连失败');
            }
            return this.config.retryDelay;
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis连接错误', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis缓存连接成功');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis缓存连接断开');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis缓存正在重连...');
      });

      await this.client.connect();
      
      logger.info('Redis缓存服务已初始化');
      return this.client;
    } catch (error) {
      logger.error('Redis缓存初始化失败', { error: error.message });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 生成缓存键
   */
  generateKey(namespace, key) {
    return `${this.config.keyPrefix}${namespace}:${key}`;
  }

  /**
   * 设置缓存
   */
  async set(namespace, key, value, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKey = this.generateKey(namespace, key);
      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.config.defaultTTL;

      await this.client.setEx(cacheKey, expiration, serializedValue);

      logger.debug('缓存设置成功', { 
        namespace, 
        key, 
        ttl: expiration 
      });

      return true;
    } catch (error) {
      logger.error('缓存设置失败', { 
        error: error.message, 
        namespace, 
        key 
      });
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get(namespace, key) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKey = this.generateKey(namespace, key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        logger.debug('缓存未命中', { namespace, key });
        return null;
      }

      const deserializedValue = JSON.parse(value);

      logger.debug('缓存命中', { 
        namespace, 
        key,
        size: value.length 
      });

      return deserializedValue;
    } catch (error) {
      logger.error('缓存获取失败', { 
        error: error.message, 
        namespace, 
        key 
      });
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(namespace, key) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKey = this.generateKey(namespace, key);
      await this.client.del(cacheKey);

      logger.debug('缓存删除成功', { namespace, key });

      return true;
    } catch (error) {
      logger.error('缓存删除失败', { 
        error: error.message, 
        namespace, 
        key 
      });
      return false;
    }
  }

  /**
   * 批量设置缓存
   */
  async mset(namespace, items, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const pipeline = this.client.multi();
      const expiration = ttl || this.config.defaultTTL;

      for (const [key, value] of Object.entries(items)) {
        const cacheKey = this.generateKey(namespace, key);
        const serializedValue = JSON.stringify(value);
        pipeline.setEx(cacheKey, expiration, serializedValue);
      }

      await pipeline.exec();

      logger.debug('批量缓存设置成功', { 
        namespace, 
        count: Object.keys(items).length 
      });

      return true;
    } catch (error) {
      logger.error('批量缓存设置失败', { 
        error: error.message, 
        namespace 
      });
      return false;
    }
  }

  /**
   * 批量获取缓存
   */
  async mget(namespace, keys) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKeys = keys.map(key => this.generateKey(namespace, key));
      const values = await this.client.mGet(cacheKeys);

      const result = {};
      for (let i = 0; i < keys.length; i++) {
        if (values[i] !== null) {
          result[keys[i]] = JSON.parse(values[i]);
        }
      }

      logger.debug('批量缓存获取成功', { 
        namespace, 
        count: keys.length,
        hitCount: Object.keys(result).length
      });

      return result;
    } catch (error) {
      logger.error('批量缓存获取失败', { 
        error: error.message, 
        namespace 
      });
      return {};
    }
  }

  /**
   * 删除命名空间下的所有缓存
   */
  async deleteNamespace(namespace) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const pattern = this.generateKey(namespace, '*');
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info('命名空间缓存删除成功', { 
          namespace, 
          count: keys.length 
        });
      }

      return keys.length;
    } catch (error) {
      logger.error('命名空间缓存删除失败', { 
        error: error.message, 
        namespace 
      });
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(namespace, key) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKey = this.generateKey(namespace, key);
      const exists = await this.client.exists(cacheKey);

      return exists === 1;
    } catch (error) {
      logger.error('缓存存在性检查失败', { 
        error: error.message, 
        namespace, 
        key 
      });
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(namespace, key, ttl) {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const cacheKey = this.generateKey(namespace, key);
      await this.client.expire(cacheKey, ttl);

      logger.debug('缓存过期时间设置成功', { 
        namespace, 
        key, 
        ttl 
      });

      return true;
    } catch (error) {
      logger.error('缓存过期时间设置失败', { 
        error: error.message, 
        namespace, 
        key 
      });
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          keys: 0,
          memory: 0
        };
      }

      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();

      return {
        connected: this.isConnected,
        keys: dbSize,
        memory: this.parseMemoryInfo(info)
      };
    } catch (error) {
      logger.error('获取缓存统计失败', { error: error.message });
      return {
        connected: false,
        keys: 0,
        memory: 0
      };
    }
  }

  /**
   * 解析Redis内存信息
   */
  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memoryInfo = {};

    for (const line of lines) {
      if (line.startsWith('used_memory_human:')) {
        memoryInfo.used = line.split(':')[1];
      }
      if (line.startsWith('used_memory_peak_human:')) {
        memoryInfo.peak = line.split(':')[1];
      }
    }

    return memoryInfo;
  }

  /**
   * 清空所有缓存
   */
  async flushAll() {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      await this.client.flushDb();
      logger.warn('所有缓存已清空');

      return true;
    } catch (error) {
      logger.error('清空缓存失败', { error: error.message });
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis缓存连接已关闭');
      }
    } catch (error) {
      logger.error('关闭Redis缓存连接失败', { error: error.message });
    }
  }
}

// 创建单例实例
const cacheService = new CacheService();

module.exports = cacheService;
