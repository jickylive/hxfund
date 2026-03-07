/**
 * 黄氏家族寻根平台 - 请求验证中间件
 */

export function validateRequest(requiredFields = []) {
  return (req, res, next) => {
    // 验证必需字段
    for (const field of requiredFields) {
      if (!(field in req.body)) {
        return res.status(400).json({
          success: false,
          error: `缺少必需字段: ${field}`,
          code: 'MISSING_FIELD'
        });
      }
    }

    // 验证字段类型
    if (req.body.prompt && typeof req.body.prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'prompt 必须是字符串',
        code: 'INVALID_TYPE'
      });
    }

    if (req.body.message && typeof req.body.message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'message 必须是字符串',
        code: 'INVALID_TYPE'
      });
    }

    if (req.body.model && typeof req.body.model !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'model 必须是字符串',
        code: 'INVALID_TYPE'
      });
    }

    if (req.body.temperature !== undefined && typeof req.body.temperature !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'temperature 必须是数字',
        code: 'INVALID_TYPE'
      });
    }

    next();
  };
}