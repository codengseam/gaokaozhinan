#!/usr/bin/env node
// scripts/crawl_schools.js — 院校专业分数线爬虫
// ==========================================================================
// 数据源：阳光高考(gaokao.cn) + 含光睿晟(hzgrys.net)
// 目标：爬取 2025 年重庆物理类各院校专业录取分数/位次，生成 /workspace/data/schools.js
// 策略：保守模式，每请求间隔 3-5 秒；阳光高考优先，失败回退含光睿晟
// 容错：单所院校失败不影响整体，失败名单记录在 _meta.crawl_failures
// 零依赖（仅 Node 内置模块），ES5 兼容（var/function/IIFE，无箭头函数/模板字符串）
// ==========================================================================
'use strict';

// ===== 模块引入 =====
var fs = require('fs');
var https = require('https');
var http = require('http');
var path = require('path');
var urlModule = require('url');

// ===== 引入共享工具函数（若 _shared.js 不存在则使用内置 fallback） =====
// _shared.js 约定导出 { Utils: { clamp, round, randInt, ... } }
var shared = null;
try {
  shared = require('./_shared.js');
} catch (e) {
  // _shared.js 尚未创建，使用下方内置实现
  shared = null;
}

var Utils = (shared && shared.Utils) || {
  // 限幅
  clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  // 四舍五入
  round: function (v, d) { d = d == null ? 0 : d; var f = Math.pow(10, d); return Math.round(v * f) / f; },
  // 随机整数 [lo, hi]
  randInt: function (lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
};

// ===== 路径常量 =====
var SCRIPT_DIR = __dirname;
var WORKSPACE_DIR = path.resolve(SCRIPT_DIR, '..');
var SCHOOLS_PATH = path.join(WORKSPACE_DIR, 'data', 'schools.js');
var ANCHORS_PATH = path.join(WORKSPACE_DIR, 'data', 'score_rank_anchors.js');
var POLICIES_PATH = path.join(WORKSPACE_DIR, 'data', 'policies.js');
var OUTPUT_PATH = SCHOOLS_PATH; // 原地生成：保留原数据 + 追加来源字段

// ===== 爬虫配置 =====
var CONFIG = {
  province: '重庆',
  subjectType: '物理类',
  year: 2025,
  delayMin: 3000,        // 请求间隔下限（毫秒）—— 保守模式
  delayMax: 5000,        // 请求间隔上限（毫秒）
  requestTimeout: 15000, // 单次请求超时（毫秒）—— 与 _shared.js 保持一致（15s）
  maxRedirects: 3,       // 最大重定向次数
  maxRetries: 3,         // 网络错误/5xx 最大重试次数（指数退避 1s/2s/4s + 抖动）
  // 数据合理性范围
  scoreMin: 400,
  scoreMax: 700,
  rankMin: 1,
  rankMax: 100000,
  // 锚点匹配容差（5% 或至少 500 名）
  anchorToleranceRatio: 0.05,
  anchorToleranceMin: 500,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// ===== 数据源 URL 构造器 =====
// 阳光高考：按校名搜索院校页
function buildGaokaoUrl(schoolName) {
  return 'https://www.gaokao.cn/school/search?keyword=' + encodeURIComponent(schoolName);
}
// 含光睿晟：按校名搜索
function buildHzgrysUrl(schoolName) {
  return 'https://www.hzgrys.net/search?q=' + encodeURIComponent(schoolName);
}

// ===== HTTP 抓取（回调式，零依赖） =====
// 返回 callback(err, body, statusCode)；自动跟随重定向
// 重试策略：网络错误 / 超时 / HTTP 5xx → 指数退避重试（最多 CONFIG.maxRetries 次）
//           HTTP 4xx → 不重试（多为不存在/需登录，重试无意义）
// 注意：req.destroy() 会触发 'error' 事件，需用 done 守卫防止重复回调
function fetch(targetUrl, redirects, callback, _attempt) {
  if (redirects == null) { redirects = 0; }
  if (_attempt == null) { _attempt = 0; }
  var urlObj = urlModule.parse(targetUrl);
  var lib = (urlObj.protocol === 'https:') ? https : http;
  var options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: (urlObj.pathname || '/') + (urlObj.search || ''),
    method: 'GET',
    headers: {
      'User-Agent': CONFIG.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  };

  // 守卫：确保 callback 只被调用一次（防止 timeout+error 双触发）
  var called = false;
  function done(err, body, status) {
    if (called) { return; }
    called = true;
    callback(err, body, status);
  }

  // 重试辅助：网络错误/超时/5xx 触发，4xx 不重试
  // 指数退避 1s/2s/4s + 0~1000ms 抖动（与 _shared.js fetchWithRetry 一致）
  function retryOrFail(err, status) {
    if (called) { return; }
    if (_attempt < CONFIG.maxRetries) {
      var backoff = Math.min(8000, 1000 * Math.pow(2, _attempt)) + Utils.randInt(0, 1000);
      called = true; // 占位，防止后续事件再次触发 done
      console.warn('[重试] ' + (err && err.message ? err.message : err) +
        '，第 ' + (_attempt + 1) + '/' + CONFIG.maxRetries + ' 次：' + targetUrl +
        '，' + backoff + 'ms 后重试');
      setTimeout(function () {
        fetch(targetUrl, 0, callback, _attempt + 1);
      }, backoff);
    } else {
      done(err, null, status);
    }
  }

  var req = lib.request(options, function (res) {
    // 处理重定向（3xx）
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume(); // 丢弃当前响应体
      if (redirects >= CONFIG.maxRedirects) {
        done(new Error('too_many_redirects'), null, res.statusCode);
        return;
      }
      var nextUrl = urlModule.resolve(targetUrl, res.headers.location);
      // 重定向时解除当前 done 守卫，交给递归 fetch 的新 done
      called = true;
      fetch(nextUrl, redirects + 1, callback, _attempt);
      return;
    }
    // 5xx 可重试（服务器临时错误）
    if (res.statusCode >= 500) {
      res.resume();
      retryOrFail(new Error('http_' + res.statusCode), res.statusCode);
      return;
    }
    // 4xx 等：不重试，直接失败（多为不存在/需登录，重试无意义）
    if (res.statusCode !== 200) {
      res.resume();
      done(new Error('http_' + res.statusCode), null, res.statusCode);
      return;
    }
    // 收集响应体
    var chunks = [];
    res.on('data', function (c) { chunks.push(c); });
    res.on('end', function () {
      var body = Buffer.concat(chunks).toString('utf-8');
      done(null, body, res.statusCode);
    });
    // 响应流异常也走 retryOrFail（网络层错误）
    res.on('error', function (err) {
      retryOrFail(err, 0);
    });
  });

  req.on('error', function (err) {
    retryOrFail(err, 0);
  });
  // 超时处理：销毁请求并重试（destroy 会触发 error，retryOrFail 守卫去重）
  req.setTimeout(CONFIG.requestTimeout, function () {
    req.destroy();
    retryOrFail(new Error('timeout'), 0);
  });
  req.end();
}

// ===== HTML 解析（正则提取分数/位次，零依赖） =====
// 阳光高考页面提取：在 HTML 中匹配 2025 重庆 物理类 分数 与 位次
function extractFromGaokao(html, schoolName) {
  if (!html) { return { score: null, rank: null, source: 'gaokao.cn' }; }
  var score = null, rank = null;
  var i, m, s, r;

  // 分数匹配模式（按优先级排序）
  var scorePatterns = [
    /2025[^<>]{0,40}重庆[^<>]{0,40}?(\d{3})\s*分/,
    /重庆[^<>]{0,20}2025[^<>]{0,40}?(\d{3})\s*分/,
    /物理类[^<>]{0,30}?(\d{3})[^<>]{0,10}?(?:分|录取)/,
    /(\d{3})\s*分[^<>]{0,30}?2025[^<>]{0,30}?重庆/
  ];
  for (i = 0; i < scorePatterns.length; i++) {
    m = html.match(scorePatterns[i]);
    if (m) {
      s = parseInt(m[1], 10);
      if (s >= CONFIG.scoreMin && s <= CONFIG.scoreMax) { score = s; break; }
    }
  }

  // 位次匹配模式
  var rankPatterns = [
    /位次[^\d]{0,8}(\d{3,6})/,
    /排名[^\d]{0,8}(\d{3,6})/,
    /(\d{3,6})\s*名[^<>]{0,20}2025/,
    /2025[^<>]{0,30}?(\d{3,6})\s*名/
  ];
  for (i = 0; i < rankPatterns.length; i++) {
    m = html.match(rankPatterns[i]);
    if (m) {
      r = parseInt(m[1], 10);
      if (r >= CONFIG.rankMin && r <= CONFIG.rankMax) { rank = r; break; }
    }
  }

  return { score: score, rank: rank, source: 'gaokao.cn' };
}

// 含光睿晟页面提取：结构更通用
function extractFromHzgrys(html, schoolName) {
  if (!html) { return { score: null, rank: null, source: 'hzgrys.net' }; }
  var score = null, rank = null;
  var i, m, s, r;

  var scorePatterns = [
    /2025[^<>]{0,40}重庆[^<>]{0,40}?(\d{3})/,
    /重庆[^<>]{0,20}2025[^<>]{0,40}?(\d{3})/,
    /物理[^<>]{0,20}?(\d{3})[^<>]{0,15}?2025/
  ];
  for (i = 0; i < scorePatterns.length; i++) {
    m = html.match(scorePatterns[i]);
    if (m) {
      s = parseInt(m[1], 10);
      if (s >= CONFIG.scoreMin && s <= CONFIG.scoreMax) { score = s; break; }
    }
  }

  var rankPatterns = [
    /位次[^\d]{0,8}(\d{3,6})/,
    /排名[^\d]{0,8}(\d{3,6})/
  ];
  for (i = 0; i < rankPatterns.length; i++) {
    m = html.match(rankPatterns[i]);
    if (m) {
      r = parseInt(m[1], 10);
      if (r >= CONFIG.rankMin && r <= CONFIG.rankMax) { rank = r; break; }
    }
  }

  return { score: score, rank: rank, source: 'hzgrys.net' };
}

// ===== 爬取单所院校（阳光高考优先，失败回退含光睿晟） =====
function crawlSchool(schoolName, callback) {
  var result = { school: schoolName, score: null, rank: null, source: null, error: null };

  // 1) 阳光高考
  fetch(buildGaokaoUrl(schoolName), 0, function (err1, body1, status1) {
    if (!err1 && body1) {
      var data1 = extractFromGaokao(body1, schoolName);
      if (data1 && (data1.score || data1.rank)) {
        result.score = data1.score;
        result.rank = data1.rank;
        result.source = data1.source;
        callback(result);
        return;
      }
    }
    var gaokaoErr = err1 ? err1.message : 'no_data';

    // 2) 阳光高考无数据，间隔后尝试含光睿晟
    var delay = Utils.randInt(CONFIG.delayMin, CONFIG.delayMax);
    setTimeout(function () {
      fetch(buildHzgrysUrl(schoolName), 0, function (err2, body2, status2) {
        if (!err2 && body2) {
          var data2 = extractFromHzgrys(body2, schoolName);
          if (data2 && (data2.score || data2.rank)) {
            result.score = data2.score;
            result.rank = data2.rank;
            result.source = data2.source;
            callback(result);
            return;
          }
        }
        var hzgrysErr = err2 ? err2.message : 'no_data';
        result.error = 'both_failed(gaokao=' + gaokaoErr + ';hzgrys=' + hzgrysErr + ')';
        callback(result);
      });
    }, delay);
  });
}

// ===== 串行爬取所有院校（保守模式：每请求间隔 3-5 秒） =====
function crawlAll(schoolNames, onProgress, onDone) {
  var results = {};     // { 校名: { score, rank, source } }
  var failures = [];    // [{ school, error }]
  var idx = 0;

  function step() {
    if (idx >= schoolNames.length) {
      onDone(results, failures);
      return;
    }
    var name = schoolNames[idx];
    onProgress(idx + 1, schoolNames.length, name);

    crawlSchool(name, function (res) {
      if (res.score || res.rank) {
        results[name] = res;
      } else {
        failures.push({ school: name, error: res.error || 'unknown' });
      }
      idx++;
      // 请求间隔 3-5 秒（保守模式）
      var delay = Utils.randInt(CONFIG.delayMin, CONFIG.delayMax);
      setTimeout(step, delay);
    });
  }

  step();
}

// ===== 读取现有 schools.js，正则提取去重院校名单 =====
function readSchoolNames(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var regex = /school:\s*'([^']+)'/g;
  var match;
  var seen = {};
  var names = [];
  while ((match = regex.exec(content)) !== null) {
    var name = match[1];
    if (!seen[name]) {
      seen[name] = true;
      names.push(name);
    }
  }
  return names;
}

// ===== 读取 score_rank_anchors.js 一分一段锚点 =====
function readAnchors(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  // 匹配 { score: 573, rank: 21426 } 或含 _est 标记
  var regex = /\{\s*score:\s*(\d+)\s*,\s*rank:\s*(\d+)\s*(?:,\s*_est:\s*(true|false)\s*)?\}/g;
  var match;
  var anchors = [];
  while ((match = regex.exec(content)) !== null) {
    anchors.push({
      score: parseInt(match[1], 10),
      rank: parseInt(match[2], 10),
      est: match[3] === 'true'
    });
  }
  return anchors;
}

// ===== 读取 policies.js 的 removed 清单（不爬取预科数据的院校） =====
function readRemovedSchools(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var removed = [];
  var removedIdx = content.indexOf('removed:');
  if (removedIdx < 0) { return removed; }
  var block = content.slice(removedIdx);
  // 在 removed 区块内提取 school 字段
  var regex = /school:\s*'([^']+)'/g;
  var match;
  while ((match = regex.exec(block)) !== null) {
    removed.push(match[1]);
  }
  return removed;
}

// ===== 数据校验：范围 + 锚点交叉验证 =====
// 返回 { ok: boolean, reason: string, ... }
function validateCrawlData(crawlData, anchors) {
  if (!crawlData || (!crawlData.score && !crawlData.rank)) {
    return { ok: false, reason: 'no_data' };
  }
  var score = crawlData.score;
  var rank = crawlData.rank;

  // 1) 分数范围校验（400-700）
  if (score != null && (score < CONFIG.scoreMin || score > CONFIG.scoreMax)) {
    return { ok: false, reason: 'score_out_of_range', value: score };
  }
  // 2) 位次范围校验（1-100000）
  if (rank != null && (rank < CONFIG.rankMin || rank > CONFIG.rankMax)) {
    return { ok: false, reason: 'rank_out_of_range', value: rank };
  }
  // 3) 锚点交叉验证：分数↔位次是否对应
  if (score != null && rank != null) {
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].score === score) {
        var expected = anchors[i].rank;
        var tolerance = Math.max(
          CONFIG.anchorToleranceMin,
          Math.floor(expected * CONFIG.anchorToleranceRatio)
        );
        if (Math.abs(rank - expected) > tolerance) {
          // 分数↔位次不对应
          return {
            ok: false,
            reason: 'rank_anchor_mismatch',
            expected: expected,
            actual: rank,
            tolerance: tolerance
          };
        }
        return { ok: true, matched: anchors[i] };
      }
    }
  }
  // 分数不在锚点表中：无法交叉验证，仅范围校验通过
  return { ok: true, reason: 'no_anchor_for_score' };
}

// ===== 生成新 schools.js 内容 =====
// 策略：保留原始 score_2025/rank_2025（已人工核实），仅注入来源标记字段
//   - 爬取成功且通过校验：source='official_crawl'
//   - 爬取成功但校验不通过：source='official_crawl', _need_verify=true
//   - 爬取失败：source='legacy_manual', _need_verify=true
//   - removed 清单中的预科：source='legacy_manual'（不爬取，保留原状）
function generateOutput(originalContent, crawlResults, anchors, removedSchools) {
  var today = new Date().toISOString().slice(0, 10); // 形如 2026-06-28
  var stats = { official: 0, legacy: 0, needVerify: 0, total: 0 };
  var failureList = [];

  // 匹配每条记录块：从 { 到 source_section: '...' 再到换行+}
  // 分组：prefix(id..source_section) | id数字 | suffix(换行+},?)
  var recordRegex = /(\{\s*\n\s*id:\s*'S-(\d+)'[\s\S]*?source_section:\s*'[^']*')(\s*\n\s*\},?)/g;

  var newContent = originalContent.replace(recordRegex, function (full, prefix, idNum, suffix) {
    stats.total++;

    // 从 prefix 中提取 school / major
    var schoolMatch = prefix.match(/school:\s*'([^']+)'/);
    var majorMatch = prefix.match(/major:\s*'([^']+)'/);
    var schoolName = schoolMatch ? schoolMatch[1] : '';
    var major = majorMatch ? majorMatch[1] : '';
    var isPrep = major.indexOf('预科') >= 0;
    var inRemoved = removedSchools.indexOf(schoolName) >= 0;

    var source, needVerify = false, verifyReason = null;

    if (isPrep && inRemoved) {
      // removed 清单中的预科：已人工核实不在渝招预科，不爬取，保留原状
      source = 'legacy_manual';
      // 不标记 _need_verify（已人工核实移除）
    } else {
      var crawlData = crawlResults[schoolName];
      if (crawlData && (crawlData.score || crawlData.rank)) {
        // 爬取成功，交叉验证
        var validation = validateCrawlData(crawlData, anchors);
        source = 'official_crawl';
        stats.official++;
        if (!validation.ok) {
          needVerify = true;
          verifyReason = validation.reason;
          stats.needVerify++;
        }
      } else {
        // 爬取失败：保留原有数据，标记 legacy_manual + _need_verify
        source = 'legacy_manual';
        needVerify = true;
        verifyReason = 'crawl_failed';
        stats.legacy++;
        stats.needVerify++;
        if (failureList.indexOf(schoolName) < 0) {
          failureList.push(schoolName);
        }
      }
    }

    // 构造注入字段
    var fields = "source: '" + source + "', crawlTime: '" + today + "'";
    if (needVerify) {
      fields += ", _need_verify: true";
      if (verifyReason) {
        fields += ", _verify_reason: '" + verifyReason + "'";
      }
    }

    return prefix + ', ' + fields + suffix;
  });

  // 更新集合级 _meta：追加爬虫来源信息（字段命名与各 crawl_*.js 统一为驼峰 crawlTime）
  var metaAddition =
    ',\n    crawl_source: "阳光高考(gaokao.cn) + 含光睿晟(hzgrys.net)",' +
    '\n    crawlTime: "' + today + '",' +
    '\n    crawl_stats: { official: ' + stats.official +
    ', legacy: ' + stats.legacy +
    ', need_verify: ' + stats.needVerify +
    ', total: ' + stats.total + ' },' +
    '\n    crawl_failures: ' + JSON.stringify(failureList);

  // 在 _meta.total 行后插入爬虫元信息
  newContent = newContent.replace(
    /(total:\s*GK\.Data\.Schools\.length)/,
    '$1' + metaAddition
  );

  return { content: newContent, stats: stats, failures: failureList };
}

// ===== 主流程 =====
function main() {
  console.log('=== 院校专业分数线爬虫启动 ===');
  console.log('时间: ' + new Date().toISOString());
  console.log('数据源: 阳光高考(gaokao.cn) + 含光睿晟(hzgrys.net)');
  console.log('目标: ' + CONFIG.province + ' ' + CONFIG.subjectType + ' ' + CONFIG.year + '年');

  // 1. 读取现有院校名单（正则提取去重）
  var schoolNames;
  try {
    schoolNames = readSchoolNames(SCHOOLS_PATH);
  } catch (e) {
    console.error('[错误] 读取 schools.js 失败: ' + e.message);
    process.exit(1);
  }
  console.log('\n提取到 ' + schoolNames.length + ' 所院校（去重后）');

  // 2. 读取位次锚点（用于交叉验证）
  var anchors = [];
  try {
    anchors = readAnchors(ANCHORS_PATH);
  } catch (e) {
    console.warn('[警告] 读取 score_rank_anchors.js 失败: ' + e.message);
  }
  console.log('加载位次锚点 ' + anchors.length + ' 条');

  // 3. 读取 policies.js removed 清单（不爬取其预科数据）
  var removedSchools = [];
  try {
    removedSchools = readRemovedSchools(POLICIES_PATH);
  } catch (e) {
    console.warn('[警告] 读取 policies.js 失败: ' + e.message);
  }
  console.log('removed 清单(' + removedSchools.length + '): ' +
    (removedSchools.length ? removedSchools.join('、') : '(空)'));

  // 4. 读取原始 schools.js 内容（用于注入字段）
  var originalContent;
  try {
    originalContent = fs.readFileSync(SCHOOLS_PATH, 'utf-8');
  } catch (e) {
    console.error('[错误] 读取原始 schools.js 失败: ' + e.message);
    process.exit(1);
  }

  // 5. 串行爬取（保守模式，每请求间隔 3-5 秒）
  console.log('\n--- 开始爬取（保守模式，每请求间隔 ' +
    (CONFIG.delayMin / 1000) + '-' + (CONFIG.delayMax / 1000) + ' 秒）---');

  crawlAll(schoolNames,
    function (cur, total, name) {
      console.log('[' + cur + '/' + total + '] 爬取 ' + name + ' ...');
    },
    function (results, failures) {
     try {
      console.log('\n--- 爬取完成 ---');
      var successCount = 0;
      var key;
      for (key in results) { if (results.hasOwnProperty(key)) { successCount++; } }
      console.log('成功: ' + successCount + ' / ' + schoolNames.length);
      console.log('失败: ' + failures.length);
      if (failures.length > 0) {
        console.log('失败名单:');
        for (var i = 0; i < failures.length; i++) {
          console.log('  - ' + failures[i].school + ': ' + failures[i].error);
        }
      }

      // 6. 生成新 schools.js（注入 source / crawlTime / _need_verify）
      var gen = generateOutput(originalContent, results, anchors, removedSchools);

      // 7. 写入文件（失败时保留现有数据不覆盖，退出码 0）
      try {
        fs.writeFileSync(OUTPUT_PATH, gen.content, 'utf-8');
      } catch (e) {
        console.error('[错误] 写入 schools.js 失败: ' + e.message + '，保留现有数据不覆盖');
        process.exitCode = 0;
        return;
      }

      console.log('\n已生成: ' + OUTPUT_PATH);
      console.log('统计: official=' + gen.stats.official +
        ', legacy=' + gen.stats.legacy +
        ', need_verify=' + gen.stats.needVerify +
        ', total=' + gen.stats.total);
      if (gen.failures.length > 0) {
        console.log('爬取失败院校(已标记 legacy_manual + _need_verify): ' + gen.failures.join('、'));
      }
      console.log('=== 爬虫完成 ===');
     } catch (e) {
      // 兜底容错：任何未捕获异常都不覆盖现有数据，退出码 0（与 crawl_policies.js 风格一致）
      console.error('[错误] 生成 schools.js 异常: ' + e.message + '，保留现有数据不覆盖，退出码 0');
      process.exitCode = 0;
     }
    }
  );
}

// ===== 启动 =====
main();
