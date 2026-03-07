/**
 * 黄氏家族寻根平台 - 阿里云虚拟主机 FTP 部署脚本（命令行工具版本）
 * 使用 lftp 命令行工具进行 FTP 部署
 */

require('dotenv').config(); // 加载 .env 文件
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 从环境变量或配置文件获取FTP配置
const ftpConfig = {
    host: process.env.ALIYUN_FTP_HOST || process.env.FTP_HOST || 'your-aliyun-ftp-host.com',
    port: process.env.ALIYUN_FTP_PORT || process.env.FTP_PORT || 21,
    user: process.env.ALIYUN_FTP_USER || process.env.FTP_USER || '',
    password: process.env.ALIYUN_FTP_PASS || process.env.FTP_PASS || '',
    remoteDir: process.env.ALIYUN_FTP_REMOTE_DIR || process.env.FTP_REMOTE || '/htdocs'
};

// 检查必要配置
if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    console.error('❌ FTP 配置缺失！请设置以下环境变量：');
    console.error('   ALIYUN_FTP_HOST 或 FTP_HOST - FTP 服务器地址');
    console.error('   ALIYUN_FTP_USER 或 FTP_USER - FTP 用户名');
    console.error('   ALIYUN_FTP_PASS 或 FTP_PASS - FTP 密码');
    console.error('   ALIYUN_FTP_PORT 或 FTP_PORT - FTP 端口 (可选，默认 21)');
    console.error('   ALIYUN_FTP_REMOTE_DIR 或 FTP_REMOTE - 远程目录 (可选，默认 /htdocs)');
    console.error('');
    console.error('示例:');
    console.error('   export ALIYUN_FTP_HOST="your-ftp-server.com"');
    console.error('   export ALIYUN_FTP_USER="your-username"');
    console.error('   export ALIYUN_FTP_PASS="your-password"');
    console.error('   npm run deploy:aliyun:ftp');
    process.exit(1);
}

// 源目录和目标目录
const SOURCE_DIR = path.join(__dirname, '..', 'dist');
const TARGET_DIR = ftpConfig.remoteDir;

if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
    console.error('   请先运行构建命令: npm run build');
    process.exit(1);
}

// 检查是否安装了 lftp
try {
    execSync('which lftp', { encoding: 'utf-8' });
    console.log('✅ lftp 已安装');
} catch (error) {
    console.error('❌ 未找到 lftp 命令，请先安装:');
    console.error('   Ubuntu/Debian: sudo apt-get install lftp');
    console.error('   CentOS/RHEL: sudo yum install lftp');
    console.error('   macOS: brew install lftp');
    process.exit(1);
}

console.log('🚀 开始部署到阿里云FTP虚拟主机...');
console.log(`   FTP服务器: ${ftpConfig.host}:${ftpConfig.port}`);
console.log(`   用户名: ${ftpConfig.user}`);
console.log(`   源目录: ${SOURCE_DIR}`);
console.log(`   目标目录: ${TARGET_DIR}`);
console.log('');

try {
    console.log('🔌 正在连接到FTP服务器并上传文件...');
    
    // 定义一个函数来安全地转义可能包含特殊字符的字符串
    function escapeForLftp(str) {
        // 对于lftp命令，我们需要特别小心处理特殊字符
        // 将双引号替换为转义形式，以及其他可能导致解析问题的字符
        return str
            .replace(/\\/g, '\\\\')  // 转义反斜杠
            .replace(/"/g, '\\"')    // 转义双引号
            .replace(/\$/g, '\\$')   // 转义美元符号
            .replace(/`/g, '\\`');   // 转义反引号
    }
    
    // 构建 lftp 命令 - 使用转义后的用户名和密码
    const escapedUser = escapeForLftp(ftpConfig.user);
    const escapedPass = escapeForLftp(ftpConfig.password);
    
    const lftpCommand = `
        set ftp:list-options -a;
        set ftp:ssl-protect-data true;
        open ftp://${ftpConfig.host}:${ftpConfig.port};
        user "${escapedUser}" "${escapedPass}";
        # 检查目标目录是否存在，如果不存在则创建
        mkdir -p ${TARGET_DIR};
        cd ${TARGET_DIR};
        lcd ${SOURCE_DIR};
        mirror --reverse --delete --verbose;
        bye
    `;
    
    console.log('⏳ 执行 lftp 命令...');
    console.log('(正在使用安全方式处理密码，避免在命令行中直接暴露)');

    // 创建临时lftp脚本文件以避免在命令行中直接暴露密码
    const os = require('os');
    const tempScriptPath = path.join(os.tmpdir(), `lftp_${Date.now()}.script`);

    try {
        // 写入临时脚本文件
        fs.writeFileSync(tempScriptPath, lftpCommand);
        
        // 使用 -f 参数执行脚本文件，这样密码不会出现在命令行参数中
        const result = execSync(`lftp -f "${tempScriptPath}"`, {
            encoding: 'utf-8',
            stdio: 'inherit' // 直接继承父进程的stdio，这样能看到实时进度
        });
    } finally {
        // 确保清理临时文件
        if (fs.existsSync(tempScriptPath)) {
            try {
                fs.unlinkSync(tempScriptPath);
            } catch (cleanupErr) {
                console.warn(`⚠️  清理临时脚本文件失败: ${cleanupErr.message}`);
            }
        }
    }
    
    console.log('');
    console.log('✅ 所有文件上传完成！');
    
    console.log('\n🎉 部署成功！');
    console.log(`🌐 您的网站现在可以通过以下地址访问:`);
    console.log(`   http://${ftpConfig.host}`);
    console.log(`   或者根据您的域名配置访问 (如 www.hxfund.cn)`);
    console.log('');
    console.log('💡 提示: 如果使用了CDN，请记得清除CDN缓存以使更改生效。');
    
} catch (error) {
    console.error('❌ 部署过程中发生错误:');
    console.error(error.message);
    process.exit(1);
}