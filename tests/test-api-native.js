/**
 * 测试 Qwen AI API 功能 (使用原生 http 模块)
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('正在测试 Qwen AI API 功能...\n');

  try {
    // 1. 检查服务器健康状态
    console.log('1. 检查服务器健康状态...');
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    
    if (healthRes.statusCode === 200) {
      console.log('   ✓ 服务器运行正常');
      console.log(`   版本: ${healthRes.data.version}`);
      console.log(`   CLI 配置状态: ${healthRes.data.config.cliConfigured ? '已配置' : '未配置'}\n`);
    } else {
      console.log('   ✗ 服务器健康检查失败\n');
    }

    // 2. 获取模型列表
    console.log('2. 获取支持的模型列表...');
    const modelsRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/models',
      method: 'GET'
    });
    
    if (modelsRes.statusCode === 200 && modelsRes.data.success) {
      console.log('   ✓ 获取模型列表成功');
      console.log(`   默认模型: ${modelsRes.data.default}`);
      console.log(`   支持模型数: ${modelsRes.data.models.length}\n`);
    } else {
      console.log('   ✗ 获取模型列表失败\n');
    }

    // 3. 尝试获取认证令牌
    console.log('3. 尝试获取认证令牌...');
    const authRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      apiKey: 'hs_731021d34ad59c5393b0bedb34f86143c309bd1e5ad3e676294a3847af72af8a'
    }));
    
    if (authRes.statusCode === 200 && authRes.data.success) {
      console.log('   ✓ 认证令牌获取成功');
      const token = authRes.data.token;
      console.log(`   令牌类型: ${authRes.data.tokenType}`);
      console.log(`   有效期: ${authRes.data.expiresIn}ms\n`);

      // 4. 测试单次对话
      console.log('4. 测试单次对话功能...');
      const chatRes = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, JSON.stringify({
        prompt: '你好，请简单介绍一下自己',
        model: 'qwen3.5-plus'
      }));

      if (chatRes.statusCode === 200 && chatRes.data.success) {
        console.log('   ✓ 单次对话测试成功');
        console.log(`   模型: ${chatRes.data.model}`);
        console.log(`   响应时间: ${chatRes.data.responseTime}ms`);
        console.log(`   Token 用量: ${chatRes.data.usage.total_tokens}`);
        console.log(`   响应长度: ${chatRes.data.response.length} 字符\n`);
        
        console.log('   AI 回复预览:', chatRes.data.response.substring(0, 100) + '...\n');
      } else {
        console.log('   ✗ 单次对话测试失败:', chatRes.data.error || `HTTP ${chatRes.statusCode}`);
      }

      // 5. 测试多轮对话
      console.log('5. 测试多轮对话功能...');
      const convRes = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/conversation',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, JSON.stringify({
        message: '黄姓的起源是什么？',
        model: 'qwen3.5-plus'
      }));

      if (convRes.statusCode === 200 && convRes.data.success) {
        console.log('   ✓ 多轮对话测试成功');
        console.log(`   会话ID: ${convRes.data.sessionId}`);
        console.log(`   消息数: ${convRes.data.messageCount}`);
        console.log(`   响应长度: ${convRes.data.response.length} 字符\n`);
        
        console.log('   AI 回复预览:', convRes.data.response.substring(0, 100) + '...\n');
      } else {
        console.log('   ✗ 多轮对话测试失败:', convRes.data.error || `HTTP ${convRes.statusCode}`);
      }
    } else {
      console.log('   ✗ 认证令牌获取失败:', authRes.data.error || `HTTP ${authRes.statusCode}`);
      console.log('   请检查服务器配置和 API 密钥\n');
    }
  } catch (error) {
    console.error('   ✗ API 测试出错:', error.message);
  }

  console.log('API 功能测试完成！');
}

// 运行测试
testAPI();