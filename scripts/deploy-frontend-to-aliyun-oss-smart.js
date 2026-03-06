require('dotenv').config(); // 加载 .env 文件
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// 阿里云 ECS 实例角色 STS 凭证获取和 OSS 部署脚本
// 通过 ECS 实例角色获取 STS 临时凭证上传文件到 OSS
// 如果不在 ECS 上运行，则使用传统 AccessKey 方式

console.log('===========================================');
console.log('黄氏家族寻根平台 - 智能 OSS 部署脚本 (ECS STS 或传统方式)');
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
const ROLE_NAME = process.env.ECS_ROLE_NAME || 'hxfund-oss-upload-role'; // 默认角色名
const BUCKET_NAME = process.env.ALIYUN_OSS_BUCKET_NAME;
const ENDPOINT = process.env.ALIYUN_OSS_ENDPOINT || 'oss-cn-hangzhou.aliyuncs.com';

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

// 检查是否在 ECS 实例上运行
function checkIfOnECS() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '100.100.100.100',
      port: 80,
      path: '/latest/meta-data/instance-id',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 && data.startsWith('i-')) {
          console.log('✓ 检测到在 ECS 实例上运行');
          resolve(true);
        } else {
          console.log('ℹ 检测到不在 ECS 实例上运行，将尝试使用传统 AccessKey 方式');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('ℹ 检测到不在 ECS 实例上运行，将尝试使用传统 AccessKey 方式');
      resolve(false);
    });

    req.end();
  });
}

// 从 ECS 元数据服务获取 STS 临时凭证
function getSTSCredentials() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '100.100.100.100',
      port: 80,
      path: `/latest/meta-data/ram/security-credentials/${ROLE_NAME}`,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const credentials = JSON.parse(data);
            if (credentials.Code === 'Success') {
              console.log('✓ 成功获取 STS 临时凭证');
              console.log(`  - AccessKeyId: ${credentials.AccessKeyId.substring(0, 8)}...`);
              console.log(`  - 过期时间: ${credentials.Expiration}`);
              resolve(credentials);
            } else {
              reject(new Error(`获取 STS 凭证失败: ${credentials.Code}`));
            }
          } catch (e) {
            reject(new Error(`解析 STS 凭证响应失败: ${e.message}`));
          }
        } else {
          reject(new Error(`获取 STS 凭证失败，HTTP状态码: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求 ECS 元数据服务失败: ${error.message}`));
    });

    req.end();
  });
}

// 验证构建文件完整性
function validateBuildFiles() {
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
      process.exit(1);
    }
  }

  console.log('✓ 所有必要文件检查通过');
}

// 配置 ossutil 使用 STS 凭证
function configureOssutilWithSTS(credentials) {
  console.log('\\n步骤: 配置 ossutil 使用 STS 凭证...');
  
  try {
    // 创建临时配置文件
    const configDir = path.join(require('os').homedir(), '.ossutilconfig_sts');
    const configContent = `[Credentials]
language = EN
accessKeyID = ${credentials.AccessKeyId}
accessKeySecret = ${credentials.AccessKeySecret}
securityToken = ${credentials.SecurityToken}
endpoint = ${ENDPOINT}
`;
    
    fs.writeFileSync(configDir, configContent);
    console.log('✓ ossutil STS 配置完成');
    
    return configDir;
  } catch (error) {
    console.error('✗ ossutil STS 配置失败:', error.message);
    process.exit(1);
  }
}

// 配置 ossutil 使用传统 AccessKey
function configureOssutilWithAccessKey() {
  console.log('\\n步骤: 配置 ossutil 使用传统 AccessKey...');
  
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  
  if (!accessKeyId || !accessKeySecret) {
    console.error('✗ 未设置 ALIYUN_ACCESS_KEY_ID 或 ALIYUN_ACCESS_KEY_SECRET 环境变量');
    console.log('\\n请设置以下环境变量：');
    console.log('  export ALIYUN_ACCESS_KEY_ID="your-access-key-id"');
    console.log('  export ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"');
    console.log('  export ALIYUN_OSS_BUCKET_NAME="your-bucket-name"');
    process.exit(1);
  }
  
  try {
    // 创建临时配置文件
    const configDir = path.join(require('os').homedir(), '.ossutilconfig_accesskey');
    const configContent = `[Credentials]
language = EN
accessKeyID = ${accessKeyId}
accessKeySecret = ${accessKeySecret}
endpoint = ${ENDPOINT}
`;
    
    fs.writeFileSync(configDir, configContent);
    console.log('✓ ossutil AccessKey 配置完成');
    
    return configDir;
  } catch (error) {
    console.error('✗ ossutil AccessKey 配置失败:', error.message);
    process.exit(1);
  }
}

// 部署到阿里云 OSS
async function deployToOSS(configFile, method) {
  console.log('\\n步骤: 部署到阿里云 OSS...');
  
  if (!BUCKET_NAME) {
    console.error('✗ 未设置 ALIYUN_OSS_BUCKET_NAME 环境变量');
    process.exit(1);
  }
  
  // 构建 OSS URL
  const ossUrl = `oss://${BUCKET_NAME}/`;
    
  try {
    // 上传文件到 OSS
    console.log(`开始上传文件到 ${ossUrl} ...`);
    
    // 上传所有文件，但对不同类型设置不同的缓存策略
    const uploadCommands = [
      // HTML 文件 - 缓存1小时
      `ossutil cp --config-file ${configFile} --recursive --exclude "*" --include "*.html" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=3600"`,
      
      // CSS/JS 文件 - 缓存1年，不可变
      `ossutil cp --config-file ${configFile} --recursive --exclude "*" --include "*.css" --include "*.js" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=31536000, immutable"`,
      
      // 图片和其他静态资源 - 缓存1年，不可变
      `ossutil cp --config-file ${configFile} --recursive --exclude "*" --include "*.png" --include "*.jpg" --include "*.jpeg" --include "*.gif" --include "*.svg" --include "*.ico" --include "*.woff" --include "*.woff2" --include "*.ttf" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=31536000, immutable"`,
      
      // 其他文件 - 缓存1小时
      `ossutil cp --config-file ${configFile} --recursive --exclude "*.html" --exclude "*.css" --exclude "*.js" --exclude "*.png" --exclude "*.jpg" --exclude "*.jpeg" --exclude "*.gif" --exclude "*.svg" --exclude "*.ico" --exclude "*.woff" --exclude "*.woff2" --exclude "*.ttf" "${DIST_DIR}" "${ossUrl}" --meta "Cache-Control:public, max-age=3600"`
    ];
    
    for (const cmd of uploadCommands) {
      console.log(`执行: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    }
    
    console.log('\\n✓ 文件上传完成');
    
    // 获取上传的文件数量
    const filesCount = execSync(`find ${DIST_DIR} -type f | wc -l`, { encoding: 'utf-8' }).trim();
    const totalSize = execSync(`du -sh ${DIST_DIR} | cut -f1`, { encoding: 'utf-8' }).trim();
    
    console.log('\\n步骤: 验证部署...');
    console.log('部署完成！请验证以下内容：');
    console.log(`- 检查网站是否正常访问 (https://${BUCKET_NAME}.${ENDPOINT.replace('oss-', '')})`);
    console.log('- 验证CSS和JS文件是否正确加载');
    console.log('- 测试所有功能是否正常工作');
    
    console.log('\\n部署信息:');
    console.log(`- 部署时间: ${new Date().toISOString()}`);
    console.log(`- 部署文件: ${filesCount} 个文件`);
    console.log(`- 部署大小: ${totalSize}`);
    console.log(`- 部署位置: ${ossUrl}`);
    console.log(`- 部署方式: ${method}`);
    
    if (method === 'ECS STS') {
      console.log(`- 使用的 ECS 角色: ${ROLE_NAME}`);
    }
    
    console.log('\\n===========================================');
    console.log('部署完成！');
    console.log('如有问题，请检查阿里云控制台 OSS 管理页面');
    console.log('===========================================');
    
    // 提示用户配置 CDN
    console.log('\\n可选步骤: 如果需要 CDN 加速，请在阿里云控制台配置 CDN 并绑定自定义域名。');
    
  } catch (error) {
    console.error('✗ 部署过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 主函数
async function main() {
  validateBuildFiles();
  
  console.log('\\n步骤 1: 检测运行环境...');
  const isOnECS = await checkIfOnECS();
  
  let configFile;
  
  if (isOnECS) {
    console.log('\\n步骤 2: 获取 STS 临时凭证...');
    try {
      const stsCredentials = await getSTSCredentials();
      
      // 配置 ossutil
      configFile = configureOssutilWithSTS(stsCredentials);
      
      // 执行部署
      await deployToOSS(configFile, 'ECS STS');
    } catch (error) {
      console.error('✗ 获取 STS 凭证失败:', error.message);
      console.log('\\n尝试使用传统 AccessKey 方式...');
      
      // 使用传统 AccessKey 方式
      configFile = configureOssutilWithAccessKey();
      await deployToOSS(configFile, 'Traditional AccessKey');
    }
  } else {
    // 不在 ECS 上，使用传统 AccessKey 方式
    configFile = configureOssutilWithAccessKey();
    await deployToOSS(configFile, 'Traditional AccessKey');
  }
  
  // 清理临时配置文件
  try {
    if (configFile && fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
      console.log('\\n✓ 已清理临时配置文件');
    }
  } catch (err) {
    console.warn('⚠ 未能清理临时配置文件:', err.message);
  }
}

// 运行主函数
main().catch(error => {
  console.error('✗ 部署脚本执行失败:', error.message);
  process.exit(1);
});