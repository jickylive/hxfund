-- ============================================================
-- guest_messages  留言表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `guest_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` bigint DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '留言者姓名',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '留言内容',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地理位置',
  `contact_info` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系方式 (加密存储)',
  `is_public` tinyint(1) DEFAULT '1' COMMENT '是否公开显示',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT '是否已审核',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP 地址',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_public` (`is_public`),
  KEY `idx_verified` (`is_verified`),
  KEY `idx_created` (`created_at`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言表';
