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
  user: process.env.RDS_USERNAME || process.env.RDS_USER || 'root',
  password: process.env.RDS_PASSWORD || '',
  charset: process.env.RDS_CHARSET || 'utf8mb4',
  connectionLimit: parseInt(process.env.RDS_CONNECTION_LIMIT) || 10,
  connectTimeout: parseInt(process.env.RDS_CONNECT_TIMEOUT) || 10000,
  acquireTimeout: parseInt(process.env.RDS_ACQUIRE_TIMEOUT) || 10000,
  timezone: '+08:00',
  
  // SSL 配置（根据 RDS 实例支持情况选择）
  // 如果 RDS 不支持 SSL，设置 RDS_SSL=false
  ssl: process.env.RDS_SSL === 'true' ? (() => {
    let sslConfig = {
      rejectUnauthorized: true // 启用证书验证（生产环境必须）
    };

    if (process.env.MYSQL_SSL_CA_PATH) {
      sslConfig.ca = require('fs').readFileSync(process.env.MYSQL_SSL_CA_PATH);
    } else if (process.env.MYSQL_SSL_CA) {
      sslConfig.ca = Buffer.from(process.env.MYSQL_SSL_CA, 'base64');
    } else {
      // 默认使用阿里云 RDS CA 证书路径
      const path = require('path');
      const caPath = path.join(__dirname, 'ApsaraDB-CA-Chain.pem');
      const fs = require('fs');
      if (fs.existsSync(caPath)) {
        sslConfig.ca = fs.readFileSync(caPath);
      }
    }

    return sslConfig;
  })() : false,
};

// 注意：connectionUrl 已于 2026-11-08 删除。原因：全仓无人使用，且它把明文密码拼进 URL
//（一旦被日志打印即泄露）。如需连接串，请调用方自行用 mysqlConfig 的各字段拼接。

// ============================================
// 导出配置
// ============================================
module.exports = {
  mysql: mysqlConfig,
  
  // 快速判断配置
  useMySQL: !!process.env.RDS_HOST,
  useSSL: process.env.RDS_SSL === 'true'
};
