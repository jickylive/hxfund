/**
 * 黄氏家族寻根平台 - 本地模拟测试脚本
 * 测试所有不依赖 AI 的核心 API 端点
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let total = 0;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method,
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    };
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch (e) {
          resolve({ status: res.statusCode, data: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function test(name, condition) {
  total++;
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

async function run() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  黄氏家族寻根平台 - 本地模拟测试              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // 1. 健康检查
  console.log('[1] 健康检查');
  let r = await request('GET', '/api/health');
  test('状态码 200', r.status === 200);
  test('status 为 ok', r.data?.status === 'ok');
  test('版本号存在', r.data?.version !== undefined);

  // 2. 模型列表
  console.log('\n[2] 模型列表');
  r = await request('GET', '/api/models');
  test('状态码 200', r.status === 200);
  test('返回模型数组', Array.isArray(r.data?.models));
  if (Array.isArray(r.data?.models)) {
    console.log(`    模型数: ${r.data.models.length}`);
  }

  // 3. 认证状态
  console.log('\n[3] 认证状态');
  r = await request('GET', '/api/auth/status');
  test('状态码 200', r.status === 200);

  // 4. 族谱 API - 健康检查
  console.log('\n[4] 族谱 API 端点');
  r = await request('GET', '/api/genealogy/health');
  test('健康检查状态码 200', r.status === 200);
  test('status 为 ok (success=true)', r.data?.success === true);

  // 5. 族谱 API - 家族树
  r = await request('GET', '/api/genealogy/members/tree');
  test('家族树状态码 200', r.status === 200);
  test('返回 data 数组', Array.isArray(r.data?.data));
  if (Array.isArray(r.data?.data)) {
    console.log(`    家族树节点数: ${r.data.data.length}`);
  }

  // 6. 族谱 API - 字辈诗
  r = await request('GET', '/api/genealogy/poems');
  test('字辈诗状态码 200', r.status === 200);
  test('返回 data 数组', Array.isArray(r.data?.data));
  if (Array.isArray(r.data?.data)) {
    console.log(`    字辈诗数: ${r.data.data.length}`);
  }

  // 7. 族谱 API - 项目幻灯片
  r = await request('GET', '/api/genealogy/slides');
  test('幻灯片状态码 200', r.status === 200);
  test('返回 data 数组', Array.isArray(r.data?.data));

  // 8. 族谱 API - 留言板
  r = await request('GET', '/api/genealogy/messages');
  test('留言板状态码 200', r.status === 200);
  test('返回 data 数组', Array.isArray(r.data?.data));

  // 9. 族谱 API - 留言提交
  r = await request('POST', '/api/genealogy/messages', {
    name: '测试用户',
    content: '这是一个测试留言',
    email: 'test@test.com'
  });
  test('留言提交状态码 201', r.status === 201);
  test('提交成功', r.data?.success === true);
  if (r.data?.data?.id) {
    console.log(`    留言ID: ${r.data.data.id}`);
  }

  // 10. 族谱 API - 区块链存证
  r = await request('GET', '/api/genealogy/blockchain');
  test('区块链状态码 200', r.status === 200);
  test('返回 data 数组', Array.isArray(r.data?.data));

  // 11. 前端资源
  console.log('\n[5] 前端资源');
  r = await request('GET', '/');
  test('主页状态码 200', r.status === 200);
  test('返回 HTML', typeof r.data === 'string' && r.data.includes('<!DOCTYPE'));

  // 12. API 文档
  r = await request('GET', '/api/docs');
  test('API 文档状态码 200', r.status === 200);

  // 13. 404 路由
  r = await request('GET', '/api/nonexistent');
  test('未知路由返回 404', r.status === 404);

  // 14. 数据库 API
  console.log('\n[6] 数据库 API');
  r = await request('GET', '/api/db/health');
  test('数据库健康检查', r.status === 200);

  // 15. 数据库 API - 表结构
  r = await request('GET', '/api/db/tables');
  test('表列表状态码 200', r.status === 200);
  if (Array.isArray(r.data?.data)) {
    console.log(`    表数: ${r.data.data.length}`);
  }

  // 总结
  console.log('\n' + '═'.repeat(40));
  console.log(`测试结果: ${passed}/${total} 通过`);
  console.log('═'.repeat(40));
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log(`\n⚠️  ${failed} 个测试失败`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('❌ 测试执行错误:', err.message); process.exit(1); });
