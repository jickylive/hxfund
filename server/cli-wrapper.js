/**
 * 黄氏家族寻根平台 - Qwen CLI 封装模块
 *
 * 统一调用 qwen-code.js CLI 工具
 * 所有 AI 请求都通过 CLI 工具转发
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLI_PATH = path.join(__dirname, '..', 'qwen-code.js');
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.qwen-code', 'config.json');

/**
 * 加载 CLI 配置
 */
function loadCliConfig() {
  try {
    // 优先从环境变量读取配置
    if (process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY) {
      return {
        apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
        baseURL: process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1',
        model: process.env.QWEN_MODEL || 'qwen3.5-plus',
        temperature: parseFloat(process.env.QWEN_TEMPERATURE) || 0.7
      };
    }
    
    // 否则从配置文件读取
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('读取 CLI 配置失败:', error.message);
  }
  return null;
}

/**
 * 调用 Qwen CLI 获取 AI 响应
 * @param {string} prompt - 用户问题
 * @param {object} options - 选项
 * @param {string} options.model - 模型 ID
 * @param {number} options.temperature - 温度
 * @returns {Promise<{content: string, usage: object}>}
 */
async function callQwenCli(prompt, options = {}) {
  const { model, temperature } = options;

  // 构建命令行参数
  const args = [CLI_PATH];

  if (model) {
    args.push('-m', model);
  }

  if (temperature !== undefined) {
    args.push('-t', temperature.toString());
  }

  // prompt 放在最后，不需要额外引号（spawn 会处理）
  args.push(prompt);

  // 创建包含API密钥的环境变量
  const env = {
    ...process.env,
    ...(process.env.QWEN_API_KEY ? { QWEN_API_KEY: process.env.QWEN_API_KEY } : {}),
    ...(process.env.DASHSCOPE_API_KEY ? { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY } : {}),
    ...(process.env.QWEN_BASE_URL ? { QWEN_BASE_URL: process.env.QWEN_BASE_URL } : {}),
    ...(process.env.DASHSCOPE_BASE_URL ? { DASHSCOPE_BASE_URL: process.env.DASHSCOPE_BASE_URL } : {}),
    ...(process.env.QWEN_MODEL ? { QWEN_MODEL: process.env.QWEN_MODEL } : {}),
    ...(process.env.QWEN_TEMPERATURE ? { QWEN_TEMPERATURE: process.env.QWEN_TEMPERATURE } : {})
  };

  return new Promise((resolve, reject) => {
    const process = spawn('node', args, {
      encoding: 'utf-8',
      timeout: 60000, // 60 秒超时
      cwd: path.join(__dirname, '..'), // 在项目根目录执行
      env: env // 使用包含API密钥的环境变量
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        // 解析输出，提取 AI 响应
        const aiMatch = output.match(/🤖 AI:([\s\S]*?)(?:\n📊|$)/);
        const tokenMatch = output.match(/📊 Token 用量：(\d+)/);

        if (aiMatch && aiMatch[1].trim()) {
          resolve({
            content: aiMatch[1].trim(),
            usage: {
              total_tokens: tokenMatch ? parseInt(tokenMatch[1]) : 0
            },
            rawOutput: output
          });
        } else {
          // 如果没有匹配到格式，返回原始输出
          resolve({
            content: output.trim(),
            usage: { total_tokens: 0 },
            rawOutput: output
          });
        }
      } else {
        // 即使退出码非零，也尝试从输出中提取有效内容
        const aiMatch = output.match(/🤖 AI:([\s\S]*?)(?:\n📊|$)/);
        if (aiMatch && aiMatch[1].trim()) {
          resolve({
            content: aiMatch[1].trim(),
            usage: { total_tokens: 0 },
            rawOutput: output
          });
        } else {
          reject(new Error(`CLI 执行失败 (code ${code}): ${errorOutput || output}`));
        }
      }
    });

    process.on('error', (error) => {
      reject(new Error(`CLI 进程错误：${error.message}`));
    });

    process.on('timeout', () => {
      process.kill();
      reject(new Error('CLI 执行超时 (60 秒)'));
    });
  });
}

/**
 * 同步调用 Qwen CLI（用于简单场景）
 * @param {string} prompt - 用户问题
 * @param {object} options - 选项
 * @returns {{content: string, usage: object}}
 */
function callQwenCliSync(prompt, options = {}) {
  const { model, temperature } = options;
  
  const args = [CLI_PATH];
  
  if (model) {
    args.push('-m', model);
  }
  
  if (temperature !== undefined) {
    args.push('-t', temperature.toString());
  }
  
  args.push(prompt);
  
  try {
    const output = execSync(`node ${args.join(' ')}`, {
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });
    
    const aiMatch = output.match(/🤖 AI:([\s\S]*?)(?:\n📊|$)/);
    const tokenMatch = output.match(/📊 Token 用量：(\d+)/);
    
    return {
      content: aiMatch ? aiMatch[1].trim() : output.trim(),
      usage: {
        total_tokens: tokenMatch ? parseInt(tokenMatch[1]) : 0
      },
      rawOutput: output
    };
  } catch (error) {
    throw new Error(`CLI 执行失败：${error.message}`);
  }
}

/**
 * 检查 CLI 配置是否存在
 * @returns {boolean}
 */
function isCliConfigured() {
  const config = loadCliConfig();
  return !!(config && config.apiKey);
}

/**
 * 获取 CLI 配置信息
 * @returns {object|null}
 */
function getCliConfig() {
  return loadCliConfig();
}

module.exports = {
  callQwenCli,
  callQwenCliSync,
  isCliConfigured,
  getCliConfig,
  CLI_PATH
};
