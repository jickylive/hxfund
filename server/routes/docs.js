/**
 * 黄氏家族寻根平台 - API 文档页面
 *
 * 从 index.js 的内联 HTML 提取而来（/api/docs），
 * 使主入口文件只保留装配逻辑。
 */

const { loadAuthConfig } = require('../auth');

/**
 * 渲染 API 文档 HTML
 * @param {number|string} port - 服务端口（用于示例 URL）
 */
function renderDocs(port) {
  const authConfig = loadAuthConfig();

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>黄氏家族寻根平台 - API 文档</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a73e8; }
    h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h3 { color: #555; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .endpoint { background: #e8f4fd; padding: 10px 15px; border-radius: 5px; margin: 10px 0; }
    .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .delete { background: #f93e3e; color: white; }
    .put { background: #fca130; color: white; }
    .param { margin: 5px 0; }
    .param-name { font-family: monospace; color: #1a73e8; }
    .param-type { color: #999; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .auth-warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .auth-info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
    .waline-info { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📚 黄氏家族寻根平台 - API 文档</h1>
  <p>基于阿里云百炼 Coding Plan 套餐 | 版本 3.2.0 (CLI Unified + Auth + Waline)</p>

  <div class="auth-warning">
    <strong>🔐 安全认证说明：</strong>
    <p>自 v3.1.0 起，所有 API 端点（除 /api/health、/api/docs、/api/models 外）均需认证。</p>
    <p>请使用 <code>X-API-Key</code> 请求头或 <code>Authorization: Bearer &lt;token&gt;</code> 进行认证。</p>
  </div>

  <div class="waline-info">
    <strong>💬 Waline 评论系统：</strong>
    <p>Waline 评论 API 已集成，兼容 Waline 前端调用规范。</p>
    <p>博客评论数据通过 <code>/api/waline</code> 路径访问。</p>
  </div>

  <h2>快速开始</h2>
  <h3>1. 获取 API Key</h3>
  <p>首次使用时，请查看服务器配置目录：<code>server/config/auth.json</code></p>
  <pre>cat server/config/auth.json</pre>

  <h3>2. 获取访问 Token（可选）</h3>
  <pre>curl -X POST http://localhost:${port}/api/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey": "hs_xxxxx..."}'</pre>

  <h3>3. 调用 API</h3>
  <pre>// 使用 API Key
curl -X POST http://localhost:${port}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: hs_xxxxx..." \\
  -d '{"prompt": "黄姓的起源是什么？"}'

// 使用 Token
curl -X POST http://localhost:${port}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer &lt;token&gt;" \\
  -d '{"prompt": "黄姓的起源是什么？"}'</pre>

  <h2>API 端点</h2>

  <div class="endpoint">
    <span class="method post">POST</span>
    <code>/api/auth/token</code>
  </div>
  <p>获取访问 Token（24 小时有效）</p>
  <h3>请求参数</h3>
  <table>
    <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
    <tr><td><span class="param-name">apiKey</span></td><td><span class="param-type">string</span></td><td>是</td><td>服务器 API Key</td></tr>
  </table>

  <div class="endpoint">
    <span class="method get">GET</span>
    <code>/api/auth/status</code>
  </div>
  <p>获取认证状态和速率限制信息</p>

  <div class="endpoint">
    <span class="method post">POST</span>
    <code>/api/chat</code>
  </div>
  <p>单次对话请求（需要认证）</p>
  <h3>请求头</h3>
  <table>
    <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
    <tr><td><span class="param-name">X-API-Key</span></td><td><span class="param-type">string</span></td><td>或</td><td>API Key</td></tr>
    <tr><td><span class="param-name">Authorization</span></td><td><span class="param-type">string</span></td><td>或</td><td>Bearer Token</td></tr>
  </table>
  <h3>请求参数</h3>
  <table>
    <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
    <tr><td><span class="param-name">prompt</span></td><td><span class="param-type">string</span></td><td>是</td><td>用户问题</td></tr>
    <tr><td><span class="param-name">model</span></td><td><span class="param-type">string</span></td><td>否</td><td>模型 ID，默认 deepseek-ai/DeepSeek-V4-Flash</td></tr>
    <tr><td><span class="param-name">temperature</span></td><td><span class="param-type">number</span></td><td>否</td><td>温度 (0-2)，默认 0.7</td></tr>
  </table>

  <div class="endpoint">
    <span class="method post">POST</span>
    <code>/api/conversation</code>
  </div>
  <p>多轮对话（带会话历史）（需要认证）</p>
  <h3>请求头</h3>
  <table>
    <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
    <tr><td><span class="param-name">X-API-Key</span></td><td><span class="param-type">string</span></td><td>或</td><td>API Key</td></tr>
    <tr><td><span class="param-name">Authorization</span></td><td><span class="param-type">string</span></td><td>或</td><td>Bearer Token</td></tr>
  </table>
  <h3>请求参数</h3>
  <table>
    <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr>
    <tr><td><span class="param-name">message</span></td><td><span class="param-type">string</span></td><td>是</td><td>用户消息</td></tr>
    <tr><td><span class="param-name">sessionId</span></td><td><span class="param-type">string</span></td><td>否</td><td>会话 ID，自动生成</td></tr>
    <tr><td><span class="param-name">model</span></td><td><span class="param-type">string</span></td><td>否</td><td>模型 ID</td></tr>
    <tr><td><span class="param-name">temperature</span></td><td><span class="param-type">number</span></td><td>否</td><td>温度 (0-2)</td></tr>
  </table>

  <div class="endpoint">
    <span class="method post">POST</span>
    <code>/api/chat/stream</code>
  </div>
  <p>流式响应（Server-Sent Events）（需要认证）</p>

  <div class="endpoint">
    <span class="method get">GET</span>
    <code>/api/session/:sessionId</code>
  </div>
  <p>获取会话历史（需要认证）</p>

  <div class="endpoint">
    <span class="method delete">DELETE</span>
    <code>/api/session/:sessionId</code>
  </div>
  <p>删除会话（需要认证）</p>

  <div class="endpoint">
    <span class="method get">GET</span>
    <code>/api/models</code>
  </div>
  <p>获取支持的模型列表（无需认证）</p>

  <div class="endpoint">
    <span class="method get">GET</span>
    <code>/api/health</code>
  </div>
  <p>健康检查（无需认证）</p>

  <h2>错误码</h2>
  <table>
    <tr><th>错误码</th><th>说明</th></tr>
    <tr><td>MISSING_AUTH</td><td>缺少认证信息</td></tr>
    <tr><td>INVALID_API_KEY</td><td>无效的 API Key</td></tr>
    <tr><td>INVALID_TOKEN</td><td>无效的 Token</td></tr>
    <tr><td>TOKEN_EXPIRED</td><td>Token 已过期</td></tr>
    <tr><td>INVALID_SIGNATURE</td><td>请求签名无效</td></tr>
    <tr><td>RATE_LIMIT_EXCEEDED</td><td>请求过于频繁</td></tr>
    <tr><td>INVALID_PROMPT</td><td>prompt 为空</td></tr>
    <tr><td>CLI_ERROR</td><td>CLI 调用失败</td></tr>
  </table>

  <h2>速率限制</h2>
  <div class="auth-info">
    <strong>📊 限制说明：</strong>
    <ul>
      <li>普通接口：每分钟最多 ${authConfig.rateLimit.maxRequests} 次请求</li>
      <li>聊天接口（/api/chat, /api/conversation）：每分钟最多 ${authConfig.rateLimit.maxChatRequests} 次请求</li>
      <li>窗口期：${authConfig.rateLimit.windowMs / 1000} 秒</li>
    </ul>
  </div>

  <h2>前端调用示例</h2>
  <pre>
// 方式 1：使用 API Key
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'hs_xxxxx...'
  },
  body: JSON.stringify({ prompt: '黄姓的起源是什么？' })
});
const data = await response.json();
console.log(data.response);

// 方式 2：使用 Token（推荐）
// 先获取 Token
const tokenRes = await fetch('/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'hs_xxxxx...' })
});
const { token } = await tokenRes.json();

// 使用 Token 调用 API
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ prompt: '黄姓的起源是什么？' })
});
const data = await response.json();
console.log(data.response);

// 多轮对话
let sessionId = null;
async function chat(message) {
  const response = await fetch('/api/conversation', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      message,
      sessionId // 首次为 null，后续传入返回的 sessionId
    })
  });
  const data = await response.json();
  sessionId = data.sessionId;
  return data.response;
}
  </pre>
</body>
</html>
  `;
}

module.exports = { renderDocs };
