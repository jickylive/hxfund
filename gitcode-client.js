/**
 * 黄氏家族寻根平台 - GitCode OpenAI 兼容 API 集成示例
 * 
 * 该脚本演示如何在Node.js环境中使用GitCode的OpenAI兼容API
 */

const https = require('https');

class GitCodeAPIClient {
  constructor(apiKey, baseURL = 'https://api-ai.gitcode.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.hostname = 'api-ai.gitcode.com';
  }

  async chatCompletion(model, messages, options = {}) {
    const {
      stream = false,
      max_tokens = 2048,
      temperature = 0.6,
      ...otherOptions
    } = options;

    const requestBody = {
      model,
      messages,
      stream,
      max_tokens,
      temperature,
      ...otherOptions
    };

    const data = JSON.stringify(requestBody);

    const optionsReq = {
      hostname: this.hostname,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'huangshi-genealogy-gitcode-client/1.0',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(optionsReq, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              // 检查是否是流式响应
              if (responseBody.startsWith('data:')) {
                if (stream) {
                  // 处理流式响应
                  const lines = responseBody.split('\n');
                  const chunks = [];
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const jsonData = line.substring(6); // 移除 'data: ' 前缀
                      if (jsonData.trim() !== '[DONE]') {
                        try {
                          const parsed = JSON.parse(jsonData);
                          chunks.push(parsed);
                        } catch (e) {
                          console.warn('解析流式数据块失败:', e.message);
                        }
                      }
                    }
                  }
                  resolve({ stream: true, chunks });
                } else {
                  reject(new Error('API 返回了意外的流式响应，但请求未设置stream=true'));
                }
              } else {
                // 处理普通JSON响应
                const result = JSON.parse(responseBody);
                if (result.error) {
                  reject(new Error(`API 错误: ${JSON.stringify(result.error)}`));
                } else {
                  resolve(result);
                }
              }
            } catch (e) {
              reject(new Error(`解析响应失败: ${e.message}, 原始响应: ${responseBody}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`网络错误: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.setTimeout(30000);
      req.write(data);
      req.end();
    });
  }

  // 流式输出聊天结果的便捷方法
  async streamChat(model, messages, options = {}) {
    try {
      const result = await this.chatCompletion(model, messages, { ...options, stream: true });
      
      if (result.stream) {
        let fullResponse = '';
        for (const chunk of result.chunks) {
          if (chunk.choices && chunk.choices[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            if (content) {
              process.stdout.write(content);
              fullResponse += content;
            }
          }
        }
        console.log(); // 添加换行
        return fullResponse;
      } else {
        throw new Error('预期流式响应但收到了普通响应');
      }
    } catch (error) {
      console.error('流式聊天错误:', error.message);
      throw error;
    }
  }

  // 普通聊天请求的便捷方法
  async simpleChat(model, messages, options = {}) {
    try {
      const result = await this.chatCompletion(model, messages, { ...options, stream: false });
      
      if (result.choices && result.choices[0]?.message?.content) {
        return result.choices[0].message.content;
      } else {
        throw new Error('API 响应格式异常: 缺少 choices[0].message.content');
      }
    } catch (error) {
      console.error('简单聊天错误:', error.message);
      throw error;
    }
  }
}

// 使用示例
async function main() {
  console.log('黄氏家族寻根平台 - GitCode API 客户端示例\n');

  // 从环境变量获取配置，如果未设置则使用默认值
  const apiKey = process.env.GITCODE_API_KEY || '7vgfybV4gKVKNLdZzaLfv-ty';
  const model = process.env.GITCODE_MODEL || 'Qwen/Qwen3.5-397B-A17B';

  if (!apiKey || apiKey === '7vgfybV4gKVKNLdZzaLfv-ty') {
    console.log('提示: 请设置环境变量 GITCODE_API_KEY 以使用您的个人API密钥');
  }

  const client = new GitCodeAPIClient(apiKey);

  // 示例1: 简单聊天
  console.log('示例1: 简单聊天请求');
  try {
    const messages = [
      {
        role: 'user',
        content: '请简单介绍一下黄氏家族的历史和文化？'
      }
    ];
    
    const response = await client.simpleChat(model, messages, {
      max_tokens: 500,
      temperature: 0.7
    });
    
    console.log('AI回复:', response);
  } catch (error) {
    console.error('简单聊天请求失败:', error.message);
    console.log('注意: 如果遇到连接问题，可能是网络限制或API服务暂时不可用\n');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 示例2: 流式聊天
  console.log('示例2: 流式聊天请求');
  try {
    const messages = [
      {
        role: 'user',
        content: '告诉我一个有关宇宙的有趣事实？'
      }
    ];
    
    console.log('AI流式回复:');
    await client.streamChat(model, messages, {
      max_tokens: 200,
      temperature: 0.6
    });
  } catch (error) {
    console.error('流式聊天请求失败:', error.message);
    console.log('注意: 如果遇到连接问题，可能是网络限制或API服务暂时不可用');
  }

  console.log('\n示例执行完成！');
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

module.exports = GitCodeAPIClient;