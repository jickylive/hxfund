/**
 * 黄氏家族寻根平台 - 数据库 API 路由
 * 提供家族成员、字辈、留言等数据访问
 */

const express = require('express');
const dbManager = require('../config/db-manager');
const { loadAuthConfig } = require('../auth');

const router = express.Router();

/**
 * 管理员鉴权：只有携带服务器 API Key（X-API-Key 请求头）才能操作。
 * 普通访客拿到的 JWT 客户端 Token 不能通过这里，留言审核/删除必须是你本人。
 */
function requireServerApiKey(req, res, next) {
  const config = loadAuthConfig();
  const apiKeyHeader = req.headers['x-api-key'];
  if (!config.serverApiKey) {
    return res.status(500).json({ success: false, error: '服务器未配置管理员 API Key' });
  }
  if (!apiKeyHeader || apiKeyHeader !== config.serverApiKey) {
    return res.status(403).json({ success: false, error: '需要管理员 API Key', code: 'ADMIN_REQUIRED' });
  }
  next();
}

/**
 * 把平铺的留言拼成两层楼中楼：顶级留言带 replies 数组。
 * 回复只挂一层（回复的回复也挂到顶级留言下，@用户名保留指向），避免无限嵌套把墙面拉得太深。
 */
function buildGuestTree(rows) {
  const byId = new Map();
  const roots = [];
  rows.forEach(r => {
    r.replies = [];
    byId.set(r.id, r);
  });
  rows.forEach(r => {
    if (r.parent_id && byId.has(r.parent_id)) {
      // 回复的回复也挂到顶级留言下
      let top = byId.get(r.parent_id);
      while (top.parent_id && byId.has(top.parent_id)) top = byId.get(top.parent_id);
      top.replies.push(r);
    } else if (!r.parent_id) {
      roots.push(r);
    }
    // parent_id 指向不存在/未通过的留言时丢弃，避免孤儿回复出现在墙上
  });
  return roots;
}

// ============================================
// 健康检查
// ============================================
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    
    res.json({
      status: 'ok',
      service: 'huangshi-genealogy-api',
      timestamp: new Date().toISOString(),
      version: '3.3.0',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// 家族成员 API
// ============================================

// 获取家族树（完整）
router.get('/family-tree', async (req, res) => {
  try {
    const sql = `
      SELECT 
        id, parent_id, name, title, period, avatar, bio, location, level, sort_order
      FROM family_members
      ORDER BY level, sort_order
    `;
    
    const members = await dbManager.query(sql);
    
    // 将平铺数据转换为树形结构
    const tree = buildFamilyTree(members);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('获取家族树失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取成员详情
router.get('/family-member/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM family_members WHERE id = ?';
    const members = await dbManager.query(sql, [id]);
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        error: '成员不存在'
      });
    }
    
    res.json({
      success: true,
      data: members[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取成员的直系祖先
router.get('/family-member/:id/ancestors', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, name, title, period, level
        FROM family_members
        WHERE id = ?
        UNION ALL
        SELECT m.id, m.parent_id, m.name, m.title, m.period, m.level
        FROM family_members m
        INNER JOIN ancestors a ON m.id = a.parent_id
      )
      SELECT * FROM ancestors ORDER BY level DESC
    `;
    
    const ancestors = await dbManager.query(sql, [id]);
    
    res.json({
      success: true,
      data: ancestors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 字辈 API
// ============================================

// 获取所有字辈分支
router.get('/generation-poems', async (req, res) => {
  try {
    const sql = 'SELECT * FROM generation_poems ORDER BY branch_name';
    const poems = await dbManager.query(sql);
    
    res.json({
      success: true,
      data: poems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 计算字辈
router.get('/generation-poems/:branch/calculate', async (req, res) => {
  try {
    const { branch } = req.params;
    const { generation } = req.query;
    
    if (!generation || generation < 1) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的代数'
      });
    }
    
    const sql = 'SELECT * FROM generation_poems WHERE branch_code = ?';
    const poems = await dbManager.query(sql, [branch]);
    
    if (poems.length === 0) {
      return res.status(404).json({
        success: false,
        error: '分支不存在'
      });
    }
    
    const poem = poems[0];
    const characters = poem.characters;
    const charIndex = (parseInt(generation) - 1) % characters.length;
    const character = characters[charIndex];
    
    res.json({
      success: true,
      data: {
        branch: poem.branch_code,
        branchName: poem.branch_name,
        generation: parseInt(generation),
        character: character,
        poem: poem.poem
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 项目幻灯片 API
// ============================================

// 获取所有幻灯片
router.get('/project-slides', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM project_slides 
      WHERE is_active = 1 
      ORDER BY sort_order
    `;
    const slides = await dbManager.query(sql);
    
    res.json({
      success: true,
      data: slides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 区块链存证 API
// ============================================

// 获取所有存证记录
router.get('/blockchain-records', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM blockchain_records 
      WHERE is_verified = 1 
      ORDER BY created_at DESC
    `;
    const records = await dbManager.query(sql);
    
    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 验证存证
router.get('/blockchain-records/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM blockchain_records WHERE record_id = ?';
    const records = await dbManager.query(sql, [id]);
    
    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        error: '存证不存在'
      });
    }
    
    res.json({
      success: true,
      data: records[0],
      verified: records[0].is_verified === 1
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 留言 API
// ============================================

// 获取留言列表（分页，楼中楼：顶级留言带 replies 数组）
// 只返回已审核通过的（is_public=1 AND is_verified=1）；回复跟随顶级留言一起返回，不单独分页
router.get('/guest-messages', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Validate inputs to prevent SQL injection
    if (isNaN(limit) || isNaN(offset) || limit < 1 || limit > 100 || offset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page or limit parameters'
      });
    }

    // 先取本页顶级留言的 id（只数顶级留言，回复不占分页名额）
    const topSql = `
      SELECT id
      FROM guest_messages
      WHERE is_public = 1 AND is_verified = 1 AND parent_id IS NULL
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `;
    const topRows = await dbManager.query(topSql);
    const topIds = topRows.map(r => r.id);

    // 再取这些顶级留言及其已通过的回复
    let messages = [];
    if (topIds.length > 0) {
      const sql = `
        SELECT id, parent_id, user_name, content, location, created_at
        FROM guest_messages
        WHERE is_public = 1 AND is_verified = 1
          AND (parent_id IS NULL AND id IN (${topIds.join(',')})
               OR parent_id IN (${topIds.join(',')}))
        ORDER BY created_at ASC
      `;
      const rows = await dbManager.query(sql);
      messages = buildGuestTree(rows);
      // 顶级留言按时间倒序（回复在各自楼内按时间正序）
      messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // 获取顶级留言总数（用于分页）
    const countSql = `
      SELECT COUNT(*) as total
      FROM guest_messages
      WHERE is_public = 1 AND is_verified = 1 AND parent_id IS NULL
    `;
    const countResult = await dbManager.query(countSql);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取留言列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 提交留言（顶级留言或回复；回复时传 parent_id，指向要回复的留言 id）
// 新留言（含回复）一律先待审核（is_public=0, is_verified=0），管理员通过后才显示
router.post('/guest-messages', async (req, res) => {
  try {
    const { user_name, content, location, parent_id } = req.body;

    if (!user_name || !content) {
      return res.status(400).json({
        success: false,
        error: '姓名和内容为必填项'
      });
    }

    // 回复时校验目标留言存在（顶级或回复都可回，回复的回复挂到同一顶级楼下）
    let parentId = null;
    if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
      parentId = parseInt(parent_id, 10);
      if (isNaN(parentId)) {
        return res.status(400).json({ success: false, error: 'parent_id 必须是数字' });
      }
      const parent = await dbManager.query('SELECT id FROM guest_messages WHERE id = ?', [parentId]);
      if (!parent || parent.length === 0) {
        return res.status(400).json({ success: false, error: '要回复的留言不存在' });
      }
    }

    const sql = `
      INSERT INTO guest_messages (parent_id, user_name, content, location, is_public, is_verified)
      VALUES (?, ?, ?, ?, 0, 0)
    `;

    const result = await dbManager.query(sql, [parentId, user_name, content, location || '']);

    res.json({
      success: true,
      message: '留言已提交，待审核后显示',
      id: result.insertId,
      parent_id: parentId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 留言审核（管理员，需服务器 API Key）
// ============================================

// 列出待审核留言（顶级+回复，按时间倒序）
router.get('/guest-messages/pending', requireServerApiKey, async (req, res) => {
  try {
    const rows = await dbManager.query(`
      SELECT id, parent_id, user_name, content, location, created_at
      FROM guest_messages
      WHERE is_public = 0 OR is_verified = 0
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 通过一条留言（顶级或回复）：设为公开+已验证
router.post('/guest-messages/:id/approve', requireServerApiKey, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'id 必须是数字' });
    const result = await dbManager.query(
      'UPDATE guest_messages SET is_public = 1, is_verified = 1 WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '留言不存在' });
    }
    res.json({ success: true, message: '已通过审核', id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 驳回一条留言：直接删除（含它的回复一并删除，避免孤儿回复）
router.delete('/guest-messages/:id', requireServerApiKey, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'id 必须是数字' });
    await dbManager.query('DELETE FROM guest_messages WHERE parent_id = ?', [id]);
    const result = await dbManager.query('DELETE FROM guest_messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '留言不存在' });
    }
    res.json({ success: true, message: '已删除', id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 辅助函数
// ============================================

/**
 * 将平铺的家族成员数据转换为树形结构
 */
function buildFamilyTree(members) {
  if (!members || members.length === 0) return null;
  
  const memberMap = {};
  const rootMembers = [];
  
  // 初始化 memberMap
  members.forEach(member => {
    memberMap[member.id] = {
      ...member,
      children: []
    };
  });
  
  // 构建树形结构
  members.forEach(member => {
    const node = memberMap[member.id];
    
    if (!member.parent_id) {
      // 根节点
      rootMembers.push(node);
    } else if (memberMap[member.parent_id]) {
      // 添加到父节点的 children
      memberMap[member.parent_id].children.push(node);
    }
  });
  
  // 如果有多个根节点，创建一个虚拟根
  if (rootMembers.length > 1) {
    return {
      id: 'root',
      name: '黄氏家族',
      title: '家族树',
      children: rootMembers
    };
  }
  
  return rootMembers[0] || null;
}

module.exports = router;
