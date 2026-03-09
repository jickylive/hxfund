/**
 * 黄氏家族寻根平台 - 数据库数据插入脚本
 * 直接插入初始数据到现有表
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function insertData() {
  console.log('===========================================');
  console.log('  黄氏家族寻根平台 - 数据插入');
  console.log('===========================================\n');

  let connection;

  try {
    console.log('🔌 正在连接数据库...');
    connection = await mysql.createConnection({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT) || 3306,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      charset: 'utf8mb4',
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ 连接成功！\n');

    // 1. 插入家族成员
    console.log('📁 插入家族成员...');
    await connection.query(`
      INSERT INTO family_members (id, parent_id, name, title, period, avatar, bio, location, level, sort_order) VALUES
      ('ancestor', NULL, '黄姓始祖', '伯益', '上古时期', '👤', '黄姓得姓始祖', '中原地区', 0, 0),
      ('branch-1', 'ancestor', '江夏黄氏', '黄香', '东汉', '📚', '江夏黄氏代表人物，二十四孝之一', '湖北江夏', 1, 1),
      ('branch-2', 'ancestor', '金华黄氏', '黄岸', '唐代', '📖', '唐代进士，金华黄氏始祖', '浙江金华', 1, 2),
      ('branch-3', 'ancestor', '闽台黄氏', '黄敦', '唐代', '🏮', '唐代入闽始祖', '福建', 1, 3),
      ('gen-1-1', 'branch-1', '江夏支系', '黄琼', '东汉', '🏛️', '东汉名臣，官至太尉', '湖北江夏', 2, 1),
      ('gen-1-2', 'branch-1', '江夏支系', '黄琬', '东汉末年', '🎭', '东汉末年大臣', '湖北江夏', 2, 2),
      ('gen-2-1', 'branch-2', '金华支系', '黄峭', '五代十国', '🌾', '五代名臣，创办义门', '福建邵武', 2, 1),
      ('gen-2-1-1', 'gen-2-1', '邵武黄氏', '黄维', '宋代', '✍️', '宋代文人', '福建邵武', 3, 1),
      ('gen-3-1', 'branch-3', '闽台支系', '黄彦斌', '明代', '⚓', '明代航海家', '福建泉州', 2, 1)
      ON DUPLICATE KEY UPDATE title=VALUES(title)
    `);
    console.log('   ✅ 9 位家族成员已插入\n');

    // 2. 插入字辈数据
    console.log('📜 插入字辈数据...');
    await connection.query(`
      INSERT INTO generation_poems (branch_code, branch_name, poem, characters) VALUES
      ('jiangxia', '江夏黄氏', '文章华国诗礼传家忠孝为本仁义是先', '文章华国诗礼传家忠孝为本仁义是先'),
      ('shicheng', '石城黄氏', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光'),
      ('mianyang', '绵阳黄氏', '朝廷文仕正世代永兴隆', '朝廷文仕正世代永兴隆'),
      ('fujian', '福建黄氏', '敦厚垂型远诗书世泽长', '敦厚垂型远诗书世泽长')
      ON DUPLICATE KEY UPDATE poem=VALUES(poem)
    `);
    console.log('   ✅ 4 个分支字辈已插入\n');

    // 3. 插入项目幻灯片
    console.log('📊 插入项目幻灯片...');
    await connection.query(`
      INSERT INTO project_slides (title, subtitle, content, icon, color, tags, sort_order) VALUES
      ('愿景使命', '数字化传承黄氏家族文化，连接全球宗亲', '打造全球黄氏宗亲的数字化精神家园，让千年血脉在数字时代继续传承。', '🎯', '#8B4513', '["文化传承", "数字化", "精神家园"]', 1),
      ('核心功能', '六大模块全面服务宗亲', '族谱树 · 字辈计算器 · AI 助手 · 区块链存证 · 留言墙 · 项目展示', '⚙️', '#C8933A', '["族谱查询", "智能计算", "AI 对话", "区块链"]', 2),
      ('技术架构', '现代化、可扩展的技术栈', 'Node.js + Express 后端 · 原生 JavaScript 前端 · 阿里云百炼 AI', '🏗️', '#c0392b', '["Node.js", "Express", "AI"]', 3),
      ('数据安全', '区块链存证，确保数据真实可信', '采用 SHA-256 哈希上链技术，确保族谱数据不可篡改、可溯源、永久保存。', '🔗', '#27ae60', '["SHA-256", "不可篡改", "可溯源"]', 4),
      ('未来规划', '持续迭代，打造更好的服务平台', '移动端 APP 开发 · 3D 族谱可视化 · AI 族谱智能修复 · 全球宗亲地图', '🚀', '#2980b9', '["移动端", "3D 可视化", "AI 修复"]', 5)
      ON DUPLICATE KEY UPDATE title=VALUES(title)
    `);
    console.log('   ✅ 5 张幻灯片已插入\n');

    // 4. 插入区块链存证
    console.log('⛓️ 插入区块链存证...');
    await connection.query(`
      INSERT INTO blockchain_records (record_id, member_name, hash_value, is_verified) VALUES
      ('MBR-2024-001', '黄香', '0x7a8f9c3e2d1b5a4c6e8f0a2b4d6e8f0a2b4d6e8f', 1),
      ('MBR-2024-002', '黄峭', '0x3b5d7f9a1c3e5g7i9k1m3o5q7s9u1w3y5a7c9e1g', 1),
      ('MBR-2024-003', '黄岸', '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d', 1)
      ON DUPLICATE KEY UPDATE member_name=VALUES(member_name)
    `);
    console.log('   ✅ 3 条存证记录已插入\n');

    // 5. 插入留言
    console.log('💬 插入留言...');
    await connection.query(`
      INSERT INTO guest_messages (user_name, content, location, is_public, is_verified) VALUES
      ('黄志强', '寻找湖南宁乡黄氏宗亲，字辈为"光明正大"，望联系。', '湖南长沙', 1, 1),
      ('黄文华', '感谢平台让我们这些海外游子能够了解家族历史！', '美国旧金山', 1, 1),
      ('匿名宗亲', '福建邵武黄氏后裔，希望能找到同支系的宗亲。', '台湾台北', 1, 1)
      ON DUPLICATE KEY UPDATE content=VALUES(content)
    `);
    console.log('   ✅ 3 条留言已插入\n');

    // 6. 插入系统配置
    console.log('⚙️ 插入系统配置...');
    await connection.query(`
      INSERT INTO system_config (config_key, config_value, config_type, description, is_public) VALUES
      ('site_name', '黄氏家族寻根平台', 'string', '网站名称', 1),
      ('site_version', '3.3.0', 'string', '系统版本号', 1),
      ('allowed_origins', '["https://hxfund.cn","https://www.hxfund.cn"]', 'json', 'CORS 允许的源', 0),
      ('rate_limit_window_ms', '60000', 'number', '速率限制窗口 (毫秒)', 0),
      ('rate_limit_max_requests', '30', 'number', '速率限制最大请求数', 0),
      ('ai_default_model', 'qwen3.5-plus', 'string', '默认 AI 模型', 0),
      ('ai_temperature', '0.70', 'number', 'AI 温度参数', 0)
      ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)
    `);
    console.log('   ✅ 7 项配置已插入\n');

    // 验证结果
    console.log('📊 验证数据...');
    const [members] = await connection.query('SELECT COUNT(*) as count FROM family_members');
    const [poems] = await connection.query('SELECT COUNT(*) as count FROM generation_poems');
    const [slides] = await connection.query('SELECT COUNT(*) as count FROM project_slides');
    const [records] = await connection.query('SELECT COUNT(*) as count FROM blockchain_records');
    const [messages] = await connection.query('SELECT COUNT(*) as count FROM guest_messages');

    console.log(`   ✓ 家族成员：${members[0].count} 人`);
    console.log(`   ✓ 字辈分支：${poems[0].count} 个`);
    console.log(`   ✓ 幻灯片：${slides[0].count} 个`);
    console.log(`   ✓ 存证记录：${records[0].count} 条`);
    console.log(`   ✓ 留言：${messages[0].count} 条`);

    console.log('\n===========================================');
    console.log('  ✅ 数据插入完成！');
    console.log('===========================================\n');

    console.log('🌐 API 测试:');
    console.log('   curl http://localhost:3000/api/db/family-tree');
    console.log('   curl http://localhost:3000/api/db/generation-poems');
    console.log('');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 数据库连接已关闭\n');
    }
  }
}

insertData();
