/**
 * 规则引擎测试文件
 */

const RuleEngine = require('./engine');
const { strictEqual, ok } = require('assert');

// 测试规则配置
const testRulesConfig = {
  rules: [
    {
      id: "test-rule-1",
      name: "测试规则1",
      description: "用于测试的简单规则",
      conditions: [
        {
          type: "git-commit",
          branch: "main"
        }
      ],
      actions: [
        {
          type: "run-script",
          script: "test-script.js"
        }
      ],
      enabled: true,
      priority: 10
    }
  ]
};

async function runTests() {
  console.log('🧪 开始规则引擎测试...\n');

  try {
    // 测试1: 初始化规则引擎
    console.log('测试1: 初始化规则引擎');
    const engine = new RuleEngine(testRulesConfig);
    ok(engine, '规则引擎应成功初始化');
    console.log('✅ 通过\n');

    // 测试2: 匹配规则
    console.log('测试2: 匹配规则');
    const testEvent = {
      type: "git-commit",
      branch: "main",
      files: ["test.js"]
    };

    const matchedRules = engine.matchRules(testEvent);
    strictEqual(matchedRules.length, 1, '应该匹配到1个规则');
    strictEqual(matchedRules[0].id, 'test-rule-1', '匹配的应该是测试规则1');
    console.log('✅ 通过\n');

    // 测试3: 处理不匹配的事件
    console.log('测试3: 处理不匹配的事件');
    const unmatchedEvent = {
      type: "git-commit",
      branch: "feature-branch",
      files: ["test.js"]
    };

    const unmatchedRules = engine.matchRules(unmatchedEvent);
    strictEqual(unmatchedRules.length, 0, '不应该匹配到任何规则');
    console.log('✅ 通过\n');

    // 测试4: 执行事件处理
    console.log('测试4: 执行事件处理');
    const results = await engine.processEvent(testEvent);
    ok(Array.isArray(results), '结果应该是数组');
    strictEqual(results.length, 1, '应该有一个结果');
    ok(results[0].success, '第一个结果应该成功');
    console.log('✅ 通过\n');

    console.log('🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runTests();