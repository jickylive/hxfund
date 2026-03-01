#!/usr/bin/env node

/**
 * 规则引擎 CLI 工具
 * 用于管理规则和测试规则配置
 */

const fs = require('fs').promises;
const path = require('path');
const RuleEngine = require('./engine');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command) {
    showHelp();
    return;
  }

  switch (command) {
    case 'list':
      await listRules();
      break;
    case 'test':
      await testRules();
      break;
    case 'validate':
      await validateRules();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
  }
}

async function listRules() {
  try {
    const rulesConfig = await loadRulesConfig();
    const rules = rulesConfig.rules;

    console.log('📋 规则列表:\n');

    for (const rule of rules) {
      console.log(`ID: ${rule.id}`);
      console.log(`名称: ${rule.name}`);
      console.log(`描述: ${rule.description}`);
      console.log(`状态: ${rule.enabled ? '启用' : '禁用'}`);
      console.log(`优先级: ${rule.priority}`);
      console.log('---');
    }
  } catch (error) {
    console.error('❌ 获取规则列表失败:', error);
  }
}

async function testRules() {
  try {
    const rulesConfig = await loadRulesConfig();
    const ruleEngine = new RuleEngine(rulesConfig);

    // 模拟事件测试规则
    const testEvents = [
      {
        type: 'git-commit',
        branch: 'main',
        files: ['index.js', 'server/api.js']
      },
      {
        type: 'pull-request',
        action: 'opened',
        prNumber: 123
      },
      {
        type: 'file-change',
        filePath: 'source/_posts/new-article.md',
        operation: 'create'
      }
    ];

    console.log('🧪 测试规则...\n');

    for (const event of testEvents) {
      console.log(`发送测试事件: ${event.type}`);
      const results = await ruleEngine.processEvent(event);
      console.log(`匹配规则数: ${results.length}`);
      console.log('');
    }

    console.log('✅ 规则测试完成');
  } catch (error) {
    console.error('❌ 规则测试失败:', error);
  }
}

async function validateRules() {
  try {
    const rulesConfig = await loadRulesConfig();

    console.log('🔍 验证规则配置...\n');

    let valid = true;
    for (const rule of rulesConfig.rules) {
      if (!validateRule(rule)) {
        valid = false;
      }
    }

    if (valid) {
      console.log('✅ 所有规则配置验证通过');
    } else {
      console.log('❌ 一些规则配置有问题');
    }
  } catch (error) {
    console.error('❌ 验证规则失败:', error);
  }
}

function validateRule(rule) {
  const requiredFields = ['id', 'name', 'conditions', 'actions', 'enabled', 'priority'];
  let isValid = true;

  for (const field of requiredFields) {
    if (!(field in rule)) {
      console.error(`❌ 规则 ${rule.id || 'unknown'} 缺少必需字段: ${field}`);
      isValid = false;
    }
  }

  // 验证条件和动作
  if (rule.conditions && !Array.isArray(rule.conditions)) {
    console.error(`❌ 规则 ${rule.id} 的条件不是数组`);
    isValid = false;
  }

  if (rule.actions && !Array.isArray(rule.actions)) {
    console.error(`❌ 规则 ${rule.id} 的动作不是数组`);
    isValid = false;
  }

  if (isValid) {
    console.log(`✅ 规则 ${rule.id} 验证通过`);
  }

  return isValid;
}

async function loadRulesConfig() {
  try {
    const configPath = path.join(__dirname, 'rules.json');
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ 加载规则配置失败:', error);
    throw error;
  }
}

function showHelp() {
  console.log(`
📦 hxfund 规则引擎 CLI 工具

用法:
  node cli.js <command>

命令:
  list      - 列出所有规则
  test      - 测试规则配置
  validate  - 验证规则配置
  help      - 显示帮助信息

示例:
  node cli.js list
  node cli.js test
  node cli.js validate
  `);
}

// 运行主函数
main().catch(error => {
  console.error('❌ CLI 工具执行失败:', error);
  process.exit(1);
});