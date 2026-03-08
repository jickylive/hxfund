/**
 * 黄氏家族寻根平台 - dist 目录部署到阿里云 FTP
 * 
 * 功能：
 * - 部署主站到 FTP 根目录
 * - 部署博客到 /blog 子目录
 * 
 * 使用方法：
 *   npm run deploy:dist
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Client = require('ftp');

// FTP 配置
const ftpConfig = {
    host: process.env.ALIYUN_FTP_HOST || process.env.FTP_HOST,
    port: parseInt(process.env.ALIYUN_FTP_PORT || process.env.FTP_PORT || '21'),
    user: process.env.ALIYUN_FTP_USER || process.env.FTP_USER,
    password: process.env.ALIYUN_FTP_PASS || process.env.FTP_PASS,
    secure: process.env.ALIYUN_FTP_SECURE === 'true' || false
};

// 目录配置
const DIST_DIR = path.join(__dirname, '..', 'dist');
const BLOG_DIR = path.join(DIST_DIR, 'blog');

// 检查配置
if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    console.error('❌ FTP 配置缺失！请设置以下环境变量：');
    console.error('   ALIYUN_FTP_HOST 或 FTP_HOST - FTP 服务器地址');
    console.error('   ALIYUN_FTP_USER 或 FTP_USER - FTP 用户名');
    console.error('   ALIYUN_FTP_PASS 或 FTP_PASS - FTP 密码');
    process.exit(1);
}

if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist 目录不存在！请先运行构建：npm run build');
    process.exit(1);
}

// 部署目标
const MAIN_SITE_DIR = process.env.FTP_REMOTE || '/htdocs';
const BLOG_SITE_DIR = process.env.ALIYUN_FTP_REMOTE_DIR || '/htdocs/blog';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     黄氏家族寻根平台 - dist 部署到阿里云 FTP              ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('📋 部署配置:');
console.log(`   FTP 服务器：${ftpConfig.host}:${ftpConfig.port}`);
console.log(`   用户名：${ftpConfig.user}`);
console.log(`   源目录：${DIST_DIR}`);
console.log(`   主站目标：${MAIN_SITE_DIR}`);
console.log(`   博客目标：${BLOG_SITE_DIR}`);
console.log('');

// 获取需要上传的文件列表
function getFiles(dir, base = '') {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(base, entry.name);
        
        if (entry.isDirectory()) {
            files.push(...getFiles(fullPath, relPath));
        } else {
            files.push(relPath);
        }
    }
    
    return files;
}

// 上传文件
function uploadFile(ftpClient, localPath, remotePath) {
    return new Promise((resolve, reject) => {
        ftpClient.put(localPath, remotePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// 创建远程目录
function mkdirRemote(ftpClient, remotePath) {
    return new Promise((resolve, reject) => {
        ftpClient.mkdir(remotePath, true, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// 部署主站文件（排除 blog 目录）
async function deployMainSite(ftpClient) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     部署主站文件                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const files = getFiles(DIST_DIR)
        .filter(f => !f.startsWith('blog') && !f.startsWith('.vite'));
    
    console.log(`📦 需要上传 ${files.length} 个文件到 ${MAIN_SITE_DIR}\n`);
    
    // 创建目标目录
    try {
        await mkdirRemote(ftpClient, MAIN_SITE_DIR);
        await ftpClient.cd(MAIN_SITE_DIR);
        console.log(`✅ 目标目录已准备：${MAIN_SITE_DIR}\n`);
    } catch (err) {
        console.error(`❌ 创建目录失败：${err.message}`);
    }
    
    let uploaded = 0;
    let failed = 0;
    
    for (const file of files) {
        const localPath = path.join(DIST_DIR, file);
        const remotePath = path.posix.join(MAIN_SITE_DIR, file.replace(/\\/g, '/'));
        const remoteDir = path.posix.dirname(remotePath);
        
        try {
            // 确保目录存在
            await mkdirRemote(ftpClient, remoteDir);
            
            // 上传文件
            await uploadFile(ftpClient, localPath, remotePath);
            uploaded++;
            console.log(`   ✅ ${file}`);
        } catch (err) {
            failed++;
            console.error(`   ❌ ${file}: ${err.message}`);
        }
    }
    
    console.log(`\n✅ 主站部署完成：${uploaded} 个文件成功，${failed} 个文件失败\n`);
    return { uploaded, failed };
}

// 部署博客文件
async function deployBlog(ftpClient) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     部署 Hexo 博客文件                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    if (!fs.existsSync(BLOG_DIR)) {
        console.log('⚠️  博客目录不存在，跳过博客部署\n');
        return { uploaded: 0, failed: 0 };
    }
    
    const files = getFiles(BLOG_DIR);
    
    console.log(`📦 需要上传 ${files.length} 个文件到 ${BLOG_SITE_DIR}\n`);
    
    // 创建目标目录
    try {
        await mkdirRemote(ftpClient, BLOG_SITE_DIR);
        await ftpClient.cd(BLOG_SITE_DIR);
        console.log(`✅ 目标目录已准备：${BLOG_SITE_DIR}\n`);
    } catch (err) {
        console.error(`❌ 创建目录失败：${err.message}`);
    }
    
    let uploaded = 0;
    let failed = 0;
    
    for (const file of files) {
        const localPath = path.join(BLOG_DIR, file);
        const remotePath = path.posix.join(BLOG_SITE_DIR, file.replace(/\\/g, '/'));
        const remoteDir = path.posix.dirname(remotePath);
        
        try {
            // 确保目录存在
            await mkdirRemote(ftpClient, remoteDir);
            
            // 上传文件
            await uploadFile(ftpClient, localPath, remotePath);
            uploaded++;
            console.log(`   ✅ ${file}`);
        } catch (err) {
            failed++;
            console.error(`   ❌ ${file}: ${err.message}`);
        }
    }
    
    console.log(`\n✅ 博客部署完成：${uploaded} 个文件成功，${failed} 个文件失败\n`);
    return { uploaded, failed };
}

// 主函数
async function deploy() {
    const ftpClient = new Client();
    
    ftpClient.on('error', (err) => {
        console.error('❌ FTP 连接错误:', err.message);
    });
    
    try {
        console.log('🔌 正在连接 FTP 服务器...\n');
        await ftpClient.connect(ftpConfig);
        console.log('✅ FTP 连接成功\n');
        
        // 部署主站
        const mainStats = await deployMainSite(ftpClient);
        
        // 部署博客
        const blogStats = await deployBlog(ftpClient);
        
        // 关闭连接
        ftpClient.end();
        console.log('🔒 FTP 连接已关闭\n');
        
        // 统计
        const totalUploaded = mainStats.uploaded + blogStats.uploaded;
        const totalFailed = mainStats.failed + blogStats.failed;
        
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                    部署完成                               ║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log(`║  主站文件：${mainStats.uploaded} 个成功，${mainStats.failed} 个失败`.padEnd(56) + '║');
        console.log(`║  博客文件：${blogStats.uploaded} 个成功，${blogStats.failed} 个失败`.padEnd(56) + '║');
        console.log(`║  总计：${totalUploaded} 个成功，${totalFailed} 个失败`.padEnd(56) + '║');
        console.log('╠═══════════════════════════════════════════════════════════╣');
        console.log('║  访问地址:'.padEnd(56) + '║');
        console.log(`║    主站：https://www.hxfund.cn/`.padEnd(56) + '║');
        console.log(`║    博客：https://www.hxfund.cn/blog/`.padEnd(56) + '║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');
        
        if (totalFailed > 0) {
            console.log('⚠️  部分文件上传失败，请检查错误信息\n');
            process.exit(1);
        }
        
    } catch (err) {
        console.error('❌ 部署失败:', err.message);
        if (ftpClient) {
            ftpClient.end();
        }
        process.exit(1);
    }
}

// 检查 ftp 包
try {
    require.resolve('ftp');
    deploy();
} catch (e) {
    console.error('❌ 未找到 ftp 包，请先安装：npm install ftp --save-dev');
    process.exit(1);
}
