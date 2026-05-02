/**
 * 黄氏家族寻根平台 - Qwen CLI 封装模块
 *
 * 统一调用 qwen-code.js CLI 工具
 * 所有 AI 请求都通过 CLI 工具转发
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLI_PATH = path.join(__dirname, '..', 'scripts', 'qwen-code.js');
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.qwen-code', 'config.json');

/**
 * 加载 CLI 配置
 */
function loadCliConfig() {
  try {
    // 优先从环境变量读取配置
    if (process.env.GITCODE_API_KEY || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.SCNET_API_KEY) {
      if (process.env.GITCODE_API_KEY) {
        return {
          apiKey: process.env.GITCODE_API_KEY,
          baseURL: process.env.GITCODE_BASE_URL || 'https://api-ai.gitcode.com/v1',
          model: process.env.GITCODE_MODEL || 'Qwen/Qwen3.5-397B-A17B',
          temperature: parseFloat(process.env.GITCODE_TEMPERATURE) || 0.7
        };
      // 如果是SCNET配置，则使用SCNET的参数
      } else if (process.env.SCNET_API_KEY) {
        return {
          apiKey: process.env.SCNET_API_KEY,
          baseURL: process.env.SCNET_BASE_URL || 'https://api.scnet.cn/api/llm/v1',
          model: process.env.SCNET_MODEL || 'Qwen3-235B-A22B',
          temperature: parseFloat(process.env.SCNET_TEMPERATURE) || 0.7
        };
      }
      // 否则使用 Qwen/DashScope 配置
      else {
        return {
          apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
          baseURL: process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1',
          model: process.env.QWEN_MODEL || 'qwen3.5-plus',
          temperature: parseFloat(process.env.QWEN_TEMPERATURE) || 0.7
        };
      }
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

  // prompt 作为最后一个参数传递（不要以 - 开头，否则会被解析为选项）
  args.push(prompt);

  // 创建包含API密钥的环境变量
  const env = {
    ...process.env,
    ...(process.env.GITCODE_API_KEY ? { GITCODE_API_KEY: process.env.GITCODE_API_KEY } : {}),
    ...(process.env.GITCODE_BASE_URL ? { GITCODE_BASE_URL: process.env.GITCODE_BASE_URL } : {}),
    ...(process.env.GITCODE_MODEL ? { GITCODE_MODEL: process.env.GITCODE_MODEL } : {}),
    ...(process.env.GITCODE_TEMPERATURE ? { GITCODE_TEMPERATURE: process.env.GITCODE_TEMPERATURE } : {}),
    ...(process.env.QWEN_API_KEY ? { QWEN_API_KEY: process.env.QWEN_API_KEY } : {}),
    ...(process.env.DASHSCOPE_API_KEY ? { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY } : {}),
    ...(process.env.QWEN_BASE_URL ? { QWEN_BASE_URL: process.env.QWEN_BASE_URL } : {}),
    ...(process.env.DASHSCOPE_BASE_URL ? { DASHSCOPE_BASE_URL: process.env.DASHSCOPE_BASE_URL } : {}),
    ...(process.env.QWEN_MODEL ? { QWEN_MODEL: process.env.QWEN_MODEL } : {}),
    ...(process.env.QWEN_TEMPERATURE ? { QWEN_TEMPERATURE: process.env.QWEN_TEMPERATURE } : {}),
    ...(process.env.SCNET_API_KEY ? { SCNET_API_KEY: process.env.SCNET_API_KEY } : {}),
    ...(process.env.SCNET_BASE_URL ? { SCNET_BASE_URL: process.env.SCNET_BASE_URL } : {}),
    ...(process.env.SCNET_MODEL ? { SCNET_MODEL: process.env.SCNET_MODEL } : {}),
    ...(process.env.SCNET_TEMPERATURE ? { SCNET_TEMPERATURE: process.env.SCNET_TEMPERATURE } : {})
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
 * @throws {Error} 如果 CLI 执行失败
 */
function callQwenCliSync(prompt, options = {}) {
  const { model, temperature } = options;
  
  // 使用 spawnSync 替代 execSync，避免命令注入漏洞
  // spawnSync 将参数作为独立数组传递，不经过 shell 解析
  const { spawnSync } = require('child_process');
  
  const args = [CLI_PATH];
  
  if (model) {
    args.push('-m', model);
  }
  
  if (temperature !== undefined) {
    args.push('-t', temperature.toString());
  }
  
  // prompt 作为独立参数传递，shell 特殊字符会被安全处理
  args.push(prompt);
  
  const env = {
    ...process.env,
    ...(process.env.GITCODE_API_KEY ? { GITCODE_API_KEY: process.env.GITCODE_API_KEY } : {}),
    ...(process.env.GITCODE_BASE_URL ? { GITCODE_BASE_URL: process.env.GITCODE_BASE_URL } : {}),
    ...(process.env.GITCODE_MODEL ? { GITCODE_MODEL: process.env.GITCODE_MODEL } : {}),
    ...(process.env.GITCODE_TEMPERATURE ? { GITCODE_TEMPERATURE: process.env.GITCODE_TEMPERATURE } : {}),
    ...(process.env.QWEN_API_KEY ? { QWEN_API_KEY: process.env.QWEN_API_KEY } : {}),
    ...(process.env.DASHSCOPE_API_KEY ? { DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY } : {}),
    ...(process.env.QWEN_BASE_URL ? { QWEN_BASE_URL: process.env.QWEN_BASE_URL } : {}),
    ...(process.env.DASHSCOPE_BASE_URL ? { DASHSCOPE_BASE_URL: process.env.DASHSCOPE_BASE_URL } : {}),
    ...(process.env.QWEN_MODEL ? { QWEN_MODEL: process.env.QWEN_MODEL } : {}),
    ...(process.env.QWEN_TEMPERATURE ? { QWEN_TEMPERATURE: process.env.QWEN_TEMPERATURE } : {}),
    ...(process.env.SCNET_API_KEY ? { SCNET_API_KEY: process.env.SCNET_API_KEY } : {}),
    ...(process.env.SCNET_BASE_URL ? { SCNET_BASE_URL: process.env.SCNET_BASE_URL } : {}),
    ...(process.env.SCNET_MODEL ? { SCNET_MODEL: process.env.SCNET_MODEL } : {}),
    ...(process.env.SCNET_TEMPERATURE ? { SCNET_TEMPERATURE: process.env.SCNET_TEMPERATURE } : {})
  };

  try {
    const result = spawnSync('node', args, {
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      env: env,
      cwd: path.join(__dirname, '..')
    });
    
    if (result.status !== 0) {
      const error = result.stderr || result.stdout || 'Unknown error';
      throw new Error(`CLI 执行失败 (code ${result.status}): ${error}`);
    }
    
    const output = result.stdout || '';
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
