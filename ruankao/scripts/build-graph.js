/* ======================================================
   知识图谱数据构建器（幂等，可重复执行）
   源：data/ch01.js ~ ch18.js（章节卡片 → 三级节点，自动带上深链 url）
   人工维护：本文件内的 PATCH（精修元数据）/ PR（前置边）/ REL（关联边）/ HUBS / EXTRA
   产物：
     data/graph-data.json  —— 规范数据（节点 + 边分离）
     data/graph-data.js    —— window.GRAPH_DATA 包装（file:// 双击打开 graph.html 时
                              fetch 会因 CORS 失败，用 <script> 兜底加载）

   用法：node scripts/build-graph.js
====================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

/* ---------- 1. 读取 18 章数据源 ---------- */
const CHS = [];
for (let i = 1; i <= 18; i++) {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'ch' + String(i).padStart(2, '0') + '.js'), 'utf8')
    .trim().replace(/,\s*$/, '');
  CHS.push(vm.runInNewContext('(' + src + ')'));
}

/* ---------- 2. 三大板块 + 专题类（配色与站点 SECTIONS 一致） ---------- */
const SEC = {
  pm:  { id: 'sec-pm',  name: '项目管理核心', color: '#8b5cf6', imp: 5, diff: 4, desc: '第9–14章：案例主战场，两科通吃，最高优先级' },
  it:  { id: 'sec-it',  name: 'IT技术基础',   color: '#22d3ee', imp: 4, diff: 3, desc: '第1–8章：基础知识科分值大户' },
  aux: { id: 'sec-aux', name: '辅助知识',     color: '#fbbf24', imp: 3, diff: 2, desc: '第15–18章：考前突击，高性价比' },
};

/* ---------- 3. 章节级人工元数据（重要度/难度/一句话简介/考试提示） ---------- */
const CH_META = {
  1:  { imp: 3, diff: 2, desc: '信息、信息化与数字经济概念群，选择题概念密集区' },
  2:  { imp: 4, diff: 3, desc: '网络协议、存储架构与新一代信息技术，选择题主力' },
  3:  { imp: 2, diff: 2, desc: 'IT服务定义、ITSS 体系与服务生命周期' },
  4:  { imp: 3, diff: 3, desc: '集中/分布式、SOA 微服务与云原生等架构模式' },
  5:  { imp: 4, diff: 3, desc: '过程模型、需求工程与软件测试，软工主干' },
  6:  { imp: 3, diff: 3, desc: '数据建模、三范式、数据仓库与数据治理' },
  7:  { imp: 3, diff: 2, desc: '集成分类、中间件、综合布线与机房工程' },
  8:  { imp: 4, diff: 4, desc: '加密体制、数字签名、PKI 与等保2.0' },
  9:  { imp: 4, diff: 3, desc: '项目/运营、生命周期、过程组与知识领域总纲' },
  10: { imp: 4, diff: 3, desc: '制定项目章程 + 识别干系人，启动两大过程' },
  11: { imp: 5, diff: 4, desc: '24个规划过程：范围/进度/成本/质量/风险/采购计划', exam: '案例+双科核心，各子计划输出必背' },
  12: { imp: 4, diff: 3, desc: '10个执行过程：带团队、管质量、干采购' },
  13: { imp: 5, diff: 4, desc: '12个监控过程：整体变更、挣值计算与收尾前控制', exam: '挣值+变更 = 案例双王牌' },
  14: { imp: 4, diff: 3, desc: '验收、总结归档与两条收尾线' },
  15: { imp: 5, diff: 3, desc: '组织结构、PMO、配置管理与变更的组织级保障', exam: '配置管理案例超高频' },
  16: { imp: 3, diff: 2, desc: '监理定位、三控两管一协调与三阶段工作' },
  17: { imp: 4, diff: 3, desc: '招投标、政府采购、合同编与知识产权法规' },
  18: { imp: 2, diff: 1, desc: '职业道德基本规范与行为准则' },
};

/* ---------- 4. 卡片级人工精修（name 更短 / 考试提示 / 难度 / 附加标签） ---------- */
const PATCH = {
  'ch9-4':   { n: 'PMBOK发展史' },
  'ch9-10':  { n: '组织结构与PM权力' },
  'ch9-18':  { n: '12项管理原则' },
  'ch10-5':  { n: '章程"高层级"判分' },
  'ch10-7':  { n: '章程的工具与技术' },
  'ch10-10': { n: '识别干系人的输入' },
  'ch10-11': { n: '干系人数据分析' },
  'ch11-7':  { n: '范围基准与工作包' },
  'ch11-25': { n: '定量分析与EMV', ex: 'EMV=概率×影响，决策树选择题必考', df: 4 },
  'ch13-11': { n: '控制采购与监督干系人' },
  'ch15-3':  { n: '组织文化的影响' },
  // 重点考点的考试提示（历年分值/题型）
  'ch9-17':  { ex: '五大过程组是全部案例题的答题框架' },
  'ch9-20':  { ex: '十大知识领域与过程对号入座，选择高频' },
  'ch10-12': { ex: '四象限管理策略，选择+案例双考' },
  'ch11-5':  { ex: '分解5步骤与编制原则，案例+选择双考', df: 3 },
  'ch11-11': { ex: '案例必考计算：TE=(O+4M+P)/6 与标准差', df: 4 },
  'ch11-12': { ex: '案例必考计算：总时差/自由时差、关键路径与工期', df: 4, tg: ['网络图', '总时差'] },
  'ch11-13': { ex: '必考辨析：平衡改工期，平滑不改' },
  'ch11-14': { ex: '案例高频：赶工加成本、快速跟进加风险' },
  'ch11-21': { ex: '选择常考计算：渠道数 n(n-1)/2', df: 3, tg: ['渠道数'] },
  'ch11-26': { ex: '威胁4策略+机会4策略，选择案例通吃' },
  'ch11-27': { ex: '总价/成本补偿/工料三类适用场景必考', tg: ['总价合同', '成本补偿'] },
  'ch12-5':  { ex: '塔克曼五阶段顺序必背' },
  'ch12-6':  { ex: '冲突五法与激励理论，选择高频' },
  'ch12-9':  { ex: '招标→投标→评标→中标流程与时间数字高频' },
  'ch13-2':  { ex: '案例必考：变更流程步骤与CCB裁决' },
  'ch13-3':  { ex: '案例判断题高频：确认范围vs控制质量' },
  'ch13-6':  { ex: '案例必考：SV/CV/SPI/CPI 判进度与成本状态', df: 4, tg: ['EVM', 'PV/EV/AC'] },
  'ch13-7':  { ex: '案例必考：EAC/ETC/TCPI 公式与含义', df: 5, tg: ['EAC', 'ETC', 'TCPI'] },
  'ch13-8':  { ex: '老七种质量工具与场景配对，选择高频' },
  'ch14-1':  { ex: '案例判断题高频对比：先合同收尾后行政收尾' },
  'ch15-6':  { ex: '案例超高频：开发库/受控库/产品库职责划分' },
  'ch15-7':  { ex: '案例默写题：配置管理六活动顺序' },
  'ch15-9':  { ex: '与整体变更控制联动出案例题' },
  'ch17-1':  { ex: '数字题：投标20日、评标7日内公示等时间节点', df: 3, tg: ['时间节点'] },
  'ch17-6':  { ex: '保护期50年与职务作品归属，选择高频' },
  'ch8-6':   { ex: 'PKI 组成与证书内容，选择高频', df: 4 },
  'ch8-8':   { ex: '五级分级与定级流程，选择高频' },
  'ch2-1':   { ex: '七层功能与设备对号入座，选择高频' },
  'ch5-6':   { ex: '测试四级顺序与执行者必考' },
};

/* ---------- 5. 跨章节专题枢纽（考试视角聚合，打通知识孤岛） ---------- */
const HUBS = [
  { id: 'hub-calc', name: '计算题专题', level: 2, category: 'topic', importance: 5, difficulty: 4, type: 'topic', url: '',
    desc: '五大计算考点一张网：挣值EVM / 关键路径CPM / 三点估算PERT / 决策树EMV / 沟通渠道数', exam: '基础+案例双科必考，合计约10~15分',
    tags: ['计算题', '案例重点', '冲刺'] },
  { id: 'hub-case', name: '案例题专题', level: 2, category: 'topic', importance: 5, difficulty: 4, type: 'topic', url: '',
    desc: '案例答题素材库：变更控制 / 进度 / 质量 / 风险应对 / 团队冲突 / 招投标与配置管理', exam: '应用技术科目主干，下午案例必用',
    tags: ['案例题', '主观题', '冲刺'] },
  { id: 'hub-eng', name: '英语题·5分', level: 2, category: 'topic', importance: 3, difficulty: 2, type: 'topic', url: '',
    desc: '基础卷末 5 道英文题：背项目管理高频术语即可稳定拿分', tags: ['英语题', '送分题'] },
];

/* ---------- 6. 挣值公式子节点（level 4，案例必考的完整公式链） ---------- */
const EXTRA = [
  { id: 'evm-pv',  name: '三值：PV/EV/AC', parent: 'ch13-6', level: 4, category: 'pm', importance: 5, difficulty: 3, type: 'point', url: 'index.html#c13-6',
    desc: 'PV 计划值(应完成多少) / EV 挣值(干了多少) / AC 实际成本(花了多少)', exam: '所有挣值计算的起点', tags: ['EVM', '公式'] },
  { id: 'evm-sv',  name: '偏差：SV与CV', parent: 'ch13-6', level: 4, category: 'pm', importance: 5, difficulty: 3, type: 'point', url: 'index.html#c13-6',
    desc: 'SV=EV-PV（进度偏差） CV=EV-AC（成本偏差），小于0即落后/超支', exam: '案例必考公式', tags: ['EVM', '公式'] },
  { id: 'evm-spi', name: '指数：SPI与CPI', parent: 'ch13-6', level: 4, category: 'pm', importance: 5, difficulty: 3, type: 'point', url: 'index.html#c13-6',
    desc: 'SPI=EV/PV CPI=EV/AC，小于1即落后/超支（相对数，可跨项目比较）', exam: '案例必考公式', tags: ['EVM', '公式'] },
  { id: 'evm-eac', name: '预测：EAC与ETC', parent: 'ch13-7', level: 4, category: 'pm', importance: 5, difficulty: 4, type: 'point', url: 'index.html#c13-7',
    desc: 'ETC=EAC-AC；典型偏差 EAC=AC+(BAC-EV)/CPI，非典型 EAC=AC+BAC-EV', exam: '案例必考公式，注意区分典型/非典型', tags: ['EVM', '公式', 'EAC'] },
  { id: 'evm-tcpi', name: 'TCPI完工绩效', parent: 'ch13-7', level: 4, category: 'pm', importance: 4, difficulty: 5, type: 'point', url: 'index.html#c13-7',
    desc: 'TCPI=(BAC-EV)/(BAC-AC)：剩余工作所需成本绩效水平，>1 说明要更省着花', exam: '选择题偶考，理解含义即可', tags: ['EVM', '公式', 'TCPI'] },
];

/* ---------- 7. 前置边（source=先学 → target=后学，箭头方向必须正确） ---------- */
const PR = [
  // 总纲与过程组骨架
  ['ch9-0', 'ch9-1'], ['ch9-0', 'ch9-2'], ['ch9-13', 'ch9-17'],
  ['ch9-17', 'ch10-0'], ['ch9-17', 'ch11-0'], ['ch9-17', 'ch12-0'], ['ch9-17', 'ch13-0'], ['ch9-17', 'ch14-0'],
  ['ch9-15', 'ch10-1'], ['ch10-8', 'ch10-12'],
  // 范围主线：规划范围→需求→定义→WBS→基准→确认→控制→整体变更→CCB
  ['ch11-2', 'ch11-3'], ['ch11-3', 'ch11-4'], ['ch11-4', 'ch11-5'], ['ch11-5', 'ch11-7'],
  ['ch11-5', 'ch13-3'], ['ch11-7', 'ch13-3'], ['ch13-3', 'ch13-4'], ['ch13-4', 'ch13-2'], ['ch13-2', 'ch15-9'],
  // 进度主线：定义活动→排序→估算→PERT→CPM→压缩
  ['ch11-8', 'ch11-9'], ['ch11-9', 'ch11-10'], ['ch11-9', 'ch11-11'], ['ch11-10', 'ch11-11'], ['ch11-11', 'ch11-12'],
  ['ch11-12', 'ch11-13'], ['ch11-12', 'ch11-14'], ['ch11-12', 'ch11-15'],
  // 成本主线：估算→预算→挣值→完工预测
  ['ch11-16', 'ch11-17'], ['ch11-17', 'ch13-6'], ['ch13-6', 'ch13-7'],
  // 质量主线
  ['ch11-18', 'ch12-3'], ['ch12-3', 'ch13-8'],
  // 资源/团队主线
  ['ch11-19', 'ch12-4'], ['ch12-4', 'ch12-5'], ['ch12-5', 'ch12-6'],
  // 沟通主线
  ['ch11-21', 'ch12-7'],
  // 风险全流程（跨11→12→13章）
  ['ch11-22', 'ch11-23'], ['ch11-23', 'ch11-24'], ['ch11-24', 'ch11-25'], ['ch11-25', 'ch11-26'],
  ['ch11-26', 'ch12-8'], ['ch12-8', 'ch13-10'],
  // 采购/合同/法规主线：合同类型→实施采购→控制采购→合同收尾
  ['ch11-27', 'ch12-9'], ['ch12-9', 'ch13-11'], ['ch13-11', 'ch14-1'], ['ch12-9', 'ch17-1'], ['ch17-0', 'ch12-9'],
  // 整体计划→执行
  ['ch11-0', 'ch11-1'], ['ch11-1', 'ch12-1'],
  // 收尾
  ['ch13-3', 'ch14-2'], ['ch14-0', 'ch14-1'],
  // 配置管理
  ['ch15-4', 'ch15-5'], ['ch15-4', 'ch15-7'], ['ch15-7', 'ch15-8'],
  // 信息安全链
  ['ch8-2', 'ch8-4'], ['ch8-3', 'ch8-4'], ['ch8-3', 'ch8-5'], ['ch8-4', 'ch8-5'], ['ch8-5', 'ch8-6'], ['ch8-8', 'ch8-9'],
  // IT 基础链
  ['ch2-1', 'ch2-2'], ['ch2-1', 'ch2-3'], ['ch4-1', 'ch4-2'], ['ch5-1', 'ch5-2'], ['ch5-3', 'ch5-4'],
  ['ch5-6', 'ch5-7'], ['ch6-0', 'ch6-2'], ['ch1-5', 'ch1-6'],
  // 监理
  ['ch16-0', 'ch16-1'], ['ch16-1', 'ch16-3'],
  // 挣值公式内部链
  ['evm-pv', 'evm-sv'], ['evm-pv', 'evm-spi'], ['evm-spi', 'evm-eac'], ['evm-eac', 'evm-tcpi'],
];

/* ---------- 8. 关联边（横向相关：常搭配出题 / 易混淆 / 跨章重复知识点桥接） ---------- */
const REL = [
  // 信息化 & IT 桥接
  ['ch1-0', 'ch1-1'], ['ch1-1', 'ch1-2'], ['ch1-2', 'ch8-0'], ['ch1-6', 'ch9-13'], ['ch1-7', 'ch1-8'],
  ['ch2-4', 'ch2-5'], ['ch2-6', 'ch4-7'], ['ch2-7', 'ch6-4'], ['ch2-8', 'ch1-12'], ['ch2-9', 'ch1-15'],
  ['ch3-4', 'ch9-13'],
  ['ch4-3', 'ch4-7'], ['ch4-3', 'ch7-7'], ['ch4-6', 'ch8-0'],
  ['ch5-0', 'ch9-14'], ['ch5-1', 'ch11-3'],
  ['ch6-3', 'ch6-2'], ['ch6-4', 'ch6-5'], ['ch6-6', 'ch6-7'],
  ['ch7-0', 'ch7-1'], ['ch7-2', 'ch7-7'], ['ch7-3', 'ch2-3'], ['ch7-4', 'ch7-5'],
  ['ch8-0', 'ch8-1'], ['ch8-2', 'ch8-3'], ['ch8-6', 'ch8-7'],
  // 项目管理跨章桥接（同一知识点在不同章重复出现，图谱里连起来）
  ['ch9-7', 'ch9-8'], ['ch9-7', 'ch9-9'], ['ch9-8', 'ch9-9'],
  ['ch9-10', 'ch15-0'], ['ch9-10', 'ch15-1'], ['ch9-11', 'ch15-2'], ['ch9-15', 'ch9-16'], ['ch9-17', 'ch9-20'],
  ['ch10-1', 'ch10-4'], ['ch10-1', 'ch10-16'], ['ch10-8', 'ch10-15'], ['ch10-12', 'ch10-13'], ['ch10-12', 'ch11-28'],
  ['ch11-1', 'ch11-7'], ['ch11-1', 'ch11-15'], ['ch11-1', 'ch11-17'], ['ch11-5', 'ch11-6'],
  ['ch11-12', 'ch13-5'], ['ch11-12', 'ch13-6'], ['ch11-28', 'ch12-8'],
  ['ch12-1', 'ch13-1'], ['ch12-2', 'ch14-3'], ['ch13-3', 'ch13-8'],
  ['ch15-5', 'ch15-6'], ['ch15-5', 'ch15-9'], ['ch15-6', 'ch13-2'],
  ['ch16-2', 'ch17-0'], ['ch16-3', 'ch16-5'],
  ['ch17-0', 'ch17-1'], ['ch17-1', 'ch17-2'], ['ch17-0', 'ch17-3'], ['ch17-4', 'ch11-27'],
  ['ch17-6', 'ch17-7'], ['ch18-2', 'ch17-6'], ['ch18-2', 'ch17-7'],
  // 专题枢纽
  ['hub-calc', 'ch11'], ['hub-calc', 'ch13'], ['hub-calc', 'ch11-10'], ['hub-calc', 'ch11-11'],
  ['hub-calc', 'ch11-12'], ['hub-calc', 'ch11-14'], ['hub-calc', 'ch11-21'], ['hub-calc', 'ch11-25'],
  ['hub-calc', 'ch13-6'], ['hub-calc', 'ch13-7'], ['hub-calc', 'ch14-4'],
  ['hub-case', 'ch13'], ['hub-case', 'ch14'], ['hub-case', 'ch15'],
  ['hub-case', 'ch11-5'], ['hub-case', 'ch12-5'], ['hub-case', 'ch12-6'], ['hub-case', 'ch12-9'],
  ['hub-case', 'ch13-2'], ['hub-case', 'ch13-3'], ['hub-case', 'ch14-1'],
  ['hub-case', 'ch15-6'], ['hub-case', 'ch15-9'], ['hub-case', 'ch11-26'],
  ['hub-eng', 'hub-case'],
  ['evm-sv', 'evm-spi'],
];

/* ---------- 9. 自动生成节点 ---------- */
const nodes = [], edges = [];
const IMP_MAP = { high: { 3: 5, 2: 4, 1: 4 }, mid: { 3: 4, 2: 3, 1: 2 }, low: { 3: 3, 2: 2, 1: 1 } };
const DIFF_MAP = { high: 3, mid: 2, low: 2 };
const FREQ = { high: '高频', mid: '中频', low: '低频' };

// 9.1 板块节点（level 1）
Object.values(SEC).forEach(s => nodes.push({
  id: s.id, name: s.name, level: 1, category: s.key, importance: s.imp, difficulty: s.diff,
  type: 'section', url: '', desc: s.desc, tags: [s.name],
}));

// 9.2 章节节点（level 2）
CHS.forEach(ch => {
  const m = CH_META[ch.id];
  nodes.push({
    id: 'ch' + ch.id, name: ch.title, parent: SEC[ch.sec].id, level: 2, category: ch.sec,
    importance: m.imp, difficulty: m.diff, type: 'chapter', url: 'index.html#c' + ch.id,
    desc: m.desc, exam: m.exam || '', tags: ['第' + ch.id + '章', FREQ[m.imp >= 5 ? 'high' : m.imp >= 4 ? 'mid' : 'low']],
  });
  edges.push({ source: SEC[ch.sec].id, target: 'ch' + ch.id, relation: 'contains' });
});

// 9.3 卡片节点（level 3，url 深链到具体卡片 —— 打通孤岛的关键）
function shortName(t, ch) {
  if (t.includes('速查')) return '速查·' + ch.title;           // 速查表卡片按章命名
  let n = t.split('——')[0];                                    // 去掉"——"副标题
  n = n.replace(/（[^）]*）|\([^)]*\)/g, '').trim();           // 去掉括注（必背）（必考）等
  return n;
}
CHS.forEach(ch => {
  ch.cards.forEach((c, i) => {
    const id = 'ch' + ch.id + '-' + i, p = PATCH[id] || {};
    const imp = p.i || IMP_MAP[c.f][c.s];
    const isCalc = /计算|估算|CPM|PERT|EMV|EVM|EAC|TCPI|渠道|CPI|SPI/.test(c.t + (p.n || ''));
    const tags = [FREQ[c.f]];
    if (isCalc) tags.push('计算题');
    if (c.f === 'high' && c.s === 3) tags.push('核心考区');
    (p.tg || []).forEach(t => tags.push(t));
    nodes.push({
      id, name: p.n || shortName(c.t, ch), parent: 'ch' + ch.id, level: 3, category: ch.sec,
      importance: imp, difficulty: p.df || (c.f === 'low' && c.s === 1 ? 1 : DIFF_MAP[c.f]),
      type: c.t.includes('速查') ? 'ref' : 'topic', url: 'index.html#c' + ch.id + '-' + i,
      desc: c.m, exam: p.ex || (c.f === 'high' ? '真题高频考点' : c.f === 'mid' ? '常考考点' : '了解即可'),
      tags, freq: c.f,
    });
    edges.push({ source: 'ch' + ch.id, target: id, relation: 'contains' });
  });
});

// 9.4 专题枢纽 + 挣值公式子节点
HUBS.forEach(h => nodes.push(h));
EXTRA.forEach(x => { nodes.push(x); edges.push({ source: x.parent, target: x.id, relation: 'contains' }); });

// 9.5 前置/关联边
PR.forEach(([s, t]) => edges.push({ source: s, target: t, relation: 'prerequisite' }));
REL.forEach(([s, t]) => edges.push({ source: s, target: t, relation: 'related' }));

/* ---------- 10. 校验 ---------- */
const ids = new Set(nodes.map(n => n.id));
if (ids.size !== nodes.length) throw new Error('存在重复节点 id');
const errs = [];
const containsPairs = new Set(edges.filter(e => e.relation === 'contains').map(e => e.source + '>' + e.target));
const seen = new Set();
edges.forEach(e => {
  if (!ids.has(e.source) || !ids.has(e.target)) errs.push('边引用不存在的节点: ' + e.source + '->' + e.target);
  const k = [e.source, e.target, e.relation].join('|');
  if (seen.has(k)) errs.push('重复边: ' + k);
  seen.add(k);
  // 前置/关联边不能连接父子（那应该用 contains）
  if (e.relation !== 'contains' && containsPairs.has(e.source + '>' + e.target)) errs.push('contains 关系重复声明: ' + k);
});
nodes.forEach(n => {
  if (n.level >= 2 && n.type !== 'topic' && !nodes.some(p => p.id === n.parent)) { /* hub 无 parent，合法 */ }
});
if (nodes.length < 150) errs.push('节点数不足150: ' + nodes.length);
if (errs.length) throw new Error('校验失败：\n' + errs.join('\n'));

// 五条验收前置链抽查
const chains = [
  ['ch11-8', 'ch11-9', 'ch11-11', 'ch11-12', 'ch11-14'],
  ['ch11-16', 'ch11-17', 'ch13-6'],
  ['ch11-5', 'ch13-3', 'ch13-4', 'ch13-2'],
  ['ch11-24', 'ch11-25'],
  ['ch11-27', 'ch12-9', 'ch17-1'],
];
chains.forEach((c, i) => {
  for (let j = 0; j < c.length - 1; j++) {
    if (!seen.has(c[j] + '|' + c[j + 1] + '|prerequisite')) errs.push('前置链' + (i + 1) + '断链: ' + c[j] + '->' + c[j + 1]);
  }
});
if (errs.length) throw new Error(errs.join('\n'));

/* ---------- 11. 输出 ---------- */
const data = {
  meta: { version: '1.0', source: '软考中项（系统集成项目管理工程师）第3版教程 · 以本站 data/ch01~ch18 章节数据为准', generated: new Date().toISOString().slice(0, 10) },
  nodes, edges,
};
const json = JSON.stringify(data, null, 1);
fs.writeFileSync(path.join(ROOT, 'data', 'graph-data.json'), json + '\n');
fs.writeFileSync(path.join(ROOT, 'data', 'graph-data.js'), '/* 由 scripts/build-graph.js 自动生成，勿手改 */\nwindow.GRAPH_DATA = ' + json + ';\n');

const cnt = r => edges.filter(e => e.relation === r).length;
console.log('graph-data 构建完成：' + nodes.length + ' 节点（板块3 / 章节18 / 卡片' + (nodes.length - 3 - 18 - HUBS.length - EXTRA.length) + ' / 专题' + HUBS.length + ' / 公式' + EXTRA.length + '），' + edges.length + ' 边（contains ' + cnt('contains') + ' / prerequisite ' + cnt('prerequisite') + ' / related ' + cnt('related') + '）');
console.log('五条验收前置链全部连通 ✓');
