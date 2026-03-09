/**
 * 黄氏家族寻根平台 - 数据库配置模块
 * 支持 MySQL（阿里云 RDS）连接
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
  timezone: '+08:00',
  // SSL 配置（根据 RDS 实例支持情况选择）
  // 如果 RDS 不支持 SSL，设置 RDS_SSL=false
  ssl: process.env.RDS_SSL === 'true' ? {
    rejectUnauthorized: false, // 允许自签名证书
    ...(process.env.MYSQL_SSL_CA_PATH ? { ca: require('fs').readFileSync(process.env.MYSQL_SSL_CA_PATH) } : {})
  } : false,
};

// 构建连接 URL（方便某些 ORM 使用）
mysqlConfig.connectionUrl = `mysql://${mysqlConfig.user}:${encodeURIComponent(mysqlConfig.password)}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}?charset=${mysqlConfig.charset}&timezone=+0800`;

// ============================================
// 导出配置
// ============================================
module.exports = {
  mysql: mysqlConfig,
  
  // 快速判断配置
  useMySQL: !!process.env.RDS_HOST,
  useSSL: process.env.RDS_SSL === 'true'
};
