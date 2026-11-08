-- ============================================================
-- 黄氏家族寻根平台 - 完整数据库结构（9 表）
-- 来源: 生产库结构备份 database/backup/2026-11-08/schema.sql
-- 更新: 2026-11-08
-- 用法: mysql -u <user> -p < full-schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `hxfund`
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hxfund`;
-- ------------------------------------------------------------
-- 001. users  用户表
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希',
  `role` enum('admin','editor','user') COLLATE utf8mb4_unicode_ci DEFAULT 'user' COMMENT '角色',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像 URL',
  `branch_id` int DEFAULT NULL COMMENT '所属分支',
  `generation` int DEFAULT NULL COMMENT '世代',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地理位置',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否激活',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
-- ------------------------------------------------------------
-- 002. sessions  会话表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 003. ai_conversations  AI 对话记录表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 004. family_members  家族成员表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 005. generation_poems  字辈表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 006. project_slides  项目愿景幻灯片表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 007. blockchain_records  区块链存证记录表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 008. guest_messages  留言表
-- ------------------------------------------------------------
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
-- ------------------------------------------------------------
-- 009. system_config  系统配置表
-- ------------------------------------------------------------
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

-- ============================================================
-- waline_comments  Waline 评论表
-- 黄氏家族寻根平台 - 表结构
-- 新增: 2026-11-08（/api/waline 评论数据持久化，此前为进程内存）
-- ============================================================
CREATE TABLE `waline_comments` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论 ID（uuid 去横线）',
  `path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章路径',
  `nick` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '匿名' COMMENT '昵称',
  `mail` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '邮箱',
  `mail_md5` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '邮箱 MD5（头像用）',
  `link` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '个人主页',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论内容（已 HTML 转义）',
  `ua` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'User-Agent',
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'IP 地址',
  `master` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否博主',
  `pid` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父评论 ID',
  `rid` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '被回复评论 ID',
  `is_spam` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否垃圾评论',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approved' COMMENT '状态: approved/waiting/spam',
  `likes` int NOT NULL DEFAULT '0' COMMENT '点赞数',
  `comments` int NOT NULL DEFAULT '0' COMMENT '回复数',
  `inserted_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  `updated_at` bigint NOT NULL COMMENT '更新时间（毫秒时间戳）',
  PRIMARY KEY (`id`),
  KEY `idx_waline_path` (`path`(191)),
  KEY `idx_waline_inserted` (`inserted_at`),
  KEY `idx_waline_status` (`status`),
  KEY `idx_waline_pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Waline 评论表';

-- ============================================================
-- waline_article_stats  Waline 文章统计表
-- 新增: 2026-11-08（浏览量/评论数，此前为进程内存）
-- ============================================================
CREATE TABLE `waline_article_stats` (
  `path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章路径',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览量',
  `comment_count` int NOT NULL DEFAULT '0' COMMENT '评论数',
  PRIMARY KEY (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Waline 文章统计表';
