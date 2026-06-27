// data/candidate.js — 考生档案 → GK.Data.Candidate
// 数据来源：/workspace/高考志愿填报个人档案.md 第一节（考生基本信息）
// 纯 ES5 IIFE，挂载到 window.GK.Data.Candidate
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  GK.Data.Candidate = {
    name: '佚名',
    year: 2026,
    category: 'physics',            // 物理类
    score: 581,                     // 高考分数
    rank: 20161,                    // 全省位次（精确）
    specialControlLine: 496,        // 物理类特控线（超 85 分）
    subjects: ['physics', 'chemistry', 'biology'],  // 物化生
    noPolitics: true,               // 未选政治（限公安/法学部分方向）
    mbti: 'ESTJ',
    ethnicity: 'minority',          // 少数民族（苗族/土家族）
    minorityBonus: 10,              // 少数民族加分 +10（column.html 红利四）
    hukou: { region: 'pengshui', type: 'unknown' },  // 彭水苗族土家族自治县，户籍性质待核实
    pengshui6yr: 'unknown',         // 是否彭水 6 年连续学籍+6 年户籍（国家专项前置，待核实）
    physical: 'unknown',            // 体检待确认（色盲色弱/视力）
    politicalStatus: 'unknown',     // 政治面貌待确认（影响选调生）
    economicLimit: false,           // 家庭经济无限制（中外合作可考虑但需评估）
    goals: ['不考研', '体制内', '国企央企', '南方优先', '尽量211'],
    mainLines: ['computer_network', 'accounting', 'electrical', 'precollege']
  };
})();
