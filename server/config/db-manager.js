/**
 * 黄氏家族寻根平台 - MySQL 数据库连接管理器
 * 使用 mysql2 连接池
 */

const mysql = require('mysql2/promise');
const dbConfig = require('./database');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * 初始化数据库连接池
   */
  async initialize() {
    if (this.pool) {
      console.log('⚠️  数据库连接池已存在');
      return this.pool;
    }

    try {
      const config = dbConfig.mysql;
      
      console.log('🔌 正在连接阿里云 RDS MySQL...');
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
      console.log('✅ 阿里云 RDS MySQL 连接成功！');

      // 监听连接池事件
      this.pool.on('acquire', (connection) => {
        console.log('📌 连接池：连接被获取');
      });

      this.pool.on('release', (connection) => {
        console.log('📌 连接池：连接被释放');
      });

      this.pool.on('enqueue', () => {
        console.log('⚠️  连接池：连接被排队（可能连接数已满）');
      });

      return this.pool;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 获取数据库连接
   */
  async getConnection() {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化，请先调用 initialize()');
    }
    return await this.pool.getConnection();
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('数据库未连接');
    }
    
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ 查询执行失败:', error.message);
      console.error('   SQL:', sql);
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
    
    return await this.query(sql, values.flat());
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
      return { status: '未初始化' };
    }

    return {
      status: this.isConnected ? '已连接' : '未连接',
      connectionLimit: dbConfig.mysql.connectionLimit,
      // mysql2 连接池统计信息
      _allConnections: this.pool._allConnections?.length || 0,
      _freeConnections: this.pool._freeConnections?.length || 0,
      _connectionQueue: this.pool._connectionQueue?.length || 0
    };
  }
}

// 单例模式
const dbManager = new DatabaseManager();

module.exports = dbManager;
module.exports.DatabaseManager = DatabaseManager;
