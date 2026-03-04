#!/usr/bin/env node
/**
 * Git 日志分析器 - 与 Qwen AI 集成
 * 
 * 用于分析 Git 提交历史并使用 AI 进行智能分析
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查是否在 Git 仓库中
function checkGitRepo() {
  try {
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf-8' }).trim();
    return gitDir && fs.existsSync(gitDir);
  } catch (error) {
    return false;
  }
}

// 获取 Git 日志
function getGitLog(options = {}) {
  const {
    limit = 50,
    format = 'full',
    since = null,
    author = null
  } = options;

  let cmd = 'git log --oneline --graph --all --date=short';

  if (format === 'full') {
    cmd += ' --pretty=format:"%C(auto)%h %C(green)%ad%C(reset) %C(dim white)-%C(reset) %s%C(yellow)%d%C(reset)"';
  } else if (format === 'detailed') {
    cmd += ' --pretty=format:"%C(auto)%h%C(reset) - %C(dim white)(%an)%C(reset) %C(green)%ad%C(reset) %C(dim white)-%C(reset) %s%C(yellow)%d%C(reset)"';
  }

  if (since) {
    cmd += ` --since="${since}"`;
  }

  if (author) {
    cmd += ` --author="${author}"`;
  }

  cmd += ` --date-order -n ${limit}`;

  try {
    return execSync(cmd, { encoding: 'utf-8' });
  } catch (error) {
    return `Git 错误: ${error.message}`;
  }
}

// 获取 Git 状态
function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return status || '工作区干净';
  } catch (error) {
    return `Git 错误: ${error.message}`;
  }
}

// 获取分支信息
function getGitBranches() {
  try {
    const branches = execSync('git branch -v --all', { encoding: 'utf-8' });
    return branches;
  } catch (error) {
    return `Git 错误: ${error.message}`;
  }
}

// 获取最近的提交统计
function getCommitStats(days = 7) {
  try {
    const since = `${days} days ago`;
    const cmd = `git log --since="${since}" --oneline --pretty=format:"%h %ad %s" --date=short | wc -l`;
    const count = execSync(cmd, { encoding: 'utf-8' }).trim();
    return parseInt(count);
  } catch (error) {
    return 0;
  }
}

// 保存 Git 日志到文件
function saveGitLogToFile(log, filename = 'git-log-analysis.txt') {
  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, log, 'utf-8');
  console.log(`✅ Git 日志已保存到: ${outputPath}`);
  return outputPath;
}

// 主函数
function main() {
  console.log('🔍 Git 日志分析器\n');

  if (!checkGitRepo()) {
    console.log('❌ 当前目录不是 Git 仓库');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法:
  node git-log-analyzer.js [选项]

选项:
  --limit <数字>     限制显示的提交数量 (默认: 50)
  --format <类型>    输出格式 (full|detailed, 默认: full)
  --since <日期>     显示指定日期以来的提交 (如: "2 weeks ago")
  --author <作者>    显示指定作者的提交
  --stats           显示提交统计信息
  --status          显示 Git 状态
  --branches        显示分支信息
  --save            保存日志到文件
  --help, -h        显示帮助信息

示例:
  node git-log-analyzer.js --limit 20
  node git-log-analyzer.js --since "1 week ago" --author "John Doe"
  node git-log-analyzer.js --stats --status
    `);
    return;
  }

  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i]) || 50;
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i];
    } else if (arg === '--since' && args[i + 1]) {
      options.since = args[++i];
    } else if (arg === '--author' && args[i + 1]) {
      options.author = args[++i];
    }
  }

  // 检查是否只需要显示统计信息
  if (args.includes('--stats')) {
    console.log('📊 提交统计信息:');
    console.log(`最近 7 天提交数: ${getCommitStats(7)}`);
    console.log(`最近 30 天提交数: ${getCommitStats(30)}`);
    console.log('');
  }

  // 检查是否只需要显示状态
  if (args.includes('--status')) {
    console.log('📋 Git 状态:');
    console.log(getGitStatus());
    console.log('');
  }

  // 检查是否只需要显示分支
  if (args.includes('--branches')) {
    console.log('🌿 Git 分支:');
    console.log(getGitBranches());
    console.log('');
  }

  // 如果没有指定只显示统计、状态或分支，则显示日志
  if (!args.includes('--stats') && !args.includes('--status') && !args.includes('--branches')) {
    console.log('📋 Git 提交历史:');
    const gitLog = getGitLog(options);
    console.log(gitLog);
    console.log('');

    if (args.includes('--save')) {
      saveGitLogToFile(gitLog, `git-log-${new Date().toISOString().split('T')[0]}.txt`);
    }
  }
}

// 运行主函数
main();