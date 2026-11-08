/**
 * 黄氏家族寻根平台 - 数据库初始化脚本（无需创建数据库权限）
 * 直接连接到现有数据库并创建表
 */

require('dotenv').config({ path: path.join(__dirname, '..', 'server', 'config', '.env') });
const mysql = require('mysql2/promise');
const path = require('path');
// 初始化 = 执行版本化迁移（database/schema/ 001-010），见 scripts/migrate.js。
// 旧路径 scripts/database/legacy/init-simple.sql 早已不存在，初始化即报错，
// 所以这里不再直接读 SQL 文件，改调迁移执行器。

async function initializeDatabase() {
  console.log('===========================================');
  console.log('  黄氏家族寻根平台 - 数据库初始化');
  console.log('===========================================\n');

  // 检查配置
  if (!process.env.RDS_HOST || process.env.RDS_HOST === 'your-rds-instance.mysql.rds.aliyuncs.com') {
    console.error('❌ 错误：请先在 .env 文件中配置 RDS_HOST');
    process.exit(1);
  }

  if (!process.env.RDS_USERNAME || process.env.RDS_USERNAME === 'your_rds_username') {
    console.error('❌ 错误：请先在 .env 文件中配置 RDS_USERNAME');
    process.exit(1);
  }

  if (!process.env.RDS_PASSWORD || process.env.RDS_PASSWORD === 'your_rds_password') {
    console.error('❌ 错误：请先在 .env 文件中配置 RDS_PASSWORD');
    process.exit(1);
  }

  if (!process.env.RDS_DATABASE || process.env.RDS_DATABASE === 'your_database_name') {
    console.error('❌ 错误：请先在 .env 文件中配置 RDS_DATABASE');
    console.error('   或者先在 RDS 控制台创建数据库 hxfund');
    process.exit(1);
  }

  let connection;

  try {
    console.log('📋 连接配置:');
    console.log(`   主机：${process.env.RDS_HOST}:${process.env.RDS_PORT || 3306}`);
    console.log(`   数据库：${process.env.RDS_DATABASE}`);
    console.log(`   用户：${process.env.RDS_USERNAME}`);
    console.log(`   SSL: ${process.env.RDS_SSL === 'true' ? '已启用' : '未启用'}`);
    console.log('');

    // 连接到 MySQL 服务器（不指定数据库）
    console.log('🔌 正在连接 MySQL 服务器...');
    connection = await mysql.createConnection({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT) || 3306,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE, // 直接指定数据库
      charset: process.env.RDS_CHARSET || 'utf8mb4',
      connectTimeout: parseInt(process.env.RDS_CONNECT_TIMEOUT) || 10000,
      ssl: process.env.RDS_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });

    console.log('✅ 连接成功！\n');

    // 执行版本化迁移（database/schema/ 001-010，按编号顺序，未执行的才跑，
    // 已执行的记在 schema_migrations 表，重复执行自动跳过）
    const { runMigrations } = require('./migrate');
    const result = await runMigrations();
    const executed = result.executed;
    const errors = 0;

    // 验证结果
    console.log('📊 验证初始化结果...\n');
    
    const tables = [
      'users',
      'sessions',
      'ai_conversations',
      'family_members',
      'generation_poems',
      'project_slides',
      'blockchain_records',
      'guest_messages',
      'system_config',
      'waline_comments',
      'waline_article_stats',
      'schema_migrations'
    ];

    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✓ ${table}: ${rows[0].count} 条记录`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: 表不存在`);
      }
    }

    console.log('\n===========================================');
    console.log('  ✅ 数据库初始化完成！');
    console.log('===========================================\n');
    
    console.log('📋 统计信息:');
    console.log(`   本次执行迁移文件：${executed} 个`);
    console.log(`   错误：${errors} 个`);
    console.log('');

    // 显示 API 测试命令
    console.log('🌐 API 测试:');
    console.log('');
    console.log('   # 测试数据库连接');
    console.log('   curl http://localhost:3000/api/db/health');
    console.log('');
    console.log('   # 获取家族树');
    console.log('   curl http://localhost:3000/api/db/family-tree');
    console.log('');
    console.log('   # 获取字辈诗');
    console.log('   curl http://localhost:3000/api/db/generation-poems');
    console.log('');
    console.log('   # 计算字辈（第 10 代）');
    console.log('   curl "http://localhost:3000/api/db/generation-poems/jiangxia/calculate?generation=10"');
    console.log('');

  } catch (error) {
    console.error('\n===========================================');
    console.error('  ❌ 初始化失败');
    console.error('===========================================\n');
    console.error('错误信息:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示：用户名或密码错误，或者用户没有数据库权限');
      console.error('   1. 检查 .env 中的 RDS_USERNAME 和 RDS_PASSWORD');
      console.error('   2. 在 RDS 控制台确认数据库已创建');
      console.error('   3. 确保用户有该数据库的权限');
      console.error('');
      console.error('   在 RDS 控制台执行:');
      console.error(`   CREATE DATABASE \`${process.env.RDS_DATABASE || 'hxfund'}\` DEFAULT CHARACTER SET utf8mb4;`);
      console.error(`   GRANT ALL PRIVILEGES ON \`${process.env.RDS_DATABASE || 'hxfund'}\`.* TO '${process.env.RDS_USERNAME || 'hxfund'}'@'%';`);
      console.error('   FLUSH PRIVILEGES;');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 提示：数据库不存在');
      console.error('   请先在阿里云 RDS 控制台创建数据库');
      console.error(`   数据库名称：${process.env.RDS_DATABASE || 'hxfund'}`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 提示：连接超时');
      console.error('   1. 检查 RDS 实例是否运行中');
      console.error('   2. 检查白名单是否包含你的 IP');
      console.error('   3. 检查网络连接');
    }
    
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 数据库连接已关闭\n');
    }
  }
}

// 运行初始化
initializeDatabase().catch(console.error);
