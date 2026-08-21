/* ======================================================
   构建管线（幂等，可重复执行）
   源：data/ch01.js ~ ch18.js（每章一文件，唯一数据源）
   产物：index.html（单文件应用，含 CSS+JS+全部章节数据）
   副本：/workspace/index.html（站点根入口，由 sync 生成）

   用法：
     node scripts/merge.js build   # data/ → index.html（先逐章语法校验）
     node scripts/merge.js check   # 全量校验：语法/字段/18章完整/源与产物一致
     node scripts/merge.js sync    # 复制 index.html → /workspace/index.html
   推荐：build && check && sync 一次跑全
====================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = path.join(ROOT, 'index.html');
const SITE_ROOT_IDX = '/workspace/index.html';
const IDS = Array.from({ length: 18 }, (_, i) => i + 1);
const chFile = id => path.join(ROOT, 'data', 'ch' + String(id).padStart(2, '0') + '.js');

/* 读取并校验单个章节源文件，返回规范化文本 */
function readChapter(id) {
  let c = fs.readFileSync(chFile(id), 'utf8').trim().replace(/,\s*$/, '');
  if (c.includes('</script')) throw new Error(`ch${id}: 内容含 </script，会破坏页面`);
  const obj = vm.runInNewContext('(' + c + ')'); // 语法 + 可求值校验
  if (obj.id !== id) throw new Error(`ch${id}: 文件内 id=${obj.id} 与文件名不匹配`);
  if (!obj.title || !obj.sec || typeof obj.page !== 'number') throw new Error(`ch${id}: 头部字段缺失`);
  if (!Array.isArray(obj.cards) || !obj.cards.length) throw new Error(`ch${id}: 无 cards`);
  if (!Array.isArray(obj.quiz) || !obj.quiz.length) throw new Error(`ch${id}: 无 quiz`);
  return c;
}

/* 用 18 个源文件整体重建 index.html 的 CHAPTERS 数据区（幂等） */
function build() {
  let html = fs.readFileSync(IDX, 'utf8');
  const LIT = 'const CHAPTERS = [';
  const s = html.indexOf(LIT);
  const e = html.indexOf('\n];', s);
  if (s < 0 || e < 0) throw new Error('index.html 中未找到 CHAPTERS 数据区');
  const parts = IDS.map(id => '  ' + readChapter(id) + ',');
  html = html.slice(0, s) + LIT + '\n' + parts.join('\n') + '\n];' + html.slice(e + 3);
  fs.writeFileSync(IDX, html);
  console.log('构建完成：18 章已由 data/ 重建至 index.html');
}

/* 全量校验：页面脚本语法、18 章字段完整性、源文件与产物逐字一致 */
function check() {
  const html = fs.readFileSync(IDX, 'utf8');
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]); // 仅编译不执行
  const LIT = 'const CHAPTERS = ';
  const s = html.indexOf(LIT + '[');
  const e = html.indexOf('\n];', s);
  const arr = vm.runInNewContext('(' + html.slice(s + LIT.length, e + 2) + ')');
  const errs = [];
  if (arr.length !== 18) errs.push('章节总数=' + arr.length + '，应为 18');
  let cards = 0, quiz = 0;
  arr.forEach(ch => {
    if (!ch.cards || !ch.cards.length) errs.push(`第${ch.id}章无卡片`);
    if (!ch.quiz || !ch.quiz.length) errs.push(`第${ch.id}章无题目`);
    (ch.cards || []).forEach((c, i) => {
      if (!c.t || !c.b || !c.m || !['high','mid','low'].includes(c.f) || !(c.s >= 1 && c.s <= 3))
        errs.push(`第${ch.id}章卡片${i + 1}字段非法（t/f/s/m/b）`);
    });
    (ch.quiz || []).forEach((q, i) => {
      if (!q.q || !Array.isArray(q.o) || q.o.length !== 4 || !(q.a >= 0 && q.a <= 3) || !q.e || !q.k)
        errs.push(`第${ch.id}章题目${i + 1}字段非法（q/o/a/k/e）`);
    });
    cards += (ch.cards || []).length; quiz += (ch.quiz || []).length;
  });
  // 源与产物一致性：防止"改了 data/ 忘了 build"
  IDS.forEach(id => {
    if (!html.includes(readChapter(id)))
      errs.push(`第${id}章：index.html 与 data/ch${String(id).padStart(2,'0')}.js 不一致（忘了 build？）`);
  });
  if (errs.length) throw new Error('校验失败：\n' + errs.join('\n'));
  console.log(`校验通过：18/18 章完整，共 ${cards} 张卡片、${quiz} 道题，源与产物一致`);
}

/* 同步站点根副本 */
function sync() {
  fs.copyFileSync(IDX, SITE_ROOT_IDX);
  console.log('已同步 → ' + SITE_ROOT_IDX);
}

const cmd = process.argv[2];
if (cmd === 'build') build();
else if (cmd === 'check') check();
else if (cmd === 'sync') sync();
else { build(); check(); sync(); }
