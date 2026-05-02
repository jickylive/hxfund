#!/usr/bin/env node
/**
 * AtomCode CLI - 后端 AI 对话命令行工具
 * 
 * 直接调用后端 AI 服务，支持交互模式、单次问答、模型管理
 * 
 * 用法:
 *   node scripts/atomcode-cli.js             # 进入交互模式
 *   node scripts/atomcode-cli.js "你好"       # 单次问答
 *   node scripts/atomcode-cli.js --init       # 初始化配置
 *   node scripts/atomcode-cli.js --models     # 列出模型
 *   node scripts/atomcode-cli.js --status     # 查看状态
 *   node scripts/atomcode-cli.js --help       # 帮助
 */

const https = require('https');
const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ============================================
// 配置与常量
// ============================================

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.atomcode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const VERSION = '1.0.0';

const SUPPORTED_MODELS = [
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', description: '多模态，默认模型', default: true },
  { id: 'qwen3-max-2026-01-23', name: 'Qwen3 Max', description: '最强推理能力' },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', description: '代码专用' },
  { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', description: '代码增强' },
  { id: 'glm-5', name: 'GLM-5', description: '支持思考模式' },
  { id: 'glm-4.7', name: 'GLM-4.7', description: '支持思考模式' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', description: '支持思考模式' },
  { id: 'Qwen/Qwen3.5-397B-A17B', name: 'Qwen3.5-397B-A17B (GitCode)', description: 'GitCode OpenAI兼容模型' },
];

const DEFAULT_CONFIG = {
  apiKey: '',
  baseURL: '',
  model: 'qwen3.5-plus',
  temperature: 0.7,
  source: 'gitcode',  // gitcode | dashscope
};

// ============================================
// 配置管理
// ============================================

function loadConfig() {
  try {
    // 1. 环境变量优先
    if (process.env.ATOMCODE_API_KEY || process.env.GITCODE_API_KEY || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY) {
      const envConfig = {
        apiKey: process.env.ATOMCODE_API_KEY || process.env.GITCODE_API_KEY || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
        baseURL: process.env.ATOMCODE_BASE_URL || process.env.GITCODE_BASE_URL || process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL,
        model: process.env.ATOMCODE_MODEL || process.env.GITCODE_MODEL || process.env.QWEN_MODEL || 'qwen3.5-plus',
        temperature: parseFloat(process.env.ATOMCODE_TEMPERATURE || process.env.GITCODE_TEMPERATURE || process.env.QWEN_TEMPERATURE || '0.7'),
        source: process.env.ATOMCODE_SOURCE || process.env.ATOMCODE_API_KEY ? 'gitcode' : 'dashscope',
      };

      // 自动推断 baseURL 和 source
      if (!envConfig.baseURL) {
        if (process.env.GITCODE_API_KEY || process.env.GITCODE_BASE_URL) {
          envConfig.baseURL = process.env.GITCODE_BASE_URL || 'https://api-ai.gitcode.com/v1';
          envConfig.source = 'gitcode';
        } else {
          envConfig.baseURL = process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';
          envConfig.source = 'dashscope';
        }
      }

      // 自动推断 model
      if (envConfig.source === 'gitcode') {
        envConfig.model = process.env.GITCODE_MODEL || 'Qwen/Qwen3.5-397B-A17B';
      }

      return { ...DEFAULT_CONFIG, ...envConfig };
    }

    // 2. 从配置文件读取
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (error) {
    console.error('❌ 读取配置失败:', error.message);
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
    console.error('❌ 保存配置失败:', error.message);
    return false;
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('❌ 读取历史记录失败:', error.message);
  }
  return [];
}

function saveHistory(history) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    // 只保留最近 100 条
    const trimmed = history.slice(-100);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ 保存历史记录失败:', error.message);
  }
}

// ============================================
// API 调用
// ============================================

function resolveAPI(config) {
  const url = config.baseURL || 'https://api-ai.gitcode.com/v1';
  return url.replace(/\/$/, '') + '/chat/completions';
}

function callAI(config, prompt, conversationHistory = []) {
  return new Promise((resolve, reject) => {
    const url = resolveAPI(config);
    let hostname, pathname;

    try {
      const parsed = new URL(url);
      hostname = parsed.hostname;
      pathname = parsed.pathname;
    } catch {
      return reject(new Error('无效的 Base URL'));
    }

    const messages = [
      { role: 'system', content: '你是 AtomCode，一个专业的 AI 编程助手。请用简洁、准确的方式回答问题。' },
      ...(conversationHistory || []),
      { role: 'user', content: prompt },
    ];

    const body = JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: false,
    });

    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    const options = {
      hostname,
      port: isHttps ? 443 : 80,
      path: pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'atomcode-cli/1.0',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const startTime = Date.now();
    const req = lib.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));

      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        const elapsed = Date.now() - startTime;

        try {
          const result = JSON.parse(raw);

          if (res.statusCode !== 200) {
            return reject(new Error(result.error?.message || `HTTP ${res.statusCode}`));
          }

          const content = result.choices?.[0]?.message?.content || '无响应内容';
          const usage = result.usage || {};

          resolve({
            content,
            usage: {
              prompt_tokens: usage.prompt_tokens || 0,
              completion_tokens: usage.completion_tokens || 0,
              total_tokens: usage.total_tokens || 0,
            },
            elapsed,
          });
        } catch (e) {
          reject(new Error('API 响应解析失败: ' + e.message));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时（60 秒）'));
    });
    req.setTimeout(60000);

    req.write(body);
    req.end();
  });
}

// ============================================
// 交互模式
// ============================================

function printAsciiArt() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║                                                      ║
  ║    ██╗   ██╗██╗███╗   ███╗    ██╗   ██╗██╗ ██████╗  ║
  ║    ██║   ██║██║████╗ ████║    ██║   ██║██║██╔═══██╗ ║
  ║    ██║   ██║██║██╔████╔██║    ██║   ██║██║██║   ██║ ║
  ║    ╚██╗ ██╔╝██║██║╚██╔╝██║    ╚██╗ ██╔╝██║██║   ██║ ║
  ║     ╚████╔╝ ██║██║ ╚═╝ ██║     ╚████╔╝ ██║╚██████╔╝ ║
  ║      ╚═══╝  ╚═╝╚═╝     ╚═╝      ╚═══╝  ╚═╝ ╚═════╝  ║
  ║                                                      ║
  ║    AtomCode CLI v${VERSION.padEnd(44)}║
  ║    后端 AI 对话工具                                  ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  `);
}

function printHelp() {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                 AtomCode CLI 帮助                ║
  ╠══════════════════════════════════════════════════╣
  ║                                                  ║
  ║  命令行参数:                                     ║
  ║    atomcode-cli.js              进入交互模式       ║
  ║    atomcode-cli.js "问题"        单次问答          ║
  ║    atomcode-cli.js --init        初始化配置         ║
  ║    atomcode-cli.js --models      列出可用模型       ║
  ║    atomcode-cli.js --status      查看当前状态       ║
  ║    atomcode-cli.js --help        显示此帮助         ║
  ║                                                  ║
  ║  交互模式命令:                                   ║
  ║    /help            显示此帮助                    ║
  ║    /quit, /exit     退出                           ║
  ║    /clear           清空对话历史                    ║
  ║    /model           查看/切换模型                   ║
  ║    /model <id>      切换到指定模型                   ║
  ║    /history         查看对话历史                    ║
  ║    /config          查看当前配置                    ║
  ║    /usage           查看 Token 用量                 ║
  ║    /time            查看响应耗时                    ║
  ║                                                  ║
  ║  环境变量:                                       ║
  ║    ATOMCODE_API_KEY     API 密钥                  ║
  ║    ATOMCODE_BASE_URL    API 地址                   ║
  ║    ATOMCODE_MODEL       模型 ID                    ║
  ║    ATOMCODE_TEMPERATURE 温度 (0-2)                  ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);
}

function printModels(currentModel) {
  console.log('\n  可用模型:');
  console.log('  ─────────────────────────────────────────────────────');
  console.log(`  ${'ID'.padEnd(40)} ${'名称'.padEnd(20)} ${'默认'.padEnd(6)} 描述`);
  console.log('  ─────────────────────────────────────────────────────');
  
  SUPPORTED_MODELS.forEach(m => {
    const isCurrent = m.id === currentModel;
    const isDefault = m.default;
    const icon = isCurrent ? ' > ' : '   ';
    const tag = isCurrent ? ' [当前]' : '';
    const defaultTag = isDefault ? ' [默认]' : '';
    console.log(`${icon}${m.id.padEnd(40)} ${m.name.padEnd(20)} ${defaultTag.padEnd(6)} ${m.description}`);
  });
  
  console.log('  ─────────────────────────────────────────────────────\n');
}

async function interactiveMode(config) {
  console.log(`\n  🚀 AtomCode CLI v${VERSION} 已启动\n`);
  console.log(`  当前模型: ${config.model}`);
  console.log(`  API 地址: ${config.baseURL}`);
  console.log(`  温度: ${config.temperature}`);
  console.log(`  配置来源: ${config.apiKey ? '已配置' : '未配置（请设置 ATOMCODE_API_KEY）'}`);
  console.log('\n  输入 /help 查看命令，输入 /quit 退出\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const conversationHistory = [];
  const tokenStats = { total: 0, prompt: 0, completion: 0 };
  const history = loadHistory();

  // 恢复历史对话上下文（最近 10 条）
  const recentHistory = history.slice(-20);
  if (recentHistory.length > 0) {
    conversationHistory.push(...recentHistory);
    console.log(`  📜 已加载 ${recentHistory.length / 2} 条历史对话\n`);
  }

  const ask = () => {
    rl.question('  🧑 你：', async (input) => {
      const trimmed = input.trim();

      // 命令处理
      if (trimmed === '/quit' || trimmed === '/exit') {
        saveHistory(conversationHistory);
        console.log('\n  👋 再见！\n');
        rl.close();
        return;
      }

      if (trimmed === '/clear') {
        conversationHistory.length = 0;
        console.log('  ✓ 对话已清空\n');
        ask();
        return;
      }

      if (trimmed === '/help') {
        printHelp();
        ask();
        return;
      }

      if (trimmed === '/models') {
        printModels(config.model);
        ask();
        return;
      }

      if (trimmed === '/model') {
        console.log(`\n  当前模型：${config.model}\n`);
        printModels(config.model);
        ask();
        return;
      }

      if (trimmed.startsWith('/model ')) {
        const newModel = trimmed.replace('/model ', '').trim();
        const found = SUPPORTED_MODELS.find(m => m.id === newModel);
        if (found) {
          config.model = newModel;
          saveConfig(config);
          console.log(`  ✓ 已切换到：${found.name} (${newModel})\n`);
        } else {
          console.log(`  ✗ 不支持的模型：${newModel}\n`);
        }
        ask();
        return;
      }

      if (trimmed === '/config') {
        const keyDisplay = config.apiKey
          ? `${config.apiKey.substring(0, 8)}...${config.apiKey.slice(-4)}`
          : '(未设置)';
        console.log(`\n  当前配置:`);
        console.log(`    API Key: ${keyDisplay}`);
        console.log(`    Base URL: ${config.baseURL}`);
        console.log(`    模型: ${config.model}`);
        console.log(`    温度: ${config.temperature}`);
        console.log(`\n`);
        ask();
        return;
      }

      if (trimmed === '/history') {
        console.log('\n  对话历史:');
        console.log('  ─────────────────────────────────────────────');
        conversationHistory.forEach((msg, i) => {
          const role = msg.role === 'user' ? '🧑 你' : '🤖 AI';
          const display = msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '');
          console.log(`  [${i + 1}] ${role}: ${display}`);
        });
        console.log('  ─────────────────────────────────────────────\n');
        ask();
        return;
      }

      if (trimmed === '/usage') {
        console.log(`\n  Token 用量:`);
        console.log(`    总用量: ${tokenStats.total} tokens`);
        console.log(`    输入: ${tokenStats.prompt} tokens`);
        console.log(`    输出: ${tokenStats.completion} tokens`);
        console.log(`\n`);
        ask();
        return;
      }

      if (trimmed === '/time') {
        console.log(`\n  总响应时间: ${getTotalTime()}ms\n`);
        ask();
        return;
      }

      if (!trimmed) {
        ask();
        return;
      }

      // 检查 API Key
      if (!config.apiKey) {
        console.log('\n  ⚠️  未配置 API Key。请先设置环境变量 ATOMCODE_API_KEY，');
        console.log('  或运行: atomcode-cli.js --init\n');
        ask();
        return;
      }

      // 调用 AI
      process.stdout.write('  🤖 AI 思考中...');
      
      try {
        const result = await callAI(config, trimmed, conversationHistory);

        // 更新统计
        tokenStats.total += result.usage.total_tokens || 0;
        tokenStats.prompt += result.usage.prompt_tokens || 0;
        tokenStats.completion += result.usage.completion_tokens || 0;

        // 显示输出
        console.log('\n  ' + '─'.repeat(60));
        console.log(`  🤖 AI: ${result.content}`);
        console.log('  ' + '─'.repeat(60));
        console.log(`  ⏱  ${result.elapsed}ms | ${result.usage.total_tokens} tokens | 模型: ${config.model}\n`);

        // 保存到历史
        conversationHistory.push({ role: 'user', content: trimmed });
        conversationHistory.push({ role: 'assistant', content: result.content });

      } catch (error) {
        console.log('\n');
        console.error(`  ❌ 错误: ${error.message}\n`);
      }

      ask();
    });
  };

  ask();
}

function getTotalTime() {
  return Object.values(totalTime).reduce((sum, t) => sum + t, 0).toFixed(0);
}

// ============================================
// 单次问答模式
// ============================================

async function singleQuestionMode(config, question) {
  // 检查配置
  if (!config.apiKey) {
    console.error('❌ 未配置 API Key');
    console.error('   请设置 ATOMCODE_API_KEY 环境变量，或运行: atomcode-cli.js --init');
    process.exit(1);
  }

  try {
    console.log(`\n  模型: ${config.model}`);
    console.log(`  温度: ${config.temperature}`);
    console.log(`  请求: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}\n`);

    const result = await callAI(config, question);

    console.log(`\n  ${'='.repeat(60)}`);
    console.log(`  ${result.content}`);
    console.log(`  ${'='.repeat(60)}`);
    console.log(`  ⏱ ${result.elapsed}ms | ${result.usage.total_tokens} tokens`);
    console.log('');

  } catch (error) {
    console.error(`\n❌ 请求失败: ${error.message}\n`);
    process.exit(1);
  }
}

// ============================================
// 初始化向导
// ============================================

async function initWizard() {
  console.log('\n  ════════════════════════════════════════════════\n');
  console.log('       AtomCode CLI 初始化配置向导\n');
  console.log('  ════════════════════════════════════════════════\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  try {
    // 步骤 1: 选择 API 提供商
    console.log('  请选择 API 提供商:');
    console.log('    1) GitCode  (推荐，免费额度充足)');
    console.log('    2) 阿里云 DashScope');
    const providerChoice = (await ask('  选择 [1-2] (默认 1): ')) || '1';
    const isGitCode = providerChoice === '1';

    const provider = isGitCode ? 'GitCode' : '阿里云 DashScope';
    console.log(`\n  已选择：${provider}\n`);

    // 步骤 2: 输入 API Key
    let apiKey = await ask('  请输入 API Key: ');
    apiKey = apiKey.trim();

    if (!apiKey) {
      // 检查环境变量
      const envKey = process.env.GITCODE_API_KEY || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
      if (envKey) {
        apiKey = envKey;
        console.log('  ✓ 使用环境变量中的 API Key\n');
      } else {
        console.log('\n  ✗ API Key 不能为空，退出\n');
        rl.close();
        return;
      }
    } else {
      console.log('  ✓ API Key 已设置');
    }

    // 步骤 3: 选择默认模型
    console.log('\n  可用模型:');
    printModels(null);

    const modelChoices = SUPPORTED_MODELS.map((m, i) => `${i + 1}). ${m.id}`);
    const modelChoice = await ask(`  选择默认模型 [1-${modelChoices.length}] (默认 1): `);
    const selectedIndex = parseInt(modelChoice) || 1;
    const selectedModel = SUPPORTED_MODELS[selectedIndex - 1].id;

    // 步骤 4: 设置温度
    const tempChoice = await ask('  设置温度 (0-2, 默认 0.7): ');
    const temperature = parseFloat(tempChoice) || 0.7;

    // 保存配置
    const config = {
      apiKey,
      baseURL: isGitCode
        ? (process.env.GITCODE_BASE_URL || 'https://api-ai.gitcode.com/v1')
        : (process.env.DASHSCOPE_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1'),
      model: selectedModel,
      temperature,
      source: isGitCode ? 'gitcode' : 'dashscope',
    };

    const success = saveConfig(config);

    if (success) {
      console.log('\n  ✓ 配置已保存到: ' + CONFIG_FILE);
      console.log('  ✓ API Key 已配置');
      console.log('  ✓ 默认模型: ' + selectedModel);
      console.log('  ✓ 温度: ' + temperature);
      console.log('\n  🎉 初始化完成！输入 "atomcode-cli.js" 开始对话\n');
    } else {
      console.log('\n  ✗ 保存配置失败\n');
    }

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  } finally {
    rl.close();
  }
}

// ============================================
// 状态查看
// ============================================

function showStatus() {
  const config = loadConfig();

  console.log(`\n  ╔══════════════════════════════════════════════════════╗
  ║                  AtomCode CLI 状态                    ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                       ║
  ║  版本:  v${VERSION.padEnd(44)}║
  ║  配置:  ${(config.apiKey ? '✓ 已配置' : '✗ 未配置').padEnd(39)}║
  ║  模型:  ${(config.model || '').padEnd(44)}║
  ║  温度:  ${String(config.temperature).padEnd(44)}║
  ║  API:   ${(config.baseURL || '未设置').padEnd(44)}║
  ║  历史:  ${(loadHistory().length / 2).toFixed(0)} 轮对话                                ║
  ║                                                       ║
  ╚══════════════════════════════════════════════════════╝\n`);
}

// ============================================
// 主入口
// ============================================

async function main() {
  const args = process.argv.slice(2);

  // 无参数 → 交互模式
  if (args.length === 0) {
    const config = loadConfig();
    printAsciiArt();
    await interactiveMode(config);
    return;
  }

  const cmd = args[0];

  switch (cmd) {
    case '--help':
    case '-h':
      printHelp();
      break;

    case '--init':
      await initWizard();
      break;

    case '--models':
    case '-m':
      const modelsConfig = loadConfig();
      printModels(modelsConfig.model);
      break;

    case '--status':
    case '-s':
      showStatus();
      break;

    case '--version':
    case '-v':
      console.log(VERSION);
      break;

    // 默认：单次问答
    default:
      const config = loadConfig();
      const question = args.join(' ');
      if (!question.trim()) {
        console.error('❌ 请输入问题');
        console.error('   用法: atomcode-cli.js "你的问题"\n');
        printHelp();
        process.exit(1);
      }
      await singleQuestionMode(config, question);
      break;
  }
}

main().catch((error) => {
  console.error('❌ 运行时错误:', error.message);
  process.exit(1);
});
