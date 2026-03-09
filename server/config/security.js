/**
 * 安全配置和工具模块
 * 提供加密、密钥管理、数据脱敏等安全功能
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 加密算法配置
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 32,
  authTagLength: 16,
};

/**
 * 获取加密密钥
 * 优先从环境变量获取，否则从配置文件读取
 */
function getEncryptionKey() {
  // 1. 尝试从环境变量获取
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    return Buffer.from(envKey, 'hex');
  }

  // 2. 尝试从配置文件获取
  const keyFile = path.join(__dirname, 'encryption.key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile);
  }

  // 3. 生成新密钥并保存
  const newKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  fs.writeFileSync(keyFile, newKey, { mode: 0o600 }); // 仅所有者可读写
  return newKey;
}

/**
 * 加密数据
 * @param {string} text - 明文
 * @returns {string} - 加密后的字符串（格式：iv:authTag:encrypted）
 */
function encrypt(text) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // 格式：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`加密失败: ${error.message}`);
  }
}

/**
 * 解密数据
 * @param {string} encryptedText - 加密后的字符串
 * @returns {string} - 明文
 */
function decrypt(encryptedText) {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('无效的加密数据格式');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`);
  }
}

/**
 * 哈希密码
 * @param {string} password - 明文密码
 * @param {string} salt - 盐值（可选）
 * @returns {object} - 包含 hash 和 salt
 */
function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(ENCRYPTION_CONFIG.saltLength).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512')
    .toString('hex');
  
  return { hash, salt: actualSalt };
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - 存储的哈希值
 * @param {string} salt - 存储的盐值
 * @returns {boolean}
 */
function verifyPassword(password, hash, salt) {
  const computedHash = hashPassword(password, salt).hash;
  return computedHash === hash;
}

/**
 * 生成安全的随机字符串
 * @param {number} length - 长度
 * @returns {string}
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 敏感数据脱敏
 * @param {string} data - 原始数据
 * @param {string} type - 数据类型（email, phone, card, idcard）
 * @returns {string} - 脱敏后的数据
 */
function maskSensitiveData(data, type) {
  if (!data) return data;
  
  const str = String(data);
  
  switch (type) {
    case 'email':
      // example@domain.com -> e***e@domain.com
      const [username, domain] = str.split('@');
      if (username.length <= 2) {
        return `${username[0]}***@${domain}`;
      }
      return `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`;
    
    case 'phone':
      // 13812345678 -> 138****5678
      if (str.length !== 11) return str;
      return `${str.slice(0, 3)}****${str.slice(7)}`;
    
    case 'card':
      // 6222021234567890 -> 6222 **** **** 7890
      if (str.length < 16) return str;
      return `${str.slice(0, 4)} **** **** ${str.slice(-4)}`;
    
    case 'idcard':
      // 110101199001011234 -> 110101********1234
      if (str.length !== 18) return str;
      return `${str.slice(0, 6)}********${str.slice(-4)}`;
    
    case 'token':
      // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... -> eyJhbGci...***...j9
      if (str.length <= 10) return '***';
      return `${str.slice(0, 10)}...${str.slice(-4)}`;
    
    default:
      // 默认脱敏：显示前2位和后2位
      if (str.length <= 4) return '***';
      return `${str.slice(0, 2)}${'*'.repeat(str.length - 4)}${str.slice(-2)}`;
  }
}

/**
 * 对象敏感字段脱敏
 * @param {object} obj - 原始对象
 * @param {object} fieldTypes - 字段类型映射 { fieldName: 'email' }
 * @returns {object} - 脱敏后的对象
 */
function maskObject(obj, fieldTypes = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const masked = { ...obj };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    
    // 自动识别敏感字段
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      masked[key] = maskSensitiveData(masked[key], 'token');
    } 
    // 使用指定的字段类型
    else if (fieldTypes[key]) {
      masked[key] = maskSensitiveData(masked[key], fieldTypes[key]);
    }
    // 递归处理嵌套对象
    else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskObject(masked[key], fieldTypes);
    }
  }
  
  return masked;
}

/**
 * 验证数据签名
 * @param {string} data - 原始数据
 * @param {string} signature - 签名
 * @param {string} publicKey - 公钥
 * @returns {boolean}
 */
function verifySignature(data, signature, publicKey) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  } catch (error) {
    return false;
  }
}

/**
 * 生成数据签名
 * @param {string} data - 原始数据
 * @param {string} privateKey - 私钥
 * @returns {string} - 签名
 */
function generateSignature(data, privateKey) {
  try {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  } catch (error) {
    throw new Error(`签名生成失败: ${error.message}`);
  }
}

/**
 * 生成 CSRF Token
 * @returns {string}
 */
function generateCSRFToken() {
  return generateSecureToken(32);
}

/**
 * 验证 CSRF Token
 * @param {string} token - 客户端提供的 token
 * @param {string} sessionToken - 会话中存储的 token
 * @returns {boolean}
 */
function verifyCSRFToken(token, sessionToken) {
  return token && sessionToken && token === sessionToken;
}

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  maskSensitiveData,
  maskObject,
  verifySignature,
  generateSignature,
  generateCSRFToken,
  verifyCSRFToken,
  ENCRYPTION_CONFIG,
};
