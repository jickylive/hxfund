-- ============================================================
-- family_members  家族成员表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `family_members` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成员 ID',
  `parent_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父成员 ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分支/支系名称',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '人物称号/姓名',
  `period` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '历史时期',
  `avatar` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像 emoji',
  `bio` text COLLATE utf8mb4_unicode_ci COMMENT '人物简介',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地理位置',
  `level` int DEFAULT '0' COMMENT '树层级',
  `sort_order` int DEFAULT '0' COMMENT '排序顺序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  CONSTRAINT `family_members_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `family_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家族成员表';
