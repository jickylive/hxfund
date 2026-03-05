/**
 * 黄氏家族寻根平台 - 会话数据备份与压缩机制
 * 
 * 功能：
 * - 定期备份会话数据
 * - 压缩备份文件以节省空间
 * - 支持压缩格式：gzip
 * - 自动清理过期备份
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class SessionBackupManager {
  constructor(options = {}) {
    this.backupDir = options.backupDir || path.join(__dirname, 'backups');
    this.retentionDays = options.retentionDays || 30; // 保留30天的备份
    this.compress = options.compress !== false; // 默认启用压缩
    this.maxBackupSize = options.maxBackupSize || 100 * 1024 * 1024; // 100MB

    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 备份会话数据
   */
  async backupSessions(sessionStore) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `sessions-backup-${timestamp}.json`;
      const filePath = path.join(this.backupDir, fileName);

      // 获取所有会话数据
      let sessions;
      if (typeof sessionStore.getAllSessions === 'function') {
        sessions = await sessionStore.getAllSessions();
      } else {
        // 如果没有 getAllSessions 方法，尝试直接访问
        sessions = sessionStore.sessions || {};
      }

      // 准备备份数据
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        sessionCount: Array.isArray(sessions) ? sessions.length : Object.keys(sessions || {}).length,
        sessions: sessions
      };

      // 写入原始数据
      const jsonData = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(filePath, jsonData);

      console.log(`[Session Backup] 会话数据已备份到: ${filePath}`);

      // 如果启用压缩，则压缩备份文件
      if (this.compress) {
        await this.compressFile(filePath);
        // 删除原始文件（保留压缩文件）
        fs.unlinkSync(filePath);
        console.log(`[Session Backup] 备份文件已压缩: ${filePath}.gz`);
      }

      // 清理过期备份
      await this.cleanupOldBackups();

      return {
        success: true,
        filePath: this.compress ? `${filePath}.gz` : filePath,
        sessionCount: backupData.sessionCount
      };
    } catch (error) {
      console.error('[Session Backup] 备份失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 压缩文件
   */
  async compressFile(filePath) {
    const data = fs.readFileSync(filePath);
    const compressedData = await gzip(data);
    fs.writeFileSync(`${filePath}.gz`, compressedData);
  }

  /**
   * 解压文件
   */
  async decompressFile(compressedFilePath) {
    const compressedData = fs.readFileSync(compressedFilePath);
    const decompressedData = await gunzip(compressedData);
    return decompressedData.toString();
  }

  /**
   * 清理过期备份
   */
  async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stat = fs.statSync(filePath);
        const fileDate = new Date(stat.mtime);

        if (fileDate < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`[Session Backup] 已删除过期备份: ${file}`);
        }
      }
    } catch (error) {
      console.error('[Session Backup] 清理过期备份失败:', error);
    }
  }

  /**
   * 获取备份文件列表
   */
  getBackupFiles() {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter(file => file.startsWith('sessions-backup-'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stat.size,
            modified: stat.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified); // 按修改时间倒序
    } catch (error) {
      console.error('[Session Backup] 获取备份文件列表失败:', error);
      return [];
    }
  }

  /**
   * 恢复会话数据
   */
  async restoreSessions(backupFileName, sessionStore) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      let backupData;
      if (backupFileName.endsWith('.gz')) {
        // 解压并读取
        const jsonStr = await this.decompressFile(backupPath);
        backupData = JSON.parse(jsonStr);
      } else {
        // 直接读取
        const jsonStr = fs.readFileSync(backupPath, 'utf-8');
        backupData = JSON.parse(jsonStr);
      }

      // 恢复会话数据到存储
      if (Array.isArray(backupData.sessions)) {
        // 如果是数组格式，转换为对象格式
        const sessionsObj = {};
        backupData.sessions.forEach(session => {
          sessionsObj[session.id] = session;
        });
        backupData.sessions = sessionsObj;
      }

      // 根据 sessionStore 类型恢复数据
      if (typeof sessionStore.importSessions === 'function') {
        await sessionStore.importSessions(backupData.sessions);
      } else if (typeof sessionStore.setSession === 'function') {
        // 逐个恢复会话
        for (const [sessionId, sessionData] of Object.entries(backupData.sessions || {})) {
          await sessionStore.setSession(sessionId, sessionData);
        }
      } else {
        // 直接赋值（适用于内存存储）
        sessionStore.sessions = backupData.sessions || {};
      }

      console.log(`[Session Backup] 会话数据已从 ${backupFileName} 恢复`);
      return {
        success: true,
        restoredCount: backupData.sessionCount
      };
    } catch (error) {
      console.error('[Session Backup] 恢复失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取备份统计信息
   */
  getBackupStats() {
    const files = this.getBackupFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      totalBackups: files.length,
      totalSize: totalSize,
      oldestBackup: files.length > 0 ? files[files.length - 1].modified : null,
      newestBackup: files.length > 0 ? files[0].modified : null,
      retentionDays: this.retentionDays
    };
  }
}

module.exports = SessionBackupManager;