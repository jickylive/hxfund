/**
 * 数据库优化配置
 * 包含索引创建、查询优化建议等
 */

const dbManager = require('./db-manager');
const logger = require('../config/logger');

/**
 * 数据库优化配置
 */
const DB_OPTIMIZATION = {
  // 索引配置
  indexes: [
    {
      table: 'family_tree',
      indexes: [
        { name: 'idx_generation', columns: ['generation'] },
        { name: 'idx_name', columns: ['name'] },
        { name: 'idx_birth_date', columns: ['birth_date'] },
        { name: 'idx_generation_name', columns: ['generation', 'name'], unique: false },
      ]
    },
    {
      table: 'generation_poems',
      indexes: [
        { name: 'idx_branch', columns: ['branch'] },
        { name: 'idx_branch_generation', columns: ['branch', 'generation'] },
      ]
    },
    {
      table: 'guest_messages',
      indexes: [
        { name: 'idx_created_at', columns: ['created_at'] },
        { name: 'idx_status', columns: ['status'] },
        { name: 'idx_created_at_status', columns: ['created_at', 'status'] },
      ]
    },
    {
      table: 'blockchain_records',
      indexes: [
        { name: 'idx_record_hash', columns: ['record_hash'], unique: true },
        { name: 'idx_record_type', columns: ['record_type'] },
        { name: 'idx_created_at', columns: ['created_at'] },
        { name: 'idx_tx_hash', columns: ['tx_hash'] },
      ]
    },
    {
      table: 'project_slides',
      indexes: [
        { name: 'idx_order', columns: ['display_order'] },
        { name: 'idx_status', columns: ['status'] },
        { name: 'idx_order_status', columns: ['display_order', 'status'] },
      ]
    }
  ],

  // 查询优化建议
  queryOptimizations: [
    {
      description: '避免 SELECT *',
      recommendation: '只选择需要的列，减少数据传输量',
      example: 'SELECT id, name, generation FROM family_tree WHERE generation = 3'
    },
    {
      description: '使用 LIMIT 分页',
      recommendation: '对于大量数据，使用 LIMIT 和 OFFSET 进行分页',
      example: 'SELECT * FROM guest_messages ORDER BY created_at DESC LIMIT 20 OFFSET 0'
    },
    {
      description: '使用索引列进行排序',
      recommendation: '确保 ORDER BY 子句使用索引列',
      example: 'SELECT * FROM guest_messages ORDER BY created_at DESC LIMIT 20'
    },
    {
      description: '避免在索引列上使用函数',
      recommendation: '这会导致索引失效',
      example: '避免：WHERE YEAR(created_at) = 2024，应该使用：WHERE created_at >= "2024-01-01" AND created_at < "2025-01-01"'
    },
    {
      description: '使用 JOIN 代替子查询',
      recommendation: '对于复杂查询，JOIN 通常比子查询更高效',
      example: 'SELECT ft.*, gp.poem FROM family_tree ft JOIN generation_poems gp ON ft.generation = gp.generation'
    }
  ],

  // 连接池优化
  poolOptimization: {
    connectionLimit: 10,
    acquireTimeout: 10000,
    queueLimit: 0,
    waitForConnections: true
  }
};

/**
 * 数据库优化服务类
 */
class DatabaseOptimizationService {
  constructor() {
    this.config = DB_OPTIMIZATION;
  }

  /**
   * 创建索引
   */
  async createIndexes() {
    try {
      if (!dbManager.isConnected) {
        throw new Error('数据库未连接');
      }

      const pool = dbManager.pool;

      for (const tableConfig of this.config.indexes) {
        const { table, indexes } = tableConfig;

        logger.info(`开始创建 ${table} 表的索引`);

        for (const indexConfig of indexes) {
          const { name, columns, unique = false } = indexConfig;

          try {
            const uniqueKeyword = unique ? 'UNIQUE' : '';
            const columnsStr = columns.join(', ');
            const sql = `CREATE ${uniqueKeyword} INDEX ${name} ON ${table} (${columnsStr})`;

            await pool.execute(sql);
            logger.info(`索引创建成功: ${name}`);
          } catch (error) {
            // 如果索引已存在，忽略错误
            if (error.code === 'ER_DUP_KEYNAME') {
              logger.warn(`索引已存在: ${name}`);
            } else {
              logger.error(`索引创建失败: ${name}`, { error: error.message });
            }
          }
        }
      }

      logger.info('所有索引创建完成');
      return true;
    } catch (error) {
      logger.error('创建索引失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 检查索引使用情况
   */
  async checkIndexUsage() {
    try {
      if (!dbManager.isConnected) {
        throw new Error('数据库未连接');
      }

      const pool = dbManager.pool;

      // 查询索引使用统计
      const sql = `
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          SEQ_IN_INDEX,
          COLUMN_NAME,
          CARDINALITY
        FROM 
          INFORMATION_SCHEMA.STATISTICS
        WHERE 
          TABLE_SCHEMA = DATABASE()
        ORDER BY 
          TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
      `;

      const [rows] = await pool.execute(sql);

      logger.info('索引使用情况查询完成');
      return rows;
    } catch (error) {
      logger.error('检查索引使用情况失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 分析慢查询
   */
  async analyzeSlowQueries() {
    try {
      if (!dbManager.isConnected) {
        throw new Error('数据库未连接');
      }

      const pool = dbManager.pool;

      // 查询慢查询日志
      const sql = `
        SELECT 
          COUNT(*) as count,
          AVG(query_time) as avg_time,
          MAX(query_time) as max_time,
          SUBSTRING(sql_text, 1, 100) as sql_sample
        FROM 
          mysql.slow_log
        WHERE 
          start_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
        GROUP BY 
          sql_sample
        ORDER BY 
          count DESC
        LIMIT 10
      `;

      const [rows] = await pool.execute(sql);

      logger.info('慢查询分析完成');
      return rows;
    } catch (error) {
      logger.error('分析慢查询失败', { error: error.message });
      // 如果慢查询日志未启用，返回空数组
      return [];
    }
  }

  /**
   * 优化表
   */
  async optimizeTables() {
    try {
      if (!dbManager.isConnected) {
        throw new Error('数据库未连接');
      }

      const pool = dbManager.pool;

      const tables = [
        'family_tree',
        'generation_poems',
        'guest_messages',
        'blockchain_records',
        'project_slides'
      ];

      for (const table of tables) {
        try {
          const sql = `OPTIMIZE TABLE ${table}`;
          await pool.execute(sql);
          logger.info(`表优化完成: ${table}`);
        } catch (error) {
          logger.error(`表优化失败: ${table}`, { error: error.message });
        }
      }

      logger.info('所有表优化完成');
      return true;
    } catch (error) {
      logger.error('优化表失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取表统计信息
   */
  async getTableStats() {
    try {
      if (!dbManager.isConnected) {
        throw new Error('数据库未连接');
      }

      const pool = dbManager.pool;

      const sql = `
        SELECT 
          TABLE_NAME,
          TABLE_ROWS,
          AVG_ROW_LENGTH,
          DATA_LENGTH,
          INDEX_LENGTH,
          DATA_FREE,
          UPDATE_TIME
        FROM 
          INFORMATION_SCHEMA.TABLES
        WHERE 
          TABLE_SCHEMA = DATABASE()
        ORDER BY 
          TABLE_NAME
      `;

      const [rows] = await pool.execute(sql);

      logger.info('表统计信息查询完成');
      return rows;
    } catch (error) {
      logger.error('获取表统计信息失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取优化建议
   */
  getOptimizationRecommendations() {
    return this.config.queryOptimizations;
  }

  /**
   * 执行完整的数据库优化
   */
  async runFullOptimization() {
    try {
      logger.info('开始执行完整数据库优化');

      // 1. 创建索引
      await this.createIndexes();

      // 2. 优化表
      await this.optimizeTables();

      // 3. 获取统计信息
      const stats = await this.getTableStats();

      // 4. 检查索引使用情况
      const indexUsage = await this.checkIndexUsage();

      logger.info('完整数据库优化完成');

      return {
        success: true,
        stats,
        indexUsage,
        recommendations: this.getOptimizationRecommendations()
      };
    } catch (error) {
      logger.error('完整数据库优化失败', { error: error.message });
      throw error;
    }
  }
}

// 创建单例实例
const dbOptimizationService = new DatabaseOptimizationService();

module.exports = dbOptimizationService;
