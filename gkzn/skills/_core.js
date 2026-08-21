// skills/_core.js — TRAE 志愿填报核心底座：全局命名空间 + 工具函数
// 纯 ES5（var/function/IIFE），兼容旧浏览器，风格与 assets/charts.js 一致
(function () {
  // 防重复初始化
  if (window.GK && window.GK.__core_loaded) { return; }

  var GK = window.GK || {};
  GK.Utils = GK.Utils || {};
  GK.Data = GK.Data || {};
  GK.Skills = GK.Skills || {};

  /**
   * 二分查找左边界：pairs 为 [[累计人数, 分数], ...]，按"累计人数"升序。
   * 返回首个 pairs[i][0] >= targetRank 的下标 i（取值范围 0..length）。
   */
  function bisectLeft(pairs, targetRank) {
    var lo = 0;
    var hi = pairs.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (pairs[mid][0] < targetRank) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  /** 限幅：将 v 限制在 [min, max] 区间 */
  function clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
  }

  /** 线性插值：a + (b - a) * t */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** 均值，空数组返回 0 */
  function mean(arr) {
    var n = arr.length;
    if (n === 0) { return 0; }
    var s = 0;
    for (var i = 0; i < n; i++) { s += arr[i]; }
    return s / n;
  }

  /** 中位数，空数组返回 0 */
  function median(arr) {
    var n = arr.length;
    if (n === 0) { return 0; }
    var tmp = [];
    for (var i = 0; i < n; i++) { tmp.push(arr[i]); }
    tmp.sort(function (x, y) { return x - y; });
    var mid = n >> 1;
    if ((n & 1) === 1) { return tmp[mid]; }
    return (tmp[mid - 1] + tmp[mid]) / 2;
  }

  /**
   * 标准差。ddof 默认 1（样本标准差，除以 n-1）；空数组返回 0。
   */
  function std(arr, ddof) {
    var n = arr.length;
    if (n === 0) { return 0; }
    if (ddof == null) { ddof = 1; }
    var m = mean(arr);
    var sq = 0;
    for (var i = 0; i < n; i++) {
      var d = arr[i] - m;
      sq += d * d;
    }
    var denom = n - ddof;
    if (denom <= 0) { return 0; }
    return Math.sqrt(sq / denom);
  }

  /** 四舍五入，digits 默认 2 */
  function round(v, digits) {
    if (digits == null) { digits = 2; }
    var f = Math.pow(10, digits);
    return Math.round(v * f) / f;
  }

  /**
   * 校验数组按 pairs[i][0] 升序排列（用于一分一段表 pairs=[累计人数,分数] 校验）。
   * 返回 true/false。
   */
  function isSortedAsc(pairs) {
    var n = pairs.length;
    for (var i = 1; i < n; i++) {
      if (pairs[i][0] < pairs[i - 1][0]) { return false; }
    }
    return true;
  }

  GK.Utils.bisectLeft = bisectLeft;
  GK.Utils.clamp = clamp;
  GK.Utils.lerp = lerp;
  GK.Utils.mean = mean;
  GK.Utils.median = median;
  GK.Utils.std = std;
  GK.Utils.round = round;
  GK.Utils.isSortedAsc = isSortedAsc;

  GK.__core_loaded = true;
  window.GK = GK;
})();
