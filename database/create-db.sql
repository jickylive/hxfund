-- ============================================
-- 黄氏家族寻根平台 - 数据库创建脚本
-- 在阿里云 RDS 控制台 SQL 查询窗口执行
-- ============================================

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS `hxfund_db` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. 授权用户访问（如果需要）
-- GRANT ALL PRIVILEGES ON `hxfund_db`.* TO 'hxfund'@'%';
-- FLUSH PRIVILEGES;

-- 3. 使用数据库
USE `hxfund_db`;

-- 4. 创建家族成员表
CREATE TABLE IF NOT EXISTS `family_members` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '成员 ID',
  `parent_id` VARCHAR(50) DEFAULT NULL COMMENT '父成员 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '分支/支系名称',
  `title` VARCHAR(100) NOT NULL COMMENT '人物称号/姓名',
  `period` VARCHAR(100) COMMENT '历史时期',
  `avatar` VARCHAR(10) COMMENT '头像 emoji',
  `bio` TEXT COMMENT '人物简介',
  `location` VARCHAR(200) COMMENT '地理位置',
  `level` INT DEFAULT 0 COMMENT '树层级',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家族成员表';

-- 5. 创建字辈表
CREATE TABLE IF NOT EXISTS `generation_poems` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_code` VARCHAR(50) NOT NULL UNIQUE COMMENT '分支代码',
  `branch_name` VARCHAR(100) NOT NULL COMMENT '分支名称',
  `poem` VARCHAR(500) NOT NULL COMMENT '字辈诗全文',
  `characters` VARCHAR(500) NOT NULL COMMENT '字辈字符序列',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_branch_code` (`branch_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字辈表';

-- 6. 创建项目幻灯片表
CREATE TABLE IF NOT EXISTS `project_slides` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL COMMENT '标题',
  `subtitle` VARCHAR(200) COMMENT '副标题',
  `content` TEXT COMMENT '内容',
  `icon` VARCHAR(10) COMMENT '图标 emoji',
  `color` VARCHAR(20) COMMENT '主题色',
  `tags` JSON COMMENT '标签数组',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sort` (`sort_order`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目愿景幻灯片表';

-- 7. 创建区块链存证表
CREATE TABLE IF NOT EXISTS `blockchain_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `record_id` VARCHAR(50) NOT NULL UNIQUE COMMENT '存证 ID',
  `member_name` VARCHAR(100) NOT NULL COMMENT '成员姓名',
  `hash_value` VARCHAR(100) NOT NULL COMMENT '哈希值',
  `is_verified` TINYINT(1) DEFAULT 1 COMMENT '是否已验证',
  `verified_at` TIMESTAMP NULL DEFAULT NULL COMMENT '验证时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_record_id` (`record_id`),
  INDEX `idx_verified` (`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区块链存证记录表';

-- 8. 创建留言表
CREATE TABLE IF NOT EXISTS `guest_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(100) NOT NULL COMMENT '留言者姓名',
  `content` TEXT NOT NULL COMMENT '留言内容',
  `location` VARCHAR(200) COMMENT '地理位置',
  `is_public` TINYINT(1) DEFAULT 1 COMMENT '是否公开显示',
  `is_verified` TINYINT(1) DEFAULT 0 COMMENT '是否已审核',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_public` (`is_public`),
  INDEX `idx_verified` (`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表';

-- 9. 创建系统配置表
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  `description` VARCHAR(500) COMMENT '配置说明',
  `is_public` TINYINT(1) DEFAULT 0 COMMENT '是否公开',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================
-- 插入初始数据
-- ============================================

-- 10. 插入家族成员
INSERT INTO `family_members` (`id`, `parent_id`, `name`, `title`, `period`, `avatar`, `bio`, `location`, `level`, `sort_order`) VALUES
('ancestor', NULL, '黄姓始祖', '伯益', '上古时期', '👤', '黄姓得姓始祖', '中原地区', 0, 0),
('branch-1', 'ancestor', '江夏黄氏', '黄香', '东汉', '📚', '江夏黄氏代表人物，二十四孝之一', '湖北江夏', 1, 1),
('branch-2', 'ancestor', '金华黄氏', '黄岸', '唐代', '📖', '唐代进士，金华黄氏始祖', '浙江金华', 1, 2),
('branch-3', 'ancestor', '闽台黄氏', '黄敦', '唐代', '🏮', '唐代入闽始祖', '福建', 1, 3),
('gen-1-1', 'branch-1', '江夏支系', '黄琼', '东汉', '🏛️', '东汉名臣，官至太尉', '湖北江夏', 2, 1),
('gen-1-2', 'branch-1', '江夏支系', '黄琬', '东汉末年', '🎭', '东汉末年大臣', '湖北江夏', 2, 2),
('gen-2-1', 'branch-2', '金华支系', '黄峭', '五代十国', '🌾', '五代名臣，创办义门', '福建邵武', 2, 1),
('gen-2-1-1', 'gen-2-1', '邵武黄氏', '黄维', '宋代', '✍️', '宋代文人', '福建邵武', 3, 1),
('gen-3-1', 'branch-3', '闽台支系', '黄彦斌', '明代', '⚓', '明代航海家', '福建泉州', 2, 1)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- 11. 插入字辈数据
INSERT INTO `generation_poems` (`branch_code`, `branch_name`, `poem`, `characters`) VALUES
('jiangxia', '江夏黄氏', '文章华国诗礼传家忠孝为本仁义是先', '文章华国诗礼传家忠孝为本仁义是先'),
('shicheng', '石城黄氏', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光', '祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光'),
('mianyang', '绵阳黄氏', '朝廷文仕正世代永兴隆', '朝廷文仕正世代永兴隆'),
('fujian', '福建黄氏', '敦厚垂型远诗书世泽长', '敦厚垂型远诗书世泽长')
ON DUPLICATE KEY UPDATE `poem`=VALUES(`poem`);

-- 12. 插入项目幻灯片
INSERT INTO `project_slides` (`title`, `subtitle`, `content`, `icon`, `color`, `tags`, `sort_order`) VALUES
('愿景使命', '数字化传承黄氏家族文化，连接全球宗亲', '打造全球黄氏宗亲的数字化精神家园，让千年血脉在数字时代继续传承。', '🎯', '#8B4513', '["文化传承", "数字化", "精神家园"]', 1),
('核心功能', '六大模块全面服务宗亲', '族谱树 · 字辈计算器 · AI 助手 · 区块链存证 · 留言墙 · 项目展示', '⚙️', '#C8933A', '["族谱查询", "智能计算", "AI 对话", "区块链"]', 2),
('技术架构', '现代化、可扩展的技术栈', 'Node.js + Express 后端 · 原生 JavaScript 前端 · 阿里云百炼 AI', '🏗️', '#c0392b', '["Node.js", "Express", "AI"]', 3),
('数据安全', '区块链存证，确保数据真实可信', '采用 SHA-256 哈希上链技术，确保族谱数据不可篡改、可溯源、永久保存。', '🔗', '#27ae60', '["SHA-256", "不可篡改", "可溯源"]', 4),
('未来规划', '持续迭代，打造更好的服务平台', '移动端 APP 开发 · 3D 族谱可视化 · AI 族谱智能修复 · 全球宗亲地图', '🚀', '#2980b9', '["移动端", "3D 可视化", "AI 修复"]', 5)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- 13. 插入区块链存证
INSERT INTO `blockchain_records` (`record_id`, `member_name`, `hash_value`, `is_verified`) VALUES
('MBR-2024-001', '黄香', '0x7a8f9c3e2d1b5a4c6e8f0a2b4d6e8f0a2b4d6e8f', 1),
('MBR-2024-002', '黄峭', '0x3b5d7f9a1c3e5g7i9k1m3o5q7s9u1w3y5a7c9e1g', 1),
('MBR-2024-003', '黄岸', '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d', 1)
ON DUPLICATE KEY UPDATE `member_name`=VALUES(`member_name`);

-- 14. 插入留言数据
INSERT INTO `guest_messages` (`user_name`, `content`, `location`, `is_public`, `is_verified`) VALUES
('黄志强', '寻找湖南宁乡黄氏宗亲，字辈为"光明正大"，望联系。', '湖南长沙', 1, 1),
('黄文华', '感谢平台让我们这些海外游子能够了解家族历史！', '美国旧金山', 1, 1),
('匿名宗亲', '福建邵武黄氏后裔，希望能找到同支系的宗亲。', '台湾台北', 1, 1)
ON DUPLICATE KEY UPDATE `content`=VALUES(`content`);

-- 15. 插入系统配置
INSERT INTO `system_config` (`config_key`, `config_value`, `config_type`, `description`, `is_public`) VALUES
('site_name', '黄氏家族寻根平台', 'string', '网站名称', 1),
('site_version', '3.3.0', 'string', '系统版本号', 1),
('allowed_origins', '["https://hxfund.cn","https://www.hxfund.cn"]', 'json', 'CORS 允许的源', 0),
('rate_limit_window_ms', '60000', 'number', '速率限制窗口 (毫秒)', 0),
('rate_limit_max_requests', '30', 'number', '速率限制最大请求数', 0),
('ai_default_model', 'qwen3.5-plus', 'string', '默认 AI 模型', 0),
('ai_temperature', '0.70', 'number', 'AI 温度参数', 0)
ON DUPLICATE KEY UPDATE `config_value`=VALUES(`config_value`);

-- ============================================
-- 完成提示
-- ============================================

SELECT '✅ 数据库初始化完成！' AS status;
SELECT '数据库：hxfund_db' AS database_name;
SELECT CONCAT('家族成员：', COUNT(*), ' 人') AS members FROM family_members;
SELECT CONCAT('字辈分支：', COUNT(*), ' 个') AS branches FROM generation_poems;
SELECT CONCAT('幻灯片：', COUNT(*), ' 个') AS slides FROM project_slides;
