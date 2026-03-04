/**
 * 测试 Qwen AI API 功能
 */

const axios = require('axios');

async function testAPI() {
  console.log('正在测试 Qwen AI API 功能...\n');

  try {
    // 1. 检查服务器健康状态
    console.log('1. 检查服务器健康状态...');
    const healthRes = await axios.get('http://localhost:3000/api/health');
    console.log('   ✓ 服务器运行正常');
    console.log(`   版本: ${healthRes.data.version}`);
    console.log(`   CLI 配置状态: ${healthRes.data.config.cliConfigured ? '已配置' : '未配置'}\n`);

    // 2. 获取模型列表
    console.log('2. 获取支持的模型列表...');
    const modelsRes = await axios.get('http://localhost:3000/api/models');
    console.log('   ✓ 获取模型列表成功');
    console.log(`   默认模型: ${modelsRes.data.default}`);
    console.log(`   支持模型数: ${modelsRes.data.models.length}\n`);

    // 3. 尝试获取认证令牌
    console.log('3. 尝试获取认证令牌...');
    const authRes = await axios.post('http://localhost:3000/api/auth/token', {
      apiKey: 'hs_731021d34ad59c5393b0bedb34f86143c309bd1e5ad3e676294a3847af72af8a'
    });
    
    if (authRes.data.success) {
      console.log('   ✓ 认证令牌获取成功');
      const token = authRes.data.token;
      console.log(`   令牌类型: ${authRes.data.tokenType}`);
      console.log(`   有效期: ${authRes.data.expiresIn}ms\n`);

      // 4. 测试单次对话
      console.log('4. 测试单次对话功能...');
      const chatRes = await axios.post('http://localhost:3000/api/chat', {
        prompt: '你好，请简单介绍一下自己',
        model: 'qwen3.5-plus'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (chatRes.data.success) {
        console.log('   ✓ 单次对话测试成功');
        console.log(`   模型: ${chatRes.data.model}`);
        console.log(`   响应时间: ${chatRes.data.responseTime}ms`);
        console.log(`   Token 用量: ${chatRes.data.usage.total_tokens}`);
        console.log(`   响应长度: ${chatRes.data.response.length} 字符\n`);
        
        console.log('   AI 回复预览:', chatRes.data.response.substring(0, 100) + '...\n');
      } else {
        console.log('   ✗ 单次对话测试失败:', chatRes.data.error);
      }

      // 5. 测试多轮对话
      console.log('5. 测试多轮对话功能...');
      const convRes = await axios.post('http://localhost:3000/api/conversation', {
        message: '黄姓的起源是什么？',
        model: 'qwen3.5-plus'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (convRes.data.success) {
        console.log('   ✓ 多轮对话测试成功');
        console.log(`   会话ID: ${convRes.data.sessionId}`);
        console.log(`   消息数: ${convRes.data.messageCount}`);
        console.log(`   响应长度: ${convRes.data.response.length} 字符\n`);
        
        console.log('   AI 回复预览:', convRes.data.response.substring(0, 100) + '...\n');
      } else {
        console.log('   ✗ 多轮对话测试失败:', convRes.data.error);
      }
    } else {
      console.log('   ✗ 认证令牌获取失败:', authRes.data.error);
      console.log('   请检查服务器配置和 API 密钥\n');
    }
  } catch (error) {
    console.error('   ✗ API 测试出错:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }

  console.log('API 功能测试完成！');
}

// 运行测试
testAPI();