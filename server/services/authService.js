/**
 * 认证服务层
 * 封装所有认证相关的业务逻辑
 */

const { generateApiKey, generateToken, loadAuthConfig } = require('../auth');
const { hashPassword, verifyPassword, generateSecureToken } = require('../config/security');
const logger = require('../config/logger');

/**
 * 认证服务类
 */
class AuthService {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * 加载认证配置
   */
  loadConfig() {
    this.config = loadAuthConfig();
  }

  /**
   * 生成API密钥
   */
  generateAPIKey() {
    try {
      const apiKey = generateApiKey();
      logger.info('生成新API密钥', { apiKeyPrefix: apiKey.substring(0, 8) });
      return apiKey;
    } catch (error) {
      logger.error('生成API密钥失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成JWT令牌
   */
  generateJWTToken(payload = {}) {
    try {
      const token = generateToken(payload, this.config.jwtSecret);
      logger.info('生成JWT令牌', { payload });
      return token;
    } catch (error) {
      logger.error('生成JWT令牌失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证API密钥
   */
  validateAPIKey(apiKey) {
    try {
      if (!apiKey) {
        return false;
      }

      // 检查是否是服务器API密钥
      if (apiKey === this.config.serverApiKey) {
        return true;
      }

      // 检查是否在允许的API密钥列表中
      if (this.config.allowedApiKeys && this.config.allowedApiKeys.includes(apiKey)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('验证API密钥失败', { error: error.message });
      return false;
    }
  }

  /**
   * 验证JWT令牌
   */
  validateJWTToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, this.config.jwtSecret);
      logger.debug('JWT令牌验证成功', { decoded });
      return decoded;
    } catch (error) {
      logger.warn('JWT令牌验证失败', { error: error.message });
      return null;
    }
  }

  /**
   * 哈希密码
   */
  hashPassword(password) {
    try {
      const { hash, salt } = hashPassword(password);
      logger.info('密码哈希成功');
      return { hash, salt };
    } catch (error) {
      logger.error('密码哈希失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证密码
   */
  verifyPassword(password, hash, salt) {
    try {
      const isValid = verifyPassword(password, hash, salt);
      logger.debug('密码验证完成', { isValid });
      return isValid;
    } catch (error) {
      logger.error('密码验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 生成CSRF令牌
   */
  generateCSRFToken() {
    try {
      const token = generateSecureToken(32);
      logger.debug('生成CSRF令牌');
      return token;
    } catch (error) {
      logger.error('生成CSRF令牌失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证CSRF令牌
   */
  validateCSRFToken(token, sessionToken) {
    try {
      const isValid = token && sessionToken && token === sessionToken;
      logger.debug('CSRF令牌验证完成', { isValid });
      return isValid;
    } catch (error) {
      logger.error('CSRF令牌验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 获取认证状态
   */
  getAuthStatus() {
    try {
      return {
        enabled: true,
        serverApiKeyConfigured: !!this.config.serverApiKey,
        jwtSecretConfigured: !!this.config.jwtSecret,
        rateLimit: this.config.rateLimit,
        tokenExpiresIn: this.config.tokenExpiresIn,
      };
    } catch (error) {
      logger.error('获取认证状态失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成客户端令牌
   */
  generateClientToken() {
    try {
      const payload = {
        type: 'client_access',
        source: 'web',
        timestamp: Date.now()
      };

      const token = this.generateJWTToken(payload);
      logger.info('生成客户端令牌成功');

      return {
        token,
        expiresIn: this.config.tokenExpiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('生成客户端令牌失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证请求签名
   */
  validateRequestSignature(data, signature, publicKey) {
    try {
      const { verifySignature } = require('../config/security');
      const isValid = verifySignature(data, signature, publicKey);
      logger.debug('请求签名验证完成', { isValid });
      return isValid;
    } catch (error) {
      logger.error('请求签名验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 生成请求签名
   */
  generateRequestSignature(data, privateKey) {
    try {
      const { generateSignature } = require('../config/security');
      const signature = generateSignature(data, privateKey);
      logger.debug('生成请求签名成功');
      return signature;
    } catch (error) {
      logger.error('生成请求签名失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 刷新令牌
   */
  refreshToken(oldToken) {
    try {
      const decoded = this.validateJWTToken(oldToken);
      
      if (!decoded) {
        throw new Error('无效的令牌');
      }

      // 生成新令牌
      const newPayload = {
        ...decoded,
        timestamp: Date.now()
      };

      const newToken = this.generateJWTToken(newPayload);
      logger.info('令牌刷新成功');

      return {
        token: newToken,
        expiresIn: this.config.tokenExpiresIn,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('刷新令牌失败', { error: error.message });
      throw error;
    }
  }
}

// 创建单例实例
const authService = new AuthService();

module.exports = authService;
