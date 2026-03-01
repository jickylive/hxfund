/**
 * 规则引擎服务端实现
 * 提供 REST API 接口来管理规则和处理事件
 */

const express = require('express');
const RuleEngine = require('./engine');
const fs = require('fs').promises;
const path = require('path');

class RuleEngineServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.ruleEngine = null;
    this.init();
  }

  async init() {
    // 中间件
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 初始化规则引擎
    try {
      const rulesConfig = await this.loadRulesConfig();
      this.ruleEngine = new RuleEngine(rulesConfig);
      console.log('✅ 规则引擎初始化成功');
    } catch (error) {
      console.error('❌ 规则引擎初始化失败:', error);
      process.exit(1);
    }

    // API 路由
    this.setupRoutes();

    // 启动服务器
    this.app.listen(this.port, () => {
      console.log(`🚀 规则引擎服务器运行在端口 ${this.port}`);
      console.log(`📋 API 文档: http://localhost:${this.port}/api/docs`);
    });
  }

  async loadRulesConfig() {
    try {
      const configPath = path.join(__dirname, 'rules.json');
      const data = await fs.readFile(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load rules config:', error);
      throw error;
    }
  }

  setupRoutes() {
    // API 根路径
    this.app.get('/api', (req, res) => {
      res.json({
        message: 'Welcome to hxfund Rule Engine API',
        version: '1.0.0',
        endpoints: {
          'POST /api/events': '处理传入事件',
          'GET /api/rules': '获取所有规则',
          'GET /api/rules/:id': '获取特定规则',
          'POST /api/rules/test': '测试规则'
        }
      });
    });

    // API 文档
    this.app.get('/api/docs', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>hxfund Rule Engine API 文档</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1, h2 { color: #2c3e50; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
            code { background: #eef2f7; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>hxfund Rule Engine API 文档</h1>

          <h2>概述</h2>
          <p>规则引擎提供自动化规则执行功能，支持事件驱动的自动化流程。</p>

          <h2>API 端点</h2>

          <div class="endpoint">
            <h3>POST /api/events</h3>
            <p>处理传入事件，匹配并执行相关规则</p>
            <strong>请求体:</strong>
            <pre><code>{
  "type": "git-commit",
  "branch": "main",
  "files": ["file1.js", "file2.ts"]
}</code></pre>
            <strong>响应:</strong>
            <pre><code>{
  "processed": true,
  "matchedRules": [...],
  "results": [...]
}</code></pre>
          </div>

          <div class="endpoint">
            <h3>GET /api/rules</h3>
            <p>获取所有规则配置</p>
            <strong>响应:</strong>
            <pre><code>{
  "rules": [...]
}</code></pre>
          </div>

          <div class="endpoint">
            <h3>GET /api/rules/:id</h3>
            <p>获取特定规则</p>
            <strong>响应:</strong>
            <pre><code>{
  "rule": {...}
}</code></pre>
          </div>

          <div class="endpoint">
            <h3>POST /api/rules/test</h3>
            <p>测试规则配置</p>
            <strong>请求体:</strong>
            <pre><code>{
  "event": {...},
  "rules": [...]
}</code></pre>
          </div>
        </body>
        </html>
      `);
    });

    // 处理事件
    this.app.post('/api/events', async (req, res) => {
      try {
        const event = req.body;
        console.log(`📥 收到事件: ${event.type}`, event);

        if (!this.ruleEngine) {
          return res.status(500).json({ error: '规则引擎未初始化' });
        }

        const results = await this.ruleEngine.processEvent(event);

        console.log(`✅ 事件处理完成，匹配规则数: ${results.length}`);
        res.json({
          processed: true,
          event: event.type,
          matchedRules: results.length,
          results: results
        });
      } catch (error) {
        console.error('❌ 事件处理失败:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 获取所有规则
    this.app.get('/api/rules', async (req, res) => {
      try {
        if (!this.ruleEngine) {
          return res.status(500).json({ error: '规则引擎未初始化' });
        }

        res.json({
          rules: this.ruleEngine.rules
        });
      } catch (error) {
        console.error('❌ 获取规则失败:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 获取特定规则
    this.app.get('/api/rules/:id', async (req, res) => {
      try {
        const ruleId = req.params.id;
        if (!this.ruleEngine) {
          return res.status(500).json({ error: '规则引擎未初始化' });
        }

        const rule = this.ruleEngine.rules.find(r => r.id === ruleId);
        if (!rule) {
          return res.status(404).json({ error: '规则未找到' });
        }

        res.json({ rule });
      } catch (error) {
        console.error('❌ 获取规则失败:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 测试规则
    this.app.post('/api/rules/test', async (req, res) => {
      try {
        const { event, rules } = req.body;

        if (!event) {
          return res.status(400).json({ error: '事件参数缺失' });
        }

        // 创建临时规则引擎进行测试
        const testEngine = new RuleEngine({ rules: rules || this.ruleEngine.rules });
        const results = await testEngine.processEvent(event);

        res.json({
          event: event.type,
          testedRules: results.length,
          results: results
        });
      } catch (error) {
        console.error('❌ 规则测试失败:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'rule-engine',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  const port = process.env.RULE_ENGINE_PORT || 3001;
  new RuleEngineServer(port);
}

module.exports = RuleEngineServer;