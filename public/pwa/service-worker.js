/**
 * 黄氏家族寻根平台 - Service Worker
 *
 * 功能：
 * - 离线缓存
 * - 静态资源预缓存（带版本控制）
 * - 网络优先策略（API）
 * - 缓存优先策略（静态资源）
 * - 自动更新检测
 */

// 版本号（每次更新时递增）
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// 预缓存资源（带版本控制）
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/pwa/manifest.json',
  '/pwa/service-worker.js',
  '/css/style.css',
  '/js/data.js',
  '/js/main.js',
  '/js/modules.js',
  '/js/script.js',
  '/js/error-monitor.js'
];

// 不需要缓存的 API 端点
const NO_CACHE_APIS = [
  '/api/auth',
  '/api/chat',
  '/api/conversation'
];

// 安装事件 - 预缓存
self.addEventListener('install', (event) => {
  console.log('[SW] 安装 Service Worker');
  // 跳过等待，立即激活
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存资源');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] 预缓存完成');
      })
      .catch((error) => {
        console.error('[SW] 预缓存失败:', error);
        // 部分资源失败不影响安装
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活 Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => {
              // 清理旧版本缓存
              const isStaticOld = key.startsWith('static-') && key !== STATIC_CACHE;
              const isDynamicOld = key.startsWith('dynamic-') && key !== DYNAMIC_CACHE;
              return isStaticOld || isDynamicOld;
            })
            .map((key) => {
              console.log('[SW] 删除旧缓存:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] 缓存清理完成');
        // 接管所有客户端
        return self.clients.claim();
      })
      .then(() => {
        // 通知客户端更新
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'UPDATE_AVAILABLE' });
          });
        });
      })
  );
});

// 获取事件 - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理 HTTP/HTTPS 请求
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API 请求：网络优先，不缓存敏感数据
  if (url.pathname.startsWith('/api/')) {
    // 不缓存认证相关 API
    if (NO_CACHE_APIS.some(api => url.pathname.startsWith(api))) {
      event.respondWith(networkOnly(request));
    } else {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // 版本化静态资源：缓存优先，长期缓存
  if (isVersionedAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 普通静态资源：缓存优先
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 页面请求：网络优先，离线时返回缓存
  event.respondWith(networkFirst(request));
});

/**
 * 判断是否为版本化资源（带哈希的文件名）
 */
function isVersionedAsset(pathname) {
  return /[.-][0-9a-f]{8}\./.test(pathname) || pathname.includes('.min.');
}

/**
 * 判断是否为静态资源
 */
function isStaticAsset(pathname) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    // 仅缓存成功响应
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] 网络请求失败，使用缓存:', request.url);
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse();
  }
}

// 仅网络策略（不缓存）
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return createOfflineResponse('API 请求失败，请检查网络连接');
  }
}

// 缓存优先策略
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // 后台更新缓存（静默更新）
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
        });
      }
    }).catch(() => {
      // 忽略更新失败
    });
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] 资源请求失败:', request.url);
    return createOfflineResponse();
  }
}

// 创建离线响应
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>离线 - 黄氏家族寻根平台</title>
      <style>
        body { 
          font-family: 'Noto Serif SC', serif; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          margin: 0; 
          background: #f5f3e8; 
          color: #2c1a0e;
        }
        .offline { 
          text-align: center; 
          padding: 40px; 
        }
        h1 { color: #8B4513; }
        p { color: #5d4037; }
        button { 
          background: #8B4513; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer; 
          font-size: 1rem;
        }
        button:hover { background: #6B3410; }
      </style>
    </head>
    <body>
      <div class="offline">
        <h1>📡 网络已断开</h1>
        <p>您当前处于离线状态，请检查网络连接后重试。</p>
        <button onclick="location.reload()">重新加载</button>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// 消息事件
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker 已加载');
