/**
 * 黄氏家族寻根平台 - 数据库 API 路由
 * 提供家族成员、字辈、留言等数据访问
 */

const express = require('express');
const dbManager = require('../config/db-manager');

const router = express.Router();

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

// 获取留言列表（分页）
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

    const sql = `
      SELECT id, user_name, content, location, created_at
      FROM guest_messages
      WHERE is_public = 1 AND is_verified = 1
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `;

    const messages = await dbManager.query(sql);

    // 获取总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM guest_messages
      WHERE is_public = 1 AND is_verified = 1
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

// 提交留言
router.post('/guest-messages', async (req, res) => {
  try {
    const { user_name, content, location } = req.body;
    
    if (!user_name || !content) {
      return res.status(400).json({
        success: false,
        error: '姓名和内容为必填项'
      });
    }
    
    const sql = `
      INSERT INTO guest_messages (user_name, content, location, is_public, is_verified)
      VALUES (?, ?, ?, 0, 0)
    `;
    
    const result = await dbManager.query(sql, [user_name, content, location || '']);
    
    res.json({
      success: true,
      message: '留言已提交，待审核后显示',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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
