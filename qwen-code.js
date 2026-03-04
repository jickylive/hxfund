#!/usr/bin/env node
/**
 * 黄氏家族寻根平台 - Qwen Code CLI 工具（增强版）
 * 
 * 基于阿里云百炼 Coding Plan 套餐
 * 使用方式：交互式编程助手（符合 Coding Plan 使用限制）
 * 
 * 功能特性：
 * - 支持 Qwen Code、Claude Code、Cline、OpenCode 等多种 AI 工具配置
 * - 一键初始化配置
 * - 交互式对话
 * - 模型切换
 * 
 * 使用方法：
 *   node qwen-code.js [问题]
 *   node qwen-code.js --help
 *   node qwen-code.js --init
 * 
 * 示例：
 *   node qwen-code.js "黄姓的起源是什么？"
 *   node qwen-code.js --init  # 初始化配置
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// ============================================
// 配置管理
// ============================================

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.qwen-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const QWEN_SETTINGS_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.qwen', 'settings.json');

const DEFAULT_CONFIG = {
  apiKey: '',
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
  model: 'qwen3.5-plus',
  temperature: 0.7,
  systemPrompt: '你是黄氏家族寻根助手，由通义千问提供技术支持。你专注于：\n1. 解答黄姓起源、历史和文化\n2. 帮助查询族谱和字辈信息\n3. 提供寻根问祖相关咨询\n4. 传承和弘扬黄氏家族传统美德\n\n作为编程助手，你也擅长解答代码相关问题。'
};

// 支持的模型列表 (Coding Plan)
const SUPPORTED_MODELS = [
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus (多模态)', default: true },
  { id: 'qwen3-max-2026-01-23', name: 'Qwen3 Max 2026-01-23', default: false },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', default: false },
  { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', default: false },
  { id: 'glm-5', name: 'GLM-5', thinking: true, default: false },
  { id: 'glm-4.7', name: 'GLM-4.7', thinking: true, default: false },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', thinking: true, default: false },
];

// AI 工具配置模板
const AI_TOOLS_CONFIG = {
  opencode: {
    name: 'OpenCode',
    installCmd: 'npm install -g opencode-ai',
    checkCmd: 'opencode -v',
    configPath: '~/.config/opencode/opencode.json',
    configTemplate: {
      "$schema": "https://opencode.ai/config.json",
      "provider": {
        "bailian-coding-plan": {
          "npm": "@ai-sdk/anthropic",
          "name": "Model Studio Coding Plan",
          "options": {
            "baseURL": "https://coding.dashscope.aliyuncs.com/apps/anthropic/v1",
            "apiKey": "YOUR_API_KEY"
          },
          "models": {
            "qwen3.5-plus": {
              "name": "Qwen3.5 Plus",
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 1024
                }
              }
            },
            "qwen3-max-2026-01-23": {
              "name": "Qwen3 Max 2026-01-23",
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 1024
                }
              }
            },
            "qwen3-coder-next": {
              "name": "Qwen3 Coder Next"
            },
            "qwen3-coder-plus": {
              "name": "Qwen3 Coder Plus"
            },
            "glm-5": {
              "name": "GLM-5",
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 1024
                }
              }
            },
            "glm-4.7": {
              "name": "GLM-4.7",
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 1024
                }
              }
            },
            "kimi-k2.5": {
              "name": "Kimi K2.5",
              "options": {
                "thinking": {
                  "type": "enabled",
                  "budgetTokens": 1024
                }
              }
            }
          }
        }
      }
    }
  },
  qwenCode: {
    name: 'Qwen Code (官方)',
    installCmd: 'npm install -g @qwen-code/qwen-code@latest',
    checkCmd: 'qwen --version',
    configPath: '~/.qwen/settings.json',
    note: 'Qwen Code 启动后使用 /auth 命令配置 API Key'
  },
  claudeCode: {
    name: 'Claude Code',
    installCmd: 'npm install -g @anthropic-ai/claude-code',
    checkCmd: 'claude --version',
    configPath: '~/.claude/settings.json',
    note: 'Claude Code 启动后使用 /auth 命令配置'
  },
  cline: {
    name: 'Cline (VS Code 插件)',
    installCmd: '在 VS Code 中安装 Cline 插件',
    checkCmd: null,
    configPath: 'VS Code 插件设置',
    note: '在 VS Code 插件设置中配置 Base URL 和 API Key'
  },
  cursor: {
    name: 'Cursor',
    installCmd: '下载并安装 Cursor IDE',
    checkCmd: null,
    configPath: 'Cursor 设置',
    note: '在 Cursor 设置中配置 OpenAI Compatible API'
  }
};

// ============================================
// 工具函数
// ============================================

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存配置文件失败:', error.message);
    return false;
  }
}

function expandHome(filePath) {
  if (filePath.startsWith('~')) {
    return path.join(process.env.HOME || process.env.USERPROFILE, filePath.slice(1));
  }
  return filePath;
}

function printAsciiArt() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         黄氏家族寻根 · Qwen Code CLI                       ║
║         基于阿里云百炼 Coding Plan                         ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

function printHelp() {
  console.log(`
使用方法：node qwen-code.js [选项] [问题]

选项:
  -h, --help              显示帮助信息
  -v, --version           显示版本号
  -c, --config            配置 API Key 和模型
  -i, --init              初始化配置向导（支持多种 AI 工具）
  -m, --model <模型>      指定模型
  -t, --temperature <值>  设置温度 (0-2)
  --tools                 列出支持的 AI 工具
  -i, --interactive       交互模式
  --list-models           列出支持的模型

示例:
  node qwen-code.js "黄姓的起源是什么？"
  node qwen-code.js -m qwen3-max-2026-01-23 "解释这段代码"
  node qwen-code.js -i  # 进入交互模式
  node qwen-code.js --init  # 初始化配置向导
  node qwen-code.js --tools  # 查看支持的 AI 工具

支持的模型:
${SUPPORTED_MODELS.map(m => `  - ${m.id}${m.default ? ' (默认)' : ''}${m.thinking ? ' (支持思考模式)' : ''}`).join('\n')}
  `);
}

function printModels() {
  console.log('\n支持的模型列表 (Coding Plan):\n');
  SUPPORTED_MODELS.forEach((model, index) => {
    const flags = [];
    if (model.default) flags.push('默认');
    if (model.thinking) flags.push('支持思考模式');
    console.log(`  ${index + 1}. ${model.id}`);
    console.log(`     ${model.name}${flags.length ? ` [${flags.join(', ')}]` : ''}`);
    console.log('');
  });
}

function printTools() {
  console.log('\n支持的 AI 工具列表:\n');
  Object.entries(AI_TOOLS_CONFIG).forEach(([key, tool], index) => {
    console.log(`  ${index + 1}. ${tool.name} (${key})`);
    if (tool.installCmd) {
      console.log(`     安装：${tool.installCmd}`);
    }
    if (tool.note) {
      console.log(`     说明：${tool.note}`);
    }
    console.log('');
  });
}

// ============================================
// 初始化配置向导
// ============================================

async function initWizard() {
  console.log('\n' + '═'.repeat(60));
  console.log('  Qwen Code CLI - 初始化配置向导');
  console.log('═'.repeat(60) + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  // 步骤 1: 检查 Node.js 版本
  console.log('步骤 1/5: 检查 Node.js 版本');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  console.log(`  当前版本：${nodeVersion}`);
  if (majorVersion < 18) {
    console.log('  ⚠️  警告：建议升级到 Node.js v18.0 或更高版本');
  } else {
    console.log('  ✅ 版本符合要求');
  }
  console.log('');

  // 步骤 2: 选择 AI 工具
  console.log('步骤 2/5: 选择要配置的 AI 工具');
  console.log('  1. Qwen Code (官方 CLI)');
  console.log('  2. OpenCode');
  console.log('  3. Claude Code');
  console.log('  4. Cline (VS Code 插件)');
  console.log('  5. Cursor');
  console.log('  6. 仅配置本 CLI 工具');
  
  const toolChoice = await question('请选择 (1-6): ');
  
  let selectedTool = null;
  switch (toolChoice) {
    case '1': selectedTool = 'qwenCode'; break;
    case '2': selectedTool = 'opencode'; break;
    case '3': selectedTool = 'claudeCode'; break;
    case '4': selectedTool = 'cline'; break;
    case '5': selectedTool = 'cursor'; break;
    case '6': selectedTool = 'cli'; break;
    default: selectedTool = 'cli';
  }
  console.log('');

  // 步骤 3: 获取 API Key
  console.log('步骤 3/5: 配置 API Key');
  console.log('获取 API Key: https://bailian.console.aliyun.com/cn-beijing/?tab=service#/coding-plan');
  const apiKey = await question('请输入 Coding Plan API Key (sk-sp-xxxxx): ');
  
  if (!apiKey.startsWith('sk-sp-')) {
    console.log('  ⚠️  警告：API Key 格式应为 sk-sp-xxxxx (Coding Plan 专属)');
  }
  console.log('');

  // 步骤 4: 选择模型
  console.log('步骤 4/5: 选择默认模型');
  SUPPORTED_MODELS.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.id}${m.default ? ' [推荐]' : ''}${m.thinking ? ' (支持思考)' : ''}`);
  });
  
  const modelChoice = await question(`\n请输入模型编号 (1-${SUPPORTED_MODELS.length}, 回车跳过): `);
  const modelIndex = parseInt(modelChoice) - 1;
  let selectedModel = DEFAULT_CONFIG.model;
  if (modelIndex >= 0 && modelIndex < SUPPORTED_MODELS.length) {
    selectedModel = SUPPORTED_MODELS[modelIndex].id;
  }
  console.log('');

  // 步骤 5: 保存配置
  console.log('步骤 5/5: 保存配置');
  
  const config = {
    apiKey: apiKey.trim(),
    baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
    model: selectedModel,
    temperature: 0.7,
    systemPrompt: DEFAULT_CONFIG.systemPrompt
  };

  if (saveConfig(config)) {
    console.log(`  ✅ 配置已保存到：${CONFIG_FILE}`);
  } else {
    console.log('  ❌ 保存失败');
  }

  // 配置选中的 AI 工具
  if (selectedTool !== 'cli' && AI_TOOLS_CONFIG[selectedTool]) {
    const tool = AI_TOOLS_CONFIG[selectedTool];
    console.log(`\n正在配置 ${tool.name}...`);
    
    if (selectedTool === 'opencode') {
      await configureOpenCode(tool, apiKey);
    } else if (selectedTool === 'qwenCode') {
      console.log(`\n  ℹ️  ${tool.note}`);
      console.log('  启动命令：qwen');
      console.log('  然后在对话中输入 /auth 进行配置');
    } else if (selectedTool === 'claudeCode') {
      console.log(`\n  ℹ️  ${tool.note}`);
      console.log('  启动命令：claude');
      console.log('  Base URL: https://coding.dashscope.aliyuncs.com/apps/anthropic/v1');
    } else if (selectedTool === 'cline' || selectedTool === 'cursor') {
      console.log(`\n  ℹ️  ${tool.note}`);
      console.log('  Base URL: https://coding.dashscope.aliyuncs.com/v1');
      console.log('  API Key: 使用上方输入的 Key');
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  配置完成！');
  console.log('═'.repeat(60) + '\n');

  // 测试配置
  const testChoice = await question('是否测试配置？(y/n): ');
  if (testChoice.toLowerCase() === 'y') {
    console.log('');
    await testConfig(config);
  }

  rl.close();
}

async function configureOpenCode(tool, apiKey) {
  const configPath = expandHome(tool.configPath);
  const configDir = path.dirname(configPath);
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`  创建配置目录：${configDir}`);
    }

    // 创建配置文件（替换 API Key）
    const configContent = JSON.stringify(tool.configTemplate, null, 2)
      .replace(/YOUR_API_KEY/g, apiKey);
    
    fs.writeFileSync(configPath, configContent, 'utf-8');
    console.log(`  ✅ OpenCode 配置已保存到：${configPath}`);
    
    console.log('\n  使用 OpenCode:');
    console.log('  1. 运行：opencode');
    console.log('  2. 输入：/models');
    console.log('  3. 选择：Model Studio Coding Plan');
    
  } catch (error) {
    console.log(`  ❌ 配置失败：${error.message}`);
  }
}

async function testConfig(config) {
  console.log('正在测试配置...\n');
  
  try {
    const result = await callQwenAPI(config, '你好，请简单自我介绍', []);
    console.log(`✅ 测试成功!`);
    console.log(`AI 回复：${result.content.substring(0, 100)}...`);
    console.log(`Token 用量：${result.usage?.total_tokens || 0}`);
  } catch (error) {
    console.log(`❌ 测试失败：${error.message}`);
  }
}

// ============================================
// API 调用
// ============================================

function callQwenAPI(config, prompt, conversationHistory = []) {
  return new Promise((resolve, reject) => {
    const urlPath = config.baseURL.replace(/\/$/, '') + '/chat/completions';

    const messages = [
      { role: 'system', content: config.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      stream: false
    };

    const data = JSON.stringify(requestBody);

    const options = {
      hostname: 'coding.dashscope.aliyuncs.com',
      port: 443,
      path: urlPath.replace('https://coding.dashscope.aliyuncs.com', ''),
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'huangshi-genealogy-qwen-code-cli/1.0',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();

        try {
          const result = JSON.parse(body);

          if (res.statusCode !== 200) {
            reject(new Error(result.error?.message || `HTTP ${res.statusCode}`));
            return;
          }

          if (!result.choices || result.choices.length === 0) {
            reject(new Error('API 返回格式异常：缺少 choices 数据'));
            return;
          }

          const content = result.choices[0].message?.content;
          const usage = result.usage || {};

          resolve({
            content: content,
            usage: usage,
            requestId: result.id
          });
        } catch (e) {
          reject(new Error(`解析响应失败：${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`网络错误：${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时 (30 秒)'));
    });

    req.setTimeout(30000);
    req.write(data);
    req.end();
  });
}

// ============================================
// 交互模式
// ============================================

async function interactiveMode(config) {
  console.log('\n进入交互模式 (输入 /quit 退出，/clear 清空对话，/help 查看命令)\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const conversationHistory = [];

  const askQuestion = () => {
    rl.question('🧑 你：', async (input) => {
      const trimmed = input.trim();
      
      // 处理特殊命令
      if (trimmed === '/quit' || trimmed === '/exit') {
        console.log('👋 再见！');
        rl.close();
        return;
      }
      
      if (trimmed === '/clear') {
        conversationHistory.length = 0;
        console.log('✓ 对话历史已清空\n');
        askQuestion();
        return;
      }
      
      if (trimmed === '/help') {
        console.log(`
命令列表:
  /quit, /exit  - 退出
  /clear        - 清空对话历史
  /help         - 显示帮助
  /model        - 查看/切换模型
  /history      - 查看对话历史
  /usage        - 查看 Token 用量
  /config       - 查看当前配置

直接输入问题即可与 AI 对话。\n`);
        askQuestion();
        return;
      }
      
      if (trimmed === '/model') {
        console.log(`\n当前模型：${config.model}\n`);
        console.log('可用模型:');
        SUPPORTED_MODELS.forEach(m => {
          if (m.id === config.model) {
            console.log(`  > ${m.id}  [当前]`);
          } else {
            console.log(`    ${m.id}`);
          }
        });
        console.log('\n使用 /model <模型名> 切换模型\n');
        askQuestion();
        return;
      }
      
      if (trimmed.startsWith('/model ')) {
        const newModel = trimmed.replace('/model ', '').trim();
        if (SUPPORTED_MODELS.some(m => m.id === newModel)) {
          config.model = newModel;
          saveConfig(config);
          console.log(`✓ 已切换到模型：${newModel}\n`);
        } else {
          console.log(`✗ 不支持的模型：${newModel}\n`);
        }
        askQuestion();
        return;
      }
      
      if (trimmed === '/config') {
        console.log('\n当前配置:');
        console.log(`  API Key: ${config.apiKey.substring(0, 12)}...`);
        console.log(`  Base URL: ${config.baseURL}`);
        console.log(`  模型：${config.model}`);
        console.log(`  温度：${config.temperature}`);
        console.log('');
        askQuestion();
        return;
      }
      
      if (trimmed === '/history') {
        console.log('\n对话历史:');
        conversationHistory.forEach((msg, i) => {
          const role = msg.role === 'user' ? '🧑 你' : '🤖 AI';
          console.log(`\n[${i + 1}] ${role}:`);
          console.log(msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''));
        });
        console.log('');
        askQuestion();
        return;
      }
      
      if (trimmed === '/usage') {
        console.log(`\n当前会话 Token 用量统计:\n`);
        const totalChars = conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0);
        console.log(`  对话字符数：${totalChars}`);
        console.log(`  估算 Token 数：~${Math.round(totalChars / 3)}\n`);
        askQuestion();
        return;
      }
      
      if (!trimmed) {
        askQuestion();
        return;
      }
      
      // 调用 API
      console.log('🤖 AI 思考中...\n');
      
      try {
        const result = await callQwenAPI(config, trimmed, conversationHistory);
        
        console.log(`\n🤖 AI: ${result.content}\n`);
        
        // 保存到对话历史
        conversationHistory.push({ role: 'user', content: trimmed });
        conversationHistory.push({ role: 'assistant', content: result.content });
        
        if (result.usage.total_tokens) {
          console.log(`📊 Token 用量：${result.usage.total_tokens} (本次请求)\n`);
        }
        
      } catch (error) {
        console.log(`\n❌ 错误：${error.message}\n`);
      }
      
      askQuestion();
    });
  };

  askQuestion();
}

// ============================================
// 单次问答模式
// ============================================

async function singleQuestionMode(config, question) {
  try {
    console.log('🤖 AI 思考中...\n');
    
    const result = await callQwenAPI(config, question);
    
    console.log(`🤖 AI: ${result.content}\n`);
    
    if (result.usage.total_tokens) {
      console.log(`📊 Token 用量：${result.usage.total_tokens}`);
    }
  } catch (error) {
    console.error(`❌ 错误：${error.message}`);
    process.exit(1);
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const config = loadConfig();

  // 解析命令行参数
  if (args.length === 0) {
    printAsciiArt();
    if (!config.apiKey) {
      console.log('⚠️  首次使用，请先配置 API Key\n');
      await initWizard();
    }
    await interactiveMode(config);
    return;
  }

  let question = null;
  let showConfig = false;
  let showHelp = false;
  let showVersion = false;
  let showModels = false;
  let showTools = false;
  let showInit = false;
  let interactive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      showHelp = true;
    } else if (arg === '-v' || arg === '--version') {
      showVersion = true;
    } else if (arg === '-c' || arg === '--config') {
      showConfig = true;
    } else if (arg === '-i' || arg === '--init') {
      showInit = true;
    } else if (arg === '--tools') {
      showTools = true;
    } else if (arg === '-i' || arg === '--interactive') {
      interactive = true;
    } else if (arg === '--list-models') {
      showModels = true;
    } else if (arg === '-m' || arg === '--model') {
      if (args[i + 1]) {
        config.model = args[++i];
      }
    } else if (arg === '-t' || arg === '--temperature') {
      if (args[i + 1]) {
        config.temperature = parseFloat(args[++i]);
      }
    } else if (!arg.startsWith('-')) {
      question = arg;
    }
  }

  if (showHelp) {
    printHelp();
    return;
  }

  if (showVersion) {
    console.log('Qwen Code CLI v1.1.0 (增强版)');
    return;
  }

  if (showModels) {
    printModels();
    return;
  }

  if (showTools) {
    printTools();
    return;
  }

  if (showInit) {
    await initWizard();
    return;
  }

  if (showConfig) {
    await initWizard();
    return;
  }

  if (interactive || !question) {
    if (!config.apiKey) {
      console.log('⚠️  首次使用，请先配置 API Key\n');
      await initWizard();
    }
    await interactiveMode(config);
    return;
  }

  // 单次问答模式
  if (!config.apiKey) {
    console.error('❌ 错误：未配置 API Key');
    console.log('请使用 --init 选项先配置 API Key，或运行 node qwen-code.js -i 进入交互模式');
    process.exit(1);
  }

  await singleQuestionMode(config, question);
}

// 运行主程序
main().catch((error) => {
  console.error('程序错误:', error.message);
  process.exit(1);
});
