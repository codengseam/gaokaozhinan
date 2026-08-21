// scripts/run_all.js — 管理员统一调度入口：串行运行全部爬虫脚本并汇总报告
// ============================================================================
// 功能：
//   1. 串行执行 4 个爬虫脚本（crawl_rank_table / crawl_schools / crawl_policies / crawl_tier_tags）
//   2. 每个脚本之间 5 秒冷却（避免给官网造成压力）
//   3. 捕获每个脚本的退出码与输出，失败不中断后续脚本
//   4. 汇总打印执行报告（成功 / 部分成功 / 失败 统计）
//   5. 生成 scripts/crawl_report.json（含每个脚本的执行状态、耗时、数据源、生成的文件）
//
// 设计说明：
//   - 各 crawl_*.js 是独立可运行脚本（含 if(require.main===module) 主入口），
//     故用 child_process.execSync 串行调用，而非 require 引入导出函数。
//   - 零依赖（仅 Node 内置模块：fs / path / child_process），ES5 兼容写法。
//   - 串行执行，绝不并行（保守模式，避免给官网造成压力）。
//   - 状态判定：结合退出码 + 输出降级关键词 + 预期产出文件的 mtime 变化（多重信号）。
//
// 用法： node scripts/run_all.js
// ============================================================================
'use strict';

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

// ===== 路径常量 =====
var SCRIPT_DIR = __dirname;                                   // /workspace/scripts
var WORKSPACE_DIR = path.resolve(SCRIPT_DIR, '..');           // /workspace
var DATA_DIR = path.join(WORKSPACE_DIR, 'data');              // /workspace/data
var REPORT_PATH = path.join(SCRIPT_DIR, 'crawl_report.json'); // /workspace/scripts/crawl_report.json

// ===== 调度配置 =====
var COOLDOWN_MS = 5000;                      // 脚本间冷却（毫秒）
var PER_SCRIPT_TIMEOUT_MS = 30 * 60 * 1000;  // 单脚本最长 30 分钟，防止挂死
var MAX_BUFFER = 10 * 1024 * 1024;           // 10MB，防止输出过大爆缓冲

// 脚本清单与元信息（顺序即执行顺序；与 package.json 的 crawl:* 脚本一一对应）
//   outputFiles : 该脚本预期产出的数据文件（相对 data/ 目录），用于核对生成结果
//   dataSource  : 数据来源说明（对应 _shared.js 的 DATA_SOURCES）
var SCRIPTS = [
  {
    name: 'crawl_rank_table.js',
    dataSource: '重庆考试院 (cqksy.cn)',
    outputFiles: ['score_rank_anchors.js']
  },
  {
    name: 'crawl_schools.js',
    dataSource: '阳光高考 (gaokao.cn) + 含光睿晟 (hzgrys.net)',
    outputFiles: ['schools.js']
  },
  {
    name: 'crawl_policies.js',
    dataSource: '重庆考试院 (cqksy.cn)',
    outputFiles: ['policies.js', 'risk_rules.js']
  },
  {
    name: 'crawl_tier_tags.js',
    dataSource: '含光睿晟 (hzgrys.net)',
    outputFiles: ['tier_tags.js']
  }
];

// ============================================================
// 时间格式化工具
// ============================================================

// 本地时间字符串：2026-06-28 15:30:00
function formatLocal(d) {
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

// 毫秒 → 紧凑耗时字符串（用于单脚本）：3m12s / 45s
function formatDurationCompact(ms) {
  if (ms < 0) ms = 0;
  var totalSec = Math.floor(ms / 1000);
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  if (m > 0) return m + 'm' + (s < 10 ? '0' + s : s) + 's';
  return s + 's';
}

// 毫秒 → 中文耗时字符串（用于总耗时）：18分32秒
function formatDurationCN(ms) {
  if (ms < 0) ms = 0;
  var totalSec = Math.floor(ms / 1000);
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  if (m > 0) return m + '分' + s + '秒';
  return s + '秒';
}

// ============================================================
// 同步阻塞睡眠（跨平台；用于脚本间冷却）
// 借助 execSync 调用系统 sleep 命令，避免轮询消耗 CPU
// ============================================================
function sleepSync(ms) {
  var sec = Math.max(1, Math.round(ms / 1000));
  var cmd;
  if (process.platform === 'win32') {
    // Windows 无 sleep，用 ping 模拟（ping N 次约耗时 N 秒）
    cmd = 'ping 127.0.0.1 -n ' + (sec + 1) + ' > NUL';
  } else {
    cmd = 'sleep ' + sec;
  }
  try { execSync(cmd, { stdio: 'ignore' }); } catch (e) { /* 忽略 */ }
}

// ============================================================
// 文件状态快照：记录 data/ 下预期产出文件的 mtime，用于判断是否被本次运行刷新
// ============================================================
function snapshotFiles(fileNames) {
  var snap = {};
  for (var i = 0; i < fileNames.length; i++) {
    var fp = path.join(DATA_DIR, fileNames[i]);
    try {
      var st = fs.statSync(fp);
      snap[fileNames[i]] = st.mtimeMs;   // mtime 毫秒时间戳
    } catch (e) {
      snap[fileNames[i]] = -1;           // 不存在
    }
  }
  return snap;
}

// 对比前后快照，返回本次运行实际"新生成/刷新"的文件列表
//   generated : 本次新写或 mtime 增大的文件
//   existing  : 当前存在的预期文件（含旧的）
function diffGenerated(fileNames, beforeSnap) {
  var generated = [];
  var existing = [];
  for (var i = 0; i < fileNames.length; i++) {
    var name = fileNames[i];
    var fp = path.join(DATA_DIR, name);
    var nowMs = -1;
    try { nowMs = fs.statSync(fp).mtimeMs; } catch (e) { nowMs = -1; }
    if (nowMs < 0) continue;             // 仍不存在
    existing.push(name);
    var beforeMs = beforeSnap[name];
    if (beforeMs == null) continue;
    if (beforeMs < 0) {
      generated.push(name);              // 之前不存在，现在存在 → 新生成
    } else if (nowMs > beforeMs) {
      generated.push(name);              // mtime 增大 → 本次刷新
    }
  }
  return { generated: generated, existing: existing };
}

// ============================================================
// 状态判定（多重信号，避免单一指标误判）
//   exitCode !== 0                                   → 'failed'
//   exitCode === 0 且输出含强降级标记                  → 'partial_success'
//   exitCode === 0 且未刷新任何预期产出文件            → 'partial_success'（降级未写）
//   其余（刷新了预期文件且无降级标记）                 → 'success'
// 说明：crawl_schools 即便部分院校失败也会写出文件，
//       故"输出降级关键词"这一信号不可或缺。
// ============================================================
function classifyStatus(exitCode, output, generatedFiles, expectedFiles) {
  if (exitCode !== 0) return 'failed';
  var text = output || '';
  // 强降级标记：各 crawl_*.js degrade() 会打印这些字样
  if (/降级|不会覆盖现有|抓取异常|请管理员手动|手动录入/.test(text)) {
    return 'partial_success';
  }
  // 无强降级标记：看是否刷新了预期文件
  if (expectedFiles && expectedFiles.length) {
    if (generatedFiles && generatedFiles.length) return 'success';
    return 'partial_success';            // 未刷新预期文件 → 视为降级未写
  }
  return 'success';
}

// 中文状态标签
function statusLabel(status) {
  if (status === 'success') return '成功';
  if (status === 'partial_success') return '部分成功';
  return '失败';
}

// ============================================================
// 从输出中启发式提取"需人工核实"条数（尽力而为）
//   匹配 "3所降级" / "降级 3 所" / "5 条需人工" 等 数字+量词+关键词
//   量词限定为 所/条/个/项/家/校，避免误匹配重试日志中的数字
//   单一正则两分支（前序 / 后序），按数字在文本中的绝对位置去重，
//   避免 "降级 5 条需人工" 这种前后双关键词导致同一数字被计数两次
// ============================================================
function extractManualReviewCount(output) {
  var text = output || '';
  var counter = '所|条|个|项|家|校';
  var kw = '降级|需人工|人工核实|人工录入';
  // 分支1（前序）：(\d+)量词关键词   分支2（后序）：关键词[^\d]{0,8}(\d+)量词
  var re = new RegExp(
    '(?:(\\d+)\\s*(' + counter + ')\\s*(?:' + kw + '))' +
    '|(?:(?:' + kw + ')[^\\d]{0,8}(\\d+)\\s*(' + counter + '))',
    'g'
  );
  var seen = {};        // 已计数的数字绝对位置 → true
  var count = 0;
  var m;
  while ((m = re.exec(text)) !== null) {
    var numStr = (m[1] != null) ? m[1] : m[3];
    // 计算数字在原文中的绝对起点（后序分支需加上关键词前缀长度）
    var numStart = (m[1] != null)
      ? m.index
      : m.index + m[0].indexOf(numStr);
    if (seen[numStart]) continue;
    seen[numStart] = true;
    var n = parseInt(numStr, 10);
    if (!isNaN(n) && n > 0 && n < 100000) count += n;
  }
  return count;
}

// ============================================================
// 执行单个脚本（execSync，合并 stdout+stderr 便于状态判定）
// 返回 { exitCode, output, durationMs, error }
// ============================================================
function runScript(scriptName) {
  var start = Date.now();
  // 2>&1 合并标准错误到标准输出，确保降级 warn 日志被一并捕获
  var cmd = 'node ' + scriptName + ' 2>&1';
  try {
    var out = execSync(cmd, {
      cwd: SCRIPT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: PER_SCRIPT_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER
    });
    return { exitCode: 0, output: out || '', durationMs: Date.now() - start, error: null };
  } catch (e) {
    // execSync 在非零退出码 / 超时 / 缓冲溢出时会抛错
    var combined = '';
    if (e && typeof e.stdout === 'string') combined += e.stdout;
    if (e && typeof e.stderr === 'string') combined += e.stderr;
    if (!combined && e && e.message) combined = e.message;
    var code = (e && typeof e.status === 'number') ? e.status : 1;
    if (e && e.signal === 'SIGTERM') code = 124;   // 超时被杀
    return { exitCode: code, output: combined, durationMs: Date.now() - start, error: e };
  }
}

// 取输出末尾 N 行（保留有内容），用于报告留存与控制台回显
function tailLines(text, n) {
  if (!text) return '';
  var lines = String(text).split(/\r?\n/);
  // 去掉末尾连续空行
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length <= n) return lines.join('\n');
  return lines.slice(lines.length - n).join('\n');
}

// ============================================================
// 字符串右侧 pad（用于报告列对齐；中文字符按 2 宽度近似）
// ============================================================
function padRight(str, width) {
  var s = String(str);
  var w = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    // CJK 及全角字符宽度近似为 2
    if (c >= 0x1100 && (
      c <= 0x115F || c === 0x2329 || c === 0x232A ||
      (c >= 0x2E80 && c <= 0xA4CF && c !== 0x303F) ||
      (c >= 0xAC00 && c <= 0xD7A3) ||
      (c >= 0xF900 && c <= 0xFAFF) ||
      (c >= 0xFE30 && c <= 0xFE4F) ||
      (c >= 0xFF00 && c <= 0xFF60) ||
      (c >= 0xFFE0 && c <= 0xFFE6)
    )) {
      w += 2;
    } else {
      w += 1;
    }
  }
  if (w >= width) return s;
  var need = width - w;
  var pad = '';
  while (need > 0) { pad += ' '; need--; }
  return s + pad;
}

// ============================================================
// 打印执行报告（控制台，格式清晰）
// ============================================================
function printReport(results, summary, manualTotal, confidence, startStr, totalMs) {
  var COL_SCRIPT = 24;
  var COL_STATUS = 10;
  var COL_DUR = 10;

  console.log('');
  console.log('========================================');
  console.log('  高考数据爬取 - 执行报告');
  console.log('  执行时间: ' + startStr);
  console.log('  总耗时: ' + formatDurationCN(totalMs));
  console.log('========================================');
  // 表头
  console.log(padRight('脚本', COL_SCRIPT) + padRight('状态', COL_STATUS) + padRight('耗时', COL_DUR) + '输出文件');
  console.log('-------------------------------------------------------------------------');
  // 各脚本行
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var fileCell = '';
    if (r.generatedFiles.length) {
      fileCell = r.generatedFiles.join(', ');
    } else if (r.existingFiles.length) {
      fileCell = r.existingFiles.join(', ') + ' (保留旧文件)';
    } else {
      fileCell = '—';
    }
    // 附加降级条数提示
    if (r.status === 'partial_success' && r.manualReviewCount > 0) {
      fileCell += ' (' + r.manualReviewCount + ' 项降级)';
    }
    console.log(
      padRight(r.script, COL_SCRIPT) +
      padRight(r.statusLabel, COL_STATUS) +
      padRight(r.durationHuman, COL_DUR) +
      fileCell
    );
  }
  console.log('========================================');
  console.log('统计: 共 ' + summary.total +
    ' 个 | 成功 ' + summary.success +
    ' | 部分成功 ' + summary.partial_success +
    ' | 失败 ' + summary.failed);
  console.log('数据置信度: ' + confidence);
  console.log('需人工核实: ' + manualTotal + ' 条');
  console.log('========================================');
}

// ============================================================
// 主流程
// ============================================================
function main() {
  var startTime = Date.now();
  var startStr = formatLocal(new Date());

  // ---------- 大标题 ----------
  console.log('');
  console.log('========================================');
  console.log('  高考数据爬取 - 管理员统一调度');
  console.log('  开始时间: ' + startStr);
  console.log('  预估总耗时: 约 15-20 分钟（保守模式，串行 + 5 秒冷却）');
  console.log('  待执行脚本: ' + SCRIPTS.length + ' 个');
  console.log('========================================');
  console.log('');

  // ---------- 串行执行 ----------
  var results = [];
  for (var i = 0; i < SCRIPTS.length; i++) {
    var s = SCRIPTS[i];
    console.log('[' + (i + 1) + '/' + SCRIPTS.length + '] ▶ 开始执行 ' + s.name +
      '  (数据源: ' + s.dataSource + ')');

    // 执行前快照预期产出文件
    var beforeSnap = snapshotFiles(s.outputFiles);

    // 运行脚本（捕获输出 + 退出码）
    var r = runScript(s.name);

    // 执行后比对：哪些文件被本次刷新/新生成
    var diff = diffGenerated(s.outputFiles, beforeSnap);

    // 综合判定状态
    var status = classifyStatus(r.exitCode, r.output, diff.generated, s.outputFiles);

    // 启发式提取需人工核实的条数
    var manualCount = extractManualReviewCount(r.output);

    // 该脚本小结
    console.log('[' + (i + 1) + '/' + SCRIPTS.length + '] ✔ ' + s.name +
      ' → ' + statusLabel(status) +
      '，耗时 ' + formatDurationCompact(r.durationMs) +
      '，退出码 ' + r.exitCode +
      (diff.generated.length ? '，已生成 ' + diff.generated.join(', ') : '，未刷新数据文件'));
    // 回显末尾输出，便于管理员快速查看该脚本结局
    var tail = tailLines(r.output, 5);
    if (tail) {
      console.log('    ┌── 末尾输出 ──');
      var tailLinesArr = tail.split('\n');
      for (var j = 0; j < tailLinesArr.length; j++) {
        console.log('    │ ' + tailLinesArr[j]);
      }
      console.log('    └──');
    }
    console.log('');

    results.push({
      script: s.name,
      status: status,
      statusLabel: statusLabel(status),
      exitCode: r.exitCode,
      durationMs: r.durationMs,
      durationHuman: formatDurationCompact(r.durationMs),
      dataSource: s.dataSource,
      expectedOutputFiles: s.outputFiles,
      generatedFiles: diff.generated,
      existingFiles: diff.existing,
      manualReviewCount: manualCount,
      outputTail: tailLines(r.output, 20)
    });

    // 脚本间冷却（最后一个不冷却）
    if (i < SCRIPTS.length - 1) {
      console.log('  ...冷却 ' + (COOLDOWN_MS / 1000) + ' 秒，避免给官网压力...');
      sleepSync(COOLDOWN_MS);
      console.log('');
    }
  }

  var endTime = Date.now();
  var totalMs = endTime - startTime;

  // ---------- 汇总统计 ----------
  var summary = { total: results.length, success: 0, partial_success: 0, failed: 0 };
  var manualTotal = 0;
  for (var k = 0; k < results.length; k++) {
    var st = results[k].status;
    if (st === 'success') summary.success++;
    else if (st === 'partial_success') summary.partial_success++;
    else summary.failed++;
    manualTotal += results[k].manualReviewCount;
    // 部分成功/失败但未提取到具体条数 → 至少记 1 条需人工介入
    if ((st === 'partial_success' || st === 'failed') && results[k].manualReviewCount === 0) {
      manualTotal += 1;
    }
  }

  // 数据置信度（依据 README 第六节规则）
  var confidence;
  if (summary.failed > 0) {
    confidence = '低（有脚本失败，需人工介入）';
  } else if (summary.partial_success > 0) {
    confidence = '中（部分降级，需人工核实）';
  } else {
    confidence = '高（官网爬取）';
  }

  // ---------- 打印执行报告 ----------
  printReport(results, summary, manualTotal, confidence, startStr, totalMs);

  // ---------- 生成 crawl_report.json ----------
  var report = {
    title: '高考数据爬取 - 执行报告',
    generated_at: new Date().toISOString(),
    generated_at_local: formatLocal(new Date()),
    started_at_local: startStr,
    total_duration_ms: totalMs,
    total_duration_human: formatDurationCN(totalMs),
    mode: '保守模式（串行 + 5 秒冷却）',
    summary: {
      total: summary.total,
      success: summary.success,
      partial_success: summary.partial_success,
      failed: summary.failed,
      manual_review_needed: manualTotal,
      confidence: confidence
    },
    scripts: results.map(function (r) {
      return {
        script: r.script,
        status: r.status,
        status_label: r.statusLabel,
        exit_code: r.exitCode,
        duration_ms: r.durationMs,
        duration_human: r.durationHuman,
        data_source: r.dataSource,
        expected_output_files: r.expectedOutputFiles,
        generated_files: r.generatedFiles,
        existing_files: r.existingFiles,
        manual_review_count: r.manualReviewCount,
        output_tail: r.outputTail
      };
    })
  };

  try {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log('报告已写入: ' + REPORT_PATH);
  } catch (e) {
    console.log('报告写入失败: ' + e.message);
  }

  // 退出码：有失败 → 1，否则 0（部分成功仍返回 0，避免阻断管理员查看报告）
  process.exitCode = summary.failed > 0 ? 1 : 0;
}

main();
