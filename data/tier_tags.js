// data/tier_tags.js — 院校层次标签 → GK.Data.TierTags
// 数据来源：/workspace/高考志愿填报个人档案.md 第二/七节
//   “原电力部直属”依据 .md 第三节“581分能稳录：…原电力部直属院校能动/新能源…”（line 162）
//   “兵工七子”依据 .md 第二节2.4 重庆理工大学备注（line 104）
//   “网络工程全国第1”依据 .md 第七节7.1 成都信息工程大学（line 342/581）
//   中国药科大学为 column.html 核实新增预科院校（211/双一流）
// 纯 ES5 IIFE，挂载到 window.GK.Data.TierTags
// 字段：{school, tags[], ownership, feature, source_section}
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  GK.Data.TierTags = [
    {
      school: '华中农业大学', tags: ['211', '双一流', '公办', '农林'],
      ownership: '公办', feature: '农林特色，预科后分流农学/园艺/生物',
      source_section: '7.2'
    },
    {
      school: '合肥工业大学', tags: ['211', '双一流'],
      ownership: '公办', feature: '国家专项可报（彭水6年学籍+户籍），预科核实新增',
      source_section: '2.3'
    },
    {
      school: '中国药科大学', tags: ['211', '双一流'],
      ownership: '公办', feature: '药学特色，预科核实新增',
      source_section: '7.2'
    },
    {
      school: '上海电力大学', tags: ['公办', '原电力部直属'],
      ownership: '公办', feature: '预科可分流电气工程（原需617）/计算机',
      source_section: '7.2'
    },
    {
      school: '福建农林大学', tags: ['公办', '农林'],
      ownership: '公办', feature: '预科兜底',
      source_section: '7.2'
    },
    {
      school: '成都信息工程大学', tags: ['公办'],
      ownership: '公办', feature: '网络工程省级一流，全国第1',
      source_section: '7.1'
    },
    {
      school: '东北电力大学', tags: ['公办', '原电力部直属'],
      ownership: '公办', feature: '电气/能动核心，进电网概率高',
      source_section: '7.4'
    },
    {
      school: '重庆理工大学', tags: ['市属', '兵工七子'],
      ownership: '市属', feature: '兵工七子，国家专项可走（彭水户籍）',
      source_section: '2.4'
    },
    {
      school: '重庆邮电大学', tags: ['市属'],
      ownership: '市属', feature: '市属热门，性价比极高（地方专项548）',
      source_section: '2.4'
    },
    {
      school: '重庆师范大学', tags: ['市属'],
      ownership: '市属', feature: '师范方向，计算机保底',
      source_section: '2.4'
    },
    {
      school: '四川农业大学', tags: ['211'],
      ownership: '公办', feature: '财会/审计多校区（都江堰/成都）',
      source_section: '7.3'
    },
    {
      school: '成都理工大学', tags: ['双一流'],
      ownership: '公办', feature: '会计学（校本部）偏冲',
      source_section: '7.3'
    },
    {
      school: '西南大学', tags: ['211', '双一流'],
      ownership: '公办', feature: '工商管理类含会计学，临界冲',
      source_section: '7.3'
    },
    {
      school: '贵州大学', tags: ['211'],
      ownership: '公办', feature: '财政学类，211冷门专业',
      source_section: '7.3'
    },
    {
      school: '西南石油大学', tags: ['双一流'],
      ownership: '公办', feature: '会计学，双一流',
      source_section: '7.3'
    },
    {
      school: '广西大学', tags: ['211'],
      ownership: '公办', feature: '会计学，211',
      source_section: '7.3'
    },
    {
      school: '四川师范大学', tags: ['省属'],
      ownership: '省属', feature: '审计学/会计学(ACCA)',
      source_section: '7.3'
    },
    {
      school: '长沙理工大学', tags: ['省属'],
      ownership: '省属', feature: '电气/财会多专业，进电网概率高',
      source_section: '7.4'
    },
    {
      school: '西南政法大学', tags: ['市属'],
      ownership: '市属', feature: '工商管理类保底',
      source_section: '7.3'
    },
    {
      school: '重庆工商大学', tags: ['市属'],
      ownership: '市属', feature: '财经方向，会计/审计/财管保底',
      source_section: '7.3'
    },
    {
      school: '重庆科技大学', tags: ['市属'],
      ownership: '市属', feature: '会计学兜底（地方专项519）',
      source_section: '2.4'
    },
    {
      school: '重庆三峡学院', tags: ['市属'],
      ownership: '市属', feature: '会计学保底',
      source_section: '7.3'
    },
    {
      school: '长江师范学院', tags: ['市属'],
      ownership: '市属', feature: '公费师范定向彭水（599，差18分放弃）；财管保底',
      source_section: '2.5'
    },
    {
      school: '重庆文理学院', tags: ['市属'],
      ownership: '市属', feature: '财务管理保底',
      source_section: '7.3'
    },
    {
      school: '三峡大学', tags: ['公办'],
      ownership: '公办', feature: '新能源材料与器件，电网相关',
      source_section: '7.4'
    }
  ];

  GK.Data.TierTags._meta = {
    source: '/workspace/高考志愿填报个人档案.md 第二/七节',
    total: GK.Data.TierTags.length,
    ownership_legend: { '公办': '公办', '市属': '重庆市属', '省属': '省属' }
  };
})();
