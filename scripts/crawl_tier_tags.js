#!/usr/bin/env node
// scripts/crawl_tier_tags.js — 院校层次标签爬虫
// ==========================================================================
// 数据源：阳光高考(gaokao.cn)
// 目标：爬取 25 所院校的层次标签（211/985/双一流/教育部直属/部委直属等），
//       生成 /workspace/data/tier_tags.js
// 策略：保守模式，每请求间隔 3-5 秒；先访问搜索页拿详情页链接，再提取标签
// 校验：211 校应有 211 标签、双一流校应有双一流标签；不一致标记 _need_verify
// 容错：单所院校失败保留原数据并标记 source='legacy_manual' + _need_verify
// 零依赖（仅 Node 内置模块），ES5 兼容（var/function/Promise 链，无箭头函数/模板字符串）
// ==========================================================================
'use strict';

// ===== 模块引入 =====
var fs = require('fs');
var path = require('path');

// 共享工具（HTTP/限速/重试/HTML解析/写文件/日志）
var shared = require('./_shared.js');
var fetchWithRetry = shared.fetchWithRetry;
var withRateLimit = shared.withRateLimit;
var writeDataFile = shared.writeDataFile;
var log = shared.log;
var DATA_SOURCES = shared.DATA_SOURCES;

// ===== 路径常量 =====
var SCRIPT_DIR = __dirname;
var WORKSPACE_DIR = path.resolve(SCRIPT_DIR, '..');
var TIER_TAGS_PATH = path.join(WORKSPACE_DIR, 'data', 'tier_tags.js');
var OUTPUT_PATH = TIER_TAGS_PATH; // 原地生成

// ===== 爬虫配置 =====
var CONFIG = {
  delayMin: 3000,        // 请求间隔下限（毫秒）—— 保守模式
  delayMax: 5000,        // 请求间隔上限（毫秒）
  requestTimeout: 15000, // 单次请求超时（毫秒）
  // 标签关键字映射：HTML 命中正则 → 输出标签名
  // 优先级从上到下；211/985 用边界约束避免误匹配 2110、9851 等
  tagPatterns: [
    { name: '985',       re: /(?:985工程|985高校|(?:^|[^\d])985(?:[^\d]|$))/ },
    { name: '211',       re: /(?:211工程|211高校|(?:^|[^\d])211(?:[^\d]|$))/ },
    { name: '双一流',     re: /双一流/ },
    { name: '教育部直属', re: /教育部直属/ },
    { name: '部委直属',   re: /部委直属/ },
    { name: '研究生院',   re: /研究生院/ },
    { name: '自划线',     re: /自划线/ }
  ]
};

// ===== 读取现有 tier_tags.js，正则提取每条记录的完整原始字段 =====
// 返回：[{ school, tags[], ownership, feature, source_section }, ...]
function readExistingRecords(filePath) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var records = [];
  // 匹配每个对象记录块（不含嵌套 {}，本数据结构无嵌套）
  var blockRe = /\{[^{}]*?school:\s*'([^']+)'[\s\S]*?\}/g;
  var m;
  while ((m = blockRe.exec(content)) !== null) {
    var block = m[0];
    var school = m[1];

    // 提取 tags 数组
    var tags = [];
    var tagsMatch = block.match(/tags:\s*\[([^\]]*)\]/);
    if (tagsMatch) {
      var tagRe = /'([^']+)'/g;
      var tm;
      while ((tm = tagRe.exec(tagsMatch[1])) !== null) {
        tags.push(tm[1]);
      }
    }

    var ownMatch = block.match(/ownership:\s*'([^']*)'/);
    var featMatch = block.match(/feature:\s*'([^']*)'/);
    var secMatch = block.match(/source_section:\s*'([^']*)'/);

    records.push({
      school: school,
      tags: tags,
      ownership: ownMatch ? ownMatch[1] : '',
      feature: featMatch ? featMatch[1] : '',
      source_section: secMatch ? secMatch[1] : ''
    });
  }
  return records;
}

// ===== 构造阳光高考搜索 URL =====
function buildSearchUrl(schoolName) {
  return 'https://www.gaokao.cn/school/search?keyword=' + encodeURIComponent(schoolName);
}

// ===== 从搜索结果页提取第一个院校详情页链接 =====
// 阳光高考详情页路径形如：/school/123 或 /school/123/info
function extractSchoolDetailLink(html) {
  if (!html) return null;
  // 匹配 href="/school/123" 或 href="/school/123/xxx"，排除 search/list 等路径
  var re = /href=["']\/school\/(\d+)(?:\/[a-z]*)?["']/;
  var m = re.exec(html);
  if (m) {
    return 'https://www.gaokao.cn/school/' + m[1];
  }
  return null;
}

// ===== 从院校详情页 HTML 提取层次标签 =====
// 返回：['211','双一流', ...]，去重保序
function extractTagsFromSchoolPage(html) {
  var tags = [];
  if (!html) return tags;
  for (var i = 0; i < CONFIG.tagPatterns.length; i++) {
    var p = CONFIG.tagPatterns[i];
    if (p.re.test(html)) {
      tags.push(p.name);
    }
  }
  // 去重（保留顺序）
  var seen = {};
  var unique = [];
  for (var j = 0; j < tags.length; j++) {
    if (!seen[tags[j]]) {
      seen[tags[j]] = true;
      unique.push(tags[j]);
    }
  }
  return unique;
}

// ===== 数据校验：现有 tags 中含 211/双一流 → 爬取结果应含对应标签 =====
// 反向：爬取到 211/双一流但原 tags 没有 → 也标记校验失败（额外发现需人工核实）
// 返回：{ ok: boolean, reason: string|null }
function validateTags(existingTags, crawledTags) {
  var crawledSet = {};
  var i;
  for (i = 0; i < crawledTags.length; i++) {
    crawledSet[crawledTags[i]] = true;
  }
  // 211 校应有 211 标签
  if (existingTags.indexOf('211') >= 0 && !crawledSet['211']) {
    return { ok: false, reason: 'missing_211' };
  }
  // 双一流校应有双一流标签
  if (existingTags.indexOf('双一流') >= 0 && !crawledSet['双一流']) {
    return { ok: false, reason: 'missing_双一流' };
  }
  // 反向：爬取到 211 但原 tags 没有
  if (crawledSet['211'] && existingTags.indexOf('211') < 0) {
    return { ok: false, reason: 'extra_211_in_crawl' };
  }
  // 反向：爬取到双一流但原 tags 没有
  if (crawledSet['双一流'] && existingTags.indexOf('双一流') < 0) {
    return { ok: false, reason: 'extra_双一流_in_crawl' };
  }
  return { ok: true, reason: null };
}

// ===== 爬取单所院校（搜索页 → 详情页两步走） =====
// 返回 Promise<crawlResult>，形如：
//   { school, ok, tags, detailUrl, source, error }
function crawlOneSchool(schoolName, safeFetch) {
  var result = {
    school: schoolName,
    ok: false,
    tags: [],
    detailUrl: null,
    source: 'official_crawl',
    error: null
  };

  // 第一步：搜索页
  return safeFetch(buildSearchUrl(schoolName)).then(function (searchRes) {
    if (!searchRes || searchRes.statusCode !== 200 || !searchRes.body) {
      result.error = 'search_failed_' + (searchRes ? searchRes.statusCode : 'no_resp');
      return result;
    }
    var detailUrl = extractSchoolDetailLink(searchRes.body);
    if (!detailUrl) {
      result.error = 'no_detail_link_in_search';
      return result;
    }
    result.detailUrl = detailUrl;

    // 第二步：详情页（safeFetch 内部已含 3-5 秒间隔）
    return safeFetch(detailUrl).then(function (detailRes) {
      if (!detailRes || detailRes.statusCode !== 200 || !detailRes.body) {
        result.error = 'detail_failed_' + (detailRes ? detailRes.statusCode : 'no_resp');
        return result;
      }
      var tags = extractTagsFromSchoolPage(detailRes.body);
      result.tags = tags;
      result.ok = tags.length > 0;
      if (!result.ok) {
        result.error = 'no_tags_extracted';
      }
      return result;
    }, function (err) {
      result.error = 'detail_fetch_error: ' + err.message;
      return result;
    });
  }, function (err) {
    result.error = 'search_fetch_error: ' + err.message;
    return result;
  });
}

// ===== 串行爬取所有院校（保守模式：每请求间隔 3-5 秒，由 withRateLimit 保证） =====
function crawlAll(records, safeFetch, onProgress) {
  var results = [];
  var idx = 0;

  function step() {
    if (idx >= records.length) {
      return Promise.resolve(results);
    }
    var rec = records[idx];
    onProgress(idx + 1, records.length, rec.school);
    return crawlOneSchool(rec.school, safeFetch).then(function (r) {
      results.push(r);
      idx++;
      return step();
    });
  }

  return step();
}

// ===== 主流程 =====
function main() {
  log('info', '=== 院校层次标签爬虫启动 ===');
  log('info', '数据源: ' + DATA_SOURCES.gaokao.url + ' (' + DATA_SOURCES.gaokao.name + ')');
  log('info', '保守模式: 每请求间隔 ' + (CONFIG.delayMin / 1000) + '-' + (CONFIG.delayMax / 1000) + ' 秒');

  // 1. 读取现有 tier_tags.js（25 所院校名单 + 原始字段，用于交叉校验）
  var records;
  try {
    records = readExistingRecords(TIER_TAGS_PATH);
  } catch (e) {
    log('error', '读取 tier_tags.js 失败: ' + e.message);
    process.exit(1);
  }
  log('info', '从 tier_tags.js 提取到 ' + records.length + ' 所院校');
  if (records.length === 0) {
    log('error', '未提取到任何院校记录，终止');
    process.exit(1);
  }

  // 2. 构造限速抓取器（3-5 秒间隔 + 3 次指数退避重试）
  var safeFetch = withRateLimit(function (u) {
    return fetchWithRetry(u, { timeout: CONFIG.requestTimeout });
  }, CONFIG.delayMin, CONFIG.delayMax);

  // 3. 串行爬取（25 所 × 2 请求 × 4 秒均值 ≈ 3-4 分钟，含重试余量）
  var estMinutes = Math.ceil(records.length * 2 * ((CONFIG.delayMin + CONFIG.delayMax) / 2) / 60000);
  log('info', '--- 开始爬取（预估约 ' + estMinutes + ' 分钟）---');

  crawlAll(records, safeFetch, function (cur, total, name) {
    log('info', '[' + cur + '/' + total + '] 爬取 ' + name);
  }).then(function (results) {
    log('info', '--- 爬取完成 ---');

    // 4. 数据校验 + 组装输出记录
    var today = new Date().toISOString().slice(0, 10); // 形如 2026-06-28
    var crawlTime = new Date().toISOString();
    var stats = { official: 0, legacy: 0, needVerify: 0, total: records.length };
    var failures = [];

    var outTags = [];
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      // 找到对应爬取结果
      var cr = null;
      for (var k = 0; k < results.length; k++) {
        if (results[k].school === rec.school) { cr = results[k]; break; }
      }

      // 基础字段：保留原始数据
      var out = {
        school: rec.school,
        tags: rec.tags.slice(),         // 默认保留原 tags（含公办/农林/市属等业务标签）
        ownership: rec.ownership,
        feature: rec.feature,
        source_section: rec.source_section,
        crawlTime: today
      };

      if (cr && cr.ok) {
        // 爬取成功：交叉校验 211/双一流
        var validation = validateTags(rec.tags, cr.tags);
        out.source = 'official_crawl';
        out.crawled_tags = cr.tags;     // 保留爬取到的标签供比对/溯源
        if (cr.detailUrl) out.detailUrl = cr.detailUrl;
        stats.official++;
        if (!validation.ok) {
          out._need_verify = true;
          out._verify_reason = validation.reason;
          stats.needVerify++;
        }
      } else {
        // 爬取失败：保留原数据，标记 legacy_manual
        out.source = 'legacy_manual';
        out._need_verify = true;
        out._verify_reason = 'crawl_failed';
        if (cr && cr.error) out._crawl_error = cr.error;
        stats.legacy++;
        stats.needVerify++;
        failures.push(rec.school);
      }
      outTags.push(out);
    }

    // 5. 组装最终数据对象
    var dataObj = {
      _meta: {
        source: 'official_crawl',
        crawlTime: crawlTime,
        confidence: '高',
        total: records.length,
        data_source: '阳光高考(gaokao.cn)',
        stats: stats,
        failures: failures
      },
      tags: outTags
    };

    // 6. 写入文件
    var comment = [
      'data/tier_tags.js — 院校层次标签 → GK.Data.TierTags',
      '数据来源：阳光高考(gaokao.cn) 院校主页爬取',
      '原数据来源：/workspace/高考志愿填报个人档案.md 第二/七节（保留原 tags 用于交叉校验）',
      '置信度：高 — 脚本从官网爬取（source=official_crawl），原始数据未经人工篡改',
      '字段：{school, tags[], ownership, feature, source_section, source, crawlTime,',
      '       crawled_tags?, detailUrl?, _need_verify?, _verify_reason?, _crawl_error?}',
      '容错：爬取失败的院校保留原数据并标记 source=legacy_manual + _need_verify',
      '校验：211 校应有 211 标签、双一流校应有双一流标签；不一致标记 _need_verify',
      '生成器：scripts/crawl_tier_tags.js',
      '生成时间(UTC): ' + crawlTime
    ];
    try {
      writeDataFile(OUTPUT_PATH, 'GK.Data', 'TierTags', dataObj, comment);
    } catch (e) {
      log('error', '写入 tier_tags.js 失败: ' + e.message);
      process.exit(1);
    }

    // 7. 汇总日志
    log('info', '已生成: ' + OUTPUT_PATH);
    log('info', '统计: official=' + stats.official +
      ', legacy=' + stats.legacy +
      ', need_verify=' + stats.needVerify +
      ', total=' + stats.total);
    if (failures.length > 0) {
      log('warn', '爬取失败院校(已标记 legacy_manual): ' + failures.join('、'));
    }
    log('info', '=== 爬虫完成 ===');
  }).then(undefined, function (err) {
    // 兜底：未捕获的异常不应导致进程静默崩溃
    log('error', '爬取流程异常: ' + (err && err.message || err));
    process.exit(1);
  });
}

// ===== 启动 =====
main();
