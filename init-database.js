/**
 * 黄氏家族寻根平台 - 数据库初始化脚本（无需创建数据库权限）
 * 直接连接到现有数据库并创建表
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, 'database', 'init-simple.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ 错误：SQL 文件不存在：${sqlFile}`);
      process.exit(1);
    }

    console.log('📄 读取 SQL 文件:', sqlFile);
    let sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 处理 SQL 语句
    console.log('   处理 SQL 语句...');
    
    // 移除 CREATE DATABASE 和 USE 语句（因为已经连接到了目标数据库）
    sqlContent = sqlContent
      .replace(/CREATE DATABASE IF NOT EXISTS `?\w+`?[^;]*;/gi, '')
      .replace(/USE `?\w+`?;/gi, '');
    
    // 分割 SQL 语句
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`   找到 ${statements.length} 条 SQL 语句\n`);

    // 执行 SQL 语句
    console.log('🔧 开始执行 SQL 语句...\n');
    
    let executed = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // 跳过空语句和注释
        if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
          continue;
        }

        await connection.query(statement);
        executed++;
        
        // 显示进度
        if ((i + 1) % 5 === 0 || i === statements.length - 1) {
          process.stdout.write(`\r   进度：${i + 1}/${statements.length}`);
        }
      } catch (error) {
        // 忽略"已存在"错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_FIELDNAME') {
          console.warn(`   ⚠️  跳过（已存在）`);
        } else {
          console.error(`\n   ❌ 错误 (${i + 1}/${statements.length}):`, error.message.substring(0, 100));
          errors++;
        }
      }
    }

    console.log('\n');

    // 验证结果
    console.log('📊 验证初始化结果...\n');
    
    const tables = [
      'family_members',
      'generation_poems',
      'project_slides',
      'blockchain_records',
      'guest_messages',
      'system_config'
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
    console.log(`   执行 SQL 语句：${executed} 条`);
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
