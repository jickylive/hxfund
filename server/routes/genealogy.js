/**
 * 黄氏家族寻根平台 - 族谱 API 路由
 * 支持 MySQL（生产）和 Mock 数据（本地开发）
 */

const express = require('express');
const router = express.Router();
const dbManager = require('../config/db-manager');
const { authenticateToken } = require('../middleware/auth');

// ==================== Mock 数据 ====================

const MOCK_MEMBERS = [
  { id: 1, name: '黄庆交', generation: '庆字辈', parent_id: null, level: 1, sort_order: 1, birth_year: 1930, status: '已确认' },
  { id: 2, name: '黄志强', generation: '志字辈', parent_id: 1, level: 2, sort_order: 1, birth_year: 1955, status: '已确认' },
  { id: 3, name: '黄志明', generation: '志字辈', parent_id: 1, level: 2, sort_order: 2, birth_year: 1958, status: '已确认' },
  { id: 4, name: '黄伟', generation: '伟字辈', parent_id: 2, level: 3, sort_order: 1, birth_year: 1980, status: '已确认' },
  { id: 5, name: '黄芳', generation: '伟字辈', parent_id: 2, level: 3, sort_order: 2, birth_year: 1983, status: '已确认' },
];

const MOCK_POEMS = [
  { id: 1, generation_range: '1-20', poem: '庆志伟业传家远，诗书礼乐继世长', dynasty: '清代', region: '福建漳州' },
  { id: 2, generation_range: '21-40', poem: '明德惟馨光祖德，修身齐家治国平', dynasty: '民国', region: '福建漳州' },
];

const MOCK_SLIDES = [
  { id: 1, title: '黄氏家族起源', content: '黄姓源于嬴姓，始祖为黄飞虎', order: 1, image_url: '/images/slide1.jpg' },
  { id: 2, title: '家族迁徙历史', content: '从河南固始南迁至福建漳州', order: 2, image_url: '/images/slide2.jpg' },
];

const MOCK_MESSAGES = [
  { id: 1, name: '黄先生', email: 'huang@example.com', content: '希望早日找到失散的亲人！', avatar: '😊', is_approved: 1, created_at: '2024-01-15 10:30:00' },
  { id: 2, name: '黄女士', email: 'huang2@example.com', content: '感谢平台提供寻根服务', avatar: '🌸', is_approved: 1, created_at: '2024-01-14 09:15:00' },
];

const MOCK_BLOCKCHAIN = [
  { id: 1, data_hash: '0x1a2b3c...', record_type: 'family_tree', record_id: 1, tx_hash: '0xabc...', created_at: '2024-01-10 12:00:00' },
];

// 检查数据库是否可用
async function checkDbAvailable() {
  try {
    await dbManager.query('SELECT 1');
    return true;
  } catch (e) {
    return false;
  }
}

// ==================== 族谱成员 ====================

// 获取完整族谱树
router.get('/members/tree', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const members = await dbManager.query('SELECT * FROM family_members ORDER BY level, sort_order');
      return res.json({ success: true, data: members, count: members.length, source: 'database' });
    }
    res.json({ success: true, data: MOCK_MEMBERS, count: MOCK_MEMBERS.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_MEMBERS, count: MOCK_MEMBERS.length, source: 'mock', warning: '数据库异常，使用模拟数据' });
  }
});

// 获取单个成员详情
router.get('/members/:id', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const rows = await dbManager.query('SELECT * FROM family_members WHERE id = ?', [req.params.id]);
      const member = rows[0] || null;
      if (!member) return res.status(404).json({ success: false, error: '成员不存在', code: 'MEMBER_NOT_FOUND' });
      return res.json({ success: true, data: member });
    }
    const member = MOCK_MEMBERS.find(m => m.id === parseInt(req.params.id)) || null;
    if (!member) return res.status(404).json({ success: false, error: '成员不存在（模拟数据中无此ID）', code: 'MEMBER_NOT_FOUND' });
    res.json({ success: true, data: member, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_MEMBERS[0], source: 'mock', warning: '数据库异常' });
  }
});

// 获取子成员列表
router.get('/members/:parentId/children', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const children = await dbManager.query('SELECT * FROM family_members WHERE parent_id = ? ORDER BY sort_order', [req.params.parentId]);
      return res.json({ success: true, data: children, parentId: req.params.parentId, count: children.length });
    }
    const children = MOCK_MEMBERS.filter(m => m.parent_id === parseInt(req.params.parentId));
    res.json({ success: true, data: children, parentId: req.params.parentId, count: children.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: [], parentId: req.params.parentId, count: 0, source: 'mock' });
  }
});

// 新增成员：写接口未实现（501）
// 旧 INSERT 的字段（generation/birth_year/status）在生产 family_members 表中不存在，
// 对真实库必然报错；DB 异常时又返回假成功——两种行为都误导调用方。
// 写 API 待按现行表结构重新实现，当前仅提供读接口。
router.post('/members', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '成员创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// 更新成员：写接口未实现（501），此前不写库直接返回成功（假成功）
router.put('/members/:id', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '成员更新未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// 删除成员：写接口未实现（501），此前不删库直接返回成功（假成功）
router.delete('/members/:id', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '成员删除未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 字辈诗 ====================

// 获取字辈诗
router.get('/poems', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const poems = await dbManager.query('SELECT * FROM generation_poems ORDER BY dynasty');
      return res.json({ success: true, data: poems, count: poems.length });
    }
    res.json({ success: true, data: MOCK_POEMS, count: MOCK_POEMS.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_POEMS, count: MOCK_POEMS.length, source: 'mock' });
  }
});

// 新增字辈诗：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/poems', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '字辈诗创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 项目幻灯片 ====================

// 获取幻灯片
router.get('/slides', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const slides = await dbManager.query('SELECT * FROM project_slides ORDER BY `order`');
      return res.json({ success: true, data: slides, count: slides.length });
    }
    res.json({ success: true, data: MOCK_SLIDES, count: MOCK_SLIDES.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_SLIDES, count: MOCK_SLIDES.length, source: 'mock' });
  }
});

// 新增幻灯片：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/slides', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '幻灯片创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 留言板 ====================

// 获取留言
router.get('/messages', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const messages = await dbManager.query('SELECT * FROM guest_messages WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 50');
      return res.json({ success: true, data: messages, count: messages.length });
    }
    res.json({ success: true, data: MOCK_MESSAGES, count: MOCK_MESSAGES.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_MESSAGES, count: MOCK_MESSAGES.length, source: 'mock' });
  }
});

// 提交留言：写接口未实现（501）
// 旧 INSERT 的字段（name/email/avatar/is_approved）在生产 guest_messages 表中不存在
// （现行表为 user_name/location/is_public/is_verified），对真实库必然报错。
// 留言墙写入口是 POST /api/db/guest-messages（带待审核流程）。
router.post('/messages', (req, res) => {
  res.status(501).json({
    success: false,
    error: '留言提交未实现，请使用 POST /api/db/guest-messages',
    code: 'NOT_IMPLEMENTED'
  });
});

// ==================== 区块链存证 ====================

// 获取区块链记录
router.get('/blockchain', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      const records = await dbManager.query('SELECT * FROM blockchain_records ORDER BY created_at DESC LIMIT 20');
      return res.json({ success: true, data: records, count: records.length });
    }
    res.json({ success: true, data: MOCK_BLOCKCHAIN, count: MOCK_BLOCKCHAIN.length, source: 'mock' });
  } catch (error) {
    res.json({ success: true, data: MOCK_BLOCKCHAIN, count: MOCK_BLOCKCHAIN.length, source: 'mock' });
  }
});

// 新增区块链记录：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/blockchain', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '区块链存证创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 系统配置 ====================

// 获取系统配置
router.get('/config/:key', async (req, res) => {
  try {
    res.json({ success: true, data: { key: req.params.key, value: 'default' }, source: 'mock' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新系统配置：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.put('/config/:key', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '系统配置更新未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 健康检查 ====================

router.get('/health', async (req, res) => {
  try {
    const dbOk = await checkDbAvailable();
    if (dbOk) {
      return res.json({ success: true, database: 'connected', source: 'database' });
    }
    res.json({ success: true, database: 'mock', source: 'mock', message: '本地模拟模式' });
  } catch (error) {
    res.json({ success: true, database: 'mock', source: 'mock', message: '本地模拟模式（数据库异常）' });
  }
});

module.exports = router;
