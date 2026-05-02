/**
 * 页面加载自动化测试
 */

const http = require('http');

function fetchPage(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };
    
    http.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function testPage() {
  console.log('=== 页面加载测试 ===\n');

  // 1. 测试首页
  console.log('1. 首页 HTML...');
  const home = await fetchPage('/');
  console.log(`   状态码: ${home.status}`);
  console.log(`   大小: ${home.body.length} bytes`);
  
  const hasDefer = home.body.includes('defer');
  console.log(`   脚本使用 defer: ${hasDefer ? '✅' : '❌'}`);
  
  console.log('   关键脚本:');
  ['js/main.js', 'js/script.js', 'js/modules.js', 'js/web-vitals.js'].forEach(s => {
    console.log(`     ${home.body.includes(s) ? '✅' : '❌'} ${s}`);
  });

  // 2. 静态资源
  console.log('\n2. 静态资源...');
  ['/css/style.css', '/js/main.js', '/js/script.js', '/js/modules.js', '/js/data.js', '/js/web-vitals.js', '/js/error-monitor.js'].forEach(r => {
    fetchPage(r).then(res => {
      const ok = res.status === 200 && !res.body.includes('SyntaxError');
      console.log(`   ${ok ? '✅' : '❌'} ${r}`);
    });
  });

  // 3. main.js 内容
  const mainJs = await fetchPage('/js/main.js');
  console.log('\n3. main.js...');
  console.log(`   包含 loader 移除逻辑: ${mainJs.body.includes('loader') ? '✅' : '❌'}`);
  
  // 4. 检查 web-vitals.js 是否还有 ES module 语法
  const webVitals = await fetchPage('/js/web-vitals.js');
  console.log('\n4. web-vitals.js...');
  const hasImport = webVitals.body.includes('import ') && !webVitals.body.includes('import(');
  console.log(`   包含 ES module import: ${hasImport ? '❌ 有问题' : '✅ 正常'}`);
  console.log(`   语法: ${webVitals.body.includes('function ') ? '函数格式' : '未知'}`);

  console.log('\n=== 完成 ===');
}

testPage().catch(err => console.error('测试失败:', err.message));
