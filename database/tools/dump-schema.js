/**
 * 黄氏家族寻根平台 - 数据库结构导出工具（只读）
 *
 * 用法（在项目根目录运行，自动读取根 .env 的 RDS 配置）：
 *   node database/tools/dump-schema.js [输出目录]
 *
 * 输出：
 *   <输出目录>/schema.sql          - 完整结构备份（DDL）
 *   <输出目录>/schema-summary.md   - 结构摘要（表清单/行数/索引/视图/触发器）
 *
 * 说明：
 *   - 只读操作：仅执行 information_schema 查询与 SHOW CREATE TABLE，
 *     不修改任何数据或结构
 *   - 输出目录缺省为 database/backup/YYYY-MM-DD
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // 项目根目录 .env

function resolveOutputDir() {
  const arg = process.argv[2];
  if (arg) return path.resolve(arg);
  const date = new Date().toISOString().slice(0, 10);
  return path.join(__dirname, '..', 'backup', date);
}

(async () => {
  const outDir = resolveOutputDir();
  fs.mkdirSync(outDir, { recursive: true });

  const caPath = path.join(__dirname, '..', '..', 'server', 'config', 'ApsaraDB-CA-Chain.pem');
  const conn = await mysql.createConnection({
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT, 10) || 3306,
    user: process.env.RDS_USERNAME || process.env.RDS_USER || 'root',
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DATABASE,
    ssl: process.env.RDS_SSL === 'true' && fs.existsSync(caPath)
      ? { ca: fs.readFileSync(caPath), rejectUnauthorized: true }
      : process.env.RDS_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectTimeout: 15000,
  });

  try {
    const db = process.env.RDS_DATABASE;
    const now = new Date().toISOString();

    // 1. 表清单（含估算行数、引擎、字符集、注释）
    const [tables] = await conn.query(
      `SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION, TABLE_COMMENT
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`
    );

    // 2. 视图
    const [views] = await conn.query(
      `SELECT TABLE_NAME, VIEW_DEFINITION
       FROM information_schema.VIEWS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME`
    );

    // 3. 触发器
    const [triggers] = await conn.query(
      `SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING, EVENT_OBJECT_TABLE
       FROM information_schema.TRIGGERS
       WHERE TRIGGER_SCHEMA = DATABASE()
       ORDER BY TRIGGER_NAME`
    );

    // 4. 每张表：SHOW CREATE TABLE + 索引明细
    let ddl = '';
    const summaryTables = [];
    for (const t of tables) {
      const [rows] = await conn.query(`SHOW CREATE TABLE \`${t.TABLE_NAME}\``);
      const createStmt = rows[0]['Create Table'];
      const [indexes] = await conn.query(`SHOW INDEX FROM \`${t.TABLE_NAME}\``);
      ddl += `\n-- ---------------------------------------------------------------------------\n`;
      ddl += `-- 表: ${t.TABLE_NAME}${t.TABLE_COMMENT ? '  ' + t.TABLE_COMMENT : ''}\n`;
      ddl += `-- ---------------------------------------------------------------------------\n`;
      ddl += createStmt + ';\n';
      summaryTables.push({ name: t.TABLE_NAME, rows: t.TABLE_ROWS, comment: t.TABLE_COMMENT, indexes });
    }

    // 5. 视图 DDL
    for (const v of views) {
      ddl += `\n-- ---------------------------------------------------------------------------\n`;
      ddl += `-- 视图: ${v.TABLE_NAME}\n`;
      ddl += `-- ---------------------------------------------------------------------------\n`;
      ddl += `CREATE VIEW \`${v.TABLE_NAME}\` AS\n${v.VIEW_DEFINITION};\n`;
    }

    // 6. 写完整结构备份
    const header = [
      '-- ============================================================',
      '-- 黄氏家族寻根平台 - 数据库结构备份',
      `-- 导出时间: ${now}`,
      `-- 数据库:   ${db}`,
      `-- 主机:     ${process.env.RDS_HOST}:${process.env.RDS_PORT}`,
      `-- 表数量:   ${tables.length}   视图: ${views.length}   触发器: ${triggers.length}`,
      '-- 由 database/tools/dump-schema.js 生成（只读导出，不含数据）',
      '-- ============================================================',
      '',
      `USE \`${db}\`;`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'schema.sql'), header + ddl, 'utf8');

    // 7. 写摘要
    let md = [];
    md.push(`# 数据库结构摘要`);
    md.push('');
    md.push(`- 导出时间：${now}`);
    md.push(`- 数据库：\`${db}\` @ \`${process.env.RDS_HOST}:${process.env.RDS_PORT}\``);
    md.push(`- 表：${tables.length} 个　视图：${views.length} 个　触发器：${triggers.length} 个`);
    md.push('');
    md.push('## 表清单');
    md.push('');
    md.push('| 表 | 估算行数 | 引擎 | 字符集 | 说明 |');
    md.push('|---|---|---|---|---|');
    for (const t of tables) {
      md.push(`| ${t.TABLE_NAME} | ${t.TABLE_ROWS} | ${t.ENGINE} | ${t.TABLE_COLLATION} | ${t.TABLE_COMMENT || '-'} |`);
    }
    md.push('');
    md.push('## 索引');
    md.push('');
    for (const t of summaryTables) {
      const idx = t.indexes
        .map(i => `- ${i.Key_name}${i.Non_unique ? '' : ' (UNIQUE)'}: ${i.Column_name}${i.SUB_PART ? '(' + i.SUB_PART + ')' : ''}`)
        .join('\n');
      md.push(`### ${t.name}\n\n${idx}\n`);
    }
    if (views.length) {
      md.push('## 视图\n');
      for (const v of views) md.push(`- ${v.TABLE_NAME}\n`);
    }
    if (triggers.length) {
      md.push('## 触发器\n');
      for (const t of triggers) md.push(`- ${t.TRIGGER_NAME || t.trigger_name} (${t.ACTION_TIMING || t.action_timing} ${t.EVENT_MANIPULATION || t.event_manipulation} ${t.EVENT_OBJECT_TABLE || t.event_object_table})\n`);
    }
    fs.writeFileSync(path.join(outDir, 'schema-summary.md'), md.join('\n'), 'utf8');

    console.log(`✅ 结构导出完成 → ${outDir}`);
    console.log(`   表: ${tables.length}  视图: ${views.length}  触发器: ${triggers.length}`);
    for (const t of tables) console.log(`   - ${t.TABLE_NAME} (~${t.TABLE_ROWS} 行)${t.TABLE_COMMENT ? '  ' + t.TABLE_COMMENT : ''}`);
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error('❌ 导出失败:', e.message);
  process.exit(1);
});
