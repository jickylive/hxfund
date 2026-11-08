/**
 * 黄氏家族寻根平台 - 族谱 API 路由
 * 只读真实 MySQL 数据（2026-11-08 起不再有 mock 回退）。
 *
 * 历史原因：本文件曾在 DB 不可用或 SQL 报错时返回写死的 MOCK_* 假数据，
 * 导致生产页面长期展示假族谱/假字辈/假留言，且三条 SQL 引用了生产库不存在的列
 * （generation_poems.dynasty、project_slides.order、guest_messages.is_approved），
 * 恒抛错后被 catch 吞掉、永远走 mock——健康检查还报 200，问题完全不可见。
 * 现按 database/schema/001-010（生产库结构备份）的真实列名修正 SQL，
 * 出错一律返回 500，不再返回假数据。
 */

const express = require('express');
const router = express.Router();
const dbManager = require('../config/db-manager');
const { authenticateToken } = require('../middleware/auth');

// DB 出错时统一返回 500（不把 MySQL 原始报错 / 列名泄露给未鉴权访客），
// 详情只写服务端日志。
function dbError(res, error, context) {
  console.error(`[genealogy] ${context} error:`, error.message);
  return res.status(500).json({ success: false, error: '数据库查询失败', code: 'DB_ERROR' });
}

// ==================== 族谱成员 ====================

// 获取完整族谱树
// family_members 真实列：id / parent_id / name / title / period / level / sort_order / ...
router.get('/members/tree', async (req, res) => {
  try {
    const members = await dbManager.query('SELECT * FROM family_members ORDER BY level, sort_order');
    return res.json({ success: true, data: members, count: members.length, source: 'database' });
  } catch (error) {
    return dbError(res, error, 'GET /members/tree');
  }
});

// 获取单个成员详情
router.get('/members/:id', async (req, res) => {
  try {
    const rows = await dbManager.query('SELECT * FROM family_members WHERE id = ?', [req.params.id]);
    const member = rows[0] || null;
    if (!member) return res.status(404).json({ success: false, error: '成员不存在', code: 'MEMBER_NOT_FOUND' });
    return res.json({ success: true, data: member });
  } catch (error) {
    return dbError(res, error, 'GET /members/:id');
  }
});

// 获取子成员列表
router.get('/members/:parentId/children', async (req, res) => {
  try {
    const children = await dbManager.query('SELECT * FROM family_members WHERE parent_id = ? ORDER BY sort_order', [req.params.parentId]);
    return res.json({ success: true, data: children, parentId: req.params.parentId, count: children.length });
  } catch (error) {
    return dbError(res, error, 'GET /members/:parentId/children');
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
// 修正：generation_poems 表无 dynasty 列（真实列：branch_code / branch_name / poem / characters），
// 原 ORDER BY dynasty 恒抛错、恒走 mock；现按 branch_code 排序。
router.get('/poems', async (req, res) => {
  try {
    const poems = await dbManager.query('SELECT * FROM generation_poems ORDER BY branch_code');
    return res.json({ success: true, data: poems, count: poems.length });
  } catch (error) {
    return dbError(res, error, 'GET /poems');
  }
});

// 新增字辈诗：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/poems', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '字辈诗创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 项目幻灯片 ====================

// 获取幻灯片
// 修正：project_slides 表无 order 列，真实排序列是 sort_order（另有 is_active 开关，
// 只返回已启用的）；原 ORDER BY `order` 恒抛错、恒走 mock。
router.get('/slides', async (req, res) => {
  try {
    const slides = await dbManager.query('SELECT * FROM project_slides WHERE is_active = 1 ORDER BY sort_order');
    return res.json({ success: true, data: slides, count: slides.length });
  } catch (error) {
    return dbError(res, error, 'GET /slides');
  }
});

// 新增幻灯片：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/slides', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '幻灯片创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 留言板 ====================

// 获取留言
// 修正：guest_messages 表无 is_approved 列，真实状态列是 is_public（公开显示）
// 与 is_verified（已审核）；与 server/routes/database.js 的公开留言口径一致，
// 只返回已审核通过的（is_public=1 AND is_verified=1）。
router.get('/messages', async (req, res) => {
  try {
    const messages = await dbManager.query('SELECT * FROM guest_messages WHERE is_public = 1 AND is_verified = 1 ORDER BY created_at DESC LIMIT 50');
    return res.json({ success: true, data: messages, count: messages.length });
  } catch (error) {
    return dbError(res, error, 'GET /messages');
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
    const records = await dbManager.query('SELECT * FROM blockchain_records ORDER BY created_at DESC LIMIT 20');
    return res.json({ success: true, data: records, count: records.length });
  } catch (error) {
    return dbError(res, error, 'GET /blockchain');
  }
});

// 新增区块链记录：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.post('/blockchain', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '区块链存证创建未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 系统配置 ====================

// 获取系统配置
// 此前是漏网的假端点：不查库直接返回 { key, value: 'default' }。
// 现查真实 system_config 表，只返回标记为公开（is_public=1）的配置；
// 不存在或不公开返回 404，DB 异常返回 500。
router.get('/config/:key', async (req, res) => {
  try {
    const rows = await dbManager.query(
      'SELECT config_key, config_value, config_type FROM system_config WHERE config_key = ? AND is_public = 1',
      [req.params.key]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: '配置不存在或不公开', code: 'CONFIG_NOT_FOUND' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return dbError(res, error, 'GET /config/:key');
  }
});

// 更新系统配置：写接口未实现（501），此前返回假成功（模拟数据，不落库）
router.put('/config/:key', authenticateToken(), (req, res) => {
  res.status(501).json({ success: false, error: '系统配置更新未实现（写接口待重新实现）', code: 'NOT_IMPLEMENTED' });
});

// ==================== 健康检查 ====================

// DB 正常返回 200，DB 不可用返回 503（此前无论 DB 状态都返回 200 + mock，探针形同虚设）。
router.get('/health', async (req, res) => {
  try {
    await dbManager.query('SELECT 1');
    return res.json({ success: true, database: 'connected' });
  } catch (error) {
    console.error('[genealogy] GET /health error:', error.message);
    return res.status(503).json({ success: false, database: 'disconnected', error: '数据库不可用' });
  }
});

module.exports = router;
