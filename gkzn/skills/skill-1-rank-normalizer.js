// skills/skill-1-rank-normalizer.js — Skill 1: Rank Normalizer 位次归一化
// (基于 GitHub 高 Star 项目「一分一段表位次换算」核心逻辑：bisect 二分 + 线性插值)
// 纯 ES5：var/function/IIFE，兼容旧浏览器。延迟绑定 GK.Utils / GK.Data，避免加载顺序问题。
if (!window.GK) window.GK = { Utils: {}, Data: {}, Skills: {} };
window.GK.Skills.RankNormalizer = (function () {
  'use strict';

  // ---------- 内部工具：延迟绑定 ----------
  // 取一分一段表数组（结构：[{score,rank},...]，按 score 升序）
  function getTable(year, category) {
    var Data = window.GK && window.GK.Data;
    if (!Data || !Data.ScoreRankTable) return null;
    var cat = Data.ScoreRankTable[category];
    if (!cat) return null;
    var arr = cat[year];
    if (!arr || !arr.length) return null;
    return arr;
  }

  // 构建 [[rank, score]] 并按 rank 升序排序。
  // 兼容两种存储方向（rank 随 score 升 或 降），保证 bisectLeft 可正确二分。
  function buildRankScorePairs(arr) {
    var pairs = [];
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (!item || item.rank == null || item.score == null) continue;
      pairs.push([item.rank, item.score]);
    }
    pairs.sort(function (a, b) { return a[0] - b[0]; });
    return pairs;
  }

  // 从 pairs 派生纯 rank 升序数组，供 bisectLeft 在数字数组上二分
  function buildRanks(pairs) {
    var ranks = [];
    for (var i = 0; i < pairs.length; i++) ranks.push(pairs[i][0]);
    return ranks;
  }

  // 降级线性 bisectLeft（仅当 GK.Utils.bisectLeft 不可用时使用）
  function linearBisectLeft(ranks, x) {
    var n = ranks.length;
    for (var i = 0; i < n; i++) {
      if (ranks[i] >= x) return i;
    }
    return n;
  }

  // ---------- 公共 API ----------

  /**
   * 分数 → 位次（累计位次）。
   * 数组按 score 升序，直接遍历找 score 匹配项返回其 rank；找不到做线性插值；越界返回 null。
   * @param {number} year 年份，如 2025
   * @param {string} category 类别，如 'physics'
   * @param {number} score 分数
   * @returns {number|null} 位次（整数），越界或数据缺失返回 null
   */
  function scoreToRank(year, category, score) {
    if (score == null || isNaN(score)) return null;
    var arr = getTable(year, category);
    if (!arr) return null;
    var n = arr.length;
    // score 越界（低于最低分或高于最高分）返回 null
    if (score < arr[0].score || score > arr[n - 1].score) return null;
    // 精确匹配
    for (var i = 0; i < n; i++) {
      if (arr[i].score === score) return arr[i].rank;
    }
    // 线性插值：在相邻两个 score 之间按分数比例插值 rank
    for (var j = 0; j < n - 1; j++) {
      var s0 = arr[j].score, s1 = arr[j + 1].score;
      if (score > s0 && score < s1) {
        var r0 = arr[j].rank, r1 = arr[j + 1].rank;
        var t = (score - s0) / (s1 - s0);
        return Math.round(r0 + (r1 - r0) * t);
      }
    }
    return null;
  }

  /**
   * 位次 → 分数（可带小数）。
   * 用 bisectLeft 在 [[rank,score]]（rank 升序）上找首个 rank>=目标的下标 idx：
   *   idx==0 → 返回最高分；idx==length → 返回最低分（外推）；否则在 pairs[idx-1]/pairs[idx] 间按 rank 线性插值 score。
   * @param {number} year 年份
   * @param {string} category 类别
   * @param {number} rank 位次
   * @returns {number|null} 分数（可带小数），数据缺失返回 null
   */
  function rankToScore(year, category, rank) {
    if (rank == null || isNaN(rank) || rank < 0) return null;
    var arr = getTable(year, category);
    if (!arr) return null;
    var pairs = buildRankScorePairs(arr); // [[rank,score]] rank 升序
    var n = pairs.length;
    if (n === 0) return null;

    var Utils = window.GK && window.GK.Utils;
    var bisectLeft = Utils && Utils.bisectLeft;
    var lerp = Utils && Utils.lerp;

    var ranks = buildRanks(pairs); // 升序数字数组（仅供降级线性查找使用）
    // 用 GK.Utils.bisectLeft 二分（须传 2D pairs，与 _core.js bisectLeft 签名一致：访问 pairs[i][0]）
    // 不可用则降级线性查找（传 1D ranks）
    var idx = (typeof bisectLeft === 'function')
      ? bisectLeft(pairs, rank)
      : linearBisectLeft(ranks, rank);

    // idx==0：rank 小于等于表中最小位次（对应最高分）
    if (idx <= 0) return pairs[0][1];
    // idx==length：rank 超过表中最大位次（对应最低分，外推）
    if (idx >= n) return pairs[n - 1][1];

    // 在 pairs[idx-1] 与 pairs[idx] 之间按 rank 线性插值 score
    var rA = pairs[idx - 1][0], sA = pairs[idx - 1][1];
    var rB = pairs[idx][0], sB = pairs[idx][1];
    if (rB === rA) return sA;
    var t = (rank - rA) / (rB - rA);
    if (typeof lerp === 'function') return lerp(sA, sB, t);
    return sA + (sB - sA) * t;
  }

  /**
   * 等位分换算：同一位次在不同年份对应的分数差。
   * @param {number} rank 位次
   * @param {Object} opts {fromYear, toYear, category='physics'}
   * @returns {{fromRank:number, fromScore:number|null, toYear:number, toScore:number|null, delta:number|null}}
   *   delta = toScore - fromScore（正=通胀，负=通缩）
   */
  function equivalentScore(rank, opts) {
    opts = opts || {};
    var fromYear = opts.fromYear;
    var toYear = opts.toYear;
    var category = opts.category || 'physics';
    var fromScore = rankToScore(fromYear, category, rank);
    var toScore = rankToScore(toYear, category, rank);
    var delta = null;
    if (fromScore != null && toScore != null) delta = toScore - fromScore;
    return {
      fromRank: rank,
      fromScore: fromScore,
      toYear: toYear,
      toScore: toScore,
      delta: delta
    };
  }

  /**
   * 多年位次归一化：对每个目标年份计算等位分及相对考生当年分的差值。
   * @param {number} candidateRank 考生位次
   * @param {Object} opts {candidateYear, targetYears:[2025,2024,2023], category='physics'}
   * @returns {Array<{year:number, equivalentScore:number|null, equivalentRank:number, deltaVsCandidate:number|null}>}
   */
  function normalize(candidateRank, opts) {
    opts = opts || {};
    var candidateYear = opts.candidateYear;
    var targetYears = opts.targetYears || [2025, 2024, 2023];
    var category = opts.category || 'physics';
    var result = [];
    for (var i = 0; i < targetYears.length; i++) {
      var y = targetYears[i];
      var eq = equivalentScore(candidateRank, {
        fromYear: candidateYear,
        toYear: y,
        category: category
      });
      // deltaVsCandidate = 目标年等位分 - 考生当年等位分（eq.delta 即 toScore - fromScore）
      result.push({
        year: y,
        equivalentScore: eq.toScore,
        equivalentRank: candidateRank,
        deltaVsCandidate: eq.delta
      });
    }
    return result;
  }

  /**
   * 落点定位：返回某位次对应的分数及其所在的分数桶区间。
   * @param {number} rank 位次
   * @param {Object} opts {year, category='physics'}
   * @returns {{score:number|null, lowerBound:{score,rank}|null, upperBound:{score,rank}|null, withinBucket:boolean}}
   */
  function locate(rank, opts) {
    opts = opts || {};
    var year = opts.year;
    var category = opts.category || 'physics';
    var empty = { score: null, lowerBound: null, upperBound: null, withinBucket: false };
    if (rank == null || isNaN(rank)) return empty;
    var arr = getTable(year, category);
    if (!arr) return empty;
    var score = rankToScore(year, category, rank);
    if (score == null) return empty;

    var n = arr.length;
    var lo = null, hi = null;
    // 在 score 升序数组中找 bracketing：lo=最后一个 score<=score；hi=第一个 score>=score
    for (var i = 0; i < n; i++) {
      var s = arr[i].score;
      if (s <= score) lo = arr[i];
      if (s >= score && hi == null) hi = arr[i];
    }
    var withinBucket = !!(lo && hi && lo.score === hi.score);
    return {
      score: score,
      lowerBound: lo ? { score: lo.score, rank: lo.rank } : null,
      upperBound: hi ? { score: hi.score, rank: hi.rank } : null,
      withinBucket: withinBucket
    };
  }

  return {
    scoreToRank: scoreToRank,
    rankToScore: rankToScore,
    equivalentScore: equivalentScore,
    normalize: normalize,
    locate: locate
  };
})();

// === 测试用例（console 验证，依赖 _core.js / data/*.js 已就绪）===
// 1) GK.Skills.RankNormalizer.rankToScore(2025, 'physics', 20161)
//    预期：约 576.x（与 column.html “位次 20161 约对应 2025 年 576–577 分”一致）
// 2) GK.Skills.RankNormalizer.scoreToRank(2025, 'physics', 581)
//    预期：18260（与 column.html “581 分 / 位次 18260”一致）
// 3) GK.Skills.RankNormalizer.normalize(20161, {candidateYear:2026, targetYears:[2025,2024,2023], category:'physics'})
//    预期：返回 3 条记录，2025 年 equivalentScore≈576.x，deltaVsCandidate 反映通胀/通缩
// 4) GK.Skills.RankNormalizer.locate(20161, {year:2025, category:'physics'})
//    预期：score≈576.x，lowerBound/upperBound 为相邻分数桶
