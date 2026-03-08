#!/usr/bin/env node

/**
 * 黄氏家族寻根平台 - 统一构建脚本
 * 
 * 功能：
 * 1. 构建前端资源
 * 2. 优化静态资源
 * 3. 生成生产环境包
 * 4. 验证构建产物
 */

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function dirname(filepath) {
  return filepath.substring(0, filepath.lastIndexOf('/')) || filepath.substring(0, filepath.lastIndexOf('\\'));
}

const BUILD_DIR = './dist';
const FRONTEND_SRC = './frontend';
const FRONTEND_DIST = './frontend/dist';
const PUBLIC_DIR = './public';
const SERVER_DIR = './server';

console.log('===========================================');
console.log('黄氏家族寻根平台 - 统一构建脚本');
console.log('===========================================');

// 清理构建目录
console.log('\\n步骤 1: 清理构建目录...');
if (existsSync(BUILD_DIR)) {
  rmSync(BUILD_DIR, { recursive: true, force: true });
}
mkdirSync(BUILD_DIR, { recursive: true });
console.log('✓ 构建目录已清理');

// 构建前端
console.log('\n步骤 2: 构建前端资源...');
try {
  execSync('npm run build', { cwd: FRONTEND_SRC + '/src', stdio: 'inherit' });
  console.log('✓ 前端构建完成');
} catch (error) {
  console.error('✗ 前端构建失败:', error.message);
  process.exit(1);
}

// 构建博客
console.log('\\n步骤 2.5: 构建 Hexo 博客...');
try {
  const BLOG_DIR = './blog';
  execSync('npm run build:dist', { cwd: BLOG_DIR, stdio: 'inherit' });
  console.log('✓ 博客构建完成');
} catch (error) {
  console.error('✗ 博客构建失败:', error.message);
  // 博客构建失败不影响主流程，仅警告
  console.warn('⚠ 跳过博客构建');
}

// 复制前端构建产物到主构建目录
console.log('\n步骤 3: 复制前端构建产物...');

if (existsSync(FRONTEND_DIST)) {
  copyDirectory(FRONTEND_DIST, BUILD_DIR);
  console.log('✓ 前端构建产物已复制');
} else {
  console.warn('⚠ 前端构建产物不存在，跳过复制');
}

// 复制后端静态资源
console.log('\n步骤 4: 复制后端静态资源...');
if (existsSync(PUBLIC_DIR)) {
  copyDirectory(PUBLIC_DIR, join(BUILD_DIR, 'public'));
  console.log('✓ 后端静态资源已复制');
} else {
  console.warn('⚠ public 目录不存在，跳过复制');
}

// 复制服务器代码
console.log('\n步骤 5: 复制服务器代码...');
if (existsSync(SERVER_DIR)) {
  copyDirectory(SERVER_DIR, join(BUILD_DIR, 'server'));
  console.log('✓ 服务器代码已复制');
} else {
  console.warn('⚠ server 目录不存在，跳过复制');
}

// 复制主文件
console.log('\\n步骤 6: 复制主文件...');
const rootFiles = ['package.json', 'package-lock.json', 'qwen-code.js', 'Dockerfile', 'docker-compose.yml', '.env.example'];
rootFiles.forEach(file => {
  const src = join('.', file);
  if (existsSync(src)) {
    copyFileSync(src, join(BUILD_DIR, file));
  }
});

// 生成构建信息
console.log('\\n步骤 7: 生成构建信息...');
const buildInfo = {
  timestamp: new Date().toISOString(),
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  commit: execSync('git rev-parse HEAD').toString().trim(),
  branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
};

writeFileSync(join(BUILD_DIR, 'BUILD_INFO.json'), JSON.stringify(buildInfo, null, 2));

// 验证构建产物
console.log('\\n步骤 8: 验证构建产物...');
const requiredFiles = [
  join(BUILD_DIR, 'index.html'),
  join(BUILD_DIR, 'public', 'css', 'style.css'),
  join(BUILD_DIR, 'public', 'js', 'script.js'),
  join(BUILD_DIR, 'server', 'index.js'),
  join(BUILD_DIR, 'package.json')
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`✗ 缺少必要文件: ${file}`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('✓ 所有构建产物验证通过');
} else {
  console.error('✗ 构建产物验证失败');
  process.exit(1);
}

// 输出构建统计
console.log('\\n步骤 9: 构建统计...');
const buildSize = getDirectorySize(BUILD_DIR);
console.log(`总构建大小: ${(buildSize / (1024 * 1024)).toFixed(2)} MB`);

console.log('\\n===========================================');
console.log('构建完成!');
console.log(`输出目录: ${resolve(BUILD_DIR)}`);
console.log('===========================================');

// 辅助函数
function copyDirectory(src, dest) {
  // 确保目标目录存在
  mkdirSync(dest, { recursive: true });
  
  const items = readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = join(src, item.name);
    const destPath = join(dest, item.name);

    if (item.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      try {
        copyFileSync(srcPath, destPath);
      } catch (err) {
        console.warn(`⚠ 复制文件失败：${srcPath} -> ${destPath}`);
      }
    }
  }
}

function getDirectorySize(dir) {
  const items = readdirSync(dir, { withFileTypes: true });
  let size = 0;
  
  for (const item of items) {
    const itemPath = join(dir, item.name);
    
    if (item.isDirectory()) {
      size += getDirectorySize(itemPath);
    } else {
      size += statSync(itemPath).size;
    }
  }
  
  return size;
}

function existsSync(path) {
  try {
    statSync(path);
    return true;
  } catch (err) {
    return false;
  }
}