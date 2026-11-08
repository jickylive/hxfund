/**
 * 黄氏家族寻根平台 - 版本化数据库迁移执行器
 *
 * 背景：此前无版本化迁移工具，DDL 无幂等，scripts/init-database.js 引用的
 * 路径（scripts/database/legacy/init-simple.sql）早已不存在，初始化即报错。
 * 本执行器按编号顺序执行 database/schema/ 下的 001-010 迁移文件，
 * 已执行的版本号记到 `schema_migrations` 表，重复执行自动跳过。
 *
 * 用法：
 *   node scripts/migrate.js            # 执行所有未执行的迁移（默认）
 *   node scripts/migrate.js status     # 只看已执行 / 待执行，不动库
 *   node scripts/migrate.js --dry-run  # 只列出要执行的迁移，不动库
 *
 * 约定：
 *   - 迁移文件只加不改：新 DDL 写新文件（如 011_xxx.sql），不要改已执行的 001-010。
 *   - 文件名格式：NNN_描述.sql（如 001_users.sql），NNN 是版本号。
 *   - 每个文件执行成功后才记版本号；中途失败不记，下次重跑会重试，
 *     已建好的表会命中 ER_TABLE_EXISTS_ERROR，被容忍后继续（与
 *     init-database.js 的习惯一致，见下面的 TOLERATED_ERRORS）。
 *   - 注意：MySQL 的 DDL 会隐式提交，事务包不住 CREATE TABLE，
 *     所以幂等靠“版本号 + 容忍已存在错误”，不是靠回滚。
 *   - seed.sql 不由本执行器跑（它含写死的 INSERT，不可重入，注释写明严禁对生产库执行）。
 *
 * 连接信息：与 server/config/database.js 同一套环境变量
 *   RDS_HOST / RDS_PORT / RDS_DATABASE / RDS_USERNAME（或 RDS_USER）/
 *   RDS_PASSWORD / RDS_CHARSET / RDS_SSL / MYSQL_SSL_CA_PATH，
 *   优先读环境变量，缺了再读 server/config/.env。
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', 'server', 'config', '.env') });

const SCHEMA_DIR = path.join(__dirname, '..', 'database', 'schema');
const MIGRATION_TABLE = 'schema_migrations';

// 已存在就跳过，不算失败（DDL 幂等的兜底，与 init-database.js 同款）
const TOLERATED_ERRORS = new Set([
  'ER_TABLE_EXISTS_ERROR', // 表已存在
  'ER_DUP_FIELDNAME', // 列已存在
  'ER_DUP_KEYNAME', // 索引已存在
]);

function getConfig() {
  const missing = [];
  if (!process.env.RDS_HOST) missing.push('RDS_HOST');
  if (!process.env.RDS_DATABASE) missing.push('RDS_DATABASE');
  if (!process.env.RDS_USERNAME && !process.env.RDS_USER) missing.push('RDS_USERNAME');
  if (!process.env.RDS_PASSWORD) missing.push('RDS_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`缺少数据库配置：${missing.join('、')}（环境变量或 server/config/.env）`);
  }
  return {
    host: process.env.RDS_HOST,
    port: parseInt(process.env.RDS_PORT, 10) || 3306,
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USERNAME || process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
    charset: process.env.RDS_CHARSET || 'utf8mb4',
    connectTimeout: parseInt(process.env.RDS_CONNECT_TIMEOUT, 10) || 10000,
    multipleStatements: false,
    ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

// 列出全部迁移文件（按编号升序），返回 [{ version, name, file }]
function listMigrationFiles() {
  if (!fs.existsSync(SCHEMA_DIR)) {
    throw new Error(`迁移目录不存在：${SCHEMA_DIR}`);
  }
  return fs
    .readdirSync(SCHEMA_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((f) => ({
      version: f.match(/^(\d+)_/)[1],
      name: f,
      file: path.join(SCHEMA_DIR, f),
    }));
}

// 拆分 SQL：按分号切，但分号在字符串（''/"" /``）里或注释里时不切。
// 001-010 目前是纯 DDL 且无分号在字符串里，这个拆分器是防御性的。
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null; // 当前在哪个引号里：' " ` 或 null
  let lineComment = false; // -- 或 # 开头的行注释
  let blockComment = false; // /* */ 块注释

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] || '';

    if (lineComment) {
      current += ch;
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      current += ch;
      // 反斜杠转义的引号不算结束；MySQL 里 '' 也是转义
      if (ch === quote && sql[i - 1] !== '\\') {
        if (ch === "'" && next === "'") {
          current += next;
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (ch === '-' && next === '-' && (sql[i + 2] === ' ' || sql[i + 2] === '\n')) {
      lineComment = true;
      current += ch;
      continue;
    }
    if (ch === '#') {
      lineComment = true;
      current += ch;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      current += ch;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ';') {
      const stmt = current.trim();
      if (stmt.length > 0) statements.push(stmt);
      current = '';
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

// 建迁移记录表（本身幂等）并读出已执行版本号
async function getAppliedVersions(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS \`${MIGRATION_TABLE}\` (
      \`version\` varchar(10) NOT NULL COMMENT '迁移编号',
      \`name\` varchar(255) NOT NULL COMMENT '迁移文件名',
      \`applied_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
      PRIMARY KEY (\`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已执行的数据库迁移'`
  );
  const [rows] = await connection.query(
    `SELECT \`version\` FROM \`${MIGRATION_TABLE}\` ORDER BY \`version\``
  );
  return new Set(rows.map((r) => r.version));
}

async function runMigrations({ dryRun = false } = {}) {
  const files = listMigrationFiles();
  const config = getConfig();
  const connection = await mysql.createConnection(config);
  try {
    console.log(`连接 ${config.host}:${config.port}/${config.database} 成功`);
    const applied = await getAppliedVersions(connection);
    const pending = files.filter((f) => !applied.has(f.version));

    console.log(`迁移文件共 ${files.length} 个，已执行 ${applied.size} 个，待执行 ${pending.length} 个`);
    if (pending.length === 0) {
      console.log('✅ 已是最新，无需执行');
      return { applied: applied.size, executed: 0 };
    }
    for (const f of pending) {
      console.log(`  待执行：${f.name}`);
    }
    if (dryRun) {
      console.log('[dry-run] 不实际执行');
      return { applied: applied.size, executed: 0, pending: pending.map((f) => f.name) };
    }

    let executed = 0;
    for (const f of pending) {
      console.log(`\n执行 ${f.name} ...`);
      let sql = fs.readFileSync(f.file, 'utf8');
      // 防御：迁移文件里不应有建库/切库语句，有就去掉（连接已指定库）
      sql = sql
        .replace(/CREATE DATABASE[^;]*;/gi, '')
        .replace(/USE `?\w+`?;/gi, '');
      const statements = splitStatements(sql);
      let skipped = 0;
      for (const stmt of statements) {
        try {
          await connection.query(stmt);
        } catch (err) {
          if (TOLERATED_ERRORS.has(err.code)) {
            skipped++;
            continue;
          }
          throw new Error(`${f.name} 执行失败：${err.message}`);
        }
      }
      // 整个文件成功后才记版本号（中途失败不记，下次重跑）
      await connection.query(
        `INSERT INTO \`${MIGRATION_TABLE}\` (\`version\`, \`name\`) VALUES (?, ?)`,
        [f.version, f.name]
      );
      executed++;
      console.log(`  ✅ ${f.name} 完成（${statements.length} 条语句，跳过已存在 ${skipped} 条）`);
    }
    console.log(`\n✅ 迁移完成：本次执行 ${executed} 个，累计已执行 ${applied.size + executed} 个`);
    return { applied: applied.size, executed };
  } finally {
    await connection.end();
  }
}

async function showStatus() {
  const files = listMigrationFiles();
  const config = getConfig();
  const connection = await mysql.createConnection(config);
  try {
    const applied = await getAppliedVersions(connection);
    console.log('迁移状态：');
    for (const f of files) {
      console.log(`  ${applied.has(f.version) ? '✅ 已执行' : '⏳ 待执行'}  ${f.name}`);
    }
  } finally {
    await connection.end();
  }
}

// 供 init-database.js 调用：初始化 = 执行全部待执行迁移
// splitStatements 也导出，方便单测 SQL 拆分逻辑
module.exports = { runMigrations, showStatus, listMigrationFiles, splitStatements, MIGRATION_TABLE };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    try {
      if (args.includes('status')) {
        await showStatus();
      } else {
        await runMigrations({ dryRun: args.includes('--dry-run') });
      }
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  })();
}
