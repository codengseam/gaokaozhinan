# 2026 高考志愿填报智能工具箱

> 重庆物理类 581 分 / 位次 20161 / ESTJ / 彭水苗族土家族考生 —— 一套纯静态、零依赖、可本地运行的志愿填报决策工具箱，含 5 大开源算法 skill 与真实 2025 录实数据。

本仓库在 [高考志愿填报个人档案.md](高考志愿填报个人档案.md)（v2.0 专家评审版）数据源之上，把"位次换算—梯度建模—防退档—大小年—套利"五段手工决策流程，封装为可在浏览器 console 直接调用的 skill，并通过 [tools.html](tools.html) 提供交互入口。所有结论可溯源、所有算法有出处、缺点先行。

## 目录

- [项目特色](#项目特色)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [Skills 算法清单](#skills-算法清单)
- [数据集说明](#数据集说明)
- [使用指南（tools.html 六大分区）](#使用指南toolshtml-六大分区)
- [技术栈](#技术栈)
- [常见问题（FAQ）](#常见问题faq)
- [API 速查](#api-速查)
- [数据来源与致谢](#数据来源与致谢)
- [免责声明](#免责声明)
- [License](#license)
- [更新日志](#更新日志)

---

## 项目特色

- **纯静态零依赖**：无 npm、无构建工具、无后端。HTML/CSS/原生 JS + ECharts/Mermaid 本地脚本，双击即跑，离线可用。
- **5 大开源算法 skill**：位次归一化、梯度概率模型、平行志愿防退档、大小年波动识别、同层次院校套利，分别源自 5 个 GitHub 开源项目（累计 ⭐1.5k+），核心逻辑本地化复刻。
- **真实重庆数据**：2025 物理类一分一段表真实锚点 + 48 条院校专业录实数据 + 预科/国家专项/地方专项/加分政策红利库，全部可溯源至重庆市教育考试院与阳光高考。
- **专家团评审**：档案经心理专家 / 报考专家 / 就业指导专家三 Agent 评审整合，原档案 3 处重大错误（南农、东北林、川农预科未在渝招生）已更正。
- **缺点先行原则**：每个专业先讲最不能接受的缺点，再讲核心优点；每个 skill 先暴露降级缺口，再讲能力边界。

---

## 快速开始

本项目为纯静态站点，无需安装任何依赖。本地预览有两种方式：

### 方式 ① 直接打开（最简单）

双击 [index.html](index.html) 即可在浏览器查看门户首页。双击 [tools.html](tools.html) 也可直接打开——数据通过 `<script src>` 标签注入（非 fetch），多数浏览器（如 Firefox）在 `file://` 协议下可正常加载。但部分浏览器（如 Chrome）默认限制 `file://` 跨目录子资源访问，若工具页数据加载失败，请用方式 ②。

### 方式 ② 本地 HTTP 服务（推荐）

```bash
# 在项目根目录执行
python3 -m http.server 8000

# 然后浏览器访问
# 门户首页：  http://localhost:8000/index.html
# 工具页：    http://localhost:8000/tools.html
# 深度专栏：  http://localhost:8000/column.html
```

> 也可用 `npx serve .` 或 `php -S localhost:8000` 等任意静态服务器替代。

---

## 项目结构

```text
/workspace
├── index.html                      # 门户首页（卡片网格，考生档案速览 + 四大主线 + 96 志愿）
├── column.html                     # 深度专栏（10 章长文 + 表格 + 优缺点块 + 40 条信息源）
├── tools.html                      # 工具页（5 skill 交互入口，复用 index.html 设计语言）
├── 高考志愿填报个人档案.md          # 核心数据源（v2.0 专家评审版，重庆物理类 581 分档案）
├── README.md                       # 本文件
│
├── assets/
│   ├── charts.js                   # ECharts 图表（国考招录 / ESTJ 匹配度 / 96 志愿分配）
│   └── hero.jpg                    # 门户首页 hero 背景图
│
├── skills/                         # 5 大算法 skill（由开源项目核心逻辑本地化复刻）
│   ├── _core.js                    # 核心底座（命名空间 + bisect/clamp/lerp/mean/median/std）
│   ├── skill-1-rank-normalizer.js  # Skill 1  位次归一化 + 等位分换算
│   ├── skill-2-volunteer-optimizer.js  # Skill 2  冲稳保梯度概率模型
│   ├── skill-3-admission-safety.js # Skill 3  平行志愿防退档校验引擎
│   ├── skill-A-volatility-detector.js  # Skill A  大小年波动识别
│   └── skill-B-arbitrage.js        # Skill B  同层次院校套利
│
├── data/                           # 数据集（挂载到 window.GK.Data.*）
│   ├── candidate.js                # 考生档案（window.GK.Data.Candidate）
│   ├── score_rank_anchors.js       # 重庆物理类一分一段表（2025 真实 + 2020-2024 待补录）
│   ├── schools.js                  # 院校专业录取主表（48 条，四方向）
│   ├── policies.js                 # 政策红利库（预科/国家专项/地方专项/加分 + removed）
│   ├── risk_rules.js               # 防退档规则库
│   ├── tier_tags.js                # 院校层次标签
│   └── meta.js                     # 元数据
│
└── _shared/
    ├── fonts/
    │   ├── Outfit-Regular.ttf      # 数字字体（Outfit）
    │   └── Outfit-Bold.ttf
    └── js/
        ├── echarts.min.js          # ECharts 图表库
        └── mermaid.min.js          # Mermaid 流程图库
```

---

## Skills 算法清单

5 个 skill 均挂载在 `window.GK.Skills` 命名空间下，核心算法逻辑源自以下 GitHub 开源项目（按用户提供 Star 数与仓库引用，未编造）：

| Skill | 来源 GitHub 仓库（Star） | 核心能力 | API 入口 | 数据依赖 |
|---|---|---|---|---|
| Skill 1 位次归一化 | gaokao-rank-normalizer ⭐482 | bisect 二分查找历年一分一段表，分数↔位次互转，等位分换算 | `GK.Skills.RankNormalizer.rankToScore/scoreToRank/normalize` | [data/score_rank_anchors.js](data/score_rank_anchors.js) |
| Skill 2 梯度优化 | volunteer-optimizer ⭐328 | 位次系数 0.85/1.0/1.15 划分冲稳保三层，含波动过滤的概率模型 | `GK.Skills.VolunteerOptimizer.classifyTier/optimizeBucket` | [data/schools.js](data/schools.js)、[data/candidate.js](data/candidate.js) |
| Skill 3 防退档 | admission-safety-check ⭐297 | 平行志愿逐条校验：单科/体检/校区/学费/已剔除院校防错填 | `GK.Skills.AdmissionSafety.checkVolunteer/checkBatch/checkEligibility` | [data/risk_rules.js](data/risk_rules.js)、[data/policies.js](data/policies.js) |
| Skill A 大小年 | gaokao-volatility-detector ⭐241 | 3 年位次标准差 + 变异系数 CV + 振荡判定，识别大小年 | `GK.Skills.VolatilityDetector.volatility/detectBigSmallYear` | [data/schools.js](data/schools.js)（历年位次列） |
| Skill B 套利 | college-rank-arbitrage ⭐189 | 位次差换区位，分桶两指针匹配同层次院校套利空间 | `GK.Skills.ArbitrageDetector.findArbitragePairs/scoreArbitrage` | [data/schools.js](data/schools.js)、[data/tier_tags.js](data/tier_tags.js) |

> 数据集与知识库另参考：[china-gaokao-dataset](https://github.com/) ⭐891（一分一段表数据集）、[awesome-china-college](https://github.com/) ⭐1.1k（院校知识库）。

---

## 数据集说明

| 文件 | 内容 | 数据来源 | 记录数 | 缺口降级 |
|---|---|---|---|---|
| [data/candidate.js](data/candidate.js) | 考生档案（分数/位次/选科/MBTI/户籍/诉求） | 个人档案.md 第一节 | 1 名考生 | 无缺口 |
| [data/score_rank_anchors.js](data/score_rank_anchors.js) | 重庆物理类一分一段表 | 重庆市教育考试院 2025 真实锚点 | 2025 完整（34 锚点）+ 2020-2024 待补录 | 2020-2024 待补录，降级为线性插值 |
| [data/schools.js](data/schools.js) | 院校专业录取主表 | 阳光高考 / 掌上高考 / 含光睿晟 / 各校招生网 | 48 条 | 部分专业缺历年位次，大小年判定降级为"数据不足" |
| [data/policies.js](data/policies.js) | 政策红利库 | 重庆考试院 / 彭水县教委 | 预科/国专/地专/加分 4 类 + removed | 已剔除院校清单随政策更新 |
| [data/risk_rules.js](data/risk_rules.js) | 防退档规则库 | 招生章程汇总 | 单科/体检/校区/学费 4 类规则 | 规则覆盖以 2025 章程为准 |
| [data/tier_tags.js](data/tier_tags.js) | 院校层次标签 | 985/211/双一流/省属公开名单 | 全量院校标签 | 无缺口 |
| [data/meta.js](data/meta.js) | 元数据（数据基准日、版本） | — | 1 条 | — |

---

## 使用指南（tools.html 六大分区）

打开 [tools.html](tools.html)，按以下顺序使用。前 1 步为档案输入，后 6 步对应 5 个 skill + 综合仪表盘，结果可叠加。

1. **考生档案输入**
   - 输入：分数 581 / 位次 20161 / 选科物化生 / ESTJ / 彭水少数民族
   - 来源：[data/candidate.js](data/candidate.js)
   - 说明：该档案为所有 skill 的输入基准，修改任一字段会级联刷新下游结果。

2. **位次换算**（Skill 1 · `RankNormalizer`）
   - 输入：高考分数 + 年份 + 科类
   - 输出：当年位次 + 历年等位分对照表
   - 降级：2020-2024 一分一段表待补录，对应年份 `equivalentScore` 返回 `null`（标注"待补录"）；位次→分数在锚点间用线性插值
   - 用途：识别"名义分 vs 真实竞争力"，581 分在 2025 位次 20161，等位分约 576 分。

3. **梯度模型**（Skill 2 · `VolunteerOptimizer`）
   - 输入：考生位次 + 48 条候选院校池
   - 输出：每条志愿的梯度归属（冲/稳/保）+ 录取概率 + 位次差
   - 系数：位次系数 0.85（冲）/ 1.0（稳）/ 1.15（保），可配置
   - 过滤：含大小年波动过滤，振荡型专业自动降权

4. **防退档校验**（Skill 3 · `AdmissionSafety`）
   - 输入：生成的志愿池 + 防退档规则集
   - 输出：每条志愿的 `passed` 标记 + 风险评分 `riskScore` + 风险清单 `issues[]` + `canUseAsSafe`
   - 校验项：单科线 / 体检限制 / 校区方向 / 学费上限 / 已剔除院校
   - 拦截：南农、东北林、川农预科等 removed 清单内院校误填会直接标红

5. **大小年识别**（Skill A · `VolatilityDetector`）
   - 输入：某专业 3 年位次序列
   - 输出：标准差 `std` + 变异系数 `cv` + 波动等级 `level`（low/mid/high/insufficient）+ 趋势 `trend`
   - 用途：避免高位次追涨"大年"专业，识别"小年"抄底机会
   - 降级：不足 3 年数据时返回 `level:'insufficient'`

6. **同层次套利**（Skill B · `ArbitrageDetector`）
   - 输入：院校池 + 分桶配置（按层次/区位）
   - 输出：套利对列表 `[{ pair:[A,B], rankCost, locationPremium, score, note }]`
   - 策略：位次差换区位，分桶两指针匹配"同层次但区位更好"的机会
   - 用途：如用内地 211 位次换沿海双非强校，提升就业区位优势

7. **综合仪表盘**
   - 汇总上述结果，输出可导出的 96 志愿候选池 + 风险报告
   - 按冲/稳/保三层着色，每条志愿附概率、风险标记、大小年标记

> 重庆"专业+学校"模式（非院校专业组），1 专业 + 1 学校 = 1 志愿，无校内调剂，不想去的专业绝对不要填。

---

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 页面 | 原生 HTML + CSS | 无框架，无构建工具，无 npm |
| 交互 | 原生 JavaScript | ES5 兼容，挂载到 `window.GK` 命名空间 |
| 图表 | ECharts（本地 [_shared/js/echarts.min.js](_shared/js/echarts.min.js)） | 国考招录 / ESTJ 匹配度 / 96 志愿分配 |
| 流程图 | Mermaid（本地 [_shared/js/mermaid.min.js](_shared/js/mermaid.min.js)） | 决策流程可视化 |
| 字体 | Outfit（本地 [_shared/fonts/](_shared/fonts/)） | 数字字体，启用 `tnum` 等宽 |
| 数据 | JS 文件字面量 | 通过 `<script>` 注入 `window.GK.Data.*`，无需 fetch 即可被 skill 读取 |

> 命名空间约定：`GK.Data.*` 挂载数据集，`GK.Skills.*` 挂载算法，`GK.Utils.*` 挂载工具函数（见 [skills/_core.js](skills/_core.js)）。

---

## 常见问题（FAQ）

**Q1：为什么双击 index.html 能看，但 tools.html 数据加载失败？**
A：tools.html 通过 `<script src>` 标签注入 `data/*.js`（非 fetch），多数浏览器在 `file://` 协议下可正常加载。但 Chrome 等浏览器默认限制 `file://` 跨目录子资源访问，可能导致数据脚本加载失败。请改用 `python3 -m http.server 8000` 起本地服务（见[快速开始](#快速开始)）。

**Q2：5 个 skill 的 Star 数和仓库链接是真的吗？**
A：Star 数按本项目委托方提供的数字引用（482/328/297/241/189），未编造。仓库链接未在 README 中给出具体 URL，仅作项目名引用，请自行在 GitHub 搜索对应仓库名。

**Q3：2026 年分数线能用吗？**
A：不能直接用。本仓库数据基准为 2025 录实数据，2026 年招生计划与分数线以重庆市教育考试院公布为准。Skill 1 的等位分换算正是为了把"2025 录实"映射到"历年可比口径"，缩小年度偏差。

**Q4：算法结果能保证录取吗？**
A：不能。5 个 skill 的概率模型、波动判定、套利匹配结果仅供参考，录取受招生计划、报考热度、政策调整等多因素影响。本工具箱用于辅助决策与风险自查，不替代官方志愿填报系统。

**Q5：为什么有些专业没有大小年标记？**
A：Skill A 需要至少 3 年位次数据。部分专业在 [data/schools.js](data/schools.js) 中缺历年位次，会返回 `level:'insufficient'`，需补录数据后才能判定。

---

## API 速查

在浏览器 console 中（需先访问 [tools.html](tools.html) 或任意引入了 skill 的页面）可直接调用：

```javascript
// —— Skill 1 位次归一化 + 等位分换算 ——
// 位次 → 分数（bisect 二分 + 线性插值）
GK.Skills.RankNormalizer.rankToScore(2025, 'physics', 20161);
// → 576.199（位次 20161 对应 2025 年约 576 分）
// 分数 → 位次
GK.Skills.RankNormalizer.scoreToRank(2025, 'physics', 581);
// → 18260
// 多年等位分换算
GK.Skills.RankNormalizer.normalize(20161, { candidateYear: 2026, targetYears: [2025, 2024, 2023], category: 'physics' });
// → [{ year:2025, equivalentScore:576.2, equivalentRank:20161, deltaVsCandidate:null }, ...]

// —— Skill 2 冲稳保梯度概率模型 ——
// 单条分档：位次系数 c = schoolRank / candidateRank
GK.Skills.VolunteerOptimizer.classifyTier(20161, 18000, {});
// → { tier:'surge', prob:0.36, marginRank:2161, marginScore:null, note:'冲刺：...' }
// 批量分桶
GK.Skills.VolunteerOptimizer.optimizeBucket(GK.Data.Candidate, GK.Data.Schools, { coef:{rush:0.85,steady:1.0,safe:1.15} });
// → { rush:[...], stable:[...], safe:[...], dropped:[...] }
// 建议配额（呼应 96 志愿 冲15/稳55/保26）
GK.Skills.VolunteerOptimizer.suggestQuota([], { total: 96 });
// → { rush:15, steady:55, safe:26, poolSize:0, warning:null, note:'...' }
// 传非空志愿池且不足 96 条时，warning 会提示需补充多少条至满档

// —— Skill 3 平行志愿防退档校验 ——
// 单条校验
GK.Skills.AdmissionSafety.checkVolunteer({ school:'南京农业大学', policy_tag:'少数民族预科班', subjects_required:[] }, GK.Data.Candidate);
// → { passed:false, risk:'high', riskScore:100, issues:[...], canUseAsSafe:false }
// 资格审查（预科/专项/加分）
GK.Skills.AdmissionSafety.checkEligibility(GK.Data.Candidate, 'precollege');
// → { eligible:true, missing:[], note:'彭水聚居地少数民族符合预科班资格' }

// —— Skill A 大小年波动识别 ——
// rankSeries: 某专业历年位次序列 [{year,rank}, ...]
GK.Skills.VolatilityDetector.volatility([{ year:2023, rank:18000 }, { year:2024, rank:22000 }, { year:2025, rank:20000 }]);
// → { years:3, mean:20000, std:2000, cv:0.1, level:'high', trend:'up', note:'...' }
// 不足 3 年降级
GK.Skills.VolatilityDetector.volatility([{ year:2025, rank:20000 }]);
// → { years:1, mean:20000, std:0, cv:0, level:'insufficient', trend:'unknown', note:'数据不足...' }
// 大小年识别（三判据：cv>0.15 && currentRank>lastRank*1.2 && oscillation>=2）
GK.Skills.VolatilityDetector.detectBigSmallYear(rankSeries, currentRank);
// → { isBigSmallYear:true|false, pattern, lastYear, predictNext, confidence, note }

// —— Skill B 同层次院校套利 ——
// 单项套利分
GK.Skills.ArbitrageDetector.scoreArbitrage({ school:'A校', rank_2025:18000 }, 20161);
// → { score:0.1072, reasons:['院校位次比考生靠前 2161 名，属"冲"类套利空间'] }
// 套利对检测（位次窗 + 同方向 + 跨省 + 一冲一保）
GK.Skills.ArbitrageDetector.findArbitragePairs(20161, { province:'重庆' }, GK.Data.Schools, { rankWindow:2000, pairDelta:1000, minScore:0.05 });
// → [{ pair:[A,B], rankCost, locationPremium, score, note }, ...]
```

工具函数（[skills/_core.js](skills/_core.js)）同样挂在 `GK.Utils` 下，可独立调用：

```javascript
GK.Utils.bisectLeft([[10000,590],[20000,580],[30000,570]], 20161);  // → 2  二分查找（2D pairs）
GK.Utils.clamp(150, 0, 100);           // → 100  钳制到 [0,100]
GK.Utils.lerp(577, 576, 0.8);          // → 576.2  线性插值
GK.Utils.mean([2,4,4,4,5,5,7,9]);      // → 5
GK.Utils.median([2,4,4,4,5,5,7,9]);    // → 4.5
GK.Utils.std([2,4,4,4,5,5,7,9], 1);    // → 2.138  样本标准差（n-1）
```

---

## 数据来源与致谢

### 官方与权威数据（来自个人档案.md 第十三节）

- **重庆市教育考试院**（cqksy.cn / cqzk.com.cn）—— 一分一段表、招生实施办法、专项资格审核
- **教育部阳光高考**（gaokao.cn）—— 院校专业分数线、招生章程
- **含光睿晟**（hzgrys.net）—— 重庆 2025 在渝录取分数明细
- **掌上高考**（gk100.com）—— 预科班分数线、专项计划录取数据
- **长沙理工大学招生网**（csust.edu.cn）—— 2025 普通类专业录取信息
- **麦可思**—— 就业率与绿牌专业报告
- **国家电网招聘平台**（sgcc.com.cn）—— 电网校招公告与薪资结构
- 另含东北电力大学、上海电力大学、三峡大学、广西大学、四川农业大学等各校招生网原始数据

### 开源项目致谢

5 个 skill 的核心算法逻辑参考以下 GitHub 开源项目（按用户提供 Star 数引用）：

| 项目 | Star | 贡献 |
|---|---|---|
| gaokao-rank-normalizer | ⭐482 | Skill 1 位次归一化 bisect 核心 |
| volunteer-optimizer | ⭐328 | Skill 2 冲稳保梯度概率模型 |
| admission-safety-check | ⭐297 | Skill 3 平行志愿防退档引擎 |
| gaokao-volatility-detector | ⭐241 | Skill A 大小年波动识别 |
| college-rank-arbitrage | ⭐189 | Skill B 同层次院校套利 |

数据集与知识库另参考 china-gaokao-dataset ⭐891、awesome-china-college ⭐1.1k。

---

## 免责声明

- **数据时效**：本仓库院校分数线、位次、政策数据均为 **2025 年录实数据**，2026 年招生计划与分数线以**重庆市教育考试院公布为准**。
- **算法性质**：5 个 skill 的概率模型、波动判定、套利匹配结果**仅供参考**，不构成志愿填报承诺。录取受招生计划、报考热度、政策调整等多因素影响，存在不可预测性。
- **不替代官方系统**：本工具箱用于辅助决策与风险自查，**不能替代**重庆市普通高校招生志愿填报官方系统。最终志愿必须通过官方系统提交确认。
- **已剔除院校**：南京农业大学、东北林业大学、四川农业大学预科班经核实未在渝 2025 招生（系他省数据误传），已计入 [data/policies.js](data/policies.js) 的 removed 清单，Skill 3 会拦截误填。

---

## License

本项目采用 **MIT License**，沿用上述 5 个 GitHub 开源项目的开源协议。可自由复制、修改、分发，但需保留原作者署名与许可证声明。

数据部分（一分一段表、分数线）版权归各官方数据来源所有，本仓库仅作整理与引用。

---

## 更新日志

### v1.0 —— 初始版（2026-06-27）

- 新增门户首页 [index.html](index.html) 与深度专栏 [column.html](column.html)
- 新增核心数据源 [高考志愿填报个人档案.md](高考志愿填报个人档案.md)（v2.0 专家评审版）
- 安装 5 个 skill：[skill-1](skills/skill-1-rank-normalizer.js)、[skill-2](skills/skill-2-volunteer-optimizer.js)、[skill-3](skills/skill-3-admission-safety.js)、[skill-A](skills/skill-A-volatility-detector.js)、[skill-B](skills/skill-B-arbitrage.js) + 核心底座 [_core.js](skills/_core.js)
- 安装 7 个数据文件：[candidate](data/candidate.js)、[score_rank_anchors](data/score_rank_anchors.js)、[schools](data/schools.js)、[policies](data/policies.js)、[risk_rules](data/risk_rules.js)、[tier_tags](data/tier_tags.js)、[meta](data/meta.js)
- 新增工具页 [tools.html](tools.html)，提供 5 skill 交互入口与综合仪表盘
- 更正原档案 3 处重大错误（南农/东北林/川农预科未在渝招生），计入 removed 清单

### 后续计划

- 补录 2020-2024 重庆物理类一分一段表完整数据，替换 Skill 1 的插值降级段
- 扩充 [data/schools.js](data/schools.js) 历年位次列，提升 Skill A 大小年判定覆盖率
- 引入更多省份一分一段表，支持跨省等位分换算
- tools.html 综合仪表盘增加 96 志愿导出（CSV / 打印）功能
