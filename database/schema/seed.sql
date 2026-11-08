-- ============================================================
-- 黄氏家族寻根平台 - 初始数据（种子数据）
-- 来源: database/legacy/init-simple.sql 的 INSERT 段
-- 更新: 2026-11-08
-- 用法: 在 schema/full-schema.sql 之后执行
--       mysql -u <user> -p hxfund < seed.sql
-- 注意: 仅用于初始化空数据库，严禁对生产库执行
-- ============================================================

USE `hxfund`;

-- 1. 家族成员数据
INSERT INTO `family_members` (`id`, `parent_id`, `name`, `title`, `period`, `avatar`, `bio`, `location`, `level`, `sort_order`) VALUES
('ancestor', NULL, '黄姓始祖', '伯益', '上古时期', '👤', '黄姓得姓始祖', '中原地区', 0, 0),
('branch-1', 'ancestor', '江夏黄氏', '黄香', '东汉', '📚', '江夏黄氏代表人物，二十四孝之一', '湖北江夏', 1, 1),
('branch-2', 'ancestor', '金华黄氏', '黄岸', '唐代', '📖', '唐代进士，金华黄氏始祖', '浙江金华', 1, 2),
('branch-3', 'ancestor', '闽台黄氏', '黄敦', '唐代', '🏮', '唐代入闽始祖', '福建', 1, 3),
('gen-1-1', 'branch-1', '江夏支系', '黄琼', '东汉', '🏛️', '东汉名臣，官至太尉', '湖北江夏', 2, 1),
('gen-1-2', 'branch-1', '江夏支系', '黄琬', '东汉末年', '🎭', '东汉末年大臣', '湖北江夏', 2, 2),
('gen-2-1', 'branch-2', '金华支系', '黄峭', '五代十国', '🌾', '五代名臣，创办义门', '福建邵武', 2, 1),
('gen-2-1-1', 'gen-2-1', '邵武黄氏', '黄维', '宋代', '✍️', '宋代文人', '福建邵武', 3, 1),
('gen-3-1', 'branch-3', '闽台支系', '黄彦斌', '明代', '⚓', '明代航海家', '福建泉州', 2, 1);

-- 2. 字辈数据
INSERT INTO `generation_poems` (`branch_code`, `branch_name`, `poem`, `characters`) VALUES
('jiangxia', '江夏黄氏', '文章华国诗礼传家忠孝为本仁义是先', '文章华国诗礼传家忠孝为本仁义是先'),
('shicheng', '石城黄氏', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光'),
('mianyang', '绵阳黄氏', '朝廷文仕正世代永兴隆', '朝廷文仕正世代永兴隆'),
('fujian', '福建黄氏', '敦厚垂型远诗书世泽长', '敦厚垂型远诗书世泽长');

-- 3. 项目愿景幻灯片数据
INSERT INTO `project_slides` (`title`, `subtitle`, `content`, `icon`, `color`, `tags`, `sort_order`) VALUES
('愿景使命', '数字化传承黄氏家族文化，连接全球宗亲', '打造全球黄氏宗亲的数字化精神家园，让千年血脉在数字时代继续传承。', '🎯', '#8B4513', '["文化传承", "数字化", "精神家园"]', 1),
('核心功能', '六大模块全面服务宗亲', '族谱树 · 字辈计算器 · AI 助手 · 区块链存证 · 留言墙 · 项目展示', '⚙️', '#C8933A', '["族谱查询", "智能计算", "AI 对话", "区块链"]', 2),
('技术架构', '现代化、可扩展的技术栈', 'Node.js + Express 后端 · 原生 JavaScript 前端 · 阿里云百炼 AI', '🏗️', '#c0392b', '["Node.js", "Express", "AI"]', 3),
('数据安全', '区块链存证，确保数据真实可信', '采用 SHA-256 哈希上链技术，确保族谱数据不可篡改、可溯源、永久保存。', '🔗', '#27ae60', '["SHA-256", "不可篡改", "可溯源"]', 4),
('未来规划', '持续迭代，打造更好的服务平台', '移动端 APP 开发 · 3D 族谱可视化 · AI 族谱智能修复 · 全球宗亲地图', '🚀', '#2980b9', '["移动端", "3D 可视化", "AI 修复"]', 5);

-- 4. 区块链存证记录数据
INSERT INTO `blockchain_records` (`record_id`, `member_name`, `hash_value`, `is_verified`) VALUES
('MBR-2024-001', '黄香', '0x7a8f9c3e2d1b5a4c6e8f0a2b4d6e8f0a2b4d6e8f', 1),
('MBR-2024-002', '黄峭', '0x3b5d7f9a1c3e5g7i9k1m3o5q7s9u1w3y5a7c9e1g', 1),
('MBR-2024-003', '黄岸', '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d', 1);

-- 5. 留言数据
INSERT INTO `guest_messages` (`user_name`, `content`, `location`, `is_public`, `is_verified`) VALUES
('黄志强', '寻找湖南宁乡黄氏宗亲，字辈为"光明正大"，望联系。', '湖南长沙', 1, 1),
('黄文华', '感谢平台让我们这些海外游子能够了解家族历史！', '美国旧金山', 1, 1),
('匿名宗亲', '福建邵武黄氏后裔，希望能找到同支系的宗亲。', '台湾台北', 1, 1);

-- 6. 系统配置数据
INSERT INTO `system_config` (`config_key`, `config_value`, `config_type`, `description`, `is_public`) VALUES
('site_name', '黄氏家族寻根平台', 'string', '网站名称', 1),
('site_version', '3.3.0', 'string', '系统版本号', 1),
('allowed_origins', '["https://hxfund.cn","https://www.hxfund.cn"]', 'json', 'CORS 允许的源', 0),
('rate_limit_window_ms', '60000', 'number', '速率限制窗口 (毫秒)', 0),
('rate_limit_max_requests', '30', 'number', '速率限制最大请求数', 0),
('ai_default_model', 'qwen3.5-plus', 'string', '默认 AI 模型', 0),
('ai_temperature', '0.70', 'number', 'AI 温度参数', 0);
