/**
 * 黄氏家族寻根平台 - 族谱 API 路由
 * 使用现有的 db-manager.js 连接数据库
 */

const express = require('express');
const router = express.Router();
const dbManager = require('../config/db-manager');
const { authenticateToken } = require('../middleware/auth');

// ==================== 族谱成员 ====================

// 获取完整族谱树
router.get('/members/tree', async (req, res) => {
  try {
    const members = await dbManager.query('SELECT * FROM family_members ORDER BY level, sort_order');
    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取成员树失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取族谱数据失败',
      code: 'TREE_FETCH_ERROR'
    });
  }
});

// 获取单个成员详情
router.get('/members/:id', async (req, res) => {
  try {
    const rows = await dbManager.query('SELECT * FROM family_members WHERE id = ?', [req.params.id]);
    const member = rows[0] || null;
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: '成员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取成员详情失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取成员详情失败',
      code: 'MEMBER_FETCH_ERROR'
    });
  }
});

// 获取子成员列表
router.get('/members/:parentId/children', async (req, res) => {
  try {
    const children = await dbManager.query(
      'SELECT * FROM family_members WHERE parent_id = ? ORDER BY sort_order',
      [req.params.parentId]
    );
    res.json({
      success: true,
      data: children,
      parentId: req.params.parentId,
      count: children.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取子成员失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取子成员失败',
      code: 'CHILDREN_FETCH_ERROR'
    });
  }
});

// 添加成员 (需要认证)
router.post('/members', authenticateToken(), async (req, res) => {
  try {
    const { id, parent_id, name, title, period, avatar, bio, location, level, sort_order } = req.body;
    
    if (!id || !name || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: id, name, title',
        code: 'MISSING_FIELDS'
      });
    }

    await dbManager.query(
      'INSERT INTO family_members (id, parent_id, name, title, period, avatar, bio, location, level, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, parent_id, name, title, period, avatar, bio, location, level || 0, sort_order || 0]
    );

    winston.info(`族谱成员添加成功: ${title} (ID: ${id})`);
    res.status(201).json({
      success: true,
      data: { id, parent_id, name, title, period, avatar, bio, location, level, sort_order },
      message: '成员添加成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 添加成员失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '添加成员失败',
      code: 'MEMBER_ADD_ERROR'
    });
  }
});

// 更新成员 (需要认证)
router.put('/members/:id', authenticateToken(), async (req, res) => {
  try {
    const existing = await dbManager.query('SELECT * FROM family_members WHERE id = ?', [req.params.id]);
    if (!existing[0]) {
      return res.status(404).json({
        success: false,
        error: '成员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const { name, title, period, avatar, bio, location, sort_order } = req.body;
    await dbManager.query(
      'UPDATE family_members SET name=?, title=?, period=?, avatar=?, bio=?, location=?, sort_order=? WHERE id=?',
      [name, title, period, avatar, bio, location, sort_order, req.params.id]
    );

    res.json({
      success: true,
      data: { id: req.params.id, ...req.body },
      message: '成员更新成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 更新成员失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '更新成员失败',
      code: 'MEMBER_UPDATE_ERROR'
    });
  }
});

// 删除成员 (需要认证)
router.delete('/members/:id', authenticateToken(), async (req, res) => {
  try {
    const result = await dbManager.query('DELETE FROM family_members WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: '成员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }
    res.json({
      success: true,
      message: '成员删除成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 删除成员失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '删除成员失败',
      code: 'MEMBER_DELETE_ERROR'
    });
  }
});

// ==================== 字辈诗 ====================

// 获取所有字辈诗
router.get('/poems', async (req, res) => {
  try {
    const poems = await dbManager.query('SELECT * FROM generation_poems ORDER BY id');
    res.json({
      success: true,
      data: poems,
      count: poems.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取字辈诗失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取字辈诗失败',
      code: 'POEMS_FETCH_ERROR'
    });
  }
});

// 添加字辈诗 (需要认证)
router.post('/poems', authenticateToken(), async (req, res) => {
  try {
    const { branch_code, branch_name, poem: poemText, characters } = req.body;
    
    if (!branch_code || !branch_name || !poemText || !characters) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: branch_code, branch_name, poem, characters',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await dbManager.query(
      'INSERT INTO generation_poems (branch_code, branch_name, poem, characters) VALUES (?, ?, ?, ?)',
      [branch_code, branch_name, poemText, characters]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body },
      message: '字辈诗添加成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 添加字辈诗失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '添加字辈诗失败',
      code: 'POEM_ADD_ERROR'
    });
  }
});

// ==================== 项目愿景幻灯片 ====================

// 获取所有幻灯片
router.get('/slides', async (req, res) => {
  try {
    const slides = await dbManager.query(
      'SELECT * FROM project_slides WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json({
      success: true,
      data: slides,
      count: slides.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取幻灯片失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取幻灯片失败',
      code: 'SLIDES_FETCH_ERROR'
    });
  }
});

// 添加幻灯片 (需要认证)
router.post('/slides', authenticateToken(), async (req, res) => {
  try {
    const { title, subtitle, content, icon, color, tags, sort_order, is_active } = req.body;
    const result = await dbManager.query(
      'INSERT INTO project_slides (title, subtitle, content, icon, color, tags, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, subtitle, content, icon, color, JSON.stringify(tags || []), sort_order || 0, is_active !== undefined ? is_active : 1]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body },
      message: '幻灯片添加成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 添加幻灯片失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '添加幻灯片失败',
      code: 'SLIDE_ADD_ERROR'
    });
  }
});

// ==================== 留言簿 ====================

// 获取已审批留言
router.get('/messages', async (req, res) => {
  try {
    const messages = await dbManager.query(
      'SELECT * FROM guest_messages WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 50'
    );
    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取留言失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取留言失败',
      code: 'MESSAGES_FETCH_ERROR'
    });
  }
});

// 提交留言
router.post('/messages', async (req, res) => {
  try {
    const { name, email, content, avatar } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: name, content',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await dbManager.query(
      'INSERT INTO guest_messages (name, email, content, avatar, is_approved) VALUES (?, ?, ?, ?, 0)',
      [name, email, content, avatar || '😊']
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body },
      message: '留言提交成功，待审核'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 提交留言失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '提交留言失败',
      code: 'MESSAGE_SUBMIT_ERROR'
    });
  }
});

// ==================== 区块链记录 ====================

// 获取区块链记录
router.get('/blockchain', async (req, res) => {
  try {
    const records = await dbManager.query(
      'SELECT * FROM blockchain_records ORDER BY created_at DESC LIMIT 20'
    );
    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取区块链记录失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取区块链记录失败',
      code: 'BLOCKCHAIN_FETCH_ERROR'
    });
  }
});

// 添加区块链记录 (需要认证)
router.post('/blockchain', authenticateToken(), async (req, res) => {
  try {
    const { title, description, tx_hash, block_number, content_type, content_id } = req.body;
    
    if (!title || !tx_hash) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段: title, tx_hash',
        code: 'MISSING_FIELDS'
      });
    }

    const result = await dbManager.query(
      'INSERT INTO blockchain_records (title, description, tx_hash, block_number, content_type, content_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, tx_hash, block_number, content_type, content_id]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.insertId, ...req.body },
      message: '区块链记录添加成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 添加区块链记录失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '添加区块链记录失败',
      code: 'BLOCKCHAIN_ADD_ERROR'
    });
  }
});

// ==================== AI 对话 ====================

// 获取用户对话列表
router.get('/conversations/:userId', authenticateToken(), async (req, res) => {
  try {
    const conversations = await dbManager.query(
      'SELECT id, model, created_at, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [req.params.userId]
    );
    res.json({
      success: true,
      data: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取对话列表失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取对话列表失败',
      code: 'CONVERSATIONS_FETCH_ERROR'
    });
  }
});

// 获取对话内容
router.get('/conversation/:conversationId', authenticateToken(), async (req, res) => {
  try {
    const messages = await dbManager.query(
      'SELECT * FROM ai_conversations WHERE id = ? ORDER BY created_at ASC',
      [req.params.conversationId]
    );
    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取对话内容失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取对话内容失败',
      code: 'CONVERSATION_FETCH_ERROR'
    });
  }
});

// ==================== 系统配置 ====================

// 获取系统配置
router.get('/config/:key', async (req, res) => {
  try {
    const rows = await dbManager.query(
      'SELECT * FROM system_config WHERE config_key = ?',
      [req.params.key]
    );
    res.json({
      success: true,
      data: rows[0] || null
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 获取系统配置失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取系统配置失败',
      code: 'CONFIG_FETCH_ERROR'
    });
  }
});

// 更新系统配置 (需要认证)
router.put('/config/:key', authenticateToken(), async (req, res) => {
  try {
    const value = req.body.value;
    const description = req.body.description || '';
    
    await dbManager.query(
      'INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?, description = ?',
      [req.params.key, JSON.stringify(value), description, value, description]
    );
    res.json({
      success: true,
      message: '系统配置更新成功'
    });
  } catch (error) {
    console.error(`[族谱 API 错误] 更新系统配置失败: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '更新系统配置失败',
      code: 'CONFIG_UPDATE_ERROR'
    });
  }
});

// 健康检查
router.get('/health', async (req, res) => {
  try {
    await dbManager.query('SELECT 1 as test');
    res.json({
      success: true,
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
