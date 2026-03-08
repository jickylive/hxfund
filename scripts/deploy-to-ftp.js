/**
 * 黄氏家族寻根平台 - FTP 部署脚本 (使用 basic-ftp)
 * 用于将构建后的文件部署到阿里云 FTP 虚拟主机
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

// FTP 配置
const ftpConfig = {
    host: process.env.FTP_HOST || process.env.ALIYUN_FTP_HOST || '',
    port: parseInt(process.env.FTP_PORT || process.env.ALIYUN_FTP_PORT || '21'),
    user: process.env.FTP_USER || process.env.ALIYUN_FTP_USER || '',
    password: process.env.FTP_PASS || process.env.ALIYUN_FTP_PASS || '',
    secure: process.env.FTP_SECURE === 'true' || false
};

const SOURCE_DIR = path.join(__dirname, '..', 'dist');
const TARGET_DIR = process.env.FTP_REMOTE || process.env.ALIYUN_FTP_REMOTE_DIR || '/htdocs';

// 检查配置
if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    console.error('❌ FTP 配置缺失！请检查 .env 文件中的以下配置：');
    console.error('   FTP_HOST / ALIYUN_FTP_HOST - FTP 服务器地址');
    console.error('   FTP_USER / ALIYUN_FTP_USER - FTP 用户名');
    console.error('   FTP_PASS / ALIYUN_FTP_PASS - FTP 密码');
    process.exit(1);
}

if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在：${SOURCE_DIR}`);
    console.error('   请先运行构建命令：npm run build');
    process.exit(1);
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     黄氏家族寻根平台 - FTP 部署脚本                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('📋 配置信息:');
console.log(`   FTP 服务器：${ftpConfig.host}:${ftpConfig.port}`);
console.log(`   用户名：${ftpConfig.user}`);
console.log(`   源目录：${SOURCE_DIR}`);
console.log(`   目标目录：${TARGET_DIR}`);
console.log(`   安全连接：${ftpConfig.secure ? '是 (FTPS)' : '否 (FTP)'}`);
console.log('');

async function uploadDirectory(client, localDir, remoteDir) {
    const files = fs.readdirSync(localDir);
    
    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = remoteDir + '/' + file;
        const stat = fs.statSync(localPath);
        
        if (stat.isFile()) {
            try {
                await client.uploadFrom(localPath, remotePath);
                console.log(`   ✅ ${remotePath}`);
            } catch (err) {
                console.error(`   ❌ 上传失败：${remotePath} - ${err.message}`);
            }
        } else if (stat.isDirectory()) {
            try {
                await client.ensureDir(remotePath);
                console.log(`   📁 ${remotePath}`);
                await uploadDirectory(client, localPath, remotePath);
            } catch (err) {
                console.error(`   ❌ 目录失败：${remotePath} - ${err.message}`);
            }
        }
    }
}

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        console.log('🔌 正在连接 FTP 服务器...');
        await client.access(ftpConfig);
        console.log('✅ FTP 连接成功\n');
        
        console.log('📤 开始上传文件...');
        await uploadDirectory(client, SOURCE_DIR, TARGET_DIR);
        
        console.log('\n✅ 所有文件上传完成！');
        console.log('\n🎉 部署成功！');
        console.log(`🌐 网站地址：http://${ftpConfig.host}`);
        
    } catch (err) {
        console.error('❌ 部署失败:', err.message);
        process.exit(1);
    } finally {
        client.close();
        console.log('🔒 FTP 连接已关闭');
    }
}

deploy();
