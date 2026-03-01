/**
 * 规则引擎主类
 * 处理事件、评估规则并执行相应动作
 */

const { minimatch } = require('minimatch');

class RuleEngine {
  constructor(rulesConfig) {
    this.rules = rulesConfig.rules || [];
    this.logger = console;
  }

  /**
   * 处理传入的事件
   * @param {Object} event - 事件对象
   * @returns {Array} 执行的动作结果
   */
  async processEvent(event) {
    const matchedRules = this.matchRules(event);
    const results = [];

    // 按优先级排序规则
    matchedRules.sort((a, b) => b.priority - a.priority);

    for (const rule of matchedRules) {
      try {
        const result = await this.executeRule(rule, event);
        results.push({
          ruleId: rule.id,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          success: false,
          error: error.message
        });
        this.logger.error(`Rule ${rule.id} execution failed:`, error);
      }
    }

    return results;
  }

  /**
   * 匹配适用的规则
   * @param {Object} event - 事件对象
   * @returns {Array} 匹配的规则数组
   */
  matchRules(event) {
    return this.rules.filter(rule => {
      if (!rule.enabled) return false;
      return this.evaluateConditions(rule.conditions, event);
    });
  }

  /**
   * 评估规则条件
   * @param {Array} conditions - 条件数组
   * @param {Object} event - 事件对象
   * @returns {Boolean} 条件是否满足
   */
  evaluateConditions(conditions, event) {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'git-commit':
          return this.evaluateGitCommitCondition(condition, event);
        case 'pull-request':
          return this.evaluatePullRequestCondition(condition, event);
        case 'schedule':
          return this.evaluateScheduleCondition(condition, event);
        case 'file-change':
          return this.evaluateFileChangeCondition(condition, event);
        case 'health-check':
          return this.evaluateHealthCheckCondition(condition, event);
        default:
          this.logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    });
  }

  /**
   * 评估 Git 提交条件
   */
  evaluateGitCommitCondition(condition, event) {
    if (event.type !== 'git-commit') return false;

    // 检查分支
    if (condition.branch && event.branch !== condition.branch) {
      return false;
    }

    // 检查文件模式
    if (condition.filePattern && event.files) {
      return event.files.some(file => minimatch(file, condition.filePattern));
    }

    return true;
  }

  /**
   * 评估 Pull Request 条件
   */
  evaluatePullRequestCondition(condition, event) {
    if (event.type !== 'pull-request') return false;

    // 检查动作
    if (condition.action && event.action !== condition.action) {
      return false;
    }

    return true;
  }

  /**
   * 评估调度条件
   */
  evaluateScheduleCondition(condition, event) {
    if (event.type !== 'schedule') return false;

    // 这里可以集成 cron 解析库来验证时间
    // 简单实现：总是匹配（实际应该根据cron表达式验证）
    return true;
  }

  /**
   * 评估文件变更条件
   */
  evaluateFileChangeCondition(condition, event) {
    if (event.type !== 'file-change') return false;

    // 检查路径
    if (condition.path && !event.filePath.startsWith(condition.path)) {
      return false;
    }

    // 检查操作类型
    if (condition.operation && event.operation !== condition.operation) {
      return false;
    }

    return true;
  }

  /**
   * 评估健康检查条件
   */
  evaluateHealthCheckCondition(condition, event) {
    if (event.type !== 'health-check') return false;

    return true;
  }

  /**
   * 执行规则
   * @param {Object} rule - 规则对象
   * @param {Object} event - 事件对象
   * @returns {Promise<any>} 执行结果
   */
  async executeRule(rule, event) {
    const results = [];

    for (const action of rule.actions) {
      const result = await this.executeAction(action, event);
      results.push(result);
    }

    return results;
  }

  /**
   * 执行动作
   * @param {Object} action - 动作对象
   * @param {Object} event - 事件对象
   * @returns {Promise<any>} 执行结果
   */
  async executeAction(action, event) {
    switch (action.type) {
      case 'trigger-workflow':
        return this.executeTriggerWorkflowAction(action, event);
      case 'run-security-scan':
        return this.executeRunSecurityScanAction(action, event);
      case 'run-script':
        return this.executeRunScriptAction(action, event);
      case 'health-check':
        return this.executeHealthCheckAction(action, event);
      case 'create-review-task':
        return this.executeCreateReviewTaskAction(action, event);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * 执行触发工作流动작
   */
  async executeTriggerWorkflowAction(action, event) {
    // 这里会集成 GitHub API 来触发工作流
    // 简化实现：模拟触发
    console.log(`Triggering workflow: ${action.workflow}`, action.inputs);

    // 在实际实现中，这里会调用 GitHub API 触发工作流
    return {
      workflow: action.workflow,
      triggered: true,
      inputs: action.inputs
    };
  }

  /**
   * 执行安全扫描动作
   */
  async executeRunSecurityScanAction(action, event) {
    // 执行安全扫描逻辑
    console.log('Running security scan...');

    // 模拟安全扫描
    return {
      scanCompleted: true,
      vulnerabilities: []
    };
  }

  /**
   * 执行脚本动作
   */
  async executeRunScriptAction(action, event) {
    // 执行指定脚本
    console.log(`Running script: ${action.script}`);

    // 在实际实现中，这里会执行具体的脚本
    return {
      script: action.script,
      executed: true
    };
  }

  /**
   * 执行健康检查动作
   */
  async executeHealthCheckAction(action, event) {
    // 执行健康检查
    console.log(`Checking health of: ${action.endpoint}`);

    try {
      const response = await fetch(action.endpoint);
      const data = await response.json();

      return {
        endpoint: action.endpoint,
        status: 'healthy',
        responseTime: response.elapsed,
        data: data
      };
    } catch (error) {
      return {
        endpoint: action.endpoint,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * 执行创建审查任务动作
   */
  async executeCreateReviewTaskAction(action, event) {
    // 创建审查任务
    console.log(`Creating review task for:`, action.assignees);

    // 在实际实现中，这里会创建PR评论或任务
    return {
      taskCreated: true,
      assignees: action.assignees,
      labels: action.labels
    };
  }
}

module.exports = RuleEngine;