/**
 * Waline 评论系统 API 服务
 * 
 * Waline 是一个简洁的评论系统，支持多种数据库后端
 * 文档：https://waline.js.org/
 * 
 * 本实现使用 MongoDB 存储评论数据
 * 部署方式：作为 hxfund API 的子路径 /waline
 */

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Waline API 版本
const WALINE_VERSION = '1.0.0';

// 常量定义
const AVAILABLE_META = ['nick', 'mail', 'link'];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const COMMENT_MAX_LENGTH = 1000;

// 内存数据库（生产环境请使用 MongoDB）
const db = {
  comments: new Map(),
  counters: new Map(),
  users: new Map()
};

// 工具函数
const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

const generateId = () => uuidv4().replace(/-/g, '');

const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`;
  
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// 创建 Waline 路由器
const router = express.Router();

// ============================================
// 中间件
// ============================================

// CORS 头设置
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ============================================
// 评论 API
// ============================================

/**
 * GET /api/waline/article
 * 获取文章统计信息（评论数、浏览量）
 */
router.get('/article', async (req, res) => {
  try {
    const { path, type = ['time'], lang = 'zh-CN' } = req.query;
    
    if (!path) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少 path 参数'
      });
    }

    const paths = path.split(',');
    const data = {};

    for (const p of paths) {
      const key = `article:${p}`;
      let counter = db.counters.get(key);
      
      if (!counter) {
        counter = { time: 0, comments: 0 };
        db.counters.set(key, counter);
      }

      // 增加浏览量
      if (type.includes('time')) {
        counter.time++;
      }

      data[p] = { ...counter };
    }

    res.json({
      errno: 0,
      errmsg: 'ok',
      data
    });
  } catch (error) {
    console.error('[Waline API] GET /article error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * POST /api/waline/article
 * 更新文章统计信息
 */
router.post('/article', async (req, res) => {
  try {
    const { path, type = 'time', action = 'inc', lang = 'zh-CN' } = req.body;
    
    if (!path) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少 path 参数'
      });
    }

    const key = `article:${path}`;
    let counter = db.counters.get(key);
    
    if (!counter) {
      counter = { time: 0, comments: 0 };
      db.counters.set(key, counter);
    }

    if (action === 'inc') {
      counter[type] = (counter[type] || 0) + 1;
    } else if (action === 'dec') {
      counter[type] = Math.max(0, (counter[type] || 0) - 1);
    }

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: counter
    });
  } catch (error) {
    console.error('[Waline API] POST /article error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * GET /api/waline/comment
 * 获取评论列表
 */
router.get('/comment', async (req, res) => {
  try {
    const { 
      path, 
      page = 1, 
      pageSize = DEFAULT_PAGE_SIZE,
      lang = 'zh-CN',
      sortBy = 'latest',
      type = 'list'
    } = req.query;

    // 评论数统计
    if (type === 'count') {
      const url = path || '';
      const paths = url.split(',');
      const data = {};

      for (const p of paths) {
        const comments = Array.from(db.comments.values())
          .filter(c => c.path === p && !c.isSpam && c.status === 'approved');
        data[p] = comments.length;
      }

      return res.json({
        errno: 0,
        errmsg: 'ok',
        data
      });
    }

    // 最新评论
    if (type === 'recent') {
      const count = parseInt(pageSize) || 10;
      const comments = Array.from(db.comments.values())
        .filter(c => !c.isSpam && c.status === 'approved')
        .sort((a, b) => b.insertedAt - a.insertedAt)
        .slice(0, count)
        .map(c => formatComment(c));

      return res.json({
        errno: 0,
        errmsg: 'ok',
        data: comments
      });
    }

    // 评论列表
    if (!path) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少 path 参数'
      });
    }

    const pageNum = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    let comments = Array.from(db.comments.values())
      .filter(c => c.path === path && !c.isSpam);

    // 排序
    if (sortBy === 'latest') {
      comments.sort((a, b) => b.insertedAt - a.insertedAt);
    } else if (sortBy === 'oldest') {
      comments.sort((a, b) => a.insertedAt - b.insertedAt);
    } else if (sortBy === 'hottest') {
      comments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    const total = comments.length;
    const totalPages = Math.ceil(total / size);
    
    // 分页
    comments = comments.slice((pageNum - 1) * size, pageNum * size);

    // 格式化评论
    const formattedComments = comments.map(c => formatComment(c));

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: {
        total,
        totalPages,
        currentPage: pageNum,
        size,
        data: formattedComments
      }
    });
  } catch (error) {
    console.error('[Waline API] GET /comment error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * POST /api/waline/comment
 * 添加评论
 */
router.post('/comment', async (req, res) => {
  try {
    const { comment, lang = 'zh-CN' } = req.body;

    if (!comment) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少评论数据'
      });
    }

    const {
      path,
      nick = '匿名',
      mail = '',
      link = '',
      comment: content,
      pid = null,
      rid = null,
      ua = '',
      url = '',
      avatar = '',
      linkIcon = '',
      type = 'comment'
    } = comment;

    // 验证必填字段
    if (!path || !content) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少必填字段'
      });
    }

    // 验证昵称长度
    if (nick.length < 2) {
      return res.status(400).json({
        errno: 400,
        errmsg: '昵称至少 2 个字符'
      });
    }

    // 验证邮箱格式
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return res.status(400).json({
        errno: 400,
        errmsg: '邮箱格式不正确'
      });
    }

    // 验证评论长度
    if (content.length > COMMENT_MAX_LENGTH) {
      return res.status(400).json({
        errno: 400,
        errmsg: `评论长度不能超过 ${COMMENT_MAX_LENGTH} 字`
      });
    }

    // 创建评论对象
    const newComment = {
      id: generateId(),
      path,
      nick: sanitizeInput(nick),
      mail: sanitizeInput(mail),
      mailMd5: mail ? md5(mail.toLowerCase()) : md5(nick),
      link: sanitizeInput(link),
      content: sanitizeInput(content),
      ua,
      ip: req.ip || req.connection.remoteAddress,
      master: false,
      pid,
      rid,
      isSpam: false,
      status: 'approved', // approved, waiting, spam
      insertedAt: Date.now(),
      updatedAt: Date.now(),
      likes: 0,
      comments: 0
    };

    // 保存评论
    db.comments.set(newComment.id, newComment);

    // 更新文章评论数
    const counterKey = `article:${path}`;
    let counter = db.counters.get(counterKey);
    if (counter) {
      counter.comments++;
    } else {
      counter = { time: 0, comments: 1 };
      db.counters.set(counterKey, counter);
    }

    // 返回评论
    res.json({
      errno: 0,
      errmsg: 'ok',
      data: formatComment(newComment)
    });
  } catch (error) {
    console.error('[Waline API] POST /comment error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * DELETE /api/waline/comment/:id
 * 删除评论
 */
router.delete('/comment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = db.comments.get(id);

    if (!comment) {
      return res.status(404).json({
        errno: 404,
        errmsg: '评论不存在'
      });
    }

    db.comments.delete(id);

    // 更新文章评论数
    const counterKey = `article:${comment.path}`;
    let counter = db.counters.get(counterKey);
    if (counter && counter.comments > 0) {
      counter.comments--;
    }

    res.json({
      errno: 0,
      errmsg: 'ok'
    });
  } catch (error) {
    console.error('[Waline API] DELETE /comment/:id error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * PUT /api/waline/comment/:id
 * 更新评论
 */
router.put('/comment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, status, isSpam } = req.body;

    const comment = db.comments.get(id);
    if (!comment) {
      return res.status(404).json({
        errno: 404,
        errmsg: '评论不存在'
      });
    }

    if (content !== undefined) {
      comment.content = sanitizeInput(content);
    }
    if (status !== undefined) {
      comment.status = status;
    }
    if (isSpam !== undefined) {
      comment.isSpam = isSpam;
    }

    comment.updatedAt = Date.now();
    db.comments.set(id, comment);

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: formatComment(comment)
    });
  } catch (error) {
    console.error('[Waline API] PUT /comment/:id error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * POST /api/waline/comment/:id/like
 * 点赞评论
 */
router.post('/comment/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = db.comments.get(id);

    if (!comment) {
      return res.status(404).json({
        errno: 404,
        errmsg: '评论不存在'
      });
    }

    comment.likes = (comment.likes || 0) + 1;
    comment.updatedAt = Date.now();
    db.comments.set(id, comment);

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: { liked: true, likes: comment.likes }
    });
  } catch (error) {
    console.error('[Waline API] POST /comment/:id/like error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

// ============================================
// 用户 API
// ============================================

/**
 * GET /api/waline/user
 * 获取用户列表
 */
router.get('/user', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, lang = 'zh-CN' } = req.query;
    
    const pageNum = parseInt(page) || 1;
    const size = Math.min(parseInt(pageSize) || 10, MAX_PAGE_SIZE);

    const users = Array.from(db.users.values());
    const total = users.length;
    const totalPages = Math.ceil(total / size);
    
    const pagedUsers = users.slice((pageNum - 1) * size, pageNum * size);

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: {
        total,
        totalPages,
        currentPage: pageNum,
        size,
        data: pagedUsers
      }
    });
  } catch (error) {
    console.error('[Waline API] GET /user error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

// ============================================
// 系统 API
// ============================================

/**
 * GET /api/waline/system
 * 获取系统信息
 */
router.get('/system', async (req, res) => {
  try {
    res.json({
      errno: 0,
      errmsg: 'ok',
      data: {
        version: WALINE_VERSION,
        commentCount: db.comments.size,
        userCount: db.users.size,
        articleCount: db.counters.size
      }
    });
  } catch (error) {
    console.error('[Waline API] GET /system error:', error);
    res.status(500).json({
      errno: 500,
      errmsg: error.message
    });
  }
});

/**
 * GET /api/waline/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'waline-comment-api',
    version: WALINE_VERSION,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 工具函数
// ============================================

/**
 * 格式化评论对象
 */
function formatComment(comment) {
  return {
    id: comment.id,
    nick: comment.nick,
    mail: comment.mail,
    link: comment.link,
    comment: comment.content,
    avatar: `https://cravatar.cn/avatar/${comment.mailMd5}?s=64&d=mp`,
    mailMd5: comment.mailMd5,
    isMaster: comment.master,
    badge: comment.master ? ['博主'] : [],
    isSpam: comment.isSpam,
    status: comment.status,
    insertedAt: comment.insertedAt,
    updatedAt: comment.updatedAt,
    likes: comment.likes || 0,
    comments: comment.comments || 0,
    pid: comment.pid,
    rid: comment.rid,
    ua: comment.ua,
    ip: comment.ip,
    url: comment.url
  };
}

module.exports = router;
