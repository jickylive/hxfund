-- ============================================================
-- system_config  系统配置表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `config_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '配置类型',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置说明',
  `is_public` tinyint(1) DEFAULT '0' COMMENT '是否公开',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
