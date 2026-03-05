/**
 * 黄氏家族寻根平台 - Redis 会话存储模块
 *
 * 功能：
 * - 使用 Redis 存储会话数据，支持多实例部署
 * - 自动过期清理
 * - 内存存储降级方案（无 Redis 时）
 * - 会话数据备份与压缩
 *
 * 使用方法：
 * const sessionStore = require('./session-store');
 * await sessionStore.set(sessionId, data);
 * const data = await sessionStore.get(sessionId);
 */

const redis = require('redis');
const SessionBackupManager = require('./session-backup');

// 配置
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_PREFIX = 'session:';
const DEFAULT_TTL = 24 * 60 * 60; // 24 小时

// Redis 客户端（单例）
let redisClient = null;
let isRedisConnected = false;

// 内存存储降级方案
const memoryStore = new Map();

// 会话备份管理器
const backupManager = new SessionBackupManager({
  backupDir: process.env.SESSION_BACKUP_DIR || './backups',
  retentionDays: parseInt(process.env.SESSION_RETENTION_DAYS) || 30,
  compress: process.env.SESSION_COMPRESS !== 'false'
});

/**
 * 初始化 Redis 连接
 */
async function initRedis() {
  if (redisClient) return redisClient;

  try {
    redisClient = redis.createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
      console.error('[Redis] 连接错误:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] 连接成功');
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      console.log('[Redis] 连接关闭');
      isRedisConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('[Redis] 连接失败，使用内存存储降级方案:', error.message);
    isRedisConnected = false;
    return null;
  }
}

/**
 * 获取会话数据
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<object|null>}
 */
async function getSession(sessionId) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(SESSION_PREFIX + sessionId);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('[Redis] 获取会话失败:', error.message);
      // 降级到内存存储
      return memoryStore.get(sessionId) || null;
    }
  }
  return memoryStore.get(sessionId) || null;
}

/**
 * 设置会话数据
 * @param {string} sessionId - 会话 ID
 * @param {object} data - 会话数据
 * @param {number} ttl - 过期时间（秒），默认 24 小时
 */
async function setSession(sessionId, data, ttl = DEFAULT_TTL) {
  const sessionData = {
    ...data,
    updatedAt: Date.now()
  };

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(
        SESSION_PREFIX + sessionId,
        JSON.stringify(sessionData),
        { EX: ttl }
      );
      return;
    } catch (error) {
      console.error('[Redis] 设置会话失败:', error.message);
      // 降级到内存存储
    }
  }
  
  // 内存存储
  memoryStore.set(sessionId, sessionData);
  
  // 设置过期时间（内存存储）
  setTimeout(() => {
    memoryStore.delete(sessionId);
  }, ttl * 1000);
}

/**
 * 删除会话
 * @param {string} sessionId - 会话 ID
 */
async function deleteSession(sessionId) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(SESSION_PREFIX + sessionId);
    } catch (error) {
      console.error('[Redis] 删除会话失败:', error.message);
    }
  }
  memoryStore.delete(sessionId);
}

/**
 * 获取所有会话（用于管理）
 * @returns {Promise<Array>}
 */
async function getAllSessions() {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(SESSION_PREFIX + '*');
      const sessions = [];
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          sessions.push({
            id: key.replace(SESSION_PREFIX, ''),
            ...JSON.parse(data)
          });
        }
      }
      return sessions;
    } catch (error) {
      console.error('[Redis] 获取所有会话失败:', error.message);
    }
  }
  
  // 内存存储
  return Array.from(memoryStore.entries()).map(([id, data]) => ({
    id,
    ...data
  }));
}

/**
 * 清理过期会话（内存存储专用）
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, data] of memoryStore.entries()) {
    if (data.expiresAt && now > data.expiresAt) {
      memoryStore.delete(id);
    }
  }
}

// 每小时清理一次内存存储
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

/**
 * 关闭 Redis 连接
 */
async function closeRedis() {
  if (redisClient && isRedisConnected) {
    await redisClient.quit();
    redisClient = null;
    isRedisConnected = false;
    console.log('[Redis] 连接已关闭');
  }
}

/**
 * 备份所有会话数据
 */
async function backupSessions() {
  return await backupManager.backupSessions(module.exports);
}

/**
 * 恢复会话数据
 */
async function restoreSessions(backupFileName) {
  return await backupManager.restoreSessions(backupFileName, module.exports);
}

/**
 * 获取备份文件列表
 */
function getBackupFiles() {
  return backupManager.getBackupFiles();
}

/**
 * 获取备份统计信息
 */
function getBackupStats() {
  return backupManager.getBackupStats();
}

// 自动初始化 Redis
initRedis();

// 设置定时备份（每天凌晨 2 点执行）
const scheduleBackup = () => {
  const now = new Date();
  const nextBackup = new Date();
  nextBackup.setHours(2, 0, 0, 0); // 凌晨 2 点
  
  // 如果已经过了今天的备份时间，则设置为明天
  if (now.getHours() >= 2) {
    nextBackup.setDate(nextBackup.getDate() + 1);
  }
  
  const timeUntilBackup = nextBackup - now;
  
  setTimeout(async () => {
    console.log('[Session Backup] 开始执行定期会话数据备份...');
    await backupSessions();
    
    // 设置下次备份
    scheduleBackup();
  }, timeUntilBackup);
};

// 启动时安排第一次备份
setTimeout(scheduleBackup, 5000); // 5秒后开始第一次备份调度

module.exports = {
  getSession,
  setSession,
  deleteSession,
  getAllSessions,
  closeRedis,
  isRedisConnected: () => isRedisConnected,
  initRedis,
  // 备份相关方法
  backupSessions,
  restoreSessions,
  getBackupFiles,
  getBackupStats
};
