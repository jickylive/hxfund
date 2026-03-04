/**
 * 黄氏家族寻根平台 - AI 对话功能测试脚本
 * 
 * 测试前端发起对话的完整流程（支持认证）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 加载 API Key
function loadApiKey() {
  const authConfigPath = path.join(__dirname, '..' , 'server', 'config', 'auth.json');
  try {
    if (fs.existsSync(authConfigPath)) {
      const config = JSON.parse(fs.readFileSync(authConfigPath, 'utf-8'));
      return config.serverApiKey;
    }
  } catch (error) {
    console.error('读取认证配置失败:', error.message);
  }
  return null;
}

// HTTP 请求封装
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 测试主函数
async function runTests() {
  log(colors.cyan, '\n╔═══════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║     黄氏家族寻根平台 - AI 对话功能测试                      ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  let authToken = null;

  // 加载 API Key 并获取 Token
  log(colors.blue, '【准备】加载认证信息...');
  const apiKey = loadApiKey();
  if (apiKey) {
    try {
      const tokenRes = await request('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { apiKey }
      });
      if (tokenRes.data.success) {
        authToken = tokenRes.data.token;
        log(colors.green, '✓ 认证 Token 获取成功\n');
      }
    } catch (error) {
      log(colors.yellow, '⚠️  Token 获取失败，部分测试可能跳过\n');
    }
  } else {
    log(colors.yellow, '⚠️  API Key 未找到，部分测试可能跳过\n');
  }

  // 测试 1: 健康检查
  log(colors.blue, '【测试 1】健康检查 API...');
  try {
    const res = await request('/api/health');
    if (res.status === 200 && res.data.status === 'ok') {
      log(colors.green, '✓ 健康检查通过');
      log(colors.yellow, `  服务版本：${res.data.version}`);
      log(colors.yellow, `  CLI 配置：${res.data.config.cliConfigured ? '已配置' : '未配置'}`);
      log(colors.yellow, `  默认模型：${res.data.config.model}`);
      passed++;
    } else {
      log(colors.red, `✗ 健康检查失败：${JSON.stringify(res.data)}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `✗ 健康检查失败：${error.message}`);
    log(colors.red, '  提示：请先启动服务器 npm start');
    failed++;
    // 如果健康检查失败，后续测试可能也会失败
    log(colors.yellow, '\n⚠️  服务器未运行，终止测试\n');
    return;
  }

  // 测试 2: 获取模型列表
  log(colors.blue, '\n【测试 2】获取模型列表 API...');
  try {
    const res = await request('/api/models');
    if (res.status === 200 && res.data.success) {
      log(colors.green, '✓ 模型列表获取成功');
      log(colors.yellow, `  支持 ${res.data.models.length} 个模型:`);
      res.data.models.forEach(m => {
        const defaultMark = m.default ? ' [默认]' : '';
        log(colors.yellow, `    - ${m.id}${defaultMark}`);
      });
      passed++;
    } else {
      log(colors.red, `✗ 模型列表获取失败：${JSON.stringify(res.data)}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `✗ 模型列表获取失败：${error.message}`);
    failed++;
  }

  // 测试 3: 单次对话 (简单问题)
  log(colors.blue, '\n【测试 3】单次对话 API (简单问题)...');
  try {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: { prompt: '黄姓的起源是什么？请用 50 字以内回答', model: 'qwen3.5-plus' }
    });
    if (res.status === 200 && res.data.success) {
      log(colors.green, '✓ 单次对话成功');
      log(colors.yellow, `  响应时间：${res.data.responseTime}ms`);
      log(colors.yellow, `  Token 用量：${res.data.usage?.total_tokens || 0}`);
      log(colors.yellow, `  AI 回复：${res.data.response.substring(0, 100)}...`);
      passed++;
    } else {
      log(colors.red, `✗ 单次对话失败：${JSON.stringify(res.data)}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `✗ 单次对话失败：${error.message}`);
    failed++;
  }

  // 测试 4: 多轮对话
  log(colors.blue, '\n【测试 4】多轮对话 API...');
  let sessionId = null;
  try {
    // 第一轮
    log(colors.yellow, '  第一轮：问候');
    const res1 = await request('/api/conversation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: { message: '你好，请介绍一下自己', model: 'qwen3.5-plus' }
    });
    if (res1.status === 200 && res1.data.success) {
      sessionId = res1.data.sessionId;
      log(colors.green, '  ✓ 第一轮成功');
      log(colors.yellow, `    会话 ID: ${sessionId}`);
      log(colors.yellow, `    AI: ${res1.data.response.substring(0, 80)}...`);

      // 第二轮
      log(colors.yellow, '  第二轮：追问');
      const res2 = await request('/api/conversation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: { message: '黄氏有哪些著名人物？', sessionId, model: 'qwen3.5-plus' }
      });
      if (res2.status === 200 && res2.data.success) {
        log(colors.green, '  ✓ 第二轮成功');
        log(colors.yellow, `    消息数：${res2.data.messageCount}`);
        log(colors.yellow, `    AI: ${res2.data.response.substring(0, 80)}...`);
        passed++;
      } else {
        log(colors.red, `  ✗ 第二轮失败：${JSON.stringify(res2.data)}`);
        failed++;
      }
    } else {
      log(colors.red, `✗ 第一轮失败：${JSON.stringify(res1.data)}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `✗ 多轮对话失败：${error.message}`);
    failed++;
  }

  // 测试 5: 获取会话历史
  if (sessionId) {
    log(colors.blue, '\n【测试 5】获取会话历史 API...');
    try {
      const res = await request(`/api/session/${sessionId}`, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      });
      if (res.status === 200 && res.data.success) {
        log(colors.green, '✓ 会话历史获取成功');
        log(colors.yellow, `  消息数：${res.data.session.messageCount}`);
        passed++;
      } else {
        log(colors.red, `✗ 会话历史获取失败：${JSON.stringify(res.data)}`);
        failed++;
      }
    } catch (error) {
      log(colors.red, `✗ 会话历史获取失败：${error.message}`);
      failed++;
    }
  }

  // 测试 6: 删除会话
  if (sessionId) {
    log(colors.blue, '\n【测试 6】删除会话 API...');
    try {
      const res = await request(`/api/session/${sessionId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + authToken }
      });
      if (res.status === 200 && res.data.success) {
        log(colors.green, '✓ 会话删除成功');
        passed++;
      } else {
        log(colors.red, `✗ 会话删除失败：${JSON.stringify(res.data)}`);
        failed++;
      }
    } catch (error) {
      log(colors.red, `✗ 会话删除失败：${error.message}`);
      failed++;
    }
  }

  // 测试 7: 错误处理 - 空 prompt
  log(colors.blue, '\n【测试 7】错误处理 (空 prompt)...');
  try {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: { prompt: '' }
    });
    if (res.status === 400 && res.data.code === 'INVALID_PROMPT') {
      log(colors.green, '✓ 错误处理正确');
      log(colors.yellow, `  错误码：${res.data.code}`);
      passed++;
    } else {
      log(colors.red, `✗ 错误处理异常：${JSON.stringify(res.data)}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `✗ 错误处理失败：${error.message}`);
    failed++;
  }

  // 总结
  log(colors.cyan, '\n╔═══════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║                    测试总结                               ║');
  log(colors.cyan, '╠═══════════════════════════════════════════════════════════╣');
  log(colors.cyan, `║  通过：${passed}  失败：${failed}                                ║`);
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════╝\n');

  if (failed === 0) {
    log(colors.green, '🎉 所有测试通过！\n');
  } else {
    log(colors.red, `⚠️  有 ${failed} 个测试失败，请检查日志\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  log(colors.red, `\n❌ 测试执行失败：${error.message}`);
  process.exit(1);
});
