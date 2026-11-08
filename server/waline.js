/**
 * Waline 评论系统 API 服务
 *
 * Waline 是一个简洁的评论系统，支持多种数据库后端
 * 文档：https://waline.js.org/
 *
 * 存储：MySQL（waline_comments / waline_article_stats，
 * 见 database/schema/010_waline.sql）。DB 不可用时（本地未配库 / 故障）
 * 自动降级为进程内存存储（重启丢失）。
 * 部署方式：作为 hxfund API 的子路径 /waline
 */

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('./config/db-manager');

// Waline API 版本
const WALINE_VERSION = '1.0.0';

// 常量定义
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const COMMENT_MAX_LENGTH = 1000;

// 内存降级存储（仅 DB 不可用时使用）
const db = {
  comments: new Map(),
  counters: new Map(),
  users: new Map()
};

// 工具函数
const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

const generateId = () => uuidv4().replace(/-/g, '');

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
// MySQL 存储层
// ============================================

/**
 * DB 是否可用（不可用时各端点降级到内存存储）
 */
async function dbOk() {
  try {
    await dbManager.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * DB 行 → 评论对象
 */
function rowToComment(row) {
  return {
    id: row.id,
    path: row.path,
    nick: row.nick,
    mail: row.mail,
    mailMd5: row.mail_md5,
    link: row.link,
    content: row.content,
    ua: row.ua,
    ip: row.ip,
    master: !!row.master,
    pid: row.pid,
    rid: row.rid,
    isSpam: !!row.is_spam,
    status: row.status,
    likes: row.likes || 0,
    comments: row.comments || 0,
    insertedAt: Number(row.inserted_at),
    updatedAt: Number(row.updated_at)
  };
}

// ============================================
// 评论 API
// ============================================

/**
 * GET /api/waline/article
 * 获取文章统计信息（评论数、浏览量）
 */
router.get('/article', async (req, res) => {
  try {
    const { path, type = ['time'] } = req.query;

    if (!path) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少 path 参数'
      });
    }

    const paths = path.split(',');

    // MySQL 存储
    if (await dbOk()) {
      try {
        // IN 占位符手动展开（该 RDS 上数组参数展开不可靠）
        const placeholders = paths.map(() => '?').join(', ');
        const rows = await dbManager.query(
          `SELECT path, view_count AS time, comment_count AS comments
           FROM waline_article_stats WHERE path IN (${placeholders})`,
          paths
        );
        const byPath = {};
        for (const r of rows) byPath[r.path] = { time: r.time, comments: r.comments };

        const data = {};
        for (const p of paths) {
          const counter = byPath[p] || { time: 0, comments: 0 };
          // 增加浏览量
          if (type.includes('time')) {
            await dbManager.query(
              `INSERT INTO waline_article_stats (path, view_count, comment_count)
               VALUES (?, 1, 0)
               ON DUPLICATE KEY UPDATE view_count = view_count + 1`,
              [p]
            );
            counter.time++;
          }
          data[p] = counter;
        }
        return res.json({ errno: 0, errmsg: 'ok', data });
      } catch (error) {
        console.warn('[Waline API] GET /article DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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
    const { path, type = 'time', action = 'inc' } = req.body;

    if (!path) {
      return res.status(400).json({
        errno: 400,
        errmsg: '缺少 path 参数'
      });
    }

    // MySQL 存储（type 白名单校验，防 SQL 注入）
    if (await dbOk()) {
      try {
        const col = type === 'time' ? 'view_count' : type === 'comments' ? 'comment_count' : null;
        if (col) {
          if (action === 'inc') {
            await dbManager.query(
              `INSERT INTO waline_article_stats (path, view_count, comment_count)
               VALUES (?, ?, 0)
               ON DUPLICATE KEY UPDATE ${col} = ${col} + 1`,
              [path, col === 'view_count' ? 1 : 0]
            );
          } else {
            await dbManager.query(
              `INSERT INTO waline_article_stats (path, view_count, comment_count)
               VALUES (?, 0, 0)
               ON DUPLICATE KEY UPDATE ${col} = GREATEST(${col} - 1, 0)`,
              [path]
            );
          }
        }
        const rows = await dbManager.query(
          'SELECT view_count AS time, comment_count AS comments FROM waline_article_stats WHERE path = ?',
          [path]
        );
        const counter = rows.length
          ? { time: rows[0].time, comments: rows[0].comments }
          : { time: 0, comments: 0 };
        return res.json({ errno: 0, errmsg: 'ok', data: counter });
      } catch (error) {
        console.warn('[Waline API] POST /article DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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
      sortBy = 'latest',
      type = 'list'
    } = req.query;

    // MySQL 存储
    if (await dbOk()) {
      try {
        // 评论数统计
        if (type === 'count') {
          const url = path || '';
          const paths = url.split(',');
          // IN 占位符手动展开（该 RDS 上数组参数展开不可靠）
          const placeholders = paths.map(() => '?').join(', ');
          const rows = await dbManager.query(
            `SELECT path, COUNT(*) AS cnt
             FROM waline_comments
             WHERE path IN (${placeholders}) AND is_spam = 0 AND status = 'approved'
             GROUP BY path`,
            paths
          );
          const data = {};
          for (const p of paths) {
            const row = rows.find(r => r.path === p);
            data[p] = row ? row.cnt : 0;
          }
          return res.json({ errno: 0, errmsg: 'ok', data });
        }

        // 最新评论
        if (type === 'recent') {
          // LIMIT 用已校验的整数拼接（与 routes/database.js 一致；
          // RDS 预处理协议不支持 LIMIT 占位符）
          const count = Math.max(1, parseInt(pageSize) || 10);
          const rows = await dbManager.query(
            `SELECT * FROM waline_comments
             WHERE is_spam = 0 AND status = 'approved'
             ORDER BY inserted_at DESC
             LIMIT ${count}`
          );
          return res.json({
            errno: 0,
            errmsg: 'ok',
            data: rows.map(r => formatComment(rowToComment(r)))
          });
        }

        // 评论列表
        if (!path) {
          return res.status(400).json({
            errno: 400,
            errmsg: '缺少 path 参数'
          });
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const size = Math.min(parseInt(pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const offset = (pageNum - 1) * size;

        // 排序（白名单，防注入）
        const order =
          sortBy === 'oldest' ? 'inserted_at ASC' :
          sortBy === 'hottest' ? 'likes DESC, inserted_at DESC' :
          'inserted_at DESC';

        const totalRows = await dbManager.query(
          'SELECT COUNT(*) AS total FROM waline_comments WHERE path = ? AND is_spam = 0',
          [path]
        );
        const total = totalRows[0].total;
        const totalPages = Math.ceil(total / size);

        // LIMIT/OFFSET 用已校验的整数拼接（与 routes/database.js 一致；
        // RDS 预处理协议不支持 LIMIT 占位符）
        const rows = await dbManager.query(
          `SELECT * FROM waline_comments
           WHERE path = ? AND is_spam = 0
           ORDER BY ${order}
           LIMIT ${size} OFFSET ${offset}`,
          [path]
        );

        return res.json({
          errno: 0,
          errmsg: 'ok',
          data: {
            total,
            totalPages,
            currentPage: pageNum,
            size,
            data: rows.map(r => formatComment(rowToComment(r)))
          }
        });
      } catch (error) {
        console.warn('[Waline API] GET /comment DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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
    const { comment } = req.body;

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
      ua = ''
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

    // MySQL 存储
    if (await dbOk()) {
      try {
        await dbManager.query(
          `INSERT INTO waline_comments
           (id, path, nick, mail, mail_md5, link, content, ua, ip, master,
            pid, rid, is_spam, status, likes, comments, inserted_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newComment.id, newComment.path, newComment.nick, newComment.mail,
            newComment.mailMd5, newComment.link, newComment.content, newComment.ua,
            newComment.ip, newComment.master ? 1 : 0, newComment.pid, newComment.rid,
            newComment.isSpam ? 1 : 0, newComment.status, newComment.likes,
            newComment.comments, newComment.insertedAt, newComment.updatedAt
          ]
        );
        // 更新文章评论数
        await dbManager.query(
          `INSERT INTO waline_article_stats (path, view_count, comment_count)
           VALUES (?, 0, 1)
           ON DUPLICATE KEY UPDATE comment_count = comment_count + 1`,
          [path]
        );
        return res.json({
          errno: 0,
          errmsg: 'ok',
          data: formatComment(newComment)
        });
      } catch (error) {
        console.warn('[Waline API] POST /comment DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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

    // MySQL 存储
    if (await dbOk()) {
      try {
        const rows = await dbManager.query(
          'SELECT id, path FROM waline_comments WHERE id = ?',
          [id]
        );
        if (!rows.length) {
          return res.status(404).json({
            errno: 404,
            errmsg: '评论不存在'
          });
        }
        await dbManager.query('DELETE FROM waline_comments WHERE id = ?', [id]);
        // 更新文章评论数
        await dbManager.query(
          'UPDATE waline_article_stats SET comment_count = GREATEST(comment_count - 1, 0) WHERE path = ?',
          [rows[0].path]
        );
        return res.json({ errno: 0, errmsg: 'ok' });
      } catch (error) {
        console.warn('[Waline API] DELETE /comment DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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

    // MySQL 存储
    if (await dbOk()) {
      try {
        const rows = await dbManager.query(
          'SELECT id FROM waline_comments WHERE id = ?',
          [id]
        );
        if (!rows.length) {
          return res.status(404).json({
            errno: 404,
            errmsg: '评论不存在'
          });
        }

        const fields = [];
        const values = [];
        if (content !== undefined) {
          fields.push('content = ?');
          values.push(sanitizeInput(content));
        }
        if (status !== undefined) {
          fields.push('status = ?');
          values.push(status);
        }
        if (isSpam !== undefined) {
          fields.push('is_spam = ?');
          values.push(isSpam ? 1 : 0);
        }
        fields.push('updated_at = ?');
        values.push(Date.now());

        if (fields.length > 1) {
          values.push(id);
          await dbManager.query(
            `UPDATE waline_comments SET ${fields.join(', ')} WHERE id = ?`,
            values
          );
        }

        const updated = await dbManager.query(
          'SELECT * FROM waline_comments WHERE id = ?',
          [id]
        );
        return res.json({
          errno: 0,
          errmsg: 'ok',
          data: formatComment(rowToComment(updated[0]))
        });
      } catch (error) {
        console.warn('[Waline API] PUT /comment DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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

    // MySQL 存储
    if (await dbOk()) {
      try {
        const result = await dbManager.query(
          'UPDATE waline_comments SET likes = likes + 1, updated_at = ? WHERE id = ?',
          [Date.now(), id]
        );
        if (result.affectedRows === 0) {
          return res.status(404).json({
            errno: 404,
            errmsg: '评论不存在'
          });
        }
        const rows = await dbManager.query(
          'SELECT likes FROM waline_comments WHERE id = ?',
          [id]
        );
        return res.json({
          errno: 0,
          errmsg: 'ok',
          data: { liked: true, likes: rows[0].likes }
        });
      } catch (error) {
        console.warn('[Waline API] POST /comment/:id/like DB 失败，降级内存:', error.message);
      }
    }

    // 内存降级
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
 * 注意：本服务从未写入用户数据，此端点恒为空（保留兼容前端）
 */
router.get('/user', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

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
    let commentCount = db.comments.size;
    let articleCount = db.counters.size;
    let storage = 'memory';

    // MySQL 存储（统计真实数据量）
    if (await dbOk()) {
      try {
        const c = await dbManager.query('SELECT COUNT(*) AS n FROM waline_comments');
        const a = await dbManager.query('SELECT COUNT(*) AS n FROM waline_article_stats');
        commentCount = c[0].n;
        articleCount = a[0].n;
        storage = 'mysql';
      } catch (error) {
        console.warn('[Waline API] GET /system DB 统计失败:', error.message);
      }
    }

    res.json({
      errno: 0,
      errmsg: 'ok',
      data: {
        version: WALINE_VERSION,
        storage,
        commentCount,
        userCount: db.users.size,
        articleCount
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
