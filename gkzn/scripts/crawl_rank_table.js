// scripts/crawl_rank_table.js — 重庆市教育考试院 一分一段表 爬虫（重庆 2025 物理类）
// ============================================================================
// 功能：从 cqksy.cn 抓取 2025 年物理类一分一段表，生成 data/score_rank_anchors.js
//
// 策略（不硬编码可能失效的明细页 URL）：
//   1. 访问考试院入口页 https://www.cqksy.cn/
//   2. 正则提取页面中"一分一段表/成绩查询/分数段"相关链接
//   3. 依次探测候选链接，提取 HTML <table>，识别物理类一分一段表
//   4. 解析为 [{score, rank}]，调用 writeDataFile 生成数据文件
//
// 容错（保守模式）：
//   - 每个请求间隔 3-5 秒（withRateLimit），指数退避重试（fetchWithRetry）
//   - 网站不可达 / 需登录 / 结构变动 → 优雅降级，不覆盖现有数据文件，exit 0
//   - 成功写入前先备份原文件，保护人工已验证数据
//
// 风格：零依赖（仅 Node 内置模块 + ./_shared.js），ES5 兼容写法
// 用法：node scripts/crawl_rank_table.js
// ============================================================================
'use strict';

var shared = require('./_shared.js');
var log = shared.log;
var fetchWithRetry = shared.fetchWithRetry;
var extractTables = shared.extractTables;
var writeDataFile = shared.writeDataFile;
var withRateLimit = shared.withRateLimit;
var DATA_SOURCES = shared.DATA_SOURCES;

var fs = require('fs');
var path = require('path');

// ===== 配置 =====
var CONFIG = {
  year: 2025,
  category: 'physics',                                  // 物理类
  province: '重庆',
  subjectType: '物理类',
  entryUrl: DATA_SOURCES.cqksy.url + '/',               // 考试院入口（取自 _shared.DATA_SOURCES，不硬编码明细页）
  rateMinMs: 3000,                                      // 请求间隔下限
  rateMaxMs: 5000,                                      // 请求间隔上限
  maxCandidateLinks: 8,                                 // 最多探测的候选链接数
  outFile: path.join(__dirname, '..', 'data', 'score_rank_anchors.js'),
  manualDir: path.join(__dirname, 'manual')
};

// 候选链接关键词（匹配锚文本或 href）
var LINK_KEYWORDS = /一分一(?:段|表)|分数段|分段表|成绩查询|位次表|高考.*成绩|统考.*成绩|物理类|历史类/;

// ===== 降级标志（幂等） =====
var _degraded = false;

// ============================================================
// HTML 链接提取：返回 [{href, text}]
// ============================================================
function extractLinks(html) {
  var links = [];
  if (!html) return links;
  var re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = (m[1] || '').trim();
    var text = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (href && href.charAt(0) !== '#' && !/^javascript:/i.test(href)) {
      links.push({ href: href, text: text });
    }
  }
  return links;
}

// 相对链接 → 绝对链接
function toAbsolute(base, href) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/\//.test(href)) return 'http:' + href;
  if (href.charAt(0) === '/') {
    var m = /^(https?:\/\/[^\/]+)/i.exec(base);
    return m ? m[1] + href : null;
  }
  var slash = base.lastIndexOf('/');
  return slash >= 0 ? base.substring(0, slash + 1) + href : href;
}

// 从入口页链接中筛选候选（命中关键词，去重，限流数量）
function pickCandidateLinks(links) {
  var out = [];
  var seen = {};
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    var hay = l.text + ' ' + l.href;
    if (LINK_KEYWORDS.test(hay)) {
      var abs = toAbsolute(CONFIG.entryUrl, l.href);
      if (abs && !seen[abs]) {
        seen[abs] = true;
        out.push({ href: abs, text: l.text });
      }
    }
  }
  return out.slice(0, CONFIG.maxCandidateLinks);
}

// 提取 <title>
function extractTitle(html) {
  var m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// ============================================================
// 一分一段表识别与解析
// ============================================================
function toInt(s) {
  if (s == null) return null;
  var t = String(s).replace(/[,，\s]/g, '');
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  return null;
}

// 识别表头列：分数 / 本段人数 / 累计(位次) / 科类
function identifyColumns(headerRow) {
  var map = { score: -1, seg: -1, cum: -1, category: -1 };
  if (!headerRow || !headerRow.length) return null;
  for (var i = 0; i < headerRow.length; i++) {
    var cell = String(headerRow[i] || '');
    if (map.score < 0 && /分数|^分$|成绩|总分/.test(cell)) map.score = i;
    else if (map.seg < 0 && /本段|人数|段数|同分/.test(cell)) map.seg = i;
    else if (map.cum < 0 && /累计|位次|名次|排名/.test(cell)) map.cum = i;
    else if (map.category < 0 && /科类|类别|物理|历史|选科/.test(cell)) map.category = i;
  }
  if (map.score < 0 || map.cum < 0) return null; // 必须有分数列与累计列
  return map;
}

// 从一组表格中找出物理类一分一段表，返回 [{score, rank}]（按 score 升序）
function parsePhysicsRankTables(tables, contextText) {
  var result = [];
  if (!tables || !tables.length) return result;
  var ctxIsPhysics = /物理类|物理/.test(contextText || '');

  for (var t = 0; t < tables.length; t++) {
    var rows = tables[t];
    if (!rows || rows.length < 2) continue;

    // 判断第 0 行是否为表头（含非数字字符即为表头）
    var headerLike = !rows[0].every(function (c) {
      return /^-?\d/.test(String(c).trim());
    });
    var colMap = headerLike ? identifyColumns(rows[0]) : { score: 0, seg: 1, cum: 2, category: -1 };
    if (!colMap) continue;

    var startIdx = headerLike ? 1 : 0;
    var used = false;

    for (var r = startIdx; r < rows.length; r++) {
      var row = rows[r];
      // 若有科类列，仅取物理类行
      if (colMap.category >= 0 && !/物理/.test(String(row[colMap.category] || ''))) continue;
      // 若无科类列，仅当上下文为物理类才采纳（避免混入历史类）
      if (colMap.category < 0 && !ctxIsPhysics) continue;

      var sc = toInt(row[colMap.score]);
      var rk = toInt(row[colMap.cum]);
      if (sc == null || rk == null) continue;
      if (sc < 0 || sc > 750) continue;        // 分数合理性
      if (rk < 1 || rk > 200000) continue;     // 位次合理性
      result.push({ score: sc, rank: rk });
      used = true;
    }

    if (used) {
      result.sort(function (a, b) { return a.score - b.score; });
      return result; // 命中物理类数据表即返回
    }
  }
  return result;
}

// ============================================================
// 生成数据对象（结构与现有 score_rank_anchors.js 兼容：physics[year]=[{score,rank}]）
// ============================================================
function buildTableObject(anchors) {
  var byYear = {};
  byYear[CONFIG.year] = anchors;
  // 补占位空数组，兼容现有文件的多年份键
  var placeholderYears = [2024, 2023, 2022, 2021, 2020];
  for (var i = 0; i < placeholderYears.length; i++) {
    byYear[placeholderYears[i]] = [];
  }
  return {
    physics: byYear,
    _meta: {
      source: 'official_crawl',
      confidence: '高',
      crawlTime: new Date().toISOString(),
      data_source: '重庆考试院 ' + DATA_SOURCES.cqksy.url + ' 一分一段表（物理类）',
      year: CONFIG.year,
      category: CONFIG.category,
      province: CONFIG.province,
      subject_type: CONFIG.subjectType,
      yearsAvailable: [CONFIG.year],
      note: '由 scripts/crawl_rank_table.js 从 cqksy.cn 自动抓取；如需人工核实请见 scripts/manual/'
    }
  };
}

// 备份现有数据文件（保护人工已验证数据，写入前调用）
function backupExisting() {
  try {
    if (fs.existsSync(CONFIG.outFile)) {
      var ts = new Date().toISOString().replace(/[:.]/g, '-');
      var bak = CONFIG.outFile.replace(/\.js$/, '.bak.' + ts + '.js');
      fs.copyFileSync(CONFIG.outFile, bak);
      log('info', '已备份原数据文件 → ' + path.basename(bak));
    }
  } catch (e) {
    log('warn', '备份原文件失败(忽略): ' + e.message);
  }
}

// 写出数据文件
function writeOutput(anchors) {
  var tableObj = buildTableObject(anchors);
  var header = [
    'data/score_rank_anchors.js — 重庆物理类一分一段表位次锚点 → GK.Data.ScoreRankTable',
    '数据来源：重庆市教育考试院(cqksy.cn) 自动抓取（scripts/crawl_rank_table.js）',
    '置信度：高 — 脚本从官网爬取（source=official_crawl），原始数据未经人工篡改',
    '纯 ES5 IIFE，挂载到 window.GK.Data.ScoreRankTable；结构兼容 physics[year]=[{score,rank}]',
    '抓取时间(crawlTime)：' + tableObj._meta.crawlTime
  ];
  backupExisting();
  writeDataFile(CONFIG.outFile, 'GK.Data', 'ScoreRankTable', tableObj, header);
  log('ok', '已生成 ' + CONFIG.outFile + '，共 ' + anchors.length + ' 条物理类锚点');
}

// ============================================================
// 降级模式：打印警告，不动数据文件，提示人工处理
// ============================================================
function degrade(reason) {
  if (!_degraded) {
    _degraded = true;
    log('warn', '抓取降级：' + reason);
    log('warn', '不会覆盖现有 data/score_rank_anchors.js（保护人工已验证数据）。');
    log('warn', '建议：请管理员手动从 https://www.cqksy.cn/ 下载一分一段表，');
    log('warn', '      放到 ' + CONFIG.manualDir + '/ 目录，再人工核对数据来源标注。');
    try { fs.mkdirSync(CONFIG.manualDir, { recursive: true }); } catch (e) { /* 忽略 */ }
  } else {
    log('warn', reason);
  }
}

// ============================================================
// 递归探测候选链接，命中即返回 anchors 数组
// ============================================================
function probeCandidates(rlGet, candidates, idx) {
  if (idx >= candidates.length) return Promise.resolve([]);
  var c = candidates[idx];
  log('info', '探测候选 [' + (idx + 1) + '/' + candidates.length + ']: ' + c.text + ' → ' + c.href);

  return rlGet(c.href).then(function (res) {
    if (!res || res.statusCode >= 400 || !res.body) {
      log('warn', '候选页不可用(HTTP ' + (res && res.statusCode) + ')，跳过');
      return probeCandidates(rlGet, candidates, idx + 1);
    }
    var body = res.body;
    var tables = extractTables(body);
    var ctx = c.text + ' ' + (extractTitle(body) || '') + ' ' + body.substring(0, 2000);
    var anchors = parsePhysicsRankTables(tables, ctx);
    if (anchors && anchors.length) {
      log('ok', '在候选页解析到 ' + anchors.length + ' 条物理类位次记录');
      return anchors;
    }
    log('info', '候选页未含可解析的物理类一分一段表，继续下一候选');
    return probeCandidates(rlGet, candidates, idx + 1);
  }, function (err) {
    log('warn', '候选页请求失败(' + (err && err.message ? err.message : String(err)) + ')，跳过');
    return probeCandidates(rlGet, candidates, idx + 1);
  });
}

// ============================================================
// 主流程
// ============================================================
function main() {
  log('info', '开始抓取 重庆' + CONFIG.year + ' 物理类一分一段表，入口：' + CONFIG.entryUrl);

  // 限速包装：每次请求前随机睡眠 3-5 秒（保守模式）
  var rlGet = withRateLimit(function (u) {
    return fetchWithRetry(u, { timeout: 15000 }, 3);   // README：单请求 15s 超时
  }, CONFIG.rateMinMs, CONFIG.rateMaxMs);

  rlGet(CONFIG.entryUrl).then(function (res) {
    var html = (res && res.body) || '';
    if (!html || (res && res.statusCode >= 400)) {
      return { ok: false, reason: '入口页不可达或返回空内容(HTTP ' + (res && res.statusCode) + '，可能需登录或被拦截)' };
    }
    var links = extractLinks(html);
    var candidates = pickCandidateLinks(links);
    log('info', '入口页提取到 ' + links.length + ' 个链接，命中关键词候选 ' + candidates.length + ' 个');
    if (!candidates.length) {
      return { ok: false, reason: '入口页未找到"一分一段表/成绩查询"相关链接（网站可能改版或需登录）' };
    }
    return probeCandidates(rlGet, candidates, 0).then(function (anchors) {
      if (anchors && anchors.length) return { ok: true, anchors: anchors };
      return { ok: false, reason: '已探测全部候选链接，未解析出物理类一分一段表（结构变动或需登录）' };
    });
  }).then(function (outcome) {
    if (outcome && outcome.ok && outcome.anchors && outcome.anchors.length) {
      writeOutput(outcome.anchors);
      log('ok', '抓取完成。');
    } else {
      degrade(outcome && outcome.reason ? outcome.reason : '未知原因');
    }
  }).catch(function (err) {
    degrade('抓取异常：' + (err && err.message ? err.message : String(err)));
  }).then(function () {
    // 确保程序正常退出（exit 0），不报错崩溃
    process.exitCode = 0;
  });
}

main();
