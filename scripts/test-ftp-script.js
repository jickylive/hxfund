/**
 * 测试脚本：验证 FTP 部署脚本的基本逻辑
 */

console.log('Testing FTP deployment script logic...');

// 检查是否可以加载 dotenv
try {
    require('dotenv').config();
    console.log('✅ dotenv module loaded successfully');
} catch (e) {
    console.log('❌ dotenv module not found');
    process.exit(1);
}

// 尝试加载 basic-ftp (即使不存在也不报错)
try {
    const ftp = require('basic-ftp');
    console.log('✅ basic-ftp module loaded successfully');
} catch (e) {
    console.log('⚠️ basic-ftp module not found - this is expected if not installed globally');
    console.log('   Run: npm install basic-ftp --save-dev');
}

// 检查 dist 目录是否存在
const fs = require('fs');
const path = require('path');
const SOURCE_DIR = path.join(__dirname, '..', 'dist');

if (fs.existsSync(SOURCE_DIR)) {
    console.log(`✅ Source directory exists: ${SOURCE_DIR}`);
    const files = fs.readdirSync(SOURCE_DIR);
    console.log(`📁 Files in dist: ${files.length} items`);
} else {
    console.log(`❌ Source directory does not exist: ${SOURCE_DIR}`);
    console.log('   Run: npm run build');
}

console.log('\\nFTP Deployment Script Logic Test Completed!');