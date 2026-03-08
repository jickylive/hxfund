/**
 * 黄氏家族寻根平台 - RDS 连接测试脚本
 * 
 * 使用方法:
 *   node test-rds-connection.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testRDSConnection() {
  console.log('===========================================');
  console.log('  阿里云 RDS 连接测试');
  console.log('===========================================\n');

  // 检查配置
  if (!process.env.RDS_HOST || process.env.RDS_HOST === 'your-rds-instance.mysql.rds.aliyuncs.com') {
    console.error('❌ 错误：请先在 .env 文件中配置 RDS_HOST');
    console.error('   编辑 .env 文件，填入你的 RDS 实例地址');
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

  let connection;

  try {
    console.log('📋 连接配置:');
    console.log(`   主机：${process.env.RDS_HOST}:${process.env.RDS_PORT || 3306}`);
    console.log(`   数据库：${process.env.RDS_DATABASE || 'hxfund'}`);
    console.log(`   用户：${process.env.RDS_USERNAME}`);
    console.log(`   SSL: ${process.env.RDS_SSL === 'true' ? '已启用' : '未启用'}`);
    console.log('');

    console.log('🔌 正在连接...');

    connection = await mysql.createConnection({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT) || 3306,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE || 'hxfund',
      charset: process.env.RDS_CHARSET || 'utf8mb4',
      connectTimeout: parseInt(process.env.RDS_CONNECT_TIMEOUT) || 10000,
      ssl: process.env.RDS_SSL === 'true' ? {
        rejectUnauthorized: true
      } : false
    });

    console.log('✅ 连接成功！\n');

    // 测试查询
    console.log('📊 执行测试查询...');
    
    // 1. 基础查询
    const [testResult] = await connection.query('SELECT 1 AS test');
    console.log('   ✓ 基础查询：', testResult);

    // 2. 获取数据库版本
    const [version] = await connection.query('SELECT VERSION() AS version');
    console.log('   ✓ MySQL 版本：', version[0].version);

    // 3. 获取当前数据库
    const [currentDb] = await connection.query('SELECT DATABASE() AS db');
    console.log('   ✓ 当前数据库：', currentDb[0].db);

    // 4. 获取用户权限
    const [user] = await connection.query('SELECT USER() AS user');
    console.log('   ✓ 当前用户：', user[0].user);

    // 5. 检查表是否存在
    console.log('\n📁 检查数据表...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    if (tables.length > 0) {
      console.log(`   找到 ${tables.length} 个表:`);
      tables.forEach(table => {
        console.log(`      - ${table.TABLE_NAME}${table.TABLE_COMMENT ? ` (${table.TABLE_COMMENT})` : ''}`);
      });
    } else {
      console.log('   ⚠️  数据库为空，请运行 database/init.sql 初始化');
    }

    // 6. 检查关键表
    console.log('\n🔍 检查关键数据...');
    
    try {
      const [members] = await connection.query('SELECT COUNT(*) AS count FROM family_members');
      console.log(`   ✓ 家族成员：${members[0].count} 人`);
    } catch (e) {
      console.log('   ⚠️  family_members 表不存在');
    }

    try {
      const [poems] = await connection.query('SELECT COUNT(*) AS count FROM generation_poems');
      console.log(`   ✓ 字辈分支：${poems[0].count} 个`);
    } catch (e) {
      console.log('   ⚠️  generation_poems 表不存在');
    }

    try {
      const [slides] = await connection.query('SELECT COUNT(*) AS count FROM project_slides');
      console.log(`   ✓ 幻灯片：${slides[0].count} 个`);
    } catch (e) {
      console.log('   ⚠️  project_slides 表不存在');
    }

    console.log('\n===========================================');
    console.log('  ✅ 所有测试通过！');
    console.log('===========================================\n');

  } catch (error) {
    console.error('\n===========================================');
    console.error('  ❌ 连接测试失败');
    console.error('===========================================\n');
    
    console.error('错误信息:', error.message);
    
    // 常见错误提示
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示：用户名或密码错误');
      console.error('   请检查 .env 中的 RDS_USERNAME 和 RDS_PASSWORD');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 提示：连接超时');
      console.error('   1. 检查 RDS 实例是否运行中');
      console.error('   2. 检查白名单是否包含你的 IP');
      console.error('   3. 检查网络连接');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 提示：数据库不存在');
      console.error('   请创建数据库或修改 RDS_DATABASE 配置');
      console.error('   CREATE DATABASE hxfund_db;');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 提示：SSL 连接失败');
      console.error('   1. 下载并配置 CA 证书');
      console.error('   2. 或临时设置 RDS_SSL=false');
    }
    
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行测试
testRDSConnection().catch(console.error);
