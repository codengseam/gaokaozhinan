// data/policies.js — 政策红利库 → GK.Data.Policies
// 数据来源：/workspace/高考志愿填报个人档案.md 第二节 + column.html（天团评审版）核实
// 纯 ES5 IIFE，挂载到 window.GK.Data.Policies
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  GK.Data.Policies = {
    policies: [
      {
        policy_id: 'POL-001',
        name: '少数民族预科班',
        max_score_drop: 80,
        duration: 5,  // 1年预科 + 4年本科
        hukou: '聚居地3年',
        applicable_schools: ['上海电力大学', '华中农业大学', '合肥工业大学', '中国药科大学', '福建农林大学'],
        source_section: '2.2',
        note: '彭水苗族土家族自治县完全符合；结业后按预科成绩分流，电气/计算机等热门专业需排名靠前'
      },
      {
        policy_id: 'POL-002',
        name: '国家专项计划',
        max_score_drop: 0,
        hukou: '彭水6年户籍',
        xueji: '6年连续学籍',
        applicable_schools: ['合肥工业大学', '中国民用航空飞行学院', '西南民族大学', '宁波大学', '北方民族大学'],
        source_section: '2.3',
        note: '提前批B段录取即锁死；电气/计算机等热门专业不在国家专项投放'
      },
      {
        policy_id: 'POL-003',
        name: '地方专项计划',
        max_score_drop: 0,
        hukou_type: '乡村',
        applicable_schools: ['重庆邮电大学', '重庆医科大学', '重庆师范大学', '重庆理工大学', '重庆科技大学', '重庆交通大学', '重庆工商大学', '四川外国语大学'],
        source_section: '2.4',
        note: '须核实户口本户籍性质为"乡村"；仅限市属高校'
      },
      {
        policy_id: 'POL-004',
        name: '少数民族加分',
        points: 10,
        condition: '聚居地3年户籍学籍',
        stack: '取最高不累加',
        source_section: '2',
        note: '投档分可达591分；加分不得用于强基/保送等不分省计划项目'
      }
    ],
    removed: [
      { school: '南京农业大学', policy: '少数民族预科班', reason: '核实不在渝招预科（2025在渝仅普通类+国家专项，无预科招生计划）', source: 'column.html核实' },
      { school: '东北林业大学', policy: '少数民族预科班', reason: '核实不在渝招预科（预科仅面向11省，不含重庆）', source: 'column.html核实' },
      { school: '四川农业大学', policy: '少数民族预科班', reason: '核实不在渝招预科（主要面向四川本省，2025重庆预科汇总无此校）', source: 'column.html核实' },
      { school: '贵州大学', policy: '少数民族预科班', reason: '核实不在渝招预科', source: 'column.html核实' },
      { school: '广西大学', policy: '少数民族预科班', reason: '核实不在渝招预科', source: 'column.html核实' }
    ]
  };
})();
