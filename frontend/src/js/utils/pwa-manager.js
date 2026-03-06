/**
 * 黄氏家族寻根平台 - PWA 管理器
 * 提供完整的 PWA 功能支持
 */

export class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isSupported = this.checkSupport();
        this.installEvent = null;
        
        // 监听 beforeinstallprompt 事件
        window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止默认的迷你安装横幅
            e.preventDefault();
            // 保存事件以便稍后使用
            this.deferredPrompt = e;
            // 触发安装可用事件
            this.onAppInstallAvailable();
        });

        // 监听安装完成事件
        window.addEventListener('appinstalled', () => {
            console.log('A2HS 安装成功');
            this.onAppInstalled();
        });
    }

    // 检查 PWA 支持情况
    checkSupport() {
        return ('serviceWorker' in navigator) && 
               ('PushManager' in window) && 
               ('Notification' in window) &&
               ('caches' in window);
    }

    // 注册 Service Worker
    async registerServiceWorker() {
        if (!this.isSupported) {
            console.warn('当前浏览器不支持 PWA 功能');
            return false;
        }

        try {
            // 注册 Service Worker
            const registration = await navigator.serviceWorker.register('/pwa/service-worker.js', {
                scope: '/'
            });

            console.log('Service Worker 注册成功:', registration.scope);

            // 监听更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('发现新版本，下载中...');

                newWorker.addEventListener('statechange', async () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 有新版本可用
                        console.log('新版本已就绪，可以更新');
                        
                        // 通知用户有更新
                        this.onUpdateAvailable(registration);
                    }
                });
            });

            // 检查是否有等待中的更新
            if (registration.waiting) {
                this.onUpdateAvailable(registration);
            }

            return registration;
        } catch (error) {
            console.error('Service Worker 注册失败:', error);
            return false;
        }
    }

    // 检查更新
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            
            // 检查是否有更新
            registration.update();
        }
    }

    // 请求通知权限
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('此浏览器不支持通知');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    // 显示本地通知
    async showLocalNotification(title, options = {}) {
        if (!await this.requestNotificationPermission()) {
            console.log('通知权限未授予');
            return;
        }

        // 如果在 Service Worker 环境中，使用 registration.showNotification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
        } else {
            // 在主线程中创建通知
            new Notification(title, options);
        }
    }

    // 缓存资源
    async cacheResources(resources) {
        if (!('caches' in window)) {
            console.log('浏览器不支持 Cache API');
            return false;
        }

        try {
            const cacheName = `static-resources-v${Date.now()}`;
            const cache = await caches.open(cacheName);

            await cache.addAll(resources);
            console.log(`资源缓存成功: ${resources.length} 个文件`);
            return true;
        } catch (error) {
            console.error('资源缓存失败:', error);
            return false;
        }
    }

    // 清除旧缓存
    async clearOldCaches(keepLatest = 5) {
        if (!('caches' in window)) {
            return false;
        }

        const cacheNames = await caches.keys();
        const pwaCacheNames = cacheNames.filter(name => name.startsWith('pwa-') || name.includes('static') || name.includes('dynamic'));

        // 保留最新的几个缓存，清除旧的
        const sortedCaches = pwaCacheNames.sort((a, b) => {
            const aTime = this.extractTimestamp(a);
            const bTime = this.extractTimestamp(b);
            return bTime - aTime; // 降序排列
        });

        const cachesToDelete = sortedCaches.slice(keepLatest);

        const deletePromises = cachesToDelete.map(cacheName => {
            console.log(`删除旧缓存: ${cacheName}`);
            return caches.delete(cacheName);
        });

        await Promise.all(deletePromises);
        console.log(`已清除 ${cachesToDelete.length} 个旧缓存`);
        return true;
    }

    // 提取缓存名称中的时间戳
    extractTimestamp(cacheName) {
        const match = cacheName.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    }

    // 获取缓存状态
    async getCacheStatus() {
        if (!('caches' in window)) {
            return { supported: false, caches: [] };
        }

        const cacheNames = await caches.keys();
        const cacheInfo = [];

        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            cacheInfo.push({
                name,
                size: requests.length,
                requests: requests.map(r => r.url)
            });
        }

        return {
            supported: true,
            caches: cacheInfo
        };
    }

    // 触发安装横幅
    async showInstallPrompt() {
        if (!this.deferredPrompt) {
            console.log('安装提示不可用');
            return false;
        }

        // 显示安装提示
        this.deferredPrompt.prompt();

        // 等待用户响应
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`用户选择: ${outcome}`);

        // 重置提示
        this.deferredPrompt = null;
        return outcome === 'accepted';
    }

    // 检查是否已安装
    isAppInstalled() {
        // 检查 display-mode 或 referer
        return window.matchMedia('(display-mode: standalone)').matches ||
               document.referrer.includes('android-app://') ||
               window.navigator.standalone === true;
    }

    // 获取安装状态
    getInstallStatus() {
        return {
            isSupported: this.isSupported,
            isInstalled: this.isAppInstalled(),
            canShowPrompt: !!this.deferredPrompt
        };
    }

    // 事件回调 - 应用安装可用
    onAppInstallAvailable() {
        console.log('应用安装可用');
        // 可以在这里显示安装按钮
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.onclick = () => this.showInstallPrompt();
        }
    }

    // 事件回调 - 应用已安装
    onAppInstalled() {
        console.log('应用已成功安装');
        // 隐藏安装按钮
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.style.display = 'none';
        }
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('app-installed'));
    }

    // 事件回调 - 有更新可用
    onUpdateAvailable(registration) {
        console.log('应用有新版本可用');
        
        // 显示更新提示
        if (confirm('发现新版本，是否立即更新？')) {
            // 立即跳转到新版本
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // 监听跳转完成事件
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }

    // 预加载关键资源
    async preloadCriticalResources() {
        const criticalResources = [
            '/css/style.css',
            '/js/components/qwen-ai.js',
            '/js/utils/api-manager.js',
            '/js/utils/storage-manager.js'
        ];

        const preloadPromises = criticalResources.map(resource => {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = resource;
                link.onload = link.onerror = resolve;
                document.head.appendChild(link);
            });
        });

        await Promise.all(preloadPromises);
        console.log('关键资源预加载完成');
    }

    // 初始化 PWA 功能
    async initialize() {
        if (!this.isSupported) {
            console.warn('PWA 功能不被支持');
            return false;
        }

        // 注册 Service Worker
        await this.registerServiceWorker();

        // 预加载关键资源
        await this.preloadCriticalResources();

        // 检查安装状态
        const installStatus = this.getInstallStatus();
        console.log('PWA 安装状态:', installStatus);

        return true;
    }
}

// 创建单例实例
const pwaManager = new PWAManager();

// 导出实例和类
export { pwaManager, PWAManager };