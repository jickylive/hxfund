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
