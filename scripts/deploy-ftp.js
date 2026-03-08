/**
 * 黄氏家族寻根平台 - FTP 部署脚本
 * 用于将构建后的文件部署到阿里云FTP虚拟主机
 */

const fs = require('fs');
const path = require('path');
const Client = require('ftp');

// 从环境变量或配置文件获取FTP配置
const ftpConfig = {
    host: process.env.FTP_HOST || '',
    port: process.env.FTP_PORT || 21,
    user: process.env.FTP_USER || '',
    password: process.env.FTP_PASS || '',
    secure: process.env.FTP_SECURE === 'true' || false
};

// 检查必要配置
if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    console.error('❌ FTP 配置缺失！请设置以下环境变量：');
    console.error('   FTP_HOST - FTP 服务器地址');
    console.error('   FTP_USER - FTP 用户名');
    console.error('   FTP_PASS - FTP 密码');
    console.error('   FTP_PORT - FTP 端口 (可选，默认 21)');
    console.error('   FTP_SECURE - 是否使用 SSL (可选，默认 false)');
    process.exit(1);
}

// 源目录和目标目录
const SOURCE_DIR = path.join(__dirname, '..', 'dist');
const TARGET_DIR = process.env.FTP_REMOTE || '/htdocs'; // 默认上传到 htdocs 目录

if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
    console.error('   请先运行构建命令: node scripts/build.js');
    process.exit(1);
}

console.log('🚀 开始部署到阿里云FTP虚拟主机...');
console.log(`   FTP服务器: ${ftpConfig.host}:${ftpConfig.port}`);
console.log(`   用户名: ${ftpConfig.user}`);
console.log(`   源目录: ${SOURCE_DIR}`);
console.log(`   目标目录: ${TARGET_DIR}`);

// 递归上传文件的函数
function uploadDirectory(ftpClient, localDir, remoteDir, callback) {
    fs.readdir(localDir, (err, files) => {
        if (err) {
            return callback(err);
        }

        let pending = files.length;
        if (!pending) {
            return callback();
        }

        files.forEach(fileName => {
            const filePath = path.join(localDir, fileName);
            const remotePath = remoteDir + '/' + fileName;

            fs.stat(filePath, (err, stat) => {
                if (err) {
                    return callback(err);
                }

                if (stat.isFile()) {
                    // 上传文件
                    ftpClient.put(filePath, remotePath, err => {
                        if (err) {
                            console.error(`   ❌ 文件上传失败: ${remotePath}`);
                            console.error(`      错误: ${err.message}`);
                        } else {
                            console.log(`   ✅ 已上传: ${remotePath}`);
                        }
                        
                        if (!--pending) {
                            callback();
                        }
                    });
                } else if (stat.isDirectory()) {
                    // 创建远程目录并递归上传
                    ftpClient.mkdir(remotePath, true, err => {
                        if (err) {
                            console.error(`   ❌ 创建目录失败: ${remotePath}`);
                            console.error(`      错误: ${err.message}`);
                            if (!--pending) {
                                callback();
                            }
                            return;
                        }

                        console.log(`   📁 创建目录: ${remotePath}`);
                        
                        uploadDirectory(ftpClient, filePath, remotePath, err => {
                            if (err) {
                                console.error(`   ❌ 目录上传失败: ${filePath}`);
                            }
                            
                            if (!--pending) {
                                callback();
                            }
                        });
                    });
                } else {
                    if (!--pending) {
                        callback();
                    }
                }
            });
        });
    });
}

// 连接到FTP服务器并上传文件
function deploy() {
    const ftpClient = new Client();

    ftpClient.on('ready', () => {
        console.log('✅ FTP 连接成功');

        // 更改到目标目录
        ftpClient.cwd(TARGET_DIR, err => {
            if (err) {
                console.error(`❌ 无法进入目标目录: ${TARGET_DIR}`);
                console.error(`   错误: ${err.message}`);
                ftpClient.end();
                process.exit(1);
            }

            console.log(`✅ 进入目标目录: ${TARGET_DIR}`);

            // 开始上传
            uploadDirectory(ftpClient, SOURCE_DIR, TARGET_DIR, err => {
                if (err) {
                    console.error('❌ 上传过程中发生错误:', err.message);
                    ftpClient.end();
                    process.exit(1);
                }

                console.log('✅ 所有文件上传完成！');
                ftpClient.end();
                console.log('🔒 FTP 连接已关闭');
                
                console.log('\n🎉 部署成功！');
                console.log(`🌐 您的网站现在可以通过以下地址访问:`);
                console.log(`   http://${ftpConfig.host}`);
                console.log(`   或者根据您的域名配置访问`);
            });
        });
    });

    ftpClient.on('error', err => {
        console.error('❌ FTP 连接错误:', err.message);
        process.exit(1);
    });

    console.log('🔌 正在连接到FTP服务器...');
    ftpClient.connect(ftpConfig);
}

// 检查是否安装了ftp包
try {
    require.resolve('ftp');
    deploy();
} catch (e) {
    console.error('❌ 未找到 ftp 包，请先安装:');
    console.error('   npm install ftp --save-dev');
    process.exit(1);
}