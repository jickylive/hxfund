-- ============================================================
-- project_slides  项目愿景幻灯片表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `project_slides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `subtitle` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '副标题',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT '内容',
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标 emoji',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主题色',
  `tags` json DEFAULT NULL COMMENT '标签数组',
  `sort_order` int DEFAULT '0' COMMENT '排序顺序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sort` (`sort_order`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目愿景幻灯片表';
