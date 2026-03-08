/**
 * 黄氏家族寻根平台 - MySQL 数据库连接管理器
 * 使用 mysql2 连接池，支持自动重连和错误恢复
 */

const mysql = require('mysql2/promise');
const dbConfig = require('./database');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 秒
  }

  /**
   * 初始化数据库连接池
   */
  async initialize() {
    if (this.pool) {
      return this.pool;
    }

    if (this.isConnecting) {
      // 等待连接完成
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkConnection);
            resolve(this.pool);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkConnection);
          reject(new Error('连接超时'));
        }, 10000);
      });
    }

    this.isConnecting = true;

    try {
      const config = dbConfig.mysql;
      
      console.log('🔌 正在连接 MySQL 数据库...');
      console.log(`   主机：${config.host}:${config.port}`);
      console.log(`   数据库：${config.database}`);
      console.log(`   连接池大小：${config.connectionLimit}`);
      console.log(`   SSL: ${config.ssl ? '已启用' : '未启用'}`);

      // 创建连接池
      this.pool = mysql.createPool(config);

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('✅ MySQL 数据库连接成功！');

      // 设置连接池事件监听
      this._setupPoolListeners();

      return this.pool;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error('❌ 数据库连接失败:', error.message);
      
      // 如果是 SSL 错误，提示用户
      if (error.message.includes('SSL') || error.message.includes('secure')) {
        console.error('\n💡 提示：服务器不支持 SSL 连接');
        console.error('   请在 .env 文件中设置 RDS_SSL=false');
      }
      
      throw error;
    }
  }

  /**
   * 设置连接池事件监听
   */
  _setupPoolListeners() {
    if (!this.pool) return;

    this.pool.on('acquire', (connection) => {
      console.debug('📌 连接池：连接被获取');
    });

    this.pool.on('release', (connection) => {
      console.debug('📌 连接池：连接被释放');
    });

    this.pool.on('enqueue', () => {
      console.warn('⚠️  连接池：连接被排队');
    });

    this.pool.on('connection', (connection) => {
      console.debug('🔗 连接池：新连接创建');
      
      // 设置连接字符集
      connection.query('SET NAMES utf8mb4');
    });
  }

  /**
   * 获取数据库连接
   */
  async getConnection() {
    if (!this.pool) {
      await this.initialize();
    }
    return await this.pool.getConnection();
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      await this._reconnectIfNeeded();
    }
    
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ 查询执行失败:', error.message);
      console.error('   SQL:', sql);
      
      // 如果是连接错误，尝试重连
      if (this._isConnectionError(error)) {
        await this._handleConnectionError();
      }
      
      throw error;
    }
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      console.error('❌ 事务执行失败:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量插入
   */
  async batchInsert(table, data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    const keys = Object.keys(data[0]);
    const values = data.map(row => keys.map(key => row[key]));
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    // 使用 multiStatements 进行批量插入
    const insertValues = values.map(v => `(${keys.map(() => '?').join(', ')})`).join(', ');
    const flatValues = values.flat();
    const batchSql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${insertValues}`;
    
    return await this.query(batchSql, flatValues);
  }

  /**
   * 检查是否是连接错误
   */
  _isConnectionError(error) {
    const connectionErrorCodes = [
      'PROTOCOL_CONNECTION_LOST',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'PROTOCOL_ENQUEUE_AFTER_QUIT',
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED'
    ];
    return connectionErrorCodes.includes(error.code) || 
           error.message.includes('connection') ||
           error.message.includes('lost');
  }

  /**
   * 处理连接错误，尝试重连
   */
  async _handleConnectionError() {
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      await new Promise(resolve => 
        setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
      );
      
      await this._reconnectIfNeeded();
    } else {
      console.error('❌ 重连失败，已达到最大重试次数');
      throw new Error('数据库重连失败');
    }
  }

  /**
   * 按需重连
   */
  async _reconnectIfNeeded() {
    if (!this.isConnected && !this.isConnecting) {
      await this.initialize();
    }
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('🔒 数据库连接池已关闭');
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus() {
    if (!this.pool) {
      return { 
        status: '未初始化',
        connected: false
      };
    }

    return {
      status: this.isConnected ? '已连接' : '未连接',
      connected: this.isConnected,
      connectionLimit: dbConfig.mysql.connectionLimit,
      reconnectAttempts: this.reconnectAttempts,
      // mysql2 连接池统计信息
      _allConnections: this.pool._allConnections?.length || 0,
      _freeConnections: this.pool._freeConnections?.length || 0,
      _connectionQueue: this.pool._connectionQueue?.length || 0
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.pool) {
        return { 
          status: 'error',
          message: '连接池未初始化'
        };
      }

      const [rows] = await this.pool.execute('SELECT 1 AS health');
      
      return {
        status: 'ok',
        database: dbConfig.mysql.database,
        host: dbConfig.mysql.host,
        connected: this.isConnected,
        poolSize: this.pool._freeConnections?.length || 0
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// 单例模式
const dbManager = new DatabaseManager();

module.exports = dbManager;
module.exports.DatabaseManager = DatabaseManager;
