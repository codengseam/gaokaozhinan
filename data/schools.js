// data/schools.js — 院校专业录取主表 → GK.Data.Schools
// 数据来源：/workspace/高考志愿填报个人档案.md 第七节（院校推荐清单）
//   预科条目以 column.html（天团评审版）核实为准：合工大预科(物化575/物不限561)、中国药科预科(574)
//   为核实新增；南农/东林/川农/贵大/广大预科核实不在渝招预科，已移入 Policies.removed（不在此表）。
// 纯 ES5 IIFE，挂载到 window.GK.Data.Schools
// 字段：{id,school,major,direction,tier,batch,policy_tag,score_2025,rank_2025,
//        history_ranks,judgment_581,layer,employment,grid_probability,campus,tuition_note,source_section}
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  function hr(rank2025) {
    return { 2025: rank2025, 2024: null, 2023: null };
  }

  GK.Data.Schools = [
    // ========== 7.1 计算机方向 ==========
    {
      id: 'S-001', school: '成都信息工程大学', major: '网络工程（省级一流）',
      direction: 'computer', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 573, rank_2025: 21426, history_ranks: hr(21426),
      judgment_581: '稳录', layer: '稳妥',
      employment: '电网信通/运营商/网安', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-002', school: '东北电力大学', major: '计算机科学与技术',
      direction: 'computer', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 580, rank_2025: 18678, history_ranks: hr(18678),
      judgment_581: '稳录', layer: '稳妥',
      employment: '电网信通/央企', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-003', school: '成都信息工程大学', major: '网络空间安全',
      direction: 'computer', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 572, rank_2025: 21842, history_ranks: hr(21842),
      judgment_581: '稳录', layer: '稳妥',
      employment: '网安/公安/等保', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-004', school: '成都信息工程大学', major: '数据科学与大数据',
      direction: 'computer', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 572, rank_2025: 21842, history_ranks: hr(21842),
      judgment_581: '稳录', layer: '稳妥',
      employment: '数据/银行', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-005', school: '成都信息工程大学', major: '密码科学与技术',
      direction: 'computer', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 570, rank_2025: 22723, history_ranks: hr(22723),
      judgment_581: '稳录', layer: '稳妥',
      employment: '保密系统/网安', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-006', school: '重庆理工大学', major: '计算机科学与技术（国家专项）',
      direction: 'computer', tier: ['市属'], batch: '提前批B段', policy_tag: '国家专项',
      score_2025: 571, rank_2025: 22294, history_ranks: hr(22294),
      judgment_581: '稳录', layer: '稳妥',
      employment: '兵工央企/电网/银行（彭水户籍可走专项）', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-007', school: '重庆邮电大学', major: '通信工程',
      direction: 'computer', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 571, rank_2025: 22294, history_ranks: hr(22294),
      judgment_581: '稳录', layer: '稳妥',
      employment: '运营商/电网信通', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-008', school: '重庆理工大学', major: '计算机科学与技术',
      direction: 'computer', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 567, rank_2025: 24004, history_ranks: hr(24004),
      judgment_581: '稳录', layer: '稳妥',
      employment: '兵工/电网/银行', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-009', school: '重庆理工大学', major: '软件工程',
      direction: 'computer', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 566, rank_2025: 24396, history_ranks: hr(24396),
      judgment_581: '稳录', layer: '稳妥',
      employment: '软开/银行科技', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-010', school: '重庆理工大学', major: '网络空间安全',
      direction: 'computer', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 554, rank_2025: 30286, history_ranks: hr(30286),
      judgment_581: '稳录', layer: '稳妥',
      employment: '网安/公安/电网', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },
    {
      id: 'S-011', school: '重庆师范大学', major: '计算机科学与技术',
      direction: 'computer', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 549, rank_2025: 31500, history_ranks: hr(31500),
      judgment_581: '保底', layer: '保底',
      employment: '教育/考公', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.1'
    },

    // ========== 7.2 少数民族预科班（column.html 核实后的真实数据） ==========
    {
      id: 'S-012', school: '合肥工业大学', major: '少数民族预科班（物+化）',
      direction: 'preparatory', tier: ['211', '双一流'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 575, rank_2025: 20633, history_ranks: hr(20633),
      judgment_581: '冲', layer: '冲刺',
      employment: '预科后分流热门专业（核实新增）', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.2'
    },
    {
      id: 'S-013', school: '中国药科大学', major: '少数民族预科班',
      direction: 'preparatory', tier: ['211', '双一流'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 574, rank_2025: 21006, history_ranks: hr(21006),
      judgment_581: '冲', layer: '冲刺',
      employment: '预科后分流（核实新增）', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.2'
    },
    {
      id: 'S-014', school: '华中农业大学', major: '少数民族预科班',
      direction: 'preparatory', tier: ['211', '双一流'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 570, rank_2025: 22723, history_ranks: hr(22723),
      judgment_581: '稳录', layer: '稳妥',
      employment: '预科后分流农学/园艺/生物', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.2'
    },
    {
      id: 'S-015', school: '上海电力大学', major: '少数民族预科班',
      direction: 'preparatory', tier: ['公办'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 561, rank_2025: 26800, history_ranks: hr(26800),
      judgment_581: '稳录', layer: '稳妥',
      employment: '预科后可分流电气工程（原需617）/计算机', grid_probability: null,
      campus: '上海浦东', tuition_note: null, source_section: '7.2'
    },
    {
      id: 'S-016', school: '合肥工业大学', major: '少数民族预科班（物+不限）',
      direction: 'preparatory', tier: ['211', '双一流'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 561, rank_2025: 26800, history_ranks: hr(26800),
      judgment_581: '稳录', layer: '稳妥',
      employment: '预科后分流热门专业（核实新增）', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.2'
    },
    {
      id: 'S-017', school: '福建农林大学', major: '少数民族预科班',
      direction: 'preparatory', tier: ['公办'], batch: '本科批', policy_tag: '少数民族预科班',
      score_2025: 507, rank_2025: 57604, history_ranks: hr(57604),
      judgment_581: '保底', layer: '保底',
      employment: '预科兜底', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.2'
    },

    // ========== 7.3 财会审计方向 ==========
    {
      id: 'S-018', school: '四川农业大学', major: '审计学（都江堰）',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 587, rank_2025: 16058, history_ranks: hr(16058),
      judgment_581: '冲', layer: '冲刺',
      employment: '考公/国企财务', grid_probability: null,
      campus: '都江堰', tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-019', school: '成都理工大学', major: '会计学（校本部）',
      direction: 'finance', tier: ['双一流'], batch: '本科批', policy_tag: null,
      score_2025: 585, rank_2025: 16764, history_ranks: hr(16764),
      judgment_581: '冲', layer: '冲刺',
      employment: '考公/国企财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-020', school: '西南大学', major: '工商管理类（含会计学）',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 581, rank_2025: 18260, history_ranks: hr(18260),
      judgment_581: '冲', layer: '冲刺',
      employment: '考公/国企财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-021', school: '四川农业大学', major: '会计学（都江堰）',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 580, rank_2025: 18678, history_ranks: hr(18678),
      judgment_581: '稳录', layer: '稳妥',
      employment: '考公/国企财务', grid_probability: null,
      campus: '都江堰', tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-022', school: '贵州大学', major: '财政学类',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 577, rank_2025: 19815, history_ranks: hr(19815),
      judgment_581: '稳录', layer: '稳妥',
      employment: '税务局/财政局', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-023', school: '四川农业大学', major: '财务管理（成都）',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 575, rank_2025: 20633, history_ranks: hr(20633),
      judgment_581: '稳录', layer: '稳妥',
      employment: '国企财务岗', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-024', school: '西南石油大学', major: '会计学',
      direction: 'finance', tier: ['双一流'], batch: '本科批', policy_tag: null,
      score_2025: 573, rank_2025: 21426, history_ranks: hr(21426),
      judgment_581: '稳录', layer: '稳妥',
      employment: '考公/国企财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-025', school: '广西大学', major: '会计学',
      direction: 'finance', tier: ['211', '双一流'], batch: '本科批', policy_tag: null,
      score_2025: 572, rank_2025: 21842, history_ranks: hr(21842),
      judgment_581: '稳录', layer: '稳妥',
      employment: '考公/国企财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-026', school: '四川师范大学', major: '审计学',
      direction: 'finance', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 567, rank_2025: 24004, history_ranks: hr(24004),
      judgment_581: '稳录', layer: '稳妥',
      employment: '审计署/国企内审', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-027', school: '四川师范大学', major: '会计学（ACCA）',
      direction: 'finance', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 564, rank_2025: 25339, history_ranks: hr(25339),
      judgment_581: '稳录', layer: '稳妥',
      employment: '考公/事务所', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-028', school: '长沙理工大学', major: '财务管理',
      direction: 'finance', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 564, rank_2025: 25339, history_ranks: hr(25339),
      judgment_581: '稳录', layer: '稳妥',
      employment: '国企财务岗', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-029', school: '西南政法大学', major: '工商管理类',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 552, rank_2025: 29255, history_ranks: hr(29255),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-030', school: '重庆理工大学', major: '会计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 547, rank_2025: 33846, history_ranks: hr(33846),
      judgment_581: '保底', layer: '保底',
      employment: '考公/国企财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-031', school: '重庆理工大学', major: '审计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 545, rank_2025: 34938, history_ranks: hr(34938),
      judgment_581: '保底', layer: '保底',
      employment: '审计署/国企内审', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-032', school: '重庆工商大学', major: '会计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 544, rank_2025: 35519, history_ranks: hr(35519),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-033', school: '重庆工商大学', major: '审计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 543, rank_2025: 36058, history_ranks: hr(36058),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业内审', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-034', school: '重庆工商大学', major: '财务管理',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 538, rank_2025: 38835, history_ranks: hr(38835),
      judgment_581: '保底', layer: '保底',
      employment: '国企财务岗', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-035', school: '重庆科技大学', major: '会计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 533, rank_2025: 41740, history_ranks: hr(41740),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-036', school: '重庆三峡学院', major: '会计学',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 515, rank_2025: 52572, history_ranks: hr(52572),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-037', school: '长江师范学院', major: '财务管理',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 506, rank_2025: 58277, history_ranks: hr(58277),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },
    {
      id: 'S-038', school: '重庆文理学院', major: '财务管理',
      direction: 'finance', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 505, rank_2025: 58929, history_ranks: hr(58929),
      judgment_581: '保底', layer: '保底',
      employment: '考公/企业财务', grid_probability: null,
      campus: null, tuition_note: null, source_section: '7.3'
    },

    // ========== 7.4 电气工程方向 ==========
    {
      id: 'S-039', school: '东北电力大学', major: '电气工程（中外合作）',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 589, rank_2025: 15346, history_ranks: hr(15346),
      judgment_581: '差8分', layer: '冲刺',
      employment: '国家电网/南方电网', grid_probability: '⭐⭐⭐⭐⭐',
      campus: null, tuition_note: '中外合作5-8万/年', source_section: '7.4'
    },
    {
      id: 'S-040', school: '长沙理工大学', major: '能源与动力工程',
      direction: 'electrical', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 589, rank_2025: 15346, history_ranks: hr(15346),
      judgment_581: '冲', layer: '冲刺',
      employment: '五大发电集团/电网', grid_probability: '⭐⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-041', school: '东北电力大学', major: '能源与动力工程',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 581, rank_2025: 18260, history_ranks: hr(18260),
      judgment_581: '踩线', layer: '稳妥',
      employment: '五大发电集团/电网', grid_probability: '⭐⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-042', school: '长沙理工大学', major: '新能源科学与工程',
      direction: 'electrical', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 581, rank_2025: 18260, history_ranks: hr(18260),
      judgment_581: '踩线', layer: '稳妥',
      employment: '电网新能源板块/发电集团', grid_probability: '⭐⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-043', school: '长沙理工大学', major: '储能科学与工程',
      direction: 'electrical', tier: ['省属'], batch: '本科批', policy_tag: null,
      score_2025: 580, rank_2025: 18678, history_ranks: hr(18678),
      judgment_581: '稳录', layer: '稳妥',
      employment: '电网/储能央企', grid_probability: '⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-044', school: '东北电力大学', major: '自动化',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 578, rank_2025: 19441, history_ranks: hr(19441),
      judgment_581: '稳录', layer: '稳妥',
      employment: '电网调度自动化/军工', grid_probability: '⭐⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-045', school: '东北电力大学', major: '核工程与核技术',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 576, rank_2025: 20247, history_ranks: hr(20247),
      judgment_581: '稳录', layer: '稳妥',
      employment: '中核/中广核', grid_probability: '⭐⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-046', school: '三峡大学', major: '新能源材料与器件',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 576, rank_2025: 20247, history_ranks: hr(20247),
      judgment_581: '稳录', layer: '稳妥',
      employment: '电网/新能源制造', grid_probability: '⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-047', school: '东北电力大学', major: '储能科学与工程',
      direction: 'electrical', tier: ['公办'], batch: '本科批', policy_tag: null,
      score_2025: 566, rank_2025: 24396, history_ranks: hr(24396),
      judgment_581: '稳录', layer: '保底',
      employment: '电网/储能央企', grid_probability: '⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    },
    {
      id: 'S-048', school: '重庆理工大学', major: '电气工程及其自动化',
      direction: 'electrical', tier: ['市属'], batch: '本科批', policy_tag: null,
      score_2025: 566, rank_2025: 24396, history_ranks: hr(24396),
      judgment_581: '保底', layer: '保底',
      employment: '本地电网兜底', grid_probability: '⭐⭐⭐',
      campus: null, tuition_note: null, source_section: '7.4'
    }
  ];

  GK.Data.Schools._meta = {
    source: '/workspace/高考志愿填报个人档案.md 第七节',
    correction: '预科条目以 column.html 核实为准（合工大/中国药科为核实新增；南农/东林/川农/贵大/广大预科已剔除）',
    total: GK.Data.Schools.length,
    direction_legend: { computer: '计算机', finance: '财会', electrical: '电气', preparatory: '预科', special: '专项' }
  };
})();
