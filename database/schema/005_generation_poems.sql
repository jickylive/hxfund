-- ============================================================
-- generation_poems  字辈表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `generation_poems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分支代码',
  `branch_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分支名称',
  `poem` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字辈诗全文',
  `characters` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字辈字符序列',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_code` (`branch_code`),
  KEY `idx_branch_code` (`branch_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字辈表';
