/**
 * AI 免费额度服务单元测试：quotaService
 * Redis 客户端用内存 mock 代替，不连真实 Redis。
 * 注意：jest.config 设了 resetMocks/restoreMocks，spy 必须在 beforeEach 里重建，
 * 写在模块顶层会在每个 test 前被清空。
 */

const sessionStore = require('../../server/session-store');
const quotaService = require('../../server/services/quotaService');

// 内存版 Redis 客户端（只实现 quotaService 用到的命令）
function createMemoryClient() {
  const store = new Map();
  return {
    __store: store,
    get: jest.fn(async (key) => (store.has(key) ? String(store.get(key)) : null)),
    incr: jest.fn(async (key) => {
      const v = (store.get(key) || 0) + 1;
      store.set(key, v);
      return v;
    }),
    incrBy: jest.fn(async (key, n) => {
      const v = (store.get(key) || 0) + n;
      store.set(key, v);
      return v;
    }),
    expire: jest.fn(async () => true)
  };
}

let memoryClient;

describe('quotaService', () => {
  beforeEach(() => {
    memoryClient = createMemoryClient();
    jest.spyOn(sessionStore, 'getRedisClient').mockImplementation(() => memoryClient);
  });

  test('Redis 里无用量时额度可用', async () => {
    const q = await quotaService.checkQuota();
    expect(q.available).toBe(true);
    expect(q.remainingCalls).toBeGreaterThan(0);
    expect(q.remainingTokens).toBeGreaterThan(0);
    expect(q.reason).toBeNull();
  });

  test('5 小时窗口内调用次数超限后额度不可用', async () => {
    const windowKey = `ai:calls:5h:${quotaService.currentWindowStart()}`;
    memoryClient.__store.set(windowKey, quotaService.currentCallsLimit());
    const q = await quotaService.checkQuota();
    expect(q.available).toBe(false);
    expect(q.remainingCalls).toBe(0);
    expect(q.reason).toMatch(/调用额度已用完/);
  });

  test('本月 Token 超限后额度不可用', async () => {
    const month = new Date().toISOString().slice(0, 7);
    memoryClient.__store.set(`ai:tokens:month:${month}`, quotaService.TOKENS_PER_MONTH);
    const q = await quotaService.checkQuota();
    expect(q.available).toBe(false);
    expect(q.reason).toMatch(/Token 额度已用完/);
  });

  test('recordUsage 会累加调用次数和 Token', async () => {
    await quotaService.recordUsage(100);
    await quotaService.recordUsage(50);
    const q = await quotaService.checkQuota();
    expect(q.remainingCalls).toBe(quotaService.currentCallsLimit() - 2);
    expect(q.remainingTokens).toBe(quotaService.TOKENS_PER_MONTH - 150);
  });

  test('夜间时段调用上限翻倍', () => {
    // 22:00（北京）是夜间
    const night = new Date('2026-11-08T22:00:00+08:00');
    expect(quotaService.isNightHours(night)).toBe(true);
    // 12:00（北京）是白天
    const day = new Date('2026-11-08T12:00:00+08:00');
    expect(quotaService.isNightHours(day)).toBe(false);
  });

  test('Redis 不可用时放行（fail-open），不阻塞对话', async () => {
    sessionStore.getRedisClient.mockReturnValueOnce(null);
    const q = await quotaService.checkQuota();
    expect(q.available).toBe(true);
    expect(q.remainingCalls).toBeNull();
  });
});
