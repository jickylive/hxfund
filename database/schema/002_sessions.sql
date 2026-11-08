-- ============================================================
-- sessions  会话表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `sessions` (
  `id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话 ID',
  `user_id` int DEFAULT NULL COMMENT '用户 ID',
  `data` json NOT NULL COMMENT '会话数据',
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '过期时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';
