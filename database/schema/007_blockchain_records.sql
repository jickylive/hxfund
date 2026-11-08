-- ============================================================
-- blockchain_records  区块链存证记录表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `blockchain_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `record_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存证 ID',
  `member_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成员姓名',
  `hash_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '哈希值',
  `is_verified` tinyint(1) DEFAULT '1' COMMENT '是否已验证',
  `blockchain_tx` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区块链交易哈希',
  `verified_at` timestamp NULL DEFAULT NULL COMMENT '验证时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `record_id` (`record_id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_verified` (`is_verified`),
  KEY `idx_hash` (`hash_value`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区块链存证记录表';
