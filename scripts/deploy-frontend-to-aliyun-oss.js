require('dotenv').config(); // 加载 .env 文件
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 阿里云 OSS 部署脚本
// 用于将构建的前端文件部署到阿里云 OSS

console.log('===========================================');
console.log('黄氏家族寻根平台 - 阿里云 OSS 部署脚本');
console.log('===========================================');

// 检查是否安装了 ossutil
try {
  execSync('which ossutil', { encoding: 'utf-8' });
  console.log('✓ ossutil 已安装');
} catch (error) {
  console.error('✗ 未找到 ossutil，请先安装阿里云 OSS 客户端工具');
  console.log('安装方法：');
  console.log('  Linux/macOS: wget http://gosspublic.alicdn.com/ossutil/install.sh && sudo sh install.sh');
  console.log('  Windows: 下载 https://help.aliyun.com/document_detail/50452.htm');
  process.exit(1);
}

// 配置变量
const DEPLOY_DIR = '/root/hxfund';
const DIST_DIR = path.join(DEPLOY_DIR, 'dist');
const BACKUP_DIR = path.join(DEPLOY_DIR, 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_NAME = `backup_${TIMESTAMP}`;

// 检查构建目录是否存在
if (!fs.existsSync(DIST_DIR)) {
  console.error(`✗ 错误: 未找到构建目录 ${DIST_DIR}`);
  console.log('请先运行 \'npm run build\' 生成构建文件');
  process.exit(1);
}

console.log('✓ 构建文件检查通过');

// 读取构建时间
if (fs.existsSync(path.join(DIST_DIR, 'manifest.json'))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf8'));
  console.log(`构建时间: ${manifest.buildTime || 'N/A'}`);
}

// 询问用户是否继续部署
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('是否继续部署到阿里云 OSS? (y/N): ', (answer) => {
  if (!/^(y|yes)$/i.test(answer)) {
    console.log('部署已取消');
    rl.close();
    process.exit(0);
  }

  // 创建备份目录
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  console.log('\\n步骤 1: 验证构建文件完整性...');
  
  const requiredFiles = [
    path.join(DIST_DIR, 'index.html'),
    path.join(DIST_DIR, 'css', 'style.min.css'),
    path.join(DIST_DIR, 'js', 'main.min.js'),
    path.join(DIST_DIR, 'js', 'data.min.js'),
    path.join(DIST_DIR, 'js', 'modules.min.js'),
    path.join(DIST_DIR, 'js', 'script.min.js'),
    path.join(DIST_DIR, 'manifest.json')
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`✗ 错误: 缺少必要文件 ${file}`);
      rl.close();
      process.exit(1);
    }
  }

  console.log('✓ 所有必要文件检查通过');

  console.log('\\n步骤 2: 获取阿里云 OSS 配置...');

  rl.question('请输入 OSS Bucket 名称 (例如: your-bucket): ', (bucketName) => {
    rl.question('请输入 AccessKeyId: ', (accessKeyId) => {
      rl.question('请输入 AccessKeySecret: ', (accessKeySecret) => {
        rl.question('请输入 OSS Endpoint (例如: oss-cn-hangzhou.aliyuncs.com): ', (endpoint) => {
          
          // 设置 ossutil 配置
          console.log('\\n正在配置 ossutil...');
          try {
            execSync(`ossutil config -e ${endpoint} -i ${accessKeyId} -k ${accessKeySecret}`, { stdio: 'inherit' });
            console.log('✓ ossutil 配置成功');
          } catch (error) {
            console.error('✗ ossutil 配置失败:', error.message);
            rl.close();
            process.exit(1);
          }

          console.log('\\n步骤 3: 部署到阿里云 OSS...');

          // 构建 OSS URL
          const ossUrl = `oss://${bucketName}/`;
          
          try {
            // 上传文件到 OSS
            console.log(`开始上传文件到 ${ossUrl} ...`);
            
            // 上传所有文件，但对不同类型设置不同的缓存策略
            const uploadCommands = [
              // HTML 文件 - 缓存1小时
              `ossutil cp --recursive --exclude "*" --include "*.html" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=3600"`,
              
              // CSS/JS 文件 - 缓存1年，不可变
              `ossutil cp --recursive --exclude "*" --include "*.css" --include "*.js" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=31536000, immutable"`,
              
              // 图片和其他静态资源 - 缓存1年，不可变
              `ossutil cp --recursive --exclude "*" --include "*.png" --include "*.jpg" --include "*.jpeg" --include "*.gif" --include "*.svg" --include "*.ico" --include "*.woff" --include "*.woff2" --include "*.ttf" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=31536000, immutable"`,
              
              // 其他文件 - 缓存1小时
              `ossutil cp --recursive --exclude "*.html" --exclude "*.css" --exclude "*.js" --exclude "*.png" --exclude "*.jpg" --exclude "*.jpeg" --exclude "*.gif" --exclude "*.svg" --exclude "*.ico" --exclude "*.woff" --exclude "*.woff2" --exclude "*.ttf" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=3600"`
            ];
            
            for (const cmd of uploadCommands) {
              console.log(`执行: ${cmd}`);
              execSync(cmd, { stdio: 'inherit' });
            }
            
            console.log('\\n✓ 文件上传完成');
            
            // 获取上传的文件数量
            const filesCount = execSync(`find ${DIST_DIR} -type f | wc -l`, { encoding: 'utf-8' }).trim();
            const totalSize = execSync(`du -sh ${DIST_DIR} | cut -f1`, { encoding: 'utf-8' }).trim();
            
            console.log('\\n步骤 4: 验证部署...');
            console.log('部署完成！请验证以下内容：');
            console.log(`- 检查网站是否正常访问 (https://${bucketName}.${endpoint.replace('oss-', '')})`);
            console.log('- 验证CSS和JS文件是否正确加载');
            console.log('- 测试所有功能是否正常工作');
            
            console.log('\\n部署信息:');
            console.log(`- 部署时间: ${new Date().toISOString()}`);
            console.log(`- 部署文件: ${filesCount} 个文件`);
            console.log(`- 部署大小: ${totalSize}`);
            console.log(`- 部署位置: ${ossUrl}`);
            
            console.log('\\n===========================================');
            console.log('部署完成！');
            console.log('如有问题，请检查阿里云控制台 OSS 管理页面');
            console.log('===========================================');
            
            // 提示用户配置 CDN
            console.log('\\n可选步骤: 如果需要 CDN 加速，请在阿里云控制台配置 CDN 并绑定自定义域名。');
            
          } catch (error) {
            console.error('✗ 部署过程中出现错误:', error.message);
            rl.close();
            process.exit(1);
          }
          
          rl.close();
        });
      });
    });
  });
});