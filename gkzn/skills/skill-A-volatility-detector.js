// skills/skill-A-volatility-detector.js — Skill A: Volatility Detector 位次波动检测
// (基于 GitHub 高 Star 项目「大小年识别」核心逻辑：样本标准差 + CV + 振荡反转计数)
// 纯 ES5：var/function/IIFE，兼容旧浏览器。延迟绑定 GK.Utils / GK.Data，避免加载顺序问题。
if (!window.GK) window.GK = { Utils: {}, Data: {}, Skills: {} };
window.GK.Skills.VolatilityDetector = (function () {
  'use strict';

  // ---------- 内部降级实现（仅当 GK.Utils 不可用时使用）----------
  function meanArr(a) {
    var s = 0, n = a.length;
    for (var i = 0; i < n; i++) s += a[i];
    return n ? s / n : 0;
  }
  // 样本标准差 n-1（与“3 年位次样本标准差 n-1”一致）
  function stdArr(a) {
    var n = a.length;
    if (n < 2) return 0;
    var m = meanArr(a), s = 0;
    for (var i = 0; i < n; i++) { var d = a[i] - m; s += d * d; }
    return Math.sqrt(s / (n - 1));
  }
  function clamp01(x) { if (x < 0) return 0; if (x > 1) return 1; return x; }
  function round4(x) { return Math.round(x * 10000) / 10000; }

  // history_ranks:{2025:r, 2024:r, ...} → [{year,rank}] 按年升序
  function historyToSeries(historyRanks) {
    var series = [];
    if (!historyRanks) return series;
    for (var y in historyRanks) {
      if (!historyRanks.hasOwnProperty(y)) continue;
      var r = historyRanks[y];
      if (r == null) continue;
      series.push({ year: parseInt(y, 10) || y, rank: r });
    }
    series.sort(function (a, b) { return a.year - b.year; });
    return series;
  }

  // ---------- 公共 API ----------

  /**
   * 计算位次序列的波动指标（均值/样本标准差/CV/等级/趋势）。
   * @param {Array<{year:number, rank:number}>} rankSeries 位次序列，至少 2 年，推荐 3 年
   * @returns {{years:number, mean:number|null, std:number|null, cv:number|null, level:string, trend:string, note:string}}
   *   level: 'low'(cv<0.03) | 'mid'(0.03~0.08) | 'high'(>0.08) | 'insufficient'(years<3)
   *   trend: 'up'(位次变小=分上涨) | 'down' | 'flat' | 'unknown'
   */
  function volatility(rankSeries) {
    var empty = { years: 0, mean: null, std: null, cv: null, level: 'insufficient', trend: 'unknown', note: '数据为空' };
    if (!rankSeries || !rankSeries.length) return empty;
    // 按年份升序
    var series = rankSeries.slice().sort(function (a, b) { return a.year - b.year; });
    var ranks = [];
    for (var i = 0; i < series.length; i++) {
      if (series[i] && series[i].rank != null) ranks.push(series[i].rank);
    }
    var years = ranks.length;
    if (years === 0) {
      return { years: 0, mean: null, std: null, cv: null, level: 'insufficient', trend: 'unknown', note: '无有效位次数据' };
    }

    // mean/std 优先用 GK.Utils（样本标准差 n-1）
    var Utils = window.GK && window.GK.Utils;
    var mean = (Utils && typeof Utils.mean === 'function') ? Utils.mean(ranks) : meanArr(ranks);
    var std = (Utils && typeof Utils.std === 'function') ? Utils.std(ranks) : stdArr(ranks);
    var cv = (mean && mean !== 0) ? std / mean : null;

    // level
    var level;
    if (years < 3) level = 'insufficient';
    else if (cv == null) level = 'insufficient';
    else if (cv < 0.03) level = 'low';
    else if (cv <= 0.08) level = 'mid';
    else level = 'high';

    // trend：近 2 年位次升降（位次变小=分数上涨='up'）
    var trend = 'unknown';
    if (years >= 2) {
      var last = ranks[years - 1];
      var prev = ranks[years - 2];
      if (last < prev) trend = 'up';        // 位次变小 → 分数上涨
      else if (last > prev) trend = 'down'; // 位次变大 → 分数下降
      else trend = 'flat';
    }

    var note;
    if (years < 3) note = '数据不足（仅 ' + years + ' 年），需补录历年数据';
    else if (level === 'high') note = '位次波动较大，建议谨慎';
    else if (level === 'mid') note = '位次波动中等';
    else note = '位次稳定';

    return { years: years, mean: mean, std: std, cv: cv, level: level, trend: trend, note: note };
  }

  /**
   * 大小年识别：三判据全满足才判定为大小年。
   *   a. cv > 0.15
   *   b. currentRank > lastRank * 1.2（去年大年，今年可能小年）
   *   c. oscillation >= 2（相邻年份位次方向反转次数）
   * @param {Array<{year:number, rank:number}>} rankSeries 位次序列
   * @param {number} currentRank 当年位次
   * @returns {{isBigSmallYear:boolean, pattern:string, lastYear:string|null, predictNext:string|null, confidence:number, note:string}}
   */
  function detectBigSmallYear(rankSeries, currentRank) {
    var vol = volatility(rankSeries);
    var base = { isBigSmallYear: false, pattern: 'none', lastYear: null, predictNext: null, confidence: 0, note: vol.note };
    if (!vol.mean || vol.years < 2) return base;

    // 按年升序的有效 ranks
    var series = (rankSeries || []).slice().sort(function (a, b) { return a.year - b.year; });
    var ranks = [];
    for (var i = 0; i < series.length; i++) {
      if (series[i] && series[i].rank != null) ranks.push(series[i].rank);
    }
    var n = ranks.length;
    var lastRank = ranks[n - 1];
    var mean = vol.mean;
    var cv = vol.cv;

    // lastYear：lastRank < mean → 位次靠前=分高=大年('big')；否则小年('small')
    var lastYear = lastRank < mean ? 'big' : 'small';

    // currentYear 模式（基于 currentRank vs lastRank）
    var currentYear = lastYear;
    if (currentRank != null) {
      if (currentRank > lastRank) currentYear = 'small'; // 位次变大=分降=小年
      else if (currentRank < lastRank) currentYear = 'big';
    }
    // predictNext：反向预测（与 currentYear 相反）
    var predictNext = currentYear === 'big' ? 'small' : 'big';

    // 振荡次数：相邻年份位次方向反转次数
    var oscillation = 0;
    for (var j = 2; j < n; j++) {
      var dPrev = ranks[j - 1] - ranks[j - 2];
      var dCurr = ranks[j] - ranks[j - 1];
      if ((dCurr > 0 && dPrev < 0) || (dCurr < 0 && dPrev > 0)) oscillation++;
    }

    // 三判据全满足才 isBigSmallYear
    var critA = cv != null && cv > 0.15;
    var critB = currentRank != null && currentRank > lastRank * 1.2;
    var critC = oscillation >= 2;
    var isBSY = critA && critB && critC;

    // confidence：随振荡次数与幅度递增
    var conf = 0;
    if (isBSY) {
      conf = clamp01(0.3 + 0.15 * oscillation + (cv - 0.15) * 2);
    }

    return {
      isBigSmallYear: isBSY,
      pattern: isBSY ? ('big-small oscillation (reversals=' + oscillation + ')') : 'none',
      lastYear: lastYear,
      predictNext: predictNext,
      confidence: conf,
      note: isBSY ? ('检测到大小年：去年' + lastYear + '年，预计明年' + predictNext + '年') : ('未达大小年判据（cv=' + round4(cv || 0) + ', reversals=' + oscillation + '）')
    };
  }

  /**
   * 按波动性过滤志愿：history_ranks 转 rankSeries 调 volatility，按 minYears/maxCV 判定保留。
   * @param {Array} volunteers 含 history_ranks 的志愿数组
   * @param {Object} opts {minYears:3, maxCV:0.08}
   * @returns {Array<{volunteer:Object, volatility:Object, keep:boolean, reason:string}>}
   *   keep = (years>=minYears && cv<=maxCV) || years<minYears（降级保留）
   */
  function filterByVolatility(volunteers, opts) {
    opts = opts || {};
    var minYears = opts.minYears != null ? opts.minYears : 3;
    var maxCV = opts.maxCV != null ? opts.maxCV : 0.08;
    var out = [];
    if (!volunteers || !volunteers.length) return out;
    for (var i = 0; i < volunteers.length; i++) {
      var v = volunteers[i];
      var series = historyToSeries(v && v.history_ranks);
      var vol = volatility(series);
      var keep, reason;
      if (vol.years < minYears) {
        // 降级保留（数据不足不报错）
        keep = true;
        reason = '数据不足（' + vol.years + ' 年 < ' + minYears + '），降级保留';
      } else if (vol.cv != null && vol.cv <= maxCV) {
        keep = true;
        reason = '波动可控（cv=' + round4(vol.cv) + ' <= ' + maxCV + '）';
      } else {
        keep = false;
        reason = '波动过大（cv=' + round4(vol.cv) + ' > ' + maxCV + '），建议剔除';
      }
      out.push({ volunteer: v, volatility: vol, keep: keep, reason: reason });
    }
    return out;
  }

  return {
    volatility: volatility,
    detectBigSmallYear: detectBigSmallYear,
    filterByVolatility: filterByVolatility
  };
})();

// === 测试用例（console 验证，依赖 _core.js / data/*.js 已就绪）===
// 1) GK.Skills.VolatilityDetector.volatility([{year:2023,rank:18000},{year:2024,rank:22000},{year:2025,rank:20000}])
//    预期：years=3，cv 约 0.1（>0.08 → level='high'），trend='down'（2025>2024? 实际 20000<22000 → 'up'）
// 2) GK.Skills.VolatilityDetector.detectBigSmallYear(
//      [{year:2022,rank:15000},{year:2023,rank:24000},{year:2024,rank:16000},{year:2025,rank:25000}], 22000)
//    预期：oscillation>=2，若 cv>0.15 且 currentRank>lastRank*1.2 → isBigSmallYear=true，predictNext='big'
// 3) GK.Skills.VolatilityDetector.filterByVolatility(
//      [{id:'a', history_ranks:{2025:18260, 2024:19000, 2023:18500}}], {minYears:3, maxCV:0.08})
//    预期：keep=true（3 年数据，cv 小），level='low' 或 'mid'
