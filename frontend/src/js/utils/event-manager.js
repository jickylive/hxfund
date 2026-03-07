/**
 * 黄氏家族寻根平台 - 事件管理器
 * 负责管理Qwen AI组件的事件系统
 */

export class EventManager {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistory = 100; // 限制事件历史记录数量
  }

  /**
   * 订阅事件
   */
  subscribe(eventType, callback, context = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listener = { callback, context, id: this.generateId() };
    this.listeners.get(eventType).push(listener);

    return {
      unsubscribe: () => this.unsubscribe(eventType, listener.id)
    };
  }

  /**
   * 取消订阅事件
   */
  unsubscribe(eventType, listenerId) {
    if (this.listeners.has(eventType)) {
      const listeners = this.listeners.get(eventType);
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   */
  publish(eventType, data = null, async = false) {
    // 记录事件到历史
    this.eventHistory.push({
      type: eventType,
      data,
      timestamp: Date.now()
    });

    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    if (this.listeners.has(eventType)) {
      const listeners = [...this.listeners.get(eventType)]; // 创建副本以防回调中修改listeners

      if (async) {
        // 异步执行所有监听器
        Promise.allSettled(listeners.map(listener => {
          try {
            return listener.context 
              ? listener.callback.call(listener.context, data)
              : listener.callback(data);
          } catch (error) {
            console.error(`事件监听器执行错误 (${eventType}):`, error);
            return Promise.reject(error);
          }
        }));
      } else {
        // 同步执行所有监听器
        listeners.forEach(listener => {
          try {
            if (listener.context) {
              listener.callback.call(listener.context, data);
            } else {
              listener.callback(data);
            }
          } catch (error) {
            console.error(`事件监听器执行错误 (${eventType}):`, error);
          }
        });
      }
    }
  }

  /**
   * 一次性订阅（执行一次后自动取消）
   */
  once(eventType, callback, context = null) {
    const unsubscribeWrapper = () => {
      // 稍后执行取消订阅，确保回调先执行
      setTimeout(() => {
        this.unsubscribe(eventType, listenerId);
      }, 0);
    };

    const listenerId = this.generateId();
    const listener = { 
      callback: (...args) => {
        try {
          const result = context ? callback.call(context, ...args) : callback(...args);
          unsubscribeWrapper();
          return result;
        } catch (error) {
          console.error(`一次性事件监听器执行错误 (${eventType}):`, error);
          unsubscribeWrapper();
          throw error;
        }
      },
      context,
      id: listenerId
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push(listener);

    return {
      unsubscribe: () => this.unsubscribe(eventType, listenerId)
    };
  }

  /**
   * 等待特定事件发生
   */
  waitFor(eventType, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribe(eventType, listenerId);
        reject(new Error(`等待事件 '${eventType}' 超时 (${timeout}ms)`));
      }, timeout);

      const listenerId = this.generateId();
      const unsubscribe = this.subscribe(eventType, (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      }).unsubscribe;

      // 将unsubscribe包装以确保正确清理
      const wrappedUnsubscribe = () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };

      // 返回取消函数
      return { unsubscribe: wrappedUnsubscribe };
    });
  }

  /**
   * 获取事件历史
   */
  getEventHistory(eventType = null) {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * 清空事件历史
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(eventType) {
    return this.listeners.has(eventType) 
      ? this.listeners.get(eventType).length 
      : 0;
  }

  /**
   * 生成唯一ID
   * @private
   */
  generateId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁事件管理器
   */
  destroy() {
    this.listeners.clear();
    this.eventHistory = [];
  }

  /**
   * 便捷方法：创建事件发射器
   */
  static createEmitter(target) {
    target.on = (eventType, callback, context) => 
      this.subscribe(eventType, callback, context);
    
    target.once = (eventType, callback, context) => 
      this.once(eventType, callback, context);
    
    target.off = (eventType, listenerId) => 
      this.unsubscribe(eventType, listenerId);
    
    target.emit = (eventType, data) => 
      this.publish(eventType, data);
    
    target.waitFor = (eventType, timeout) => 
      this.waitFor(eventType, timeout);
    
    return target;
  }
}