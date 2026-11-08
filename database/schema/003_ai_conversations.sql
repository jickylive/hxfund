-- ============================================================
-- ai_conversations  AI 对话记录表
-- 黄氏家族寻根平台 - 表结构
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- ============================================================
CREATE TABLE `ai_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话 ID',
  `user_id` int DEFAULT NULL COMMENT '用户 ID',
  `model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'AI 模型',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户消息',
  `response` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AI 响应',
  `tokens_used` int DEFAULT '0' COMMENT '消耗 Token 数',
  `temperature` decimal(3,2) DEFAULT '0.70' COMMENT '温度参数',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上传图片 URL',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 对话记录表';
