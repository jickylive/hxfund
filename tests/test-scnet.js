require('dotenv').config({ path: '.env.dev' });

const { callQwenCli, getCliConfig } = require('../server/cli-wrapper.js');

async function test() {
  console.log('=== 测试 SCNET 接口 ===\n');
  
  // 1. 检查配置
  const config = getCliConfig();
  console.log('1. 当前配置:', JSON.stringify(config, null, 2));
  
  if (!config || config.apiKey !== process.env.SCNET_API_KEY) {
    console.error('❌ 配置不正确，未使用 SCNET 配置');
    process.exit(1);
  }
  console.log('✅ 配置正确，使用 SCNET 接口\n');
  
  // 2. 测试 API 调用
  console.log('2. 测试调用 SCNET API...');
  try {
    const result = await callQwenCli('你好，请用一句话介绍你自己', { 
      model: 'Qwen3-235B-A22B',
      temperature: 0.7
    });
    
    console.log('\n✅ 调用成功！');
    console.log('AI 回复:', result.content);
    console.log('Token 用量:', result.usage?.total_tokens || 0);
  } catch (error) {
    console.error('\n❌ 调用失败:', error.message);
    process.exit(1);
  }
}

test();
