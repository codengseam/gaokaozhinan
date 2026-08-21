// data/meta.js — 元数据 → GK.Data.Meta
// 数据来源：/workspace/高考志愿填报个人档案.md（v2.0 专家评审版）+ column.html（天团评审核实）
// 纯 ES5 IIFE，挂载到 window.GK.Data.Meta
(function () {
  var GK = window.GK || (window.GK = {});
  GK.Data = GK.Data || {};

  GK.Data.Meta = {
    version: '1.0',
    base_doc: '/workspace/高考志愿填报个人档案.md',
    base_doc_version: 'v2.0',
    data_year: 2025,
    province: '重庆',
    subject_type: '物理类',
    candidate_score: 581,
    candidate_rank: 20161,
    files: [
      'skills/_core.js',
      'data/candidate.js',
      'data/score_rank_anchors.js',
      'data/schools.js',
      'data/policies.js',
      'data/risk_rules.js',
      'data/tier_tags.js',
      'data/meta.js'
    ],
    skills_supported: [
      'Skill1-位次定位与一分一段插值',
      'Skill2-院校专业志愿匹配与分层',
      'Skill3-防退档与政策资格核验',
      'Skill4-政策红利核算（预科/专项/加分）'
    ],
    data_correction_note: '预科数据以 column.html（天团评审版）核实为准：南农/东林/川农/贵大/广大预科核实不在渝招预科，已移入 Policies.removed；合工大预科(物化575/物不限561)、中国药科预科(574)为核实新增',
    disclaimer: '所有数据为2025年实录，2026年以考试院公布为准'
  };
})();
