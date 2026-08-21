// skills/skill-2-volunteer-optimizer.js — Skill 2: Volunteer Optimizer 志愿优化器
// (基于 GitHub 高 Star 项目「高考志愿冲稳保分档」核心逻辑：位次系数分档 + 概率模型)
// 纯 ES5：var/function/IIFE，兼容旧浏览器。延迟绑定 GK.Utils / GK.Data / GK.Skills，避免加载顺序问题。
if (!window.GK) window.GK = { Utils: {}, Data: {}, Skills: {} };
window.GK.Skills.VolunteerOptimizer = (function () {
  'use strict';

  // ---------- 内部工具 ----------
  // clamp 到 [0,1]：优先用 GK.Utils.clamp，不可用则降级
  function clamp01(x) {
    var Utils = window.GK && window.GK.Utils;
    if (Utils && typeof Utils.clamp === 'function') return Utils.clamp(x, 0, 1);
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  // 线性插值并 clamp：优先用 GK.Utils.lerp
  function lerpClamp(a, b, t) {
    var Utils = window.GK && window.GK.Utils;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    if (Utils && typeof Utils.lerp === 'function') return Utils.lerp(a, b, t);
    return a + (b - a) * t;
  }

  // 按 prob 降序排序（原地）
  function sortByProbDesc(arr) {
    arr.sort(function (x, y) {
      var px = x.prob == null ? -1 : x.prob;
      var py = y.prob == null ? -1 : y.prob;
      return py - px;
    });
    return arr;
  }

  // 分档固定边界（规范要求严格按此，1.15 归 stable）
  var SURGE_UPPER = 0.95; // surge 上界（双闭）
  var SAFE_UPPER = 1.30;  // safe 上界（闭上）

  // ---------- 公共 API ----------

  /**
   * 志愿分档：根据考生位次与院校位次计算位次系数 c=schoolRank/candidateRank，分入 surge/gap/stable/safe/hopeless/overSafe。
   * 注意：schoolRank 越小（位次靠前）表示学校越强；c<1 表示学校比考生强（冲）。
   * @param {number} candidateRank 考生位次
   * @param {number} schoolRank 院校录取位次（如 rank_2025）
   * @param {Object} opts {coef:{rush:0.85,steady:1.0,safe:1.15}, volatility:{level,std}, year, category}
   * @returns {{tier:string, prob:number, marginRank:number|null, marginScore:number|null, note:string}}
   */
  function classifyTier(candidateRank, schoolRank, opts) {
    opts = opts || {};
    var coef = opts.coef || { rush: 0.85, steady: 1.0, safe: 1.15 };
    var volatility = opts.volatility || {};
    var RUSH = coef.rush, STEADY = coef.steady, SAFE = coef.safe;
    var emptyNote = '数据缺失';

    if (!candidateRank || !schoolRank || candidateRank <= 0 || schoolRank <= 0) {
      return { tier: 'hopeless', prob: 0, marginRank: null, marginScore: null, note: emptyNote };
    }

    var c = schoolRank / candidateRank; // 位次系数：越小学校越强
    var tier, prob;

    // 分档（严格按规范区间）
    if (c < RUSH) {                       // c < 0.85
      tier = 'hopeless'; prob = 0.05;
    } else if (c <= SURGE_UPPER) {        // [0.85, 0.95] 双闭
      tier = 'surge';
      prob = lerpClamp(0.2, 0.5, (c - RUSH) / (SURGE_UPPER - RUSH)); // 越接近 0.85 越低
    } else if (c < STEADY) {              // (0.95, 1.00) 开区间
      tier = 'gap'; prob = 0.5;
    } else if (c <= SAFE) {               // [1.00, 1.15] 双闭
      tier = 'stable';
      prob = lerpClamp(0.7, 0.95, (c - STEADY) / (SAFE - STEADY));
    } else if (c <= SAFE_UPPER) {         // (1.15, 1.30] 开下闭上
      tier = 'safe';
      prob = lerpClamp(0.95, 0.99, (c - SAFE) / (SAFE_UPPER - SAFE));
    } else {                              // > 1.30
      tier = 'overSafe'; prob = 0.99;
    }

    // 波动性高 → 概率衰减（不确定性增大）
    if (volatility.level === 'high' && prob != null) prob *= 0.8;
    if (prob != null) prob = clamp01(prob);

    // marginRank = candidateRank - schoolRank（正=位次优于该校=更稳）
    var marginRank = candidateRank - schoolRank;

    // marginScore：等位分差（用 Skill 1 换算，可选）
    var marginScore = null;
    if (opts.year && opts.category) {
      var RN = window.GK && window.GK.Skills && window.GK.Skills.RankNormalizer;
      if (RN && typeof RN.rankToScore === 'function') {
        var cs = RN.rankToScore(opts.year, opts.category, candidateRank);
        var ss = RN.rankToScore(opts.year, opts.category, schoolRank);
        if (cs != null && ss != null) marginScore = cs - ss;
      }
    }

    return {
      tier: tier,
      prob: prob,
      marginRank: marginRank,
      marginScore: marginScore,
      note: buildNote(tier, c, prob, marginRank)
    };
  }

  // 生成人类可读备注
  function buildNote(tier, c, prob, marginRank) {
    var cStr = (Math.round(c * 1000) / 1000);
    var pStr = prob != null ? (Math.round(prob * 1000) / 10) + '%' : '?';
    var mStr = marginRank != null ? marginRank : '?';
    if (tier === 'surge') return '冲刺：位次系数 ' + cStr + '，录取概率约 ' + pStr + '，位次差 ' + mStr;
    if (tier === 'stable') return '稳妥：位次系数 ' + cStr + '，录取概率约 ' + pStr + '，位次差 ' + mStr;
    if (tier === 'safe') return '保底：位次系数 ' + cStr + '，录取概率约 ' + pStr + '，位次差 ' + mStr;
    if (tier === 'gap') return '缝隙区：略冲，建议谨慎（概率约 ' + pStr + '）';
    if (tier === 'hopeless') return '希望渺茫：学校过强（位次系数 ' + cStr + '）';
    if (tier === 'overSafe') return '过保：分数浪费，建议替换为更高目标';
    return '未知分档';
  }

  /**
   * 录取概率（统计模型）：以 schoolRank 为均值、σ=f(volatility.std||schoolRank*0.05) 的正态 CDF 在 candidateRank 处取值。
   * 用 logistic 近似正态 CDF（避免引入第三方库）。candidate 位次优于 school（rank 更小）→ 概率高。
   * @param {number} candidateRank 考生位次
   * @param {number} schoolRank 院校位次
   * @param {Object} volatility {std?:number, level?:string}
   * @returns {number} 0..1
   */
  function computeProb(candidateRank, schoolRank, volatility) {
    volatility = volatility || {};
    if (!candidateRank || !schoolRank || candidateRank <= 0 || schoolRank <= 0) return 0;
    // σ：优先用 volatility.std，否则取 schoolRank*0.05
    var sigma = (volatility.std && volatility.std > 0) ? volatility.std : schoolRank * 0.05;
    if (!(sigma > 0)) sigma = 1;
    // z = (schoolRank - candidateRank)/σ：candidate 位次更优（rank 更小）→ z>0 → 高概率
    var z = (schoolRank - candidateRank) / sigma;
    // logistic 近似正态 CDF：Φ(z) ≈ 1/(1+exp(-1.702*z))
    var prob = 1 / (1 + Math.exp(-1.702 * z));
    return clamp01(prob);
  }

  /**
   * 志愿分桶：对每个 volunteer 调 classifyTier，分入 rush/stable/safe；gap/hopeless/overSafe 进 dropped。每组按 prob 降序。
   * @param {Object} candidate {rank, year, category}
   * @param {Array} volunteers [{id,school,major,rank_2025,history_ranks,...}]
   * @param {Object} opts {coef, volatilityMap:{id:{level,std}}}
   * @returns {{rush:Array, stable:Array, safe:Array, dropped:Array}}
   */
  function optimizeBucket(candidate, volunteers, opts) {
    opts = opts || {};
    candidate = candidate || {};
    var candidateRank = candidate.rank;
    var volatilityMap = opts.volatilityMap || {};
    var result = { rush: [], stable: [], safe: [], dropped: [] };
    if (!volunteers || !volunteers.length || !candidateRank) return result;

    for (var i = 0; i < volunteers.length; i++) {
      var v = volunteers[i];
      if (!v) continue;
      var schoolRank = v.rank_2025; // rank_2025 作为 schoolRank
      if (schoolRank == null) {
        result.dropped.push({ volunteer: v, tier: null, prob: 0, reason: 'data_missing', note: '缺少 rank_2025，无法分档' });
        continue;
      }
      var vol = (v.id && volatilityMap[v.id]) || {};
      var cls = classifyTier(candidateRank, schoolRank, {
        coef: opts.coef,
        volatility: vol,
        year: candidate.year,
        category: candidate.category
      });
      var entry = {
        volunteer: v,
        tier: cls.tier,
        prob: cls.prob,
        marginRank: cls.marginRank,
        marginScore: cls.marginScore,
        note: cls.note
      };
      if (cls.tier === 'surge') result.rush.push(entry);
      else if (cls.tier === 'stable') result.stable.push(entry);
      else if (cls.tier === 'safe') result.safe.push(entry);
      else result.dropped.push(entry); // gap/hopeless/overSafe → dropped
    }

    // 每组内按 prob 降序
    sortByProbDesc(result.rush);
    sortByProbDesc(result.stable);
    sortByProbDesc(result.safe);
    sortByProbDesc(result.dropped);
    return result;
  }

  /**
   * 建议志愿配额：按比例分配冲/稳/保数量（呼应 index.html 冲15/稳55/保26）。
   * @param {Array} volunteers 志愿池（仅用于参考容量，可为空）
   * @param {Object} opts {total:96, rushRatio:0.16, steadyRatio:0.57, safeRatio:0.27}
   * @returns {{rush:number, steady:number, safe:number, poolSize:number, warning:string|null, note:string}}
   */
  function suggestQuota(volunteers, opts) {
    opts = opts || {};
    var total = opts.total || 96;
    var rushRatio = opts.rushRatio != null ? opts.rushRatio : 0.16;
    var steadyRatio = opts.steadyRatio != null ? opts.steadyRatio : 0.57;
    var safeRatio = opts.safeRatio != null ? opts.safeRatio : 0.27;
    // 配额以政策志愿总数 total 为基准（重庆本科批 96 个平行志愿），
    // 不因当前志愿池偏小而压缩目标配额；池不足时通过 warning 提示补充。
    var cap = total;
    var poolSize = (volunteers && volunteers.length) ? volunteers.length : 0;
    var rush = Math.round(cap * rushRatio);
    var steady = Math.round(cap * steadyRatio);
    var safe = cap - rush - steady; // 余数归 safe，保证总和=cap
    if (safe < 0) { safe = 0; }
    var note = '建议冲 ' + rush + ' / 稳 ' + steady + ' / 保 ' + safe + '（呼应 96 志愿分配 冲15/稳55/保26）';
    var warning = null;
    if (poolSize > 0 && poolSize < cap) {
      warning = '当前志愿池仅 ' + poolSize + ' 条，不足 ' + cap + ' 个志愿槽位，建议补充 ' + (cap - poolSize) + ' 条至满档';
    }
    return {
      rush: rush,
      steady: steady,
      safe: safe,
      poolSize: poolSize,
      warning: warning,
      note: note
    };
  }

  return {
    classifyTier: classifyTier,
    computeProb: computeProb,
    optimizeBucket: optimizeBucket,
    suggestQuota: suggestQuota
  };
})();

// === 测试用例（console 验证，依赖 _core.js / data/*.js / skill-1 已就绪）===
// 1) GK.Skills.VolunteerOptimizer.classifyTier(20161, 18260, {})
//    预期：tier='surge'（c=18260/20161≈0.906 落 [0.85,0.95]），prob 约 0.2~0.5
// 2) GK.Skills.VolunteerOptimizer.classifyTier(20161, 24396, {})
//    预期：tier='safe'（c≈1.21 落 (1.15,1.30]），prob 约 0.95~0.99
// 3) GK.Skills.VolunteerOptimizer.suggestQuota([], {total:96})
//    预期：{rush:15, steady:55, safe:26}（呼应 index.html 冲15/稳55/保26）
// 4) GK.Skills.VolunteerOptimizer.computeProb(20161, 18260, {})
//    预期：candidate 位次弱于 school（rank 更大）→ 概率 < 0.5
