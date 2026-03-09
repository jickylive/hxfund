/**
 * GitCode OpenAI 兼容模型集成测试脚本
 */

const https = require('https');

// GitCode API 配置
const GITCODE_CONFIG = {
  apiKey: '7vgfybV4gKVKNLdZzaLfv-ty',
  baseURL: 'https://api-ai.gitcode.com/v1',
  model: 'Qwen/Qwen3.5-397B-A17B'  // 使用原始模型名称
};

async function testGitCodeAPI() {
  console.log('🧪 开始测试 GitCode OpenAI 兼容模型集成...\n');

  const prompt = '你好，请简单介绍一下自己，你是哪个模型？';
  
  const messages = [
    { role: 'system', content: '你是一个有用的AI助手' },
    { role: 'user', content: prompt }
  ];

  const requestBody = {
    model: GITCODE_CONFIG.model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 200,
    stream: false  // 确保不使用流式响应
  };

  const data = JSON.stringify(requestBody);

  const options = {
    hostname: 'api-ai.gitcode.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITCODE_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'huangshi-genealogy-gitcode-test/1.0',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk.toString();
      });

      res.on('end', () => {
        console.log('原始响应:', responseBody);

        // 检查是否是流式响应格式
        if (responseBody.startsWith('data:')) {
          console.log('⚠️  API 返回了流式响应，但请求设置了stream=false');
          // 尝试解析第一个data块
          const lines = responseBody.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.substring(6); // 移除 'data: ' 前缀
                if (jsonData.trim() !== '[DONE]') {
                  const parsed = JSON.parse(jsonData);
                  if (parsed.choices && parsed.choices[0]?.delta?.content) {
                    console.log('流式响应内容:', parsed.choices[0].delta.content);
                  } else if (parsed.choices && parsed.choices[0]?.message?.content) {
                    console.log('完整响应内容:', parsed.choices[0].message.content);
                  }
                }
              } catch (e) {
                console.log('解析流式响应失败:', e.message);
              }
            }
          }
          reject(new Error('API 返回了意外的流式响应'));
          return;
        }

        try {
          if (res.statusCode !== 200) {
            console.log(`❌ API 请求失败: HTTP ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
            return;
          }

          const result = JSON.parse(responseBody);

          if (result.error) {
            console.log('❌ API 返回错误:', result.error);
            reject(new Error(`API 错误: ${JSON.stringify(result.error)}`));
            return;
          }

          if (!result.choices || result.choices.length === 0) {
            console.log('❌ API 返回格式异常：缺少 choices 数据');
            reject(new Error('API 返回格式异常'));
            return;
          }

          const content = result.choices[0].message?.content;
          const usage = result.usage || {};

          console.log('✅ GitCode API 测试成功!');
          console.log(`\n🤖 AI 回复：${content}`);
          console.log(`\n📊 Token 用量：`);
          console.log(`   - 输入: ${usage.prompt_tokens || 'N/A'}`);
          console.log(`   - 输出: ${usage.completion_tokens || 'N/A'}`);
          console.log(`   - 总计: ${usage.total_tokens || 'N/A'}`);
          
          resolve({
            content: content,
            usage: usage,
            requestId: result.id
          });
        } catch (e) {
          console.log('❌ 解析响应失败:', e.message);
          reject(new Error(`解析响应失败：${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ 网络错误:', error.message);
      reject(new Error(`网络错误：${error.message}`));
    });

    req.on('timeout', () => {
      console.log('❌ 请求超时 (30 秒)');
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.setTimeout(30000);
    req.write(data);
    req.end();
  });
}

// 运行测试
testGitCodeAPI()
  .then(() => {
    console.log('\n🎉 GitCode 模型集成测试完成！');
  })
  .catch(error => {
    console.log('\n💥 GitCode 模型集成测试失败：', error.message);
  });