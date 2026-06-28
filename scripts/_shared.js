// scripts/_shared.js — 爬虫共享工具集（零依赖，仅 Node.js 内置模块）
// ============================================================================
// 导出（项目级契约，详见 scripts/README.md）：
//   DATA_SOURCES : 数据源常量表
//   Utils        : { clamp, round, randInt } 通用工具
//   log / sleep / httpGet / fetchWithRetry / extractTables / writeDataFile / withRateLimit
// 风格：ES5 兼容（var/function/Promise 链，无 arrow/async/await/template-literal）
// 保守模式：请求间隔 3-5 秒（withRateLimit），15s 超时，3 次指数退避重试，gzip 自动解压
// ============================================================================
'use strict';

var http = require('http');
var https = require('https');
var url = require('url');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');

// ============================================================
// DATA_SOURCES：数据源常量表（各爬取脚本统一引用，详见 README 第三节）
// ============================================================
var DATA_SOURCES = {
  cqksy:   { url: 'https://www.cqksy.cn',     name: '重庆考试院', note: '一分一段表、政策、批次线' },
  gaokao:  { url: 'https://gaokao.cn',        name: '阳光高考',   note: '院校库、专业库、招生计划' },
  hzgrys:  { url: 'https://www.hzgrys.net',   name: '含光睿晟',   note: '第三方院校层次/标签补充' },
  schools: { url: 'individual',               name: '各校招生网', note: '动态列表，逐校抓取' }
};

// ============================================================
// Utils：通用工具（供 crawl_schools.js 等脚本复用）
// ============================================================
var Utils = {
  // 限幅
  clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  // 四舍五入到 d 位小数（默认 0）
  round: function (v, d) {
    d = d == null ? 0 : d;
    var f = Math.pow(10, d);
    return Math.round(v * f) / f;
  },
  // [lo, hi] 闭区间随机整数
  randInt: function (lo, hi) {
    if (hi < lo) hi = lo;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }
};

// ============================================================
// log：带时间戳与级别的纯文本日志（避免 ANSI 颜色在管道里干扰）
// ============================================================
function log(level, msg) {
  var lv = (level || 'info').toUpperCase();
  var ts = new Date().toISOString();
  console.log('[' + ts + '] [' + lv + '] ' + msg);
}

// ============================================================
// sleep：Promise 化的延时
// ============================================================
function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// ============================================================
// withRateLimit：返回一个限速包装函数，每次调用前随机睡眠 [minMs, maxMs]
// 保守模式：保证两次请求"上一次完成 → 下一次开始"之间至少 3-5 秒空隙
// 用法：var safeFetch = withRateLimit(function(u){ return fetchWithRetry(u); }, 3000, 5000);
// ============================================================
function withRateLimit(fn, minMs, maxMs) {
  var lo = minMs || 3000;
  var hi = maxMs || 5000;
  if (hi < lo) hi = lo;
  return function () {
    var args = arguments;
    var self = this;
    var gap = Utils.randInt(lo, hi);
    return sleep(gap).then(function () {
      return fn.apply(self, args);
    });
  };
}

// ============================================================
// 字符集探测：优先 Content-Type，其次 meta charset，默认 utf-8
// 注意：Node 内置 Buffer.toString 仅支持 utf8/utf-16le/latin1/ascii；
//       零依赖下遇到 GBK 类编码回退 utf-8（中文可能乱码，但 ASCII 链接仍可提取）
// ============================================================
function detectCharset(headers, buf) {
  var cs = 'utf-8';
  var ct = (headers && headers['content-type']) || '';
  var m = /charset=([^;]+)/i.exec(ct);
  if (m) {
    cs = m[1].trim().toLowerCase();
  } else {
    var head = buf.slice(0, 2048).toString('latin1');
    var mm = /charset=["']?([\w-]+)/i.exec(head);
    if (mm) cs = mm[1].toLowerCase();
  }
  if (cs === 'utf-8' || cs === 'utf8' || cs === 'utf-16le' || cs === 'latin1' || cs === 'ascii') {
    return cs;
  }
  // GBK / GB2312 / GB18030 等：Node 原生不支持，回退 utf-8（尽力而为）
  return 'utf-8';
}

// 桌面 Chrome 伪装头（README 第四节：浏览器伪装）
var DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                 '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function defaultHeaders() {
  return {
    'User-Agent': DEFAULT_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
  };
}

// 按 Content-Encoding 解压响应 buffer（gzip/deflate/br）
function decompress(buf, encoding) {
  var enc = (encoding || '').toLowerCase();
  if (!enc) return buf;
  try {
    if (enc === 'gzip') return zlib.gunzipSync(buf);
    if (enc === 'deflate') return zlib.inflateSync(buf);
    if (enc === 'br') return zlib.brotliDecompressSync(buf);
  } catch (e) {
    // 解压失败：deflate 可能是 raw，再试一次
    if (enc === 'deflate') {
      try { return zlib.inflateRawSync(buf); } catch (e2) { /* 用原 buf */ }
    }
    log('warn', '解压失败(' + enc + ')，使用原始响应体');
  }
  return buf;
}

// ============================================================
// httpGet：Promise 化 GET，自动跟随重定向（最多 5 次），自动解压，返回响应对象
// 返回：{ statusCode, headers, body, url, finalUrl, buffer }
// ============================================================
function httpGet(targetUrl, opts) {
  opts = opts || {};
  var timeout = opts.timeout || 15000;                 // README：15s 超时
  var maxRedirects = opts.maxRedirects == null ? 5 : opts.maxRedirects;
  var baseHeaders = opts.headers || defaultHeaders();

  return new Promise(function (resolve, reject) {
    var redirects = 0;

    function go(u) {
      var parsed;
      try {
        parsed = url.parse(u);
      } catch (e) {
        reject(new Error('无效 URL: ' + u));
        return;
      }
      if (!parsed || !parsed.hostname) {
        reject(new Error('无效 URL(无主机名): ' + u));
        return;
      }
      var lib = (parsed.protocol === 'https:') ? https : http;
      var ro = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: (parsed.pathname || '/') + (parsed.search || ''),
        method: 'GET',
        headers: baseHeaders,
        timeout: timeout
      };
      var req = lib.request(ro, function (res) {
        // 3xx 重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < maxRedirects) {
          redirects++;
          var next = url.resolve(u, res.headers.location);
          res.resume(); // 丢弃当前响应体
          go(next);
          return;
        }
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          var buf = Buffer.concat(chunks);
          buf = decompress(buf, res.headers['content-encoding']);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: buf.toString(detectCharset(res.headers, buf)),
            url: targetUrl,
            finalUrl: u,
            buffer: buf
          });
        });
      });
      req.on('timeout', function () {
        req.destroy(new Error('请求超时(' + timeout + 'ms): ' + u));
      });
      req.on('error', function (err) {
        reject(err);
      });
      req.end();
    }

    go(targetUrl);
  });
}

// ============================================================
// fetchWithRetry：带指数退避重试的 GET（README 第四节）
//   - 网络错误 / 超时：重试
//   - HTTP 5xx：重试
//   - HTTP 4xx / 2xx：不重试（4xx 多为不存在/需登录，重试无意义）
// 重试间隔：1s / 2s / 4s + 0~1000ms 抖动
// ============================================================
function fetchWithRetry(targetUrl, opts, retries) {
  var max = retries == null ? 3 : retries;
  opts = opts || {};

  function backoff(n) {
    // 指数退避 1s/2s/4s + 0~1000ms 抖动
    return Math.min(8000, 1000 * Math.pow(2, n)) + Utils.randInt(0, 1000);
  }

  function attempt(n) {
    return httpGet(targetUrl, opts).then(function (res) {
      if (res.statusCode >= 200 && res.statusCode < 400) return res;
      // 5xx 可重试
      if (res.statusCode >= 500 && n < max) {
        log('warn', 'HTTP ' + res.statusCode + '，第 ' + (n + 1) + '/' + max + ' 次重试: ' + targetUrl);
        return sleep(backoff(n)).then(function () { return attempt(n + 1); });
      }
      // 4xx 等：不重试，直接返回响应（由调用方判断是否降级）
      return res;
    }, function (err) {
      if (n < max) {
        log('warn', '请求失败(' + err.message + ')，第 ' + (n + 1) + '/' + max + ' 次重试: ' + targetUrl);
        return sleep(backoff(n)).then(function () { return attempt(n + 1); });
      }
      throw err;
    });
  }

  return attempt(0);
}

// ============================================================
// HTML 表格提取（正则实现，零依赖）
// 返回：[ table, ... ]，每个 table = [ row, ... ]，每个 row = [ cellText, ... ]
// ============================================================
function cleanCell(s) {
  if (s == null) return '';
  s = String(s);
  s = s.replace(/<[^>]+>/g, '');                 // 去 HTML 标签
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'");
  return s.replace(/\s+/g, ' ').trim();
}

function extractTables(html) {
  var tables = [];
  if (!html) return tables;
  var tRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  var tm;
  while ((tm = tRe.exec(html)) !== null) {
    var inner = tm[1];
    var rows = [];
    var trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    var trm;
    while ((trm = trRe.exec(inner)) !== null) {
      var cells = [];
      var cRe = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      var cm;
      while ((cm = cRe.exec(trm[1])) !== null) {
        cells.push(cleanCell(cm[1]));
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

// ============================================================
// JS 数据文件序列化器：产出与现有 data/*.js 风格一致的代码
//   - 数字键（如 "2025"）不引号
//   - 合法标识符键不引号
//   - 全原始值的小对象/小数组内联（{ score: 600, rank: 12895 }）
//   - 大对象/嵌套结构多行缩进
// ============================================================
function repeat2(n) {
  var s = '';
  for (var i = 0; i < n; i++) s += '  ';
  return s;
}

function isPrimitive(v) {
  return v === null || v === undefined ||
    typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
}

function keyStr(k) {
  if (/^\d+$/.test(k)) return k;                   // 数字键，如 2025
  if (/^[A-Za-z_$][\w$]*$/.test(k)) return k;       // 合法标识符
  return JSON.stringify(k);
}

function serialize(obj, indent) {
  indent = indent || 0;
  var pad = repeat2(indent);
  if (obj === null || obj === undefined) return 'null';
  var t = typeof obj;
  if (t === 'number' || t === 'boolean') return String(obj);
  if (t === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    if (obj.length <= 8 && obj.every(isPrimitive)) {
      return '[' + obj.map(function (x) { return serialize(x, 0); }).join(', ') + ']';
    }
    var items = obj.map(function (x) { return pad + '  ' + serialize(x, indent + 1); });
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }
  // 普通对象
  var keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  // 全原始值且键不多 → 内联
  if (keys.length <= 4 && keys.every(function (k) { return isPrimitive(obj[k]); })) {
    var inline = keys.map(function (k) {
      return keyStr(k) + ': ' + serialize(obj[k], 0);
    });
    return '{ ' + inline.join(', ') + ' }';
  }
  var kvs = keys.map(function (k) {
    return pad + '  ' + keyStr(k) + ': ' + serialize(obj[k], indent + 1);
  });
  return '{\n' + kvs.join(',\n') + '\n' + pad + '}';
}

// ============================================================
// writeDataFile：把数据对象写为 ES5 IIFE 数据文件（项目级统一签名）
//   filepath  : 输出绝对路径
//   namespace : 挂载命名空间，如 'GK.Data'
//   dataName  : 数据名，如 'ScoreRankTable' → 挂载到 GK.Data.ScoreRankTable
//   data      : 数据对象（内含 _meta 等字段）
//   comment   : 文件头注释（字符串或字符串数组，每行不加 //）
// 产出格式与 data/*.js 兼容：
//   ;(function () {
//     var GK = window.GK || (window.GK = {});
//     GK.Data = GK.Data || {};
//     GK.Data.ScoreRankTable = { ... };
//   })();
// ============================================================
function writeDataFile(filepath, namespace, dataName, data, comment) {
  var dir = path.dirname(filepath);
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* 忽略已存在 */ }

  var header = '';
  if (comment) {
    var lines = Array.isArray(comment) ? comment : String(comment).split('\n');
    header = lines.map(function (l) { return '// ' + l; }).join('\n') + '\n';
  }

  // 解析 namespace → ['GK','Data']，生成逐级挂载样板
  var parts = String(namespace || 'GK.Data').split('.');
  var mountLines = [];
  for (var i = 0; i < parts.length; i++) {
    var pathStr = parts.slice(0, i + 1).join('.');
    if (i === 0) {
      mountLines.push('  var ' + parts[0] + ' = window.' + parts[0] + ' || (window.' + parts[0] + ' = {});');
    } else {
      mountLines.push('  ' + pathStr + ' = ' + pathStr + ' || {};');
    }
  }
  var fullRef = parts.join('.') + '.' + dataName;
  var body =
    ';(function () {\n' +
    mountLines.join('\n') + '\n\n' +
    '  ' + fullRef + ' = ' + serialize(data, 1) + ';\n' +
    '})();\n';

  fs.writeFileSync(filepath, header + body, 'utf8');
}

module.exports = {
  DATA_SOURCES: DATA_SOURCES,
  Utils: Utils,
  log: log,
  sleep: sleep,
  httpGet: httpGet,
  fetchWithRetry: fetchWithRetry,
  extractTables: extractTables,
  writeDataFile: writeDataFile,
  withRateLimit: withRateLimit,
  // 暴露内部工具便于复用/测试
  _serialize: serialize,
  _defaultHeaders: defaultHeaders
};
