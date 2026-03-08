/**
 * 黄氏家族寻根平台 - 项目进展自动记录脚本
 * 
 * 使用方法:
 *   node scripts/save-progress.js
 *   node scripts/save-progress.js --message "完成留言功能"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const PROJECT_ROOT = path.join(__dirname, '..');
const PROGRESS_FILE = path.join(PROJECT_ROOT, 'PROJECT_PROGRESS.md');

// 解析命令行参数
const args = process.argv.slice(2);
const customMessage = args.find(arg => arg.startsWith('--message='))?.split('=')[1] || '';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     黄氏家族寻根平台 - 项目进展记录                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// 获取当前时间
const now = new Date();
const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
const dateStr = now.toISOString().slice(0, 10);

// 读取现有进展文件
let progressContent = '';
let lastUpdate = '';

if (fs.existsSync(PROGRESS_FILE)) {
    progressContent = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    const match = progressContent.match(/\*\*最后更新\*\*: (.+)/);
    lastUpdate = match ? match[1].split(' ')[0] : '';
}

// 检查 Git 状态
console.log('📊 检查 Git 状态...');
let gitStatus = '';
let gitDiff = '';
let gitLog = '';

try {
    gitStatus = execSync('git status --short', { encoding: 'utf-8', cwd: PROJECT_ROOT });
    gitDiff = execSync('git diff HEAD --stat', { encoding: 'utf-8', cwd: PROJECT_ROOT });
    gitLog = execSync('git log -n 3 --oneline', { encoding: 'utf-8', cwd: PROJECT_ROOT });
} catch (e) {
    console.log('⚠️  Git 操作失败:', e.message);
}

// 检查文件变更
const changedFiles = gitStatus.split('\n').filter(line => line.trim()).map(line => {
    const parts = line.trim().split(/\s+/);
    return {
        status: parts[0],
        file: parts.slice(1).join(' ')
    };
});

console.log(`   找到 ${changedFiles.length} 个变更文件`);

// 生成更新内容
const updateSection = `
## 🔄 本次更新 (${dateStr} ${timestamp.slice(11, 19)})

${customMessage ? `**说明**: ${customMessage}\n` : ''}
### 文件变更
${changedFiles.length > 0 
    ? changedFiles.map(f => `- \`${f.status}\` ${f.file}`).join('\n')
    : '- 无未提交的变更'}

### 最近提交
${gitLog.split('\n').filter(l => l).map(l => `- ${l}`).join('\n')}

---
`;

// 更新文件内容
let newContent = progressContent;

if (lastUpdate === dateStr) {
    // 今天已更新过，替换最新更新时间
    newContent = progressContent.replace(
        /\*\*最后更新\*\*: .+/,
        `**最后更新**: ${timestamp}`
    );
    
    // 在待解决问题后添加更新
    const todoMatch = newContent.match(/(## ⚠️ 待解决问题[\s\S]*?)(?=## |\Z)/);
    if (todoMatch) {
        const insertPos = todoMatch.index + todoMatch[0].length;
        newContent = newContent.slice(0, insertPos) + updateSection + newContent.slice(insertPos);
    }
} else {
    // 新的一天，在文件开头添加新章节
    const header = `# 黄氏家族寻根平台 - 项目进展记录

**最后更新**: ${timestamp}  
**版本**: 3.3.0

---
`;
    const restContent = progressContent.split('---').slice(2).join('---') || '';
    newContent = header + updateSection + '\n' + restContent;
}

// 写回文件
fs.writeFileSync(PROGRESS_FILE, newContent, 'utf-8');
console.log(`✅ 进展记录已更新：${PROGRESS_FILE}`);

// 如果有变更，提交并推送
if (changedFiles.length > 0 || !progressContent) {
    console.log('\n📤 提交并推送进展记录...\n');
    
    try {
        // 添加文件
        execSync('git add PROJECT_PROGRESS.md', { 
            cwd: PROJECT_ROOT, 
            stdio: 'pipe' 
        });
        console.log('✅ git add PROJECT_PROGRESS.md');
        
        // 提交
        const commitMsg = customMessage 
            ? `docs: 更新项目进展 - ${customMessage}`
            : `docs: 更新项目进展 (${dateStr})`;
        
        execSync(`git commit -m "${commitMsg}"`, { 
            cwd: PROJECT_ROOT, 
            stdio: 'pipe' 
        });
        console.log(`✅ git commit -m "${commitMsg}"`);
        
        // 推送到 GitCode
        console.log('\n📤 推送到 GitCode...');
        const pushOrigin = execSync('git push origin main', { 
            cwd: PROJECT_ROOT, 
            encoding: 'utf-8' 
        });
        console.log('✅ git push origin main');
        
        // 推送到 GitHub
        console.log('\n📤 推送到 GitHub...');
        const pushUpstream = execSync('git push upstream main', { 
            cwd: PROJECT_ROOT, 
            encoding: 'utf-8' 
        });
        console.log('✅ git push upstream main');
        
        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                    ✅ 进展记录完成！                       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
        
    } catch (e) {
        console.error('\n❌ 推送失败:', e.message);
        if (e.stdout) console.log(e.stdout);
        if (e.stderr) console.error(e.stderr);
    }
} else {
    console.log('\nℹ️  无变更需要提交');
}

// 显示当前状态
console.log('📋 当前 Git 状态:');
console.log(gitStatus || '   工作树干净');
console.log('');
