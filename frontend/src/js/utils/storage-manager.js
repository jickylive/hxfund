/**
 * 黄氏家族寻根平台 - 存储管理器
 * 统一管理 localStorage 和 sessionStorage
 */

export class LocalStorageManager {
    constructor() {
        this.prefix = 'hxfund_';
    }

    // 获取带前缀的键名
    getPrefixedKey(key) {
        return this.prefix + key;
    }

    // 设置值
    set(key, value) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            localStorage.setItem(prefixedKey, value);
            return true;
        } catch (error) {
            console.error('localStorage 设置失败:', error);
            return false;
        }
    }

    // 获取值
    get(key) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            return localStorage.getItem(prefixedKey);
        } catch (error) {
            console.error('localStorage 获取失败:', error);
            return null;
        }
    }

    // 删除值
    remove(key) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('localStorage 删除失败:', error);
            return false;
        }
    }

    // 清空所有带前缀的项
    clear() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('localStorage 清空失败:', error);
            return false;
        }
    }

    // 检查是否支持 localStorage
    static isSupported() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
}

// sessionStorage 管理器
export class SessionStorageManager {
    constructor() {
        this.prefix = 'hxfund_session_';
    }

    getPrefixedKey(key) {
        return this.prefix + key;
    }

    set(key, value) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            sessionStorage.setItem(prefixedKey, value);
            return true;
        } catch (error) {
            console.error('sessionStorage 设置失败:', error);
            return false;
        }
    }

    get(key) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            return sessionStorage.getItem(prefixedKey);
        } catch (error) {
            console.error('sessionStorage 获取失败:', error);
            return null;
        }
    }

    remove(key) {
        try {
            const prefixedKey = this.getPrefixedKey(key);
            sessionStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('sessionStorage 删除失败:', error);
            return false;
        }
    }

    clear() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('sessionStorage 清空失败:', error);
            return false;
        }
    }

    static isSupported() {
        try {
            const test = '__session_storage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
}