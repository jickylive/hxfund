/**
 * 测试前端 AI 功能的脚本
 * 由于缺少真实的 Qwen API Key，我们将创建一个模拟响应
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// 创建一个模拟服务器，用于测试前端功能
const app = express();
const PORT = 3001;

// 提供静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 模拟 API 端点
app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    models: [
      { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', description: '多模态，默认模型', default: true },
      { id: 'qwen3-max-2026-01-23', name: 'Qwen3 Max', description: '最强推理能力' },
      { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', description: '代码专用' }
    ],
    default: 'qwen3.5-plus'
  });
});

// 模拟认证端点
app.post('/api/auth/client-token', express.json(), (req, res) => {
  // 返回一个模拟的 JWT 令牌（虽然不是真正的 JWT，但前端会接受它进行测试）
  res.json({
    success: true,
    token: 'mock-jwt-token-for-testing',
    expiresIn: 86400000,
    tokenType: 'Bearer'
  });
});

// 模拟对话端点
app.post('/api/conversation', express.json(), (req, res) => {
  // 模拟 AI 响应
  const responses = {
    '黄姓的起源是什么': '黄姓起源于古代中国，主要源自嬴姓，为陆终之后。陆终之子樊的后代被封于黄国（今河南潢川县），春秋时期黄国被楚国所灭，其后代遂以国名为姓，称为黄姓。黄姓是中国古老的姓氏之一，历史悠久，分布广泛。',
    '介绍一下黄氏家族的历史': '黄氏家族是中国最古老的姓氏之一，有着超过四千年的悠久历史。黄姓的起源主要有三支：嬴姓、金姓和改姓。其中最主要的是嬴姓黄氏，源自上古时期的颛顼帝，其后裔被封于黄国。黄国灭亡后，其国民以国为姓，形成了黄姓的主体。历史上著名的黄氏人物包括东汉的黄香、唐代的黄巢等。',
    '什么是字辈': '字辈是指家族中同一代人共同使用的字，用于区分辈分。在中国传统的家族制度中，字辈是体现家族等级秩序的重要标志。每个家族通常会制定字辈诗或字辈谱，规定每一代人名字中必须包含的字，以此来明确家族成员之间的血缘关系和辈分高低。',
    '区块链存证有什么作用': '区块链存证在家族寻根中有重要作用。通过区块链技术，可以将族谱、家谱等重要资料进行哈希加密并上链，确保数据的不可篡改性和可追溯性。这为家族历史的永久保存和真实性验证提供了可靠的技术保障。',
    '默认': '您好！我是通义千问 AI 助手，专门为您解答关于黄氏家族寻根的相关问题。您可以问我关于族谱、字辈、历史等方面的问题。'
  };

  const message = req.body.message || req.body.prompt || '';
  const responseText = responses[message] || responses['默认'];

  res.json({
    success: true,
    response: responseText,
    model: req.body.model || 'qwen3.5-plus',
    usage: { total_tokens: Math.floor(Math.random() * 100) + 50 },
    responseTime: Math.floor(Math.random() * 100) + 50,
    sessionId: req.body.sessionId || 'mock-session-' + Date.now(),
    messageCount: Math.floor(Math.random() * 10) + 1,
    source: 'mock-server'
  });
});

// 模拟健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mock-ai-service',
    version: 'mock-v1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`模拟 AI 服务已启动在 http://localhost:${PORT}`);
  console.log('您可以访问 http://localhost:${PORT} 来测试前端 AI 功能');
  console.log('按 Ctrl+C 停止服务');
});