# AGENTS.md — AI 开发维护规范（软考中项知识库）

> 任何 AI（或人）在本项目中修改内容前，**必须先读完本文件**。目标：照做即可正确维护，无需重新摸索。

## 1. 项目是什么

单文件静态 Web 应用「软考中项知识库」，面向零基础备考新人，目标：学完即通过软考中级《系统集成项目管理工程师》（第3版教材 / 机考新大纲）。功能：仪表盘、章节学习（知识点卡片）、刷题实战、错题本、搜索；进度存 localStorage，无后端、无构建依赖、无外部请求。

内容规模：18 章 / 229 张知识点卡片 / 218 道题。数据基准：`data/exam-analysis.md`（近5年真题考频分析，选题与高频定级的依据）。

## 2. 核心架构：源与产物（最重要的一节）

本项目采用 **"开发时分离、发布时单文件"** 模式：

```
ruankao/
├── index.html        ← 构建产物（唯一发布物，CSS+JS+全部数据内联）。禁止手改其数据区
├── graph.html        ← 知识图谱独立页面（力导向图，样式与主站一致，导航互跳）
├── data/
│   ├── ch01~ch18.js  ← 唯一数据源：每章一个文件（格式契约见 data/SPEC.md）
│   ├── graph-data.json / graph-data.js ← 知识图谱数据（build-graph.js 生成，勿手改）
│   ├── SPEC.md       ← 写作格式契约 + 交付 checklist（改内容必读）
│   └── exam-analysis.md ← 真题考频分析（选题/定级依据）
└── scripts/
    ├── merge.js      ← 构建器（build / check / sync）
    └── build-graph.js ← 图谱构建器：章节卡片 → 节点/边，改章节后重跑同步图谱

/workspace/index.html ← 站点根副本（由 sync 自动生成，禁止手改）
```

**为什么单文件发布**：使用者常以 file:// 双击打开或挂任意静态托管；分离加载会破坏 file:// 能力且无实质收益。**为什么源文件分离**：477KB 大文件不可维护；每章 10-20KB 的小文件便于定位、审阅、多 Agent 并行修改不冲突；`build` 可自动校验。

## 3. 必读顺序

1. 本文件
2. `data/SPEC.md`（第二节字段契约、第三节 HTML 白名单、第六节 checklist）
3. 要改的 `data/chNN.js` + 其前后章节（避免内容重复、保持衔接）

## 4. 标准工作流

### 常用命令（在 `ruankao/` 目录下执行）

```bash
node scripts/merge.js build   # data/ 18 章源文件 → 重建 index.html 数据区（幂等，先逐章语法校验）
node scripts/merge.js check   # 全量校验：页面脚本语法/字段完整性/18章齐全/源与产物逐字一致
node scripts/merge.js sync    # 同步 index.html → /workspace/index.html（站点根副本）
node scripts/merge.js         # 不带参数 = build + check + sync 全跑
```

### 场景 A：修订某章知识点（最常见）

1. 编辑 `data/chNN.js`（N=章号，两位数文件名），遵守 SPEC 契约
2. `node scripts/merge.js`（build 内置逐章语法+结构校验，check 会拦截"改了源忘 build"）
3. 浏览器打开 `ruankao/index.html` 冒烟：该章能打开、卡片/表格/图示渲染正常、刷题判分正常、console 无报错

### 场景 B：教材改版 / 勘误 / 新增考试年份内容

1. 先更新 `data/exam-analysis.md` 的考频结论（需要时 WebSearch 核实）
2. 按场景 A 修改对应章节源文件；高频考点定级（f:'high'）须与考频一致
3. 事实拿不准的（国标编号、法条数字、教材表述）：WebSearch 交叉验证，仍不确定则只写名称不写编号，禁止编造

### 场景 C：多 Agent 并行开发

- 每个 Agent 只写**自己的** `data/chNN.js`，禁止触碰 index.html、merge.js 及其他章节文件
- 全部完成后由总控统一执行 `node scripts/merge.js`（build 会重建全量，天然合并无冲突）
- 推荐分工模式（本项目已验证）：1 个真题分析 Agent → N 个写作 Agent 按章并行 → 2-3 个审查 Agent（格式合规 / 内容准确性分线）→ 总控构建集成

## 5. 硬性禁令（违反 = 构建失败或内容回归）

1. **禁止直接编辑 index.html 的 `CHAPTERS` 数据区**——下次 build 会整体重建覆盖你的修改；所有内容改动只能改 `data/chNN.js`
2. **禁止手改 `/workspace/index.html`**——它是 sync 生成的副本，改了会被覆盖
3. 卡片正文 `b` 是反引号模板字符串：内部**禁止出现反引号和 `${**（会被解析为插值，直接语法错误）
4. 字符串一律单引号；quiz 选项 `o` 内禁用单引号（改写文句规避，不要用转义）
5. 正文 HTML 只用 SPEC 第三节白名单标签/class；禁止 script/style/on* 事件/img/外链 a
6. 头部四字段 `{id,title,sec,page}` 不得变更（与页面 SECTIONS 分区、进度存储 key 关联）
7. 不要引入任何运行时依赖（npm 包、外链 CDN、字体）：单文件离线可用是产品特性

## 6. 交付前 checklist

- [ ] `node scripts/merge.js` 三步全过（build/check/sync 无报错）
- [ ] 改动章节在浏览器中渲染正常（卡片、表格 kt、图示 dg、坑点 pit）
- [ ] 刷题实战中该章答题判分与解析显示正常
- [ ] 若新增卡片/题目：对照 SPEC 第六节逐项自查（字段齐全、答案打散、选项无单引号、表格列数一致）
- [ ] 若涉及事实修正：注明依据（教材原文/官方标准/法条），不确定的不写

## 7. 已知设计约定（防止误改）

- 学习进度 key 为 `章id_卡片下标` 存 localStorage（`zx_v1`）——**卡片只能追加到章末或原位修改，不要插入中间**，否则用户已有进度错位；删除卡片同样慎做
- 章内 quiz 题目顺序无此约束（按章存储整体引用）
- 根目录 `/workspace` 是站点根（含 .nojekyll，可整体推 GitHub Pages）；`gkzn/` 是另一独立子项目，与本项目无关，勿动
