// data/risk_rules.js — 防退档规则库 → GK.Data.RiskRules
// 数据来源：/workspace/高考志愿填报个人档案.md 第八节/第十四节 + column.html 核实
// 纯 ES5 IIFE，挂载到 window.GK.Data.RiskRules
// 字段：{rule_id, category, school, description, risk_level, check_field, action, source_section}
// category: campus|tuition|medical|subject_score|select_subject
// risk_level: high|medium|low
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  GK.Data.RiskRules = [
    {
      rule_id: 'RR-001',
      category: 'campus',
      school: '四川农业大学',
      description: '校区陷阱：审计学(都江堰)587分 vs 财务管理(成都)575分，同校不同校区差12分',
      risk_level: 'medium',
      check_field: 'campus',
      action: '填报川农财会专业须核对校区（都江堰/成都），避免误填高分校区',
      source_section: '7.3'
    },
    {
      rule_id: 'RR-002',
      category: 'tuition',
      school: '东北电力大学',
      description: '中外合作学费陷阱：电气工程(中外合作)589分，学费5-8万/年，4年20-32万，与家庭经济诉求冲突',
      risk_level: 'high',
      check_field: 'tuition_note',
      action: '确认家庭可承担中外合作学费再填报，否则避开',
      source_section: '7.4'
    },
    {
      rule_id: 'RR-003',
      category: 'medical',
      school: '*',
      description: '色盲色弱限医学/化学/美术类专业；体检未确认前慎报',
      risk_level: 'high',
      check_field: 'physical',
      action: '体检确认色觉后再报医学/化学/美术类',
      source_section: '8.4'
    },
    {
      rule_id: 'RR-004',
      category: 'medical',
      school: '重庆警察学院',
      description: '视力≥4.8、身高男≥170cm等体检要求；581分差16-24分，公安院校路线已放弃',
      risk_level: 'low',
      check_field: 'physical',
      action: '公安院校路线已放弃，保留规则备查',
      source_section: '6.4'
    },
    {
      rule_id: 'RR-005',
      category: 'tuition',
      school: '*',
      description: '中外合作办学学费高（年均6-10万），且部分项目学位证标注中外合作，需核实',
      risk_level: 'medium',
      check_field: 'tuition_note',
      action: '核实学费与学位证标注后再填报',
      source_section: '14.1'
    },
    {
      rule_id: 'RR-006',
      category: 'select_subject',
      school: '南京农业大学/东北林业大学/四川农业大学',
      description: '已剔除院校防错填：核实不在渝招预科，原档案误录为预科目标',
      risk_level: 'high',
      check_field: 'policy_tag',
      action: '核实不在渝招预科，禁止填报（贵大/广西大学预科同此）',
      source_section: '7.5'
    },
    {
      rule_id: 'RR-007',
      category: 'subject_score',
      school: '*',
      description: '部分院校对外语/数学单科有要求，.md未列具体单科≥100实例',
      risk_level: 'medium',
      check_field: 'subject_score',
      action: '该院校单科线未录入，请到考试院核验',
      source_section: '8.4'
    }
  ];

  GK.Data.RiskRules._meta = {
    source: '/workspace/高考志愿填报个人档案.md 第八节/第十四节 + column.html核实',
    total: GK.Data.RiskRules.length,
    category_legend: {
      campus: '校区陷阱',
      tuition: '学费/学位证',
      medical: '体检限制',
      subject_score: '单科线',
      select_subject: '选科/填报资格'
    }
  };
})();
