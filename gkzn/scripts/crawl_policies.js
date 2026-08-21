// scripts/crawl_policies.js — 政策与防退档规则爬虫
// ============================================================================
// 功能：
//   1. 从重庆考试院(cqksy.cn)和阳光高考(gaokao.cn)爬取 2025 年重庆高考政策
//      （预科班 / 国家专项 / 地方专项 / 少数民族加分）
//   2. 生成 data/policies.js（每条政策标注 source='official_crawl' 与 crawlTime）
//   3. 生成 data/risk_rules.js（规则内容不变，仅增加 source 标注）
//   4. 保留人工核实 removed 清单（爬虫不覆盖，冲突时以 removed 为准）
//   5. 容错：网站不可达时优雅降级，不覆盖现有数据，退出码 0
//
// 风格：ES5 兼容（var/function/Promise 链，无 arrow/async/await/template-literal）
// 保守模式：请求间隔 3-5 秒（withRateLimit），15s 超时，3 次指数退避重试
// 零依赖：仅 Node.js 内置模块 + ./_shared.js
// ============================================================================
'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');

// ============================================================
// 引入共享工具集（项目级契约）
// ============================================================
var shared = require('./_shared.js');
var httpGet = shared.httpGet;
var sleep = shared.sleep;
var fetchWithRetry = shared.fetchWithRetry;
var extractTables = shared.extractTables;
var writeDataFile = shared.writeDataFile;
var log = shared.log;
var withRateLimit = shared.withRateLimit;
var DATA_SOURCES = shared.DATA_SOURCES;
var serialize = shared._serialize;

// ============================================================
// 配置：爬取种子入口与关键词
// ============================================================
// 重庆考试院政策栏目候选入口（多个候选逐一尝试，任一可达即可）
var CQKSY_ENTRIES = [
  'https://www.cqksy.cn/site/zczl/zcjj.html',
  'https://www.cqksy.cn/site/zcjd/zcjd.html',
  'https://www.cqksy.cn/zk/zcjd.html',
  'https://www.cqksy.cn/site/ywzx/list.html'
];

// 阳光高考政策栏目候选入口
var GAOKAO_ENTRIES = [
  'https://gaokao.cn/news',
  'https://www.gaokao.cn/zcfg',
  'https://gaokao.cn/policy'
];

// 政策关键词（链接文本命中任一即抓取详情页）
var POLICY_KEYWORDS = ['预科', '国家专项', '地方专项', '少数民族', '加分'];

// 重庆市区县名（用于从详情页正文中识别实施区域）
var CQ_REGIONS = [
  '万州', '涪陵', '渝中', '大渡口', '江北', '沙坪坝', '九龙坡', '南岸',
  '北碚', '渝北', '巴南', '长寿', '江津', '合川', '永川', '南川',
  '綦江', '大足', '璧山', '铜梁', '潼南', '荣昌', '开州', '梁平',
  '武隆', '城口', '丰都', '垫江', '忠县', '云阳', '奉节', '巫山',
  '巫溪', '石柱', '秀山', '酉阳', '彭水'
];

// 单个入口最多抓取的详情页数量（防止爬虫失控）
var MAX_DETAIL_PER_SOURCE = 15;

// ============================================================
// 工具函数
// ============================================================

// URL 解析（相对路径补全为绝对路径）
function resolveUrl(base, rel) {
  try {
    return url.resolve(base, rel);
  } catch (e) {
    return rel;
  }
}

// 数组去重合并（把 items 中不在 arr 的元素追加进去）
function pushUnique(arr, items) {
  for (var i = 0; i < items.length; i++) {
    if (arr.indexOf(items[i]) < 0) arr.push(items[i]);
  }
  return arr;
}

// HTML 转纯文本（去脚本/样式/标签，合并空白）
function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// 从 HTML 中提取符合关键词的 <a> 链接
// 返回：[{ url, title }]
function extractPolicyLinks(html, baseUrl, keywords) {
  var links = [];
  if (!html) return links;
  var re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = m[1];
    var text = htmlToText(m[2]);
    if (!href || href === '#' || href.indexOf('javascript:') === 0) continue;
    // 关键词命中
    var hit = false;
    for (var i = 0; i < keywords.length; i++) {
      if (text.indexOf(keywords[i]) >= 0) { hit = true; break; }
    }
    if (!hit) continue;
    if (href.indexOf('http') !== 0) href = resolveUrl(baseUrl, href);
    links.push({ url: href, title: text });
  }
  return links;
}

// 从详情页正文与表格中抽取政策要点
// 返回：{ schools, regions, points, conditions, tables }
function extractPolicyFacts(html) {
  var text = htmlToText(html);
  var facts = {
    schools: [],       // 抽取到的院校名
    regions: [],       // 抽取到的重庆区县
    points: null,      // 加分分值（如 10）
    conditions: [],    // 抽取到的资格条件短语
    tables: []         // 表格结构化数据
  };

  // 院校名（XX大学 / XX学院，2-8 个汉字前缀，排除"大学"等单字干扰）
  var schoolRe = /([\u4e00-\u9fa5]{2,8}(?:大学|学院))/g;
  var sm;
  while ((sm = schoolRe.exec(text)) !== null) {
    var s = sm[1];
    // 排除常见非院校词
    if (s === '大学' || s === '学院') continue;
    if (facts.schools.indexOf(s) < 0) facts.schools.push(s);
  }

  // 重庆区县
  for (var i = 0; i < CQ_REGIONS.length; i++) {
    if (text.indexOf(CQ_REGIONS[i]) >= 0 && facts.regions.indexOf(CQ_REGIONS[i]) < 0) {
      facts.regions.push(CQ_REGIONS[i]);
    }
  }

  // 加分分值（"加分X分" / "X分加分"）
  var pm = /(?:加分|照顾)(\d{1,2})\s*分|(?:加分|照顾)\D{0,4}(\d{1,2})\s*分/.exec(text);
  if (pm) {
    var v = pm[1] || pm[2];
    if (v) facts.points = parseInt(v, 10);
  }

  // 资格条件短语（"户籍...年" / "学籍...年" / "连续...年"）
  var condRe = /(户籍|学籍|连续)\s*\d+\s*年/g;
  var cm;
  while ((cm = condRe.exec(text)) !== null) {
    // 截取上下文 20 字
    var start = Math.max(0, cm.index - 5);
    var snippet = text.substring(start, cm.index + 20).trim();
    if (facts.conditions.indexOf(snippet) < 0) facts.conditions.push(snippet);
  }

  // 表格结构化数据（extractTables 来自 _shared.js）
  try {
    facts.tables = extractTables(html);
  } catch (e) {
    facts.tables = [];
  }

  return facts;
}

// ============================================================
// 限速 GET（3-5 秒间隔 + 重试）
// ============================================================
var safeGet = withRateLimit(function (u) { return fetchWithRetry(u); }, 3000, 5000);

// ============================================================
// 爬取：入口扫描
// ============================================================
// 抓取单个入口页，提取符合关键词的链接，推入 sink
// 返回：true 表示入口可达，false 表示不可达
function crawlSeedEntry(entryUrl, keywords, sink) {
  return safeGet(entryUrl).then(function (res) {
    if (res.statusCode < 200 || res.statusCode >= 400) {
      log('warn', '入口不可达 HTTP ' + res.statusCode + ': ' + entryUrl);
      return false;
    }
    var links = extractPolicyLinks(res.body, entryUrl, keywords);
    log('info', '入口 ' + entryUrl + ' 抽取候选链接 ' + links.length + ' 条');
    for (var i = 0; i < links.length; i++) sink.push(links[i]);
    return true;
  }, function (err) {
    log('warn', '入口失败(' + err.message + '): ' + entryUrl);
    return false;
  });
}

// ============================================================
// 爬取：详情页解析
// ============================================================
function crawlDetailPage(linkItem) {
  return safeGet(linkItem.url).then(function (res) {
    if (res.statusCode < 200 || res.statusCode >= 400) {
      log('warn', '详情不可达 HTTP ' + res.statusCode + ': ' + linkItem.url);
      return null;
    }
    var facts = extractPolicyFacts(res.body);
    facts.url = linkItem.url;
    facts.title = linkItem.title;
    log('info', '详情解析: ' + linkItem.title + '（院校' + facts.schools.length +
        '/区县' + facts.regions.length + '/加分' + (facts.points == null ? '-' : facts.points) + '）');
    return facts;
  }, function (err) {
    log('warn', '详情失败(' + err.message + '): ' + linkItem.url);
    return null;
  });
}

// ============================================================
// 按政策类型分类聚合抓取结果
// ============================================================
function classifyFacts(allFacts) {
  var result = {
    yuke:   { schools: [], conditions: [], sources: [] },   // 预科班
    guojia: { regions: [], conditions: [], sources: [] },   // 国家专项
    difang: { regions: [], conditions: [], sources: [] },   // 地方专项
    jiafen: { points: null, conditions: [], sources: [] }   // 少数民族加分
  };

  for (var i = 0; i < allFacts.length; i++) {
    var f = allFacts[i];
    if (!f) continue;
    var title = f.title || '';
    var srcRef = { url: f.url, title: f.title };

    if (title.indexOf('预科') >= 0) {
      pushUnique(result.yuke.schools, f.schools);
      pushUnique(result.yuke.conditions, f.conditions);
      result.yuke.sources.push(srcRef);
    }
    if (title.indexOf('国家专项') >= 0) {
      pushUnique(result.guojia.regions, f.regions);
      pushUnique(result.guojia.conditions, f.conditions);
      result.guojia.sources.push(srcRef);
    }
    if (title.indexOf('地方专项') >= 0) {
      pushUnique(result.difang.regions, f.regions);
      pushUnique(result.difang.conditions, f.conditions);
      result.difang.sources.push(srcRef);
    }
    if (title.indexOf('少数民族') >= 0 || title.indexOf('加分') >= 0) {
      if (f.points != null) result.jiafen.points = f.points;
      pushUnique(result.jiafen.conditions, f.conditions);
      result.jiafen.sources.push(srcRef);
    }
  }
  return result;
}

// ============================================================
// removed 清单保护
// 爬取到的预科院校与 removed 清单冲突时，保留 removed 判定（人工核实优先）
// ============================================================
function filterRemoved(crawledSchools, removedSchools) {
  var kept = [];
  var filtered = [];
  for (var i = 0; i < crawledSchools.length; i++) {
    var s = crawledSchools[i];
    if (removedSchools.indexOf(s) >= 0) {
      filtered.push(s);
    } else {
      kept.push(s);
    }
  }
  if (filtered.length) {
    log('warn', '爬取到的预科院校与 removed 清单冲突，保留 removed 判定（人工核实优先）：' + filtered.join('、'));
  }
  return kept;
}

// ============================================================
// 现有数据读取（用 window mock 执行 IIFE 提取数据）
// ============================================================
function readExistingData(filepath, dataName) {
  try {
    if (!fs.existsSync(filepath)) return null;
    var code = fs.readFileSync(filepath, 'utf8');
    var sandbox = { window: {} };
    try {
      // eslint-disable-next-line no-new-func
      var fn = new Function('window', code);
      fn(sandbox.window);
      if (sandbox.window.GK && sandbox.window.GK.Data) {
        return sandbox.window.GK.Data[dataName];
      }
      return null;
    } catch (e) {
      log('warn', '解析现有文件失败(' + filepath + '): ' + e.message);
      return null;
    }
  } catch (e) {
    log('warn', '读取现有文件失败(' + filepath + '): ' + e.message);
    return null;
  }
}

// 浅克隆对象（保留自有属性）
function shallowClone(obj) {
  var copy = {};
  if (!obj) return copy;
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) copy[k] = obj[k];
  }
  return copy;
}

// ============================================================
// 构造 policies 数据（现有 + 爬取补充，保留 removed 清单）
// ============================================================
function buildPoliciesData(existing, classified, filteredYuke, removedList, crawlTime) {
  var basePolicies = (existing && existing.policies) ? existing.policies : [];

  // 克隆现有政策并标注 source/crawlTime
  var policies = basePolicies.map(function (p) {
    var copy = shallowClone(p);
    copy.source = 'official_crawl';
    copy.crawlTime = crawlTime;
    return copy;
  });

  // 按政策类型补充爬取到的字段
  for (var i = 0; i < policies.length; i++) {
    var name = policies[i].name || '';
    if (name.indexOf('预科') >= 0) {
      // 合并院校（现有 + 爬取去 removed 后），保留 crawled_schools 记录爬虫发现
      var existingSchools = policies[i].applicable_schools || [];
      var merged = [];
      pushUnique(merged, existingSchools);
      pushUnique(merged, filteredYuke);
      policies[i].applicable_schools = merged;
      policies[i].crawled_schools = filteredYuke;
    } else if (name.indexOf('国家专项') >= 0) {
      policies[i].crawled_regions = classified.guojia.regions;
    } else if (name.indexOf('地方专项') >= 0) {
      policies[i].crawled_regions = classified.difang.regions;
    } else if (name.indexOf('少数民族') >= 0 || name.indexOf('加分') >= 0) {
      if (classified.jiafen.points != null) policies[i].crawled_points = classified.jiafen.points;
    }
  }

  return {
    _meta: {
      source: 'official_crawl',
      crawlTime: crawlTime,
      confidence: '高',
      removed_protection: '人工核实 removed 清单优先，爬虫不覆盖'
    },
    policies: policies,
    removed: removedList,                    // 保留人工核实 removed 清单
    crawl_sources: [
      DATA_SOURCES.cqksy.url,
      DATA_SOURCES.gaokao.url
    ]
  };
}

// ============================================================
// 构造 risk_rules 数据（规则内容不变，仅加 source 标注）
// 注意：RiskRules 原生结构为「数组 + _meta 属性」，
//       writeDataFile 的 serialize 不支持数组挂额外属性，
//       故此处手写文件以保持原格式兼容。
// ============================================================
function buildRiskRulesRules(existing, crawlTime) {
  // existing 可能是数组（原结构），也可能带 rules 字段（容错）
  var baseRules = [];
  if (Array.isArray(existing)) {
    baseRules = existing;
  } else if (existing && Array.isArray(existing.rules)) {
    baseRules = existing.rules;
  }
  return baseRules.map(function (r) {
    var copy = shallowClone(r);
    copy.source = 'official_crawl';
    copy.crawlTime = crawlTime;
    return copy;
  });
}

function buildRiskRulesMeta(existing, total, crawlTime) {
  var meta = {};
  var baseMeta = (existing && !Array.isArray(existing) && existing._meta) ? existing._meta : null;
  if (Array.isArray(existing) && existing._meta) baseMeta = existing._meta;
  if (baseMeta) {
    for (var k in baseMeta) {
      if (Object.prototype.hasOwnProperty.call(baseMeta, k)) meta[k] = baseMeta[k];
    }
  }
  meta.source = 'official_crawl';
  meta.crawlTime = crawlTime;
  meta.total = total;
  return meta;
}

// 手写 risk_rules.js（保留「数组 + 末尾 _meta 挂载」的原格式）
function writeRiskRulesFile(filepath, rulesArray, metaObj, crawlTime) {
  var dir = path.dirname(filepath);
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* 忽略已存在 */ }

  var headerLines = [
    'data/risk_rules.js — 防退档规则库 → GK.Data.RiskRules',
    '数据来源：crawl_policies.js 标注 source（规则内容不变）',
    '爬取时间：' + crawlTime,
    '纯 ES5 IIFE，挂载到 window.GK.Data.RiskRules',
    '字段：{rule_id, category, school, description, risk_level, check_field, action, source_section, source, crawlTime}',
    'category: campus|tuition|medical|subject_score|select_subject',
    'risk_level: high|medium|low'
  ];
  var header = headerLines.map(function (l) { return '// ' + l; }).join('\n') + '\n';

  var body = '';
  body += ';(function () {\n';
  body += '  var GK = window.GK || (window.GK = {});\n';
  body += '  GK.Data = GK.Data || {};\n\n';
  body += '  GK.Data.RiskRules = ' + serialize(rulesArray, 1) + ';\n\n';
  body += '  GK.Data.RiskRules._meta = ' + serialize(metaObj, 1) + ';\n';
  body += '})();\n';

  fs.writeFileSync(filepath, header + body, 'utf8');
}

// ============================================================
// 主流程
// ============================================================
function main() {
  log('info', '=== 政策与防退档规则爬虫启动 ===');

  var dataDir = path.resolve(__dirname, '..', 'data');
  var policiesPath = path.join(dataDir, 'policies.js');
  var riskRulesPath = path.join(dataDir, 'risk_rules.js');

  // 1. 读取现有数据（容错：不存在则视为空）
  var existingPolicies = readExistingData(policiesPath, 'Policies');
  var existingRiskRules = readExistingData(riskRulesPath, 'RiskRules');

  // 2. 现有 removed 清单（人工核实，优先级最高）
  var removedList = (existingPolicies && existingPolicies.removed) ? existingPolicies.removed : [];
  var removedSchools = removedList.map(function (r) { return r.school; });
  log('info', '现有 removed 清单 ' + removedSchools.length + ' 所：' + removedSchools.join('、'));

  // 3. 收集所有候选链接（入口扫描）
  var linkSink = [];
  var seedTasks = [];
  var i;

  for (i = 0; i < CQKSY_ENTRIES.length; i++) {
    seedTasks.push(crawlSeedEntry(CQKSY_ENTRIES[i], POLICY_KEYWORDS, linkSink));
  }
  for (i = 0; i < GAOKAO_ENTRIES.length; i++) {
    seedTasks.push(crawlSeedEntry(GAOKAO_ENTRIES[i], POLICY_KEYWORDS, linkSink));
  }

  Promise.all(seedTasks).then(function (reachFlags) {
    // 统计可达入口数
    var reachable = 0;
    for (var j = 0; j < reachFlags.length; j++) {
      if (reachFlags[j]) reachable++;
    }
    log('info', '入口扫描完成：可达 ' + reachable + ' 个，收集候选链接 ' + linkSink.length + ' 条');

    // 链接去重（按 url）
    var seen = {};
    var deduped = [];
    for (var k = 0; k < linkSink.length; k++) {
      if (!seen[linkSink[k].url]) {
        seen[linkSink[k].url] = true;
        deduped.push(linkSink[k]);
      }
    }
    log('info', '去重后候选链接 ' + deduped.length + ' 条');

    // 限制详情页数量，避免爬虫失控
    var detailLinks = deduped.slice(0, MAX_DETAIL_PER_SOURCE);
    log('info', '开始抓取详情页 ' + detailLinks.length + ' 条（3-5 秒间隔）');

    var detailTasks = [];
    for (var m = 0; m < detailLinks.length; m++) {
      detailTasks.push(crawlDetailPage(detailLinks[m]));
    }
    return Promise.all(detailTasks).then(function (details) {
      return { details: details, reachable: reachable };
    });
  }).then(function (ctx) {
    var details = ctx.details;
    var reachable = ctx.reachable;
    var valid = [];
    for (var i2 = 0; i2 < details.length; i2++) {
      if (details[i2]) valid.push(details[i2]);
    }
    log('info', '详情页解析完成，有效 ' + valid.length + ' 条');

    // 容错降级判定：所有入口都不可达 → 不覆盖现有数据
    if (reachable === 0) {
      log('warn', '所有入口均不可达，触发降级：保留现有数据不覆盖，退出码 0');
      log('info', '=== 爬虫结束（降级）===');
      return;
    }

    // 4. 分类聚合
    var classified = classifyFacts(valid);

    // 5. removed 清单交叉验证（预科院校）
    var filteredYuke = filterRemoved(classified.yuke.schools, removedSchools);

    // 6. 构造并写入数据
    var crawlTime = new Date().toISOString();
    var policiesData = buildPoliciesData(existingPolicies, classified, filteredYuke, removedList, crawlTime);
    var riskRulesArr = buildRiskRulesRules(existingRiskRules, crawlTime);
    var riskRulesMeta = buildRiskRulesMeta(existingRiskRules, riskRulesArr.length, crawlTime);

    // 6.1 写入 policies.js（对象结构，用 writeDataFile）
    writeDataFile(policiesPath, 'GK.Data', 'Policies', policiesData, [
      'data/policies.js — 政策红利库 → GK.Data.Policies',
      '数据来源：cqksy.cn + gaokao.cn 爬虫（crawl_policies.js）',
      '保留人工核实 removed 清单（爬虫不覆盖，冲突以 removed 为准）',
      '爬取时间：' + crawlTime
    ]);
    log('info', '已写入 ' + policiesPath);

    // 6.2 写入 risk_rules.js（数组 + _meta 属性，手写以保兼容）
    writeRiskRulesFile(riskRulesPath, riskRulesArr, riskRulesMeta, crawlTime);
    log('info', '已写入 ' + riskRulesPath);

    log('info', '=== 爬虫完成 ===');
  }).catch(function (err) {
    // 兜底容错：任何未捕获异常都不覆盖现有数据，退出码 0
    log('error', '爬虫异常：' + (err && err.message ? err.message : String(err)));
    log('info', '容错降级：保留现有数据不覆盖，退出码 0');
    process.exit(0);
  });
}

// ============================================================
// 启动
// ============================================================
main();
