/**
 * 黄氏家族寻根平台 - 存储管理器
 */

export class StorageManager {
  constructor() {
    this.storage = window.localStorage;
  }

  get(key) {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      console.error('获取存储数据失败:', error);
      return null;
    }
  }

  set(key, value) {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      console.error('设置存储数据失败:', error);
    }
  }

  remove(key) {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error('删除存储数据失败:', error);
    }
  }

  clear() {
    try {
      this.storage.clear();
    } catch (error) {
      console.error('清空存储失败:', error);
    }
  }
}