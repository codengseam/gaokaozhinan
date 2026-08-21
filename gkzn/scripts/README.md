# scripts/ — 管理员数据爬取工具（一次性）

> ⚠️ **本目录仅供管理员使用，不对终端用户暴露。** 这是一次性数据采集工具，用于从官网爬取高考志愿数据并落盘为 `GK.Data.*` 格式的 JS 文件，供前端 `data/` 目录加载。脚本本身不参与线上运行时。

## 一、定位

- **一次性工具**：仅在数据需要更新时由管理员手动运行，不部署到生产环境。
- **零依赖**：仅使用 Node.js 内置模块（`http` / `https` / `url` / `zlib` / `fs` / `path`），无需 `npm install`。
- **保守模式**：所有请求严格限速，避免对官网造成压力或被识别为爬虫。

## 二、使用方法

```bash
cd scripts
node run_all.js          # 依次运行全部爬取任务
# 或单独运行某一任务：
node crawl_rank_table.js # 一分一段表
node crawl_schools.js    # 院校专业录取数据
node crawl_policies.js   # 政策红利库
node crawl_tier_tags.js  # 院校层次标签
```

也可通过 npm 脚本调用：

```bash
cd scripts
node -e "require('child_process').execSync('node run_all.js', {stdio:'inherit'})"
# 等价于 npm 风格：
#   npm run crawl:all
#   npm run crawl:rank
#   npm run crawl:schools
#   npm run crawl:policies
#   npm run crawl:tags
```

> 要求 Node.js >= 14（见 `package.json` 的 `engines`）。无需安装任何依赖，进入目录后直接 `node xxx.js` 即可。

## 三、数据源列表

| 标识 | URL | 说明 |
| --- | --- | --- |
| `cqksy` | https://www.cqksy.cn | 重庆考试院（一分一段表、政策、批次线） |
| `gaokao` | https://gaokao.cn | 阳光高考（院校库、专业库、招生计划） |
| `hzgrys` | https://www.hzgrys.net | 含光睿晟（第三方院校层次/标签补充） |
| `schools` | individual | 各校招生网（动态列表，逐校抓取） |

常量定义于 `_shared.js` 的 `DATA_SOURCES`，所有爬取脚本统一引用。

## 四、保守模式频率说明

本工具遵循**保守爬取**原则，核心由 `_shared.js` 的 `withRateLimit` 限速器实现：

- **基础间隔**：`intervalMs` 默认 3000ms。
- **随机抖动**：叠加 0~2000ms 随机抖动（即 ±1000 幅度），实际请求间隔落在 **3~5 秒**区间。
- **串行化**：所有请求顺序执行，绝不并发。
- **间隔计时**：从"上一次请求完成"到"下一次请求开始"计时，确保两次请求之间至少有 3~5 秒空隙。
- **超时**：单请求 15 秒超时，超时即失败。
- **重试**：网络错误或 5xx 自动重试 3 次，指数退避（1s / 2s / 4s + 抖动）；4xx 客户端错误不重试。
- **浏览器伪装**：所有请求统一携带桌面 Chrome 的 `User-Agent`、`Accept-Encoding: gzip, deflate, br` 等头，并自动解压响应。

> 典型用法：`var safeFetch = withRateLimit(function(u){ return fetchWithRetry(u); });`
> 之后所有抓取均通过 `safeFetch(url)` 发起，自动遵守 3~5 秒保守间隔。

## 五、输出文件说明

爬取结果落盘到项目根目录的 `data/` 下，文件格式与现有数据文件一致：

- **格式**：纯 ES5 IIFE，挂载到 `window.GK.Data.<数据名>`，可在浏览器端直接 `<script>` 加载。
- **文件头注释**：包含数据来源、爬取时间（本地 + UTC）、置信度说明、生成器标识。
- **`_meta` 字段**：每个数据对象自动注入元数据，记录来源与置信度。

各任务对应输出：

| 任务脚本 | 输出文件 | 挂载点 |
| --- | --- | --- |
| `crawl_rank_table.js` | `data/score_rank_anchors.js` | `GK.Data.ScoreRankTable` |
| `crawl_schools.js` | `data/schools.js` | `GK.Data.Schools` |
| `crawl_policies.js` | `data/policies.js` | `GK.Data.Policies` |
| `crawl_tier_tags.js` | `data/tier_tags.js` | `GK.Data.TierTags` |

文件由 `_shared.js` 的 `writeDataFile(filepath, namespace, dataName, data, comment)` 统一生成，签名示例：

```js
writeDataFile(
  '/workspace/data/score_rank_anchors.js',
  'GK.Data',
  'ScoreRankTable',
  { physics: { 2025: [...] }, /* ... */ },
  '重庆考试院 https://www.cqksy.cn 一分一段表（物理类）'
);
```

### 数据流向

`scripts/` 只做"取数 → 落盘"，单向写入 `data/`，不参与前端运行时；前端 `tools.html` 通过 `<script src>` 只读加载 `data/*.js`：

```
┌─────────────────┐   保守爬取    ┌──────────────────────────┐
│  官方网站数据源  │ ───────────▶ │  scripts/ 爬虫脚本        │
│  · cqksy.cn     │  3-5s/请求   │  run_all.js（入口）       │
│  · gaokao.cn    │              │  crawl_*.js（各任务）     │
│  · hzgrys.net   │              │  _shared.js（限速/重试）  │
│  · 各校招生网    │              └─────────────┬────────────┘
└─────────────────┘                            │ writeDataFile()
                                               ▼
                              ┌──────────────────────────────┐
                              │  data/*.js（window.GK.Data.*）│
                              │  · score_rank_anchors.js      │
                              │  · schools.js                 │
                              │  · policies.js                │
                              │  · tier_tags.js               │
                              └──────────────┬───────────────┘
                                             │ <script src> 注入
                                             ▼
                              ┌──────────────────────────────┐
                              │  tools.html + skills/*.js     │
                              │  前端读取 GK.Data.* 跑 5 skill │
                              └──────────────────────────────┘
```

> 只读方向：`scripts/` → `data/` → 前端。前端不回写 `data/`，`scripts/` 不参与线上运行时。

## 六、置信度规则

数据置信度通过 `_meta.source` 与 `_meta.confidence` 标记。本项目遵循"官网爬取优先、AI 生成不可接受"原则，四档全貌如下（本目录脚本仅产生「高/极高」档，其余档位由前端 skills 与用户交互产生，列出以供对照）：

| 置信度 | 数据来源 | 本目录是否产生 | 说明 |
| --- | --- | --- | --- |
| **极高** | 规则引擎硬匹配 / 用户交互输入的档案信息 | 部分（官网原始页面直采、无字段推导时） | Skill 3 removed 清单拦截；用户在 tools.html 填写的分数/位次/选科等 |
| **高** | 官网爬取的录实数据 + 数学插值 | 是（主要产出） | 脚本从官网直采，锚点间用线性插值补全 |
| **中** | 概率模型估算 | 否（前端 Skill 2/B 产生） | Skill 2 logistic 概率、Skill B 套利评分 |
| **低** | 数据不足降级 | 否（前端降级产生） | 待补录年份、`level:'insufficient'`、体检 unknown |
| **不可接受** | AI 生成 | 否（**本项目一律拒绝**） | 所有录取数据必须可溯源至官网，缺失字段宁可降级也不由 AI 补全 |

落盘与标记约定：

- 凡经 `writeDataFile` 落盘的数据，`_meta.source` 统一标记为 `official_crawl`，`_meta.confidence` 标记为 `高`。
- 若某条数据为官网原始页面直采、无任何字段推导，可由脚本显式覆盖为 `极高`。
- 文件头注释中亦会标注"置信度：高 — 脚本从官网爬取（source=official_crawl），原始数据未经人工篡改"。
- `_meta` 还包含 `crawlTime`（ISO 时间戳）、`data_source`（来源说明），便于后续溯源与版本比对。
- **AI 生成数据一律不入库**：爬虫脚本仅做"取数 + 清洗 + 落盘"，不做任何预测性生成；缺失字段宁可标"低"置信度降级，也不由 AI 补全。

## 七、目录结构

```
scripts/
├── _shared.js              # 共享工具模块（HTTP/限速/重试/HTML解析/写文件/日志）
├── package.json            # npm 脚本入口（零依赖）
├── README.md               # 本文档（管理员专用）
├── run_all.js              # 串行运行全部爬取任务（待创建）
├── crawl_rank_table.js     # 一分一段表爬取（待创建）
├── crawl_schools.js        # 院校专业录取数据爬取（待创建）
├── crawl_policies.js       # 政策红利库爬取（待创建）
└── crawl_tier_tags.js      # 院校层次标签爬取（待创建）
```

> 各 `crawl_*.js` 与 `run_all.js` 可按需后续创建，统一通过 `require('./_shared.js')` 复用基础设施。

## 八、注意事项

1. **合规优先**：仅爬取公开页面，遵守 robots.txt 与网站服务条款；遇到反爬即停止并改用人工录入。
2. **不对外暴露**：本目录不打包进前端产物，仅在管理员本地运行。
3. **数据校验**：爬取后应人工抽查关键字段（位次单调性、分数范围等），确认无误后再覆盖 `data/` 中现网文件。
4. **版本留痕**：建议在覆盖前备份旧数据文件，`_meta.crawlTime` 可用于追溯每次更新时间。
5. **一次性使用**：本工具仅在数据需要更新时由管理员手动运行一次，跑完即止——不部署到生产环境、不作为常驻服务、不提供任何对外接口。前端运行时完全不依赖本目录。
6. **非 AI 生成**：本目录产出的是官网原始爬取数据，**非 AI 生成**。缺失字段宁可标"低"置信度降级，也不由 AI 补全；任何 AI 生成的录取数据一律不入库。
