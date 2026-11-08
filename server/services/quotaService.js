/**
 * AI 免费额度跟踪服务
 *
 * 背景：GitCode 免费额度没有可查询的 HTTP 接口，额度按“调用次数 / 5 小时窗口”
 * 计（体验版约 200 次/5h，Lite 约 500 次，Pro 约 800 次；21:00–09:00 夜间翻倍），
 * 控制台另有每月 2M Token 的免费额度。两者都没有官方查询接口，只能由后端自己计数。
 *
 * 做法：用 Redis 记两个计数器——
 *   ai:calls:5h:<窗口起始时间戳>：当前 5 小时窗口内的调用次数（固定窗口 00/05/10/15/20，TTL 5h）
 *   ai:tokens:month:<YYYY-MM>：当月累计 Token 数（TTL 32 天）
 * 提供默认模型前先查这两个计数器，任一超限即认为额度不可用，拒绝调用并返回明确提示，
 * 而不是把请求发出去等上游报“额度耗尽”。
 *
 * 降级原则：Redis 不可用时放行（fail-open），只记日志，不阻塞正常对话；
 * 计数本身是近似值（固定窗口 vs 上游滚动窗口），限额取保守的体验版默认值，
 * 可通过环境变量按实际套餐调整。
 */

const sessionStore = require('../session-store');
const logger = require('../config/logger');

const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash';

// 限额（环境变量可调；默认按体验版最保守值）
const CALLS_PER_5H = parseInt(process.env.AI_CALLS_PER_5H, 10) || 200;
const TOKENS_PER_MONTH = parseInt(process.env.AI_TOKENS_PER_MONTH, 10) || 2000000;
// 5 小时窗口长度（毫秒）
const WINDOW_MS = 5 * 60 * 60 * 1000;
// 夜间翻倍时段：21:00–09:00（北京时间，GitCode 规则）
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 9;

/**
 * 当前 5 小时窗口的起始时间戳（固定窗口，与时钟对齐）
 */
function currentWindowStart() {
  const now = Date.now();
  return now - (now % WINDOW_MS);
}

/**
 * 当前是否夜间（翻倍时段），按北京时间判断
 */
function isNightHours(date = new Date()) {
  // 转北京时间（UTC+8）
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hour = beijing.getUTCHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * 当前窗口的调用次数上限（夜间翻倍）
 */
function currentCallsLimit() {
  return isNightHours() ? CALLS_PER_5H * 2 : CALLS_PER_5H;
}

/**
 * 检查额度是否可用（提供默认模型前调用）
 * @returns {Promise<{available: boolean, remainingCalls: number|null, remainingTokens: number|null, callsLimit: number, tokensLimit: number, reason: string|null, windowResetAt: string}>}
 */
async function checkQuota() {
  const callsLimit = currentCallsLimit();
  const result = {
    available: true,
    remainingCalls: null,
    remainingTokens: null,
    callsLimit,
    tokensLimit: TOKENS_PER_MONTH,
    reason: null,
    windowResetAt: new Date(currentWindowStart() + WINDOW_MS).toISOString()
  };

  const client = sessionStore.getRedisClient();
  if (!client) {
    // Redis 不可用：放行，只记日志（不阻塞对话）
    logger.warn('额度检查跳过：Redis 未连接（fail-open）');
    return result;
  }

  try {
    const windowKey = `ai:calls:5h:${currentWindowStart()}`;
    const month = new Date().toISOString().slice(0, 7);
    const monthKey = `ai:tokens:month:${month}`;

    const [calls, tokens] = await Promise.all([
      client.get(windowKey),
      client.get(monthKey)
    ]);

    const usedCalls = parseInt(calls || '0', 10);
    const usedTokens = parseInt(tokens || '0', 10);

    result.remainingCalls = Math.max(0, callsLimit - usedCalls);
    result.remainingTokens = Math.max(0, TOKENS_PER_MONTH - usedTokens);

    if (usedCalls >= callsLimit) {
      result.available = false;
      result.reason = `5 小时调用额度已用完（${usedCalls}/${callsLimit} 次），${new Date(result.windowResetAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} 后恢复`;
    } else if (usedTokens >= TOKENS_PER_MONTH) {
      result.available = false;
      result.reason = `本月 Token 额度已用完（${usedTokens}/${TOKENS_PER_MONTH}），下月 1 日恢复`;
    }

    return result;
  } catch (error) {
    // Redis 出错：放行，只记日志
    logger.warn('额度检查失败（fail-open）:', error.message);
    return result;
  }
}

/**
 * 记录一次调用的用量（成功调用后调用；Token 数来自上游返回的 usage）
 */
async function recordUsage(tokens = 0) {
  const client = sessionStore.getRedisClient();
  if (!client) return;
  try {
    const windowKey = `ai:calls:5h:${currentWindowStart()}`;
    const month = new Date().toISOString().slice(0, 7);
    const monthKey = `ai:tokens:month:${month}`;
    // 次数 +1（TTL 5h，窗口结束自动清零）；Token 累加（TTL 32 天）
    await Promise.all([
      client.incr(windowKey).then(() => client.expire(windowKey, 5 * 60 * 60)),
      tokens > 0
        ? client.incrBy(monthKey, Math.max(0, Math.floor(tokens))).then(() => client.expire(monthKey, 32 * 24 * 60 * 60))
        : Promise.resolve()
    ]);
  } catch (error) {
    logger.warn('额度用量记录失败（忽略）:', error.message);
  }
}

// ==================== 原子预占（防并发超发） ====================
//
// 问题：旧流程是 checkQuota() 先读、recordUsage() 后记（check-then-act），
// 并发请求能同时读到“还剩 1 次”全部放行，免费额度可任意超发。
// 修复：用一条 Redis Lua 脚本在一次执行里完成“读剩余 → 判断 → 预占扣减”
// （Redis 单线程执行脚本，天然原子），调用方先预占、成功才调 CLI。
//
// 预占只扣“调用次数”（1 次）；Token 用量调用前未知，成功后由 recordTokens()
// 按实际用量补记。estimatedTokens 参数用于将来需要提前预留 Token 的场景。

/**
 * 原子预占一条 Lua 脚本。
 * KEYS[1] 5 小时调用计数 key，KEYS[2] 当月 Token 计数 key。
 * ARGV[1] 调用次数上限，ARGV[2] 月 Token 上限，ARGV[3] 预留 Token 数，
 * ARGV[4] 调用计数 key TTL（秒），ARGV[5] Token 计数 key TTL（秒）。
 * 返回 {是否允许 1/0, 扣减后调用次数, 扣减后 Token 数, 拒绝原因 0=无 1=次数超限 2=Token 超限}。
 */
const RESERVE_LUA = `
local calls = tonumber(redis.call('GET', KEYS[1]) or '0')
local tokens = tonumber(redis.call('GET', KEYS[2]) or '0')
local est = tonumber(ARGV[3])
if calls + 1 > tonumber(ARGV[1]) then
  return {0, calls, tokens, 1}
end
if tokens + est > tonumber(ARGV[2]) then
  return {0, calls, tokens, 2}
end
redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[4])
end
if est > 0 then
  redis.call('INCRBY', KEYS[2], est)
  if redis.call('TTL', KEYS[2]) == -1 then
    redis.call('EXPIRE', KEYS[2], ARGV[5])
  end
end
return {1, calls + 1, tokens + est, 0}
`;

/**
 * 原子检查并预占 1 次调用额度（推荐调用路径，替代 checkQuota + recordUsage 的两步流程）。
 * @param {number} [estimatedTokens=0] - 提前预留的 Token 数（通常 0，成功后由 recordTokens 按实际补记）
 * @returns {Promise<{available: boolean, reserved: boolean, remainingCalls: number|null, remainingTokens: number|null, callsLimit: number, tokensLimit: number, reason: string|null, windowResetAt: string, windowKey: string}>}
 *   reserved=true 表示已实际扣减（CLI 失败时需调 refundReservation 退还）；
 *   Redis 不可用时 fail-open：available=true 但 reserved=false，不阻塞对话。
 */
async function checkAndReserve(estimatedTokens = 0) {
  const callsLimit = currentCallsLimit();
  const windowKey = `ai:calls:5h:${currentWindowStart()}`;
  const result = {
    available: true,
    reserved: false,
    remainingCalls: null,
    remainingTokens: null,
    callsLimit,
    tokensLimit: TOKENS_PER_MONTH,
    reason: null,
    windowResetAt: new Date(currentWindowStart() + WINDOW_MS).toISOString(),
    windowKey
  };

  const client = sessionStore.getRedisClient();
  if (!client) {
    // Redis 不可用：放行，只记日志（不阻塞对话）
    logger.warn('额度预占跳过：Redis 未连接（fail-open）');
    return result;
  }

  try {
    const month = new Date().toISOString().slice(0, 7);
    const monthKey = `ai:tokens:month:${month}`;
    const est = Math.max(0, Math.floor(estimatedTokens) || 0);
    const [allowed, usedCalls, usedTokens, reasonCode] = await client.eval(RESERVE_LUA, {
      keys: [windowKey, monthKey],
      arguments: [
        String(callsLimit),
        String(TOKENS_PER_MONTH),
        String(est),
        String(5 * 60 * 60),
        String(32 * 24 * 60 * 60)
      ]
    });

    result.remainingCalls = Math.max(0, callsLimit - usedCalls);
    result.remainingTokens = Math.max(0, TOKENS_PER_MONTH - usedTokens);

    if (allowed !== 1) {
      result.available = false;
      result.reason = reasonCode === 1
        ? `5 小时调用额度已用完（${usedCalls}/${callsLimit} 次），${new Date(result.windowResetAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} 后恢复`
        : `本月 Token 额度已用完（${usedTokens}/${TOKENS_PER_MONTH}），下月 1 日恢复`;
      return result;
    }

    result.reserved = true;
    return result;
  } catch (error) {
    // Redis 出错：放行，只记日志
    logger.warn('额度预占失败（fail-open）:', error.message);
    return result;
  }
}

/**
 * 按实际用量补记 Token（checkAndReserve 成功调用 CLI 后调用）。
 * 调用次数已在预占时扣过，这里只加 Token，不再重复计次数。
 */
async function recordTokens(tokens = 0) {
  if (!tokens || tokens <= 0) return;
  const client = sessionStore.getRedisClient();
  if (!client) return;
  try {
    const month = new Date().toISOString().slice(0, 7);
    const monthKey = `ai:tokens:month:${month}`;
    await client.incrBy(monthKey, Math.max(0, Math.floor(tokens)));
    await client.expire(monthKey, 32 * 24 * 60 * 60);
  } catch (error) {
    logger.warn('额度 Token 记录失败（忽略）:', error.message);
  }
}

/**
 * 退还一次预占的调用额度（CLI 调用失败时调用，免得失败请求也占额度）。
 * @param {string} [windowKey] - 预占时返回的 windowKey（缺省为当前窗口）；
 *   用传入的 key 而不用当前窗口，是为了跨 5 小时窗口边界的长调用不扣错窗口。
 * 计数器不低于 0（Lua 内判下限），Redis 不可用时静默跳过。
 */
async function refundReservation(windowKey) {
  const client = sessionStore.getRedisClient();
  if (!client) return;
  try {
    const key = windowKey || `ai:calls:5h:${currentWindowStart()}`;
    await client.eval(
      `local c = tonumber(redis.call('GET', KEYS[1]) or '0')
       if c > 0 then redis.call('DECR', KEYS[1]) end
       return 1`,
      { keys: [key] }
    );
  } catch (error) {
    logger.warn('额度预占退还失败（忽略）:', error.message);
  }
}

/**
 * 提供默认模型前的统一入口：返回默认模型 + 额度状态。
 * 前端从 /api/health 拿到的就是这份数据。
 * @param {string} [configuredModel] - 后端配置的模型（.env 的 GITCODE_MODEL），未传时用默认模型
 */
async function getDefaultModelStatus(configuredModel) {
  const quota = await checkQuota();
  return {
    model: configuredModel || DEFAULT_MODEL,
    available: quota.available,
    quota
  };
}

module.exports = {
  DEFAULT_MODEL,
  CALLS_PER_5H,
  TOKENS_PER_MONTH,
  checkQuota,
  recordUsage,
  checkAndReserve,
  recordTokens,
  refundReservation,
  getDefaultModelStatus,
  isNightHours,
  currentCallsLimit,
  currentWindowStart
};
