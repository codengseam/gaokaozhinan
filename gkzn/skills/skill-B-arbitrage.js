// skills/skill-B-arbitrage.js — Skill B: Arbitrage Detector 同层次院校套利检测
// (基于 GitHub 高 Star 项目「同层次院校套利」核心逻辑：位次窗 + 分桶 + 两指针，避免 O(N²))
// 纯 ES5：var/function/IIFE，兼容旧浏览器。延迟绑定 GK.Utils / GK.Data / GK.Skills，避免加载顺序问题。
if (!window.GK) window.GK = { Utils: {}, Data: {}, Skills: {} };
window.GK.Skills.ArbitrageDetector = (function () {
  'use strict';

  // ---------- 内部降级实现 ----------
  function clamp(v, min, max) {
    var Utils = window.GK && window.GK.Utils;
    if (Utils && typeof Utils.clamp === 'function') return Utils.clamp(v, min, max);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }
  function round4(x) { return Math.round(x * 10000) / 10000; }

  // 专业方向关键词映射（major_name → direction）
  // direction 同类是「同层次」判据之一：computer/finance/electrical
  var DIRECTION_KEYWORDS = {
    computer: ['计算机', '软件', '网络空间', '网络工程', '信息安全', '人工智能', '数据科学', '大数据'],
    finance: ['财会', '会计', '审计', '财政', '税收', '金融', '经济'],
    electrical: ['电气', '能源', '动力', '自动化', '新能源', '电子']
  };

  // 城市层级关键词（一线 / 新一线）—— 用 tier_tags.feature 或 school 名简化判断
  var TIER1_KEYWORDS = ['上海', '深圳', '北京', '广州'];
  var NEW_TIER1_KEYWORDS = ['成都', '重庆', '杭州', '南京', '武汉', '西安', '苏州', '天津'];

  // 省份/直辖市关键字（用于跨省判断的简化）
  var PROVINCE_KEYWORDS = [
    '北京', '上海', '天津', '重庆',
    '广东', '深圳', '广州', '东莞', '佛山',
    '江苏', '南京', '苏州', '无锡', '徐州',
    '浙江', '杭州', '宁波', '温州',
    '四川', '成都', '绵阳',
    '湖北', '武汉',
    '陕西', '西安',
    '山东', '济南', '青岛', '烟台', '威海',
    '湖南', '长沙',
    '河南', '郑州', '洛阳',
    '福建', '福州', '厦门',
    '辽宁', '大连', '沈阳',
    '吉林', '长春',
    '黑龙江', '哈尔滨',
    '河北', '石家庄', '保定',
    '山西', '太原',
    '云南', '昆明',
    '贵州', '贵阳',
    '广西', '南宁',
    '海南', '海口',
    '甘肃', '兰州',
    '青海', '西宁',
    '宁夏', '银川',
    '新疆', '乌鲁木齐',
    '内蒙古', '呼和浩特',
    '西藏', '拉萨',
    '江西', '南昌',
    '安徽', '合肥'
  ];

  // 推断专业方向：优先 item.direction，否则从 major_name/major/name 关键字匹配
  function inferDirection(item) {
    if (!item) return null;
    if (item.direction) return item.direction;
    var name = '';
    if (typeof item.major_name === 'string') name = item.major_name;
    else if (typeof item.major === 'string') name = item.major;
    else if (typeof item.name === 'string') name = item.name;
    if (!name) return null;
    for (var k in DIRECTION_KEYWORDS) {
      if (!DIRECTION_KEYWORDS.hasOwnProperty(k)) continue;
      var kws = DIRECTION_KEYWORDS[k];
      for (var i = 0; i < kws.length; i++) {
        if (name.indexOf(kws[i]) >= 0) return k;
      }
    }
    return null;
  }

  // 提取院校所在地特征串：tier_tags.feature 优先，其次 school/school_name/city/province
  function extractLocation(item) {
    if (!item) return '';
    var tags = item.tier_tags || {};
    if (tags.feature && typeof tags.feature === 'string') return tags.feature;
    if (typeof item.school === 'string') return item.school;
    if (typeof item.school_name === 'string') return item.school_name;
    if (typeof item.city === 'string') return item.city;
    if (typeof item.province === 'string') return item.province;
    return '';
  }

  // 城市层级：'tier1' / 'new_tier1' / 'other'
  function cityTier(loc) {
    if (!loc) return 'other';
    for (var i = 0; i < TIER1_KEYWORDS.length; i++) {
      if (loc.indexOf(TIER1_KEYWORDS[i]) >= 0) return 'tier1';
    }
    for (var j = 0; j < NEW_TIER1_KEYWORDS.length; j++) {
      if (loc.indexOf(NEW_TIER1_KEYWORDS[j]) >= 0) return 'new_tier1';
    }
    return 'other';
  }

  // 从 location 串中提取首个匹配的省份/城市关键字（简化省籍判断）
  function provinceOf(loc) {
    if (!loc) return '';
    for (var i = 0; i < PROVINCE_KEYWORDS.length; i++) {
      if (loc.indexOf(PROVINCE_KEYWORDS[i]) >= 0) return PROVINCE_KEYWORDS[i];
    }
    return '';
  }

  // 跨省判断：两地 province 关键字不同视为跨省（简化方案）
  function isCrossProvince(locA, locB) {
    if (!locA || !locB) return false;
    var pa = provinceOf(locA);
    var pb = provinceOf(locB);
    if (!pa || !pb) return locA !== locB; // 无法识别则退化为字符串不等
    return pa !== pb;
  }

  // locationPremium：城市层级提升溢价（B 相对 A）
  //   一线 +0.30 / 新一线 +0.20 / 同级或降级 0
  function locationPremium(locA, locB) {
    var ta = cityTier(locA);
    var tb = cityTier(locB);
    var pa = ta === 'tier1' ? 0.30 : (ta === 'new_tier1' ? 0.20 : 0);
    var pb = tb === 'tier1' ? 0.30 : (tb === 'new_tier1' ? 0.20 : 0);
    var diff = pb - pa;
    return diff > 0 ? diff : 0; // 仅计提升，不计降级
  }

  // 获取 item 位次：rank_2025 优先，降级 rank / rank_2024
  function getRank(item) {
    if (!item) return null;
    if (item.rank_2025 != null) return item.rank_2025;
    if (item.rank != null) return item.rank;
    if (item.rank_2024 != null) return item.rank_2024;
    return null;
  }

  // 院校显示名（用于 note 拼接）
  function displayName(item) {
    if (!item) return '?';
    if (typeof item.school === 'string') return item.school;
    if (typeof item.school_name === 'string') return item.school_name;
    if (typeof item.name === 'string') return item.name;
    return '?';
  }

  // ---------- 公共 API ----------

  /**
   * 单项套利评分：score = (candidateRank - item.rank_2025) / candidateRank。
   * 正分表示院校位次比考生靠前（冲），负分表示靠后（保）。
   * @param {Object} item 院校/专业志愿项（含 rank_2025 或 rank）
   * @param {number} candidateRank 考生位次
   * @returns {{score:number, reasons:Array<string>}}
   */
  function scoreArbitrage(item, candidateRank) {
    var empty = { score: 0, reasons: [] };
    if (!item || !candidateRank || candidateRank <= 0) return empty;
    var rank = getRank(item);
    if (rank == null || rank <= 0) {
      return { score: 0, reasons: ['缺少 rank_2025 数据，套利分降级为 0'] };
    }
    // 核心公式：(考生位次 - 院校位次) / 考生位次
    var score = (candidateRank - rank) / candidateRank;
    var reasons = [];
    var delta = candidateRank - rank;
    if (delta > 0) {
      // 院校位次靠前 = 冲
      reasons.push('院校位次比考生靠前 ' + delta + ' 名，属"冲"类套利空间');
    } else if (delta < 0) {
      // 院校位次靠后 = 保
      reasons.push('院校位次比考生靠后 ' + (-delta) + ' 名，属"保"类');
    } else {
      reasons.push('位次完全匹配，无套利空间');
    }
    return { score: round4(score), reasons: reasons };
  }

  /**
   * 查找同层次 peer 院校：位次窗（rankTolerance）+ direction 同类过滤。
   * @param {Object} targetItem 目标项
   * @param {Array} allItems 全量池
   * @param {number} candidateRank 考生位次
   * @param {Object} opts {rankTolerance:0.15, direction?:string}
   * @returns {Array<{item:Object, rankDelta:number, arbitrageScore:number}>}
   */
  function findPeers(targetItem, allItems, candidateRank, opts) {
    opts = opts || {};
    var tol = opts.rankTolerance != null ? opts.rankTolerance : 0.15;
    var forceDir = opts.direction || null;
    var out = [];
    if (!targetItem || !allItems || !allItems.length || !candidateRank) return out;

    var targetRank = getRank(targetItem);
    if (targetRank == null || targetRank <= 0) return out;
    var targetDir = forceDir || inferDirection(targetItem);
    if (!targetDir) return out; // 无法判定方向则无 peer

    // 位次窗：[targetRank*(1-tol), targetRank*(1+tol)]
    var lower = targetRank * (1 - tol);
    var upper = targetRank * (1 + tol);

    for (var i = 0; i < allItems.length; i++) {
      var it = allItems[i];
      if (!it || it === targetItem) continue;
      var r = getRank(it);
      if (r == null || r <= 0) continue;
      if (r < lower || r > upper) continue; // 位次窗过滤
      var d = inferDirection(it);
      if (d !== targetDir) continue; // direction 必须相同
      var arb = scoreArbitrage(it, candidateRank);
      out.push({
        item: it,
        rankDelta: r - targetRank,
        arbitrageScore: arb.score
      });
    }
    // 按位次差绝对值升序（越接近越是 peer）
    out.sort(function (a, b) {
      return Math.abs(a.rankDelta) - Math.abs(b.rankDelta);
    });
    return out;
  }

  /**
   * 查找套利对：位次窗 + direction 分桶 + 桶内两指针（避免 O(N²)）。
   * 同层次五条件（全满足）：
   *   1. |rankA - rankB| ≤ pairDelta
   *   2. 两者均落在 [candidateRank-rankWindow, candidateRank+rankWindow]
   *   3. direction 相同（major 同类）
   *   4. 跨省（location 不同省籍）
   *   5. 一冲一保：rankA < candidateRank < rankB
   * 套利评分：score = locationPremium - rankCost
   *   rankCost = (rankB - rankA) / candidateRank
   *   locationPremium：城市层级提升（一线+0.30 / 新一线+0.20 / 同级0）
   * @param {number} candidateRank 考生位次
   * @param {Object} candidateCtx 考生上下文（保留参数，可选）
   * @param {Array} pool 院校池
   * @param {Object} opts {rankWindow:2000, pairDelta:1000, minScore:0.05}
   * @returns {Array<{pair:Array, rankCost:number, locationPremium:number, score:number, note:string}>}
   */
  function findArbitragePairs(candidateRank, candidateCtx, pool, opts) {
    opts = opts || {};
    var rankWindow = opts.rankWindow != null ? opts.rankWindow : 2000;
    var pairDelta = opts.pairDelta != null ? opts.pairDelta : 1000;
    var minScore = opts.minScore != null ? opts.minScore : 0.05;
    var out = [];
    if (!candidateRank || candidateRank <= 0 || !pool || !pool.length) return out;

    // 1. 位次窗过滤 + 收集 rank/direction/location
    var lo = candidateRank - rankWindow;
    var hi = candidateRank + rankWindow;
    var filtered = [];
    for (var i = 0; i < pool.length; i++) {
      var it = pool[i];
      if (!it) continue;
      var r = getRank(it);
      if (r == null || r <= 0) continue;
      if (r < lo || r > hi) continue; // 位次窗
      var d = inferDirection(it);
      if (!d) continue; // 无方向则无法同层次配对
      filtered.push({ item: it, rank: r, direction: d, location: extractLocation(it) });
    }
    if (filtered.length < 2) return out;

    // 2. 按 direction 分桶（桶内独立配对，避免 O(N²)）
    var buckets = {};
    for (var k = 0; k < filtered.length; k++) {
      var f = filtered[k];
      var key = f.direction;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(f);
    }

    // 3. 桶内按 rank 升序 + 两指针找对
    //    i2 指向 A（rank 小=冲），j2 指向 B（rank 大=保）
    //    由于 arr 升序，A.rank>=candidateRank 时外层 break；
    //    B.rank 升序导致 delta 单调递增，delta>pairDelta 时内层 break
    for (var dir in buckets) {
      if (!buckets.hasOwnProperty(dir)) continue;
      var arr = buckets[dir];
      arr.sort(function (x, y) { return x.rank - y.rank; });
      var n = arr.length;
      for (var i2 = 0; i2 < n; i2++) {
        var A = arr[i2];
        // 一冲一保条件：A.rank < candidateRank
        if (A.rank >= candidateRank) break; // arr 升序，后续 A 只会更大
        for (var j2 = i2 + 1; j2 < n; j2++) {
          var B = arr[j2];
          // 一冲一保条件：B.rank > candidateRank
          if (B.rank <= candidateRank) continue;
          var delta = B.rank - A.rank;
          // 位次差条件：delta ≤ pairDelta（升序，超出后 break）
          if (delta > pairDelta) break;
          // 跨省条件
          if (!isCrossProvince(A.location, B.location)) continue;
          // 套利评分
          var rankCost = delta / candidateRank;
          var prem = locationPremium(A.location, B.location);
          var score = prem - rankCost;
          if (score < minScore) continue;
          var note = 'A="' + displayName(A.item) + '"(rank' + A.rank + ') → B="' + displayName(B.item) + '"(rank' + B.rank +
            '），城市溢价+' + round4(prem) + '，位次成本-' + round4(rankCost);
          out.push({
            pair: [A.item, B.item],
            rankCost: round4(rankCost),
            locationPremium: round4(prem),
            score: round4(score),
            note: note
          });
        }
      }
    }

    // 4. 按 score 降序
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  /**
   * 按套利分降序排列 volunteers（浅拷贝，不改原数组）。
   * @param {Array} volunteers 志愿数组
   * @param {number} candidateRank 考生位次
   * @returns {Array} 排序后的浅拷贝
   */
  function rankByArbitrage(volunteers, candidateRank) {
    if (!volunteers || !volunteers.length) return [];
    var arr = volunteers.slice();
    arr.sort(function (a, b) {
      var sa = scoreArbitrage(a, candidateRank).score;
      var sb = scoreArbitrage(b, candidateRank).score;
      return sb - sa;
    });
    return arr;
  }

  /**
   * 高亮 TopN 套利亮点并附一句话理由。
   * @param {Array} volunteers 志愿数组
   * @param {number} candidateRank 考生位次
   * @param {number} topN 默认 5
   * @returns {Array<{item:Object, score:number, reason:string}>}
   */
  function highlight(volunteers, candidateRank, topN) {
    if (topN == null) topN = 5;
    if (!volunteers || !volunteers.length || !candidateRank) return [];
    var ranked = rankByArbitrage(volunteers, candidateRank);
    var out = [];
    var lim = Math.min(topN, ranked.length);
    for (var i = 0; i < lim; i++) {
      var it = ranked[i];
      var r = scoreArbitrage(it, candidateRank);
      var reason;
      if (r.reasons && r.reasons.length) {
        reason = r.reasons[0];
      } else if (r.score > 0) {
        reason = '套利分 +' + r.score + '，存在冲类空间';
      } else if (r.score < 0) {
        reason = '套利分 ' + r.score + '，保底稳妥';
      } else {
        reason = '套利分 0，位次匹配';
      }
      out.push({ item: it, score: r.score, reason: reason });
    }
    return out;
  }

  return {
    scoreArbitrage: scoreArbitrage,
    findPeers: findPeers,
    findArbitragePairs: findArbitragePairs,
    rankByArbitrage: rankByArbitrage,
    highlight: highlight
  };
})();

// === 测试用例（console 验证，依赖 _core.js / data/*.js 已就绪）===
// 1) GK.Skills.ArbitrageDetector.scoreArbitrage({school:'A校', rank_2025:18000}, 20161)
//    预期：score = (20161-18000)/20161 ≈ +0.1072（冲类），reasons 含"靠前 2161 名"
// 2) GK.Skills.ArbitrageDetector.findPeers(
//      {school:'A校', major_name:'计算机科学与技术', rank_2025:19500},
//      [{school:'B校', major_name:'软件工程', rank_2025:20000},
//       {school:'C校', major_name:'电气工程', rank_2025:19800}],
//      20161, {rankTolerance:0.15})
//    预期：仅 B 校命中（同为 computer 方向且在窗内），C 校 direction='electrical' 排除
// 3) GK.Skills.ArbitrageDetector.findArbitragePairs(
//      20161, {},
//      [{school:'郑州X大', major_name:'计算机', rank_2025:19700, tier_tags:{feature:'郑州'}},
//       {school:'北京Y大', major_name:'软件工程', rank_2025:20700, tier_tags:{feature:'北京'}}],
//      {rankWindow:2000, pairDelta:1000, minScore:0.0})
//    预期：返回 1 对，rankCost=1000/20161≈0.0496，locationPremium=+0.30（北京一线 > 郑州其他），score≈0.2504
// 4) GK.Skills.ArbitrageDetector.rankByArbitrage(
//      [{name:'a',rank_2025:18000},{name:'b',rank_2025:22000}], 20161)
//    预期：[a, b]（a 套利分 +0.1072 > b 的 -0.0912，降序）
// 5) GK.Skills.ArbitrageDetector.highlight(
//      [{school:'A',rank_2025:18000},{school:'B',rank_2025:22000}], 20161, 2)
//    预期：TopN=2，第一条 score≈+0.1072 reason 含"冲"，第二条 score≈-0.0912 reason 含"保"
