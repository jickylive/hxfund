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
  getDefaultModelStatus,
  isNightHours,
  currentCallsLimit,
  currentWindowStart
};
