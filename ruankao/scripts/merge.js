/* 合并 data/chNN.js 到 index.html 并做全量校验（loop 用） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDS = [2,3,4,5,6,7,8,12,13,14,15,16,17,18];

function merge() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const id of IDS) {
    const f = path.join(ROOT, 'data', 'ch' + String(id).padStart(2, '0') + '.js');
    let content = fs.readFileSync(f, 'utf8').trim();
    if (content.includes('</script')) throw new Error(`ch${id}: 内容含 </script，会破坏页面`);
    content = content.replace(/,\s*$/, ''); // 去尾部逗号
    const re = new RegExp("^\\s*\\{id:" + id + ",\\s*title:'[^']+',\\s*sec:'\\w+',\\s*page:\\d+\\},?\\s*$", 'm');
    if (!re.test(html)) throw new Error(`ch${id}: index.html 占位行未找到（可能已合并）`);
    html = html.replace(re, '\n  ' + content + ',');
  }
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
}

function validate() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('未找到 <script> 块');
  new vm.Script(m[1]); // 语法编译检查（不执行）
  // 提取 CHAPTERS 数据并求值
  const s = html.indexOf('const CHAPTERS = [');
  const e = html.indexOf('\n];', s);
  const arr = vm.runInNewContext('(' + html.slice(s + 'const CHAPTERS = '.length, e + 2) + ')');
  if (arr.length !== 18) throw new Error('章节总数=' + arr.length + '，应为18');
  let cards = 0, quiz = 0, errs = [];
  for (const ch of arr) {
    if (!ch.cards || !ch.cards.length) errs.push(`第${ch.id}章无卡片`);
    if (!ch.quiz || !ch.quiz.length) errs.push(`第${ch.id}章无题目`);
    ch.cards.forEach((c, i) => {
      if (!c.t || !c.b || !['high','mid','low'].includes(c.f) || !(c.s>=1&&c.s<=3) || !c.m) errs.push(`第${ch.id}章卡片${i}字段缺失`);
    });
    ch.quiz.forEach((q, i) => {
      if (!q.q || !Array.isArray(q.o) || q.o.length !== 4 || !(q.a>=0&&q.a<=3) || !q.e || !q.k) errs.push(`第${ch.id}章题${i}字段非法`);
    });
    cards += ch.cards.length; quiz += ch.quiz.length;
  }
  if (errs.length) throw new Error('数据校验失败：\n' + errs.join('\n'));
  console.log(`校验通过：18/18 章均有内容，共 ${cards} 张卡片、${quiz} 道题`);
}

const cmd = process.argv[2];
if (cmd === 'check') { validate(); }
else { merge(); console.log('合并完成'); validate(); }
