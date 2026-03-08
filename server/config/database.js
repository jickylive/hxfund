/**
 * 黄氏家族寻根平台 - 数据库配置模块
 * 支持 MySQL 和 MongoDB
 */

require('dotenv').config();

// ============================================
// MySQL 配置（阿里云 RDS）
// ============================================
const mysqlConfig = {
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT) || 3306,
  database: process.env.RDS_DATABASE || 'hxfund_db',
  user: process.env.RDS_USERNAME || 'root',
  password: process.env.RDS_PASSWORD || '',
  charset: process.env.RDS_CHARSET || 'utf8mb4',
  connectionLimit: parseInt(process.env.RDS_CONNECTION_LIMIT) || 10,
  connectTimeout: parseInt(process.env.RDS_CONNECT_TIMEOUT) || 10000,
  acquireTimeout: parseInt(process.env.RDS_ACQUIRE_TIMEOUT) || 10000,
  timezone: 'Asia/Shanghai',
  // SSL 配置（阿里云 RDS 默认启用 SSL）
  ssl: process.env.RDS_SSL === 'true' ? {
    ca: process.env.RDS_SSL_CA ? require('fs').readFileSync(process.env.RDS_SSL_CA) : undefined,
    cert: process.env.RDS_SSL_CERT ? require('fs').readFileSync(process.env.RDS_SSL_CERT) : undefined,
    key: process.env.RDS_SSL_KEY ? require('fs').readFileSync(process.env.RDS_SSL_KEY) : undefined,
    rejectUnauthorized: true
  } : false,
  // 读写分离配置（可选）
  readReplicas: process.env.RDS_READ_REPLICA_HOST ? [{
    host: process.env.RDS_READ_REPLICA_HOST,
    port: parseInt(process.env.RDS_READ_REPLICA_PORT) || 3306,
    user: process.env.RDS_USERNAME || 'root',
    password: process.env.RDS_PASSWORD || ''
  }] : null
};

// 构建连接 URL（方便某些 ORM 使用）
mysqlConfig.connectionUrl = `mysql://${mysqlConfig.user}:${encodeURIComponent(mysqlConfig.password)}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}?charset=${mysqlConfig.charset}&timezone=+0800`;

// ============================================
// MongoDB 配置
// ============================================
const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hxfund_db',
  options: {
    maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,
    maxIdleTimeMS: parseInt(process.env.MONGODB_IDLE_TIMEOUT) || 30000,
    connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 10000,
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SELECTION_TIMEOUT) || 5000,
    // SSL 配置
    ssl: process.env.MONGODB_SSL === 'true',
    sslValidate: process.env.MONGODB_SSL_VALIDATE === 'true',
    sslCA: process.env.MONGODB_SSL_CA ? require('fs').readFileSync(process.env.MONGODB_SSL_CA) : undefined,
    sslCert: process.env.MONGODB_SSL_CERT ? require('fs').readFileSync(process.env.MONGODB_SSL_CERT) : undefined,
    sslKey: process.env.MONGODB_SSL_KEY ? require('fs').readFileSync(process.env.MONGODB_SSL_KEY) : undefined,
    sslPass: process.env.MONGODB_SSL_PASS || undefined,
    // 认证
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    auth: process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD ? {
      username: process.env.MONGODB_USERNAME,
      password: process.env.MONGODB_PASSWORD
    } : undefined
  }
};

// ============================================
// Redis 配置
// ============================================
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  // 连接池配置
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
  retryDelayOnFail: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
  // SSL 配置
  tls: process.env.REDIS_SSL === 'true' ? {
    ca: process.env.REDIS_SSL_CA ? require('fs').readFileSync(process.env.REDIS_SSL_CA) : undefined,
    cert: process.env.REDIS_SSL_CERT ? require('fs').readFileSync(process.env.REDIS_SSL_CERT) : undefined,
    key: process.env.REDIS_SSL_KEY ? require('fs').readFileSync(process.env.REDIS_SSL_KEY) : undefined,
  } : undefined
};

// 导出 Redis URL（方便某些库使用）
redisConfig.url = redisConfig.password 
  ? `redis://:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`
  : `redis://${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`;

// ============================================
// 导出配置
// ============================================
module.exports = {
  mysql: mysqlConfig,
  mongodb: mongoConfig,
  redis: redisConfig,
  
  // 快速判断使用哪个数据库
  useMySQL: !!process.env.RDS_HOST,
  useMongoDB: !!process.env.MONGODB_URI,
  useRedis: !!process.env.REDIS_HOST
};
