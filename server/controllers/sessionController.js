/**
 * 会话控制器
 * 处理所有会话相关的HTTP请求
 */

const sessionService = require('../services/sessionService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * 会话控制器
 */
const sessionController = {
  /**
   * 获取会话
   * GET /api/session/:sessionId
   */
  getSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    logger.info('获取会话请求', { sessionId });

    const session = await sessionService.getSession(sessionId);

    res.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        messageCount: session.messages.length,
        messages: session.messages
      }
    });
  }),

  /**
   * 删除会话
   * DELETE /api/session/:sessionId
   */
  deleteSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    logger.info('删除会话请求', { sessionId });

    await sessionService.deleteSession(sessionId);

    res.json({ 
      success: true, 
      message: '会话已删除' 
    });
  }),

  /**
   * 获取所有会话
   * GET /api/sessions
   */
  getAllSessions: asyncHandler(async (req, res) => {
    logger.info('获取所有会话请求');

    const sessions = await sessionService.getAllSessions();

    res.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        messageCount: session.messages.length
      })),
      count: sessions.length
    });
  }),

  /**
   * 获取会话统计
   * GET /api/sessions/stats
   */
  getStats: asyncHandler(async (req, res) => {
    logger.info('获取会话统计请求');

    const stats = await sessionService.getStats();

    res.json({
      success: true,
      stats
    });
  }),

  /**
   * 清理过期会话
   * POST /api/sessions/cleanup
   */
  cleanup: asyncHandler(async (req, res) => {
    const { maxAge } = req.body;

    logger.info('清理过期会话请求', { maxAge });

    const cleanedCount = await sessionService.cleanupExpiredSessions(maxAge);

    res.json({
      success: true,
      message: `已清理 ${cleanedCount} 个过期会话`,
      cleanedCount
    });
  }),

  /**
   * 添加消息到会话
   * POST /api/session/:sessionId/message
   */
  addMessage: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { role, content } = req.body;

    logger.info('添加消息到会话请求', { sessionId, role });

    const session = await sessionService.addMessage(sessionId, role, content);

    res.json({
      success: true,
      session: {
        id: session.id,
        messageCount: session.messages.length
      }
    });
  })
};

module.exports = sessionController;
