// skills/skill-3-admission-safety.js — Skill 3: Admission Safety 录取安全规则引擎
// (基于 GitHub 高 Star 项目「志愿风险规则引擎」核心逻辑：硬性拦截 + 软性扣分 + 风险评分)
// 纯 ES5：var/function/IIFE，兼容旧浏览器。延迟绑定 GK.Utils / GK.Data，避免加载顺序问题。
if (!window.GK) window.GK = { Utils: {}, Data: {}, Skills: {} };
window.GK.Skills.AdmissionSafety = (function () {
  'use strict';

  // ---------- 内部工具 ----------
  function getData() {
    return (window.GK && window.GK.Data) || {};
  }

  // 彭水等民族自治地方（预科班/专项实施区域）
  var AUTONOMOUS_REGIONS = ['pengshui', '彭水', 'youyang', '酉阳', 'xiushan', '秀山', 'qianjiang', '黔江'];

  // 体检受限专业关键词（医学/化学类，色盲色弱受限）
  var MEDICAL_CHEM_KEYWORDS = ['医学', '临床', '口腔', '药学', '制药', '化学', '化工', '检验', '影像', '护理', '生物制药'];

  function majorInvolvesMedicalOrChem(major) {
    if (!major) return false;
    if (typeof major !== 'string') return false;
    for (var i = 0; i < MEDICAL_CHEM_KEYWORDS.length; i++) {
      if (major.indexOf(MEDICAL_CHEM_KEYWORDS[i]) >= 0) return true;
    }
    return false;
  }

  // 选科是否满足要求：subjects_required ⊆ candidate.subjects
  function subjectsSatisfied(required, have) {
    if (!required || !required.length) return true;
    if (!have || !have.length) return false;
    var haveMap = {};
    for (var i = 0; i < have.length; i++) haveMap[have[i]] = true;
    for (var j = 0; j < required.length; j++) {
      if (!haveMap[required[j]]) return false;
    }
    return true;
  }

  // 判断院校是否在 Policies.removed 中（已删除/不在渝招生）
  function isRemovedSchool(school) {
    var Data = getData();
    var Policies = Data.Policies;
    if (!Policies || !Policies.removed || !school) return false;
    var arr = Policies.removed;
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (typeof item === 'string') { if (item === school) return true; }
      else if (item && item.school === school) return true;
    }
    return false;
  }

  // 取与院校匹配的 RiskRules（含通配 '*'）
  function getMatchingRules(school) {
    var Data = getData();
    var Rules = Data.RiskRules;
    if (!Rules || !Rules.length) return [];
    var out = [];
    for (var i = 0; i < Rules.length; i++) {
      var r = Rules[i];
      if (!r) continue;
      if (r.school === school || r.school === '*') out.push(r);
    }
    return out;
  }

  function hasError(issues) {
    for (var i = 0; i < issues.length; i++) {
      if (issues[i].severity === 'error') return true;
    }
    return false;
  }

  // 风险等级（risk_level）→ severity 映射
  function severityFromLevel(level) {
    if (level === 'high' || level === 'hard' || level === 'error') return 'error';
    if (level === 'mid' || level === 'medium' || level === 'warn') return 'warn';
    return 'info';
  }

  // ---------- 单条规则校验（按 rule 名分发） ----------
  /**
   * 按指定规则名单独校验一条志愿。
   * @param {Object} volunteer {school, major, tier, policy_tag, campus, tuition_note, subjects_required:[]}
   * @param {Object} candidate {subjects:[], hukou:{type,region}, physical, economicLimit, ethnicity}
   * @param {string} ruleName 规则枚举
   * @returns {{rule:string, passed:boolean, detail:string, severity:string}}
   */
  function checkByRule(volunteer, candidate, ruleName) {
    volunteer = volunteer || {};
    candidate = candidate || {};
    var hukou = candidate.hukou || {};
    var res = function (passed, detail, severity) {
      return { rule: ruleName, passed: passed, detail: detail, severity: severity || 'info' };
    };

    switch (ruleName) {
      case 'subject_mismatch': {
        var ok = subjectsSatisfied(volunteer.subjects_required, candidate.subjects);
        return res(ok, ok ? '选科符合要求' : '选科不符：缺少 ' + (volunteer.subjects_required || []).join('/'), ok ? 'info' : 'error');
      }
      case 'single_subject_limit': {
        // 单科成绩限制：无考生单科成绩数据时标记需核实
        if (!volunteer.single_subject_requirement) return res(true, '无单科限制', 'info');
        return res(false, '存在单科成绩限制，需核实考生单科成绩是否达标', 'warn');
      }
      case 'physical_limit': {
        if (candidate.physical === 'unknown' || !candidate.physical) {
          return res(false, '体检情况未知，需补全信息以判断色盲色弱等专业限制', 'info');
        }
        if (candidate.physical === 'fail' || candidate.physical === '色盲' || candidate.physical === '色弱') {
          return res(false, '体检结论受限，可能被退档：' + candidate.physical, 'error');
        }
        return res(true, '体检符合要求', 'info');
      }
      case 'campus_trap': {
        // 校区陷阱：办学地点偏远/独立学院挂靠
        if (volunteer.campus && /独立学院|分校|异地/.test(volunteer.campus)) {
          return res(false, '校区可能为独立学院/异地办学，需核实毕业证一致性：' + volunteer.campus, 'warn');
        }
        return res(true, '校区正常', 'info');
      }
      case 'tuition_conflict': {
        if (volunteer.tuition_note && /中外合作/.test(volunteer.tuition_note) && candidate.economicLimit === true) {
          return res(false, '中外合作办学学费高昂，与家庭经济诉求冲突', 'warn');
        }
        return res(true, '学费无冲突', 'info');
      }
      case 'hukou_ineligible': {
        if (volunteer.require_region && hukou.region !== volunteer.require_region) {
          return res(false, '户籍不符要求：需 ' + volunteer.require_region + '，当前 ' + hukou.region, 'error');
        }
        return res(true, '户籍符合', 'info');
      }
      case 'precollege_ineligible': {
        if (volunteer.policy_tag === '少数民族预科班') {
          var ok2 = false;
          for (var i = 0; i < AUTONOMOUS_REGIONS.length; i++) {
            if (hukou.region === AUTONOMOUS_REGIONS[i]) { ok2 = true; break; }
          }
          if (!ok2) return res(false, '预科班仅面向民族自治地方（彭水等），当前户籍不符：' + hukou.region, 'error');
          return res(true, '户籍属民族自治地方，预科班符合', 'info');
        }
        return res(true, '非预科志愿，无需预科资格', 'info');
      }
      case 'specialplan_ineligible': {
        // 专项计划：国家专项需 6 年学籍+户籍；地方专项需乡村户籍
        if (volunteer.policy_tag === '国家专项' || volunteer.policy_tag === '国家专项计划') {
          var natOk = false;
          for (var k = 0; k < AUTONOMOUS_REGIONS.length; k++) {
            if (hukou.region === AUTONOMOUS_REGIONS[k]) { natOk = true; break; }
          }
          return res(natOk, natOk ? '属国家专项实施区域' : '不属国家专项实施区域', natOk ? 'info' : 'error');
        }
        if (volunteer.policy_tag === '地方专项' || volunteer.policy_tag === '地方专项计划') {
          var locOk = (hukou.type === '乡村' || hukou.type === 'rural');
          return res(locOk, locOk ? '乡村户籍符合地方专项' : '地方专项须乡村户籍，当前：' + hukou.type, locOk ? 'info' : 'error');
        }
        return res(true, '无专项资格要求', 'info');
      }
      case 'data_missing': {
        if (candidate.physical === 'unknown' && majorInvolvesMedicalOrChem(volunteer.major)) {
          return res(false, '体检未知且专业涉及医学/化学，需补全数据', 'info');
        }
        return res(true, '数据完整', 'info');
      }
      case 'removed_school': {
        var rm = isRemovedSchool(volunteer.school);
        return res(!rm, rm ? '院校已删除/不在渝招生：' + volunteer.school : '院校在册', rm ? 'error' : 'info');
      }
      default:
        return res(true, '未知规则，默认通过', 'info');
    }
  }

  // ---------- 批量校验主入口 ----------
  /**
   * 校验单条志愿的全部风险规则。
   * @param {Object} volunteer {school, major, tier, policy_tag, campus, tuition_note, subjects_required:[]}
   * @param {Object} candidate {subjects:[], hukou:{type,region}, physical, economicLimit, ethnicity}
   * @returns {{passed:boolean, risk:'low'|'mid'|'high', riskScore:number, issues:Array, canUseAsSafe:boolean}}
   */
  function checkVolunteer(volunteer, candidate) {
    volunteer = volunteer || {};
    candidate = candidate || {};
    var issues = [];
    var hardMax = 0;   // 硬性错误最高分
    var softSum = 0;   // 软性警告累计（封顶 25）

    function addIssue(rule, severity, msg, score) {
      issues.push({ rule: rule, severity: severity, msg: msg });
      if (severity === 'error') {
        var s = score != null ? score : 100;
        if (s > hardMax) hardMax = s;
      } else if (severity === 'warn') {
        softSum += (score != null ? score : 25);
      }
      // info 不计入分数（仅提示）
    }

    // a. 查 RiskRules 中 school 匹配（含 '*'）的规则，逐条校验
    var rules = getMatchingRules(volunteer.school);
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      var sev = severityFromLevel(r.risk_level);
      // 根据 check_field 决定是否触发：若规则带 check_field，则用对应 checkByRule 评估
      var cf = r.check_field || r.category;
      var mapped = mapCheckFieldToRule(cf);
      if (mapped) {
        var one = checkByRule(volunteer, candidate, mapped);
        if (!one.passed) {
          addIssue(mapped, one.severity === 'info' ? 'info' : (one.severity || sev), r.description || one.detail);
        }
      } else {
        // 无法自动评估的规则：仅在高风险时提示（不阻断）
        if (sev === 'error' || sev === 'warn') {
          addIssue(r.rule_id || cf, sev === 'error' ? 'warn' : 'info', r.description || ('规则提示：' + cf), sev === 'warn' ? 0 : 0);
        }
      }
    }

    // b. removed_school：院校在 Policies.removed 中 → error，riskScore=100
    if (isRemovedSchool(volunteer.school)) {
      addIssue('removed_school', 'error', '院校已被核实不在渝招生或已删除：' + volunteer.school, 100);
    }

    // c. precollege_ineligible：预科班且户籍非民族自治地方 → error
    if (volunteer.policy_tag === '少数民族预科班') {
      var preOk = false;
      var region = (candidate.hukou && candidate.hukou.region) || '';
      for (var p = 0; p < AUTONOMOUS_REGIONS.length; p++) {
        if (region === AUTONOMOUS_REGIONS[p]) { preOk = true; break; }
      }
      if (!preOk) {
        addIssue('precollege_ineligible', 'error', '预科班仅面向民族自治地方（彭水等），当前户籍不符：' + region, 100);
      }
    }

    // d. tuition_conflict：中外合作且经济受限 → warn(softSum+25)
    if (volunteer.tuition_note && /中外合作/.test(volunteer.tuition_note) && candidate.economicLimit === true) {
      addIssue('tuition_conflict', 'warn', '中外合作办学学费高昂（年均6-10万），与家庭经济诉求冲突', 25);
    }

    // e. physical_limit / data_missing：体检未知 + 医学化学专业 → info，不直接 error
    if ((candidate.physical === 'unknown' || !candidate.physical) && majorInvolvesMedicalOrChem(volunteer.major)) {
      addIssue('data_missing', 'info', '体检情况未知且专业涉及医学/化学，需补全信息以判断色盲色弱限制');
    }

    // f. 选科硬性校验（subject_mismatch）
    if (volunteer.subjects_required && volunteer.subjects_required.length) {
      if (!subjectsSatisfied(volunteer.subjects_required, candidate.subjects)) {
        addIssue('subject_mismatch', 'error', '选科不符：缺少 ' + volunteer.subjects_required.join('/'), 100);
      }
    }

    // 风险评分 = max(hardMax, 5) + min(25, softSum)，clamp 0..100
    var riskScore = Math.max(hardMax, 5) + Math.min(25, softSum);
    if (riskScore > 100) riskScore = 100;
    if (riskScore < 0) riskScore = 0;

    // level: <30 low(SAFE); <75 mid(WARNING); 否则 high(DANGER)
    var risk;
    if (riskScore < 30) risk = 'low';
    else if (riskScore < 75) risk = 'mid';
    else risk = 'high';

    var passed = !hasError(issues);
    var canUseAsSafe = (hardMax === 0) && (riskScore < 30);

    return {
      passed: passed,
      risk: risk,
      riskScore: riskScore,
      issues: issues,
      canUseAsSafe: canUseAsSafe
    };
  }

  // check_field → 规则枚举映射
  function mapCheckFieldToRule(cf) {
    if (!cf) return null;
    var s = String(cf).toLowerCase();
    if (s.indexOf('subject') >= 0) return 'subject_mismatch';
    if (s.indexOf('single') >= 0) return 'single_subject_limit';
    if (s.indexOf('physical') >= 0 || s.indexOf('体检') >= 0) return 'physical_limit';
    if (s.indexOf('campus') >= 0 || s.indexOf('校区') >= 0) return 'campus_trap';
    if (s.indexOf('tuition') >= 0 || s.indexOf('学费') >= 0) return 'tuition_conflict';
    if (s.indexOf('hukou') >= 0 || s.indexOf('户籍') >= 0) return 'hukou_ineligible';
    if (s.indexOf('precollege') >= 0 || s.indexOf('预科') >= 0) return 'precollege_ineligible';
    if (s.indexOf('special') >= 0 || s.indexOf('专项') >= 0) return 'specialplan_ineligible';
    if (s.indexOf('removed') >= 0 || s.indexOf('删除') >= 0) return 'removed_school';
    return null;
  }

  /**
   * 批量校验：对一组志愿逐条校验。
   * @param {Array} volunteers
   * @param {Object} candidate
   * @returns {Array<{volunteer:Object, result:Object}>}
   */
  function checkBatch(volunteers, candidate) {
    var out = [];
    if (!volunteers || !volunteers.length) return out;
    for (var i = 0; i < volunteers.length; i++) {
      var v = volunteers[i];
      out.push({ volunteer: v, result: checkVolunteer(v, candidate) });
    }
    return out;
  }

  /**
   * 资格审查：检查考生是否符合某项政策计划。
   * @param {Object} candidate {hukou:{type,region}, ethnicity, ...}
   * @param {string} planType 'precollege'|'national_special'|'local_special'|'minority_bonus'
   * @returns {{eligible:boolean, missing:Array, note:string}}
   */
  function checkEligibility(candidate, planType) {
    candidate = candidate || {};
    var hukou = candidate.hukou || {};
    var Data = getData();
    var Policies = Data.Policies || {};
    var missing = [];

    // 优先读取 Policies 中对应计划的 requirements（若已由 data agent 提供）
    var plan = Policies[planType];
    var reqs = (plan && plan.requirements) || null;

    // 自治地方判定
    var inAutonomous = false;
    for (var i = 0; i < AUTONOMOUS_REGIONS.length; i++) {
      if (hukou.region === AUTONOMOUS_REGIONS[i]) { inAutonomous = true; break; }
    }
    var isMinority = !!candidate.ethnicity && candidate.ethnicity !== 'han' && candidate.ethnicity !== '汉族';

    var eligible = false;
    var note = '';

    switch (planType) {
      case 'precollege':
        // 预科班：民族自治地方 + 少数民族
        if (!inAutonomous) missing.push('hukou.region（须民族自治地方，如彭水）');
        if (!isMinority) missing.push('ethnicity（须少数民族）');
        eligible = (missing.length === 0);
        note = eligible ? '彭水聚居地少数民族符合预科班资格' : '不符合预科班资格：缺 ' + missing.join('、');
        break;
      case 'national_special':
        // 国家专项：实施区域（彭水等） + 6 年学籍+户籍
        if (!inAutonomous) missing.push('hukou.region（须国家专项实施区域）');
        if (!hukou.years || hukou.years < 6) missing.push('hukou.years（须 6 年户籍）');
        eligible = (missing.length === 0);
        note = eligible ? '属国家专项实施区域且满足 6 年户籍学籍' : '国家专项资格不全：缺 ' + missing.join('、');
        break;
      case 'local_special':
        // 地方专项：乡村户籍
        if (!(hukou.type === '乡村' || hukou.type === 'rural')) missing.push('hukou.type（须乡村户籍）');
        eligible = (missing.length === 0);
        note = eligible ? '乡村户籍符合地方专项' : '地方专项须乡村户籍，当前：' + (hukou.type || '未知');
        break;
      case 'minority_bonus':
        // 少数民族加分：聚居地 3 年户籍学籍 + 少数民族
        if (!inAutonomous) missing.push('hukou.region（须少数民族聚居地）');
        if (!isMinority) missing.push('ethnicity（须少数民族）');
        if (hukou.years != null && hukou.years < 3) missing.push('hukou.years（须 3 年户籍学籍）');
        eligible = (missing.length === 0);
        note = eligible ? '聚居地少数民族符合加分资格（+10 分投档）' : '加分资格不全：缺 ' + missing.join('、');
        break;
      default:
        eligible = false;
        missing.push('planType（未知计划类型）');
        note = '未知计划类型：' + planType;
    }

    // 若 Policies 提供了 requirements，叠加校验（以 data agent 数据为准）
    if (reqs) {
      for (var key in reqs) {
        if (!reqs.hasOwnProperty(key)) continue;
        var expected = reqs[key];
        var actual = candidate[key];
        if (typeof expected === 'function') {
          if (!expected(actual)) missing.push(key);
        } else if (actual !== expected) {
          missing.push(key);
        }
      }
      eligible = (missing.length === 0);
    }

    return { eligible: eligible, missing: missing, note: note };
  }

  return {
    checkVolunteer: checkVolunteer,
    checkBatch: checkBatch,
    checkByRule: checkByRule,
    checkEligibility: checkEligibility
  };
})();

// === 测试用例（console 验证，依赖 _core.js / data/*.js 已就绪）===
// 1) GK.Skills.AdmissionSafety.checkEligibility({hukou:{region:'pengshui',type:'城镇',years:6}, ethnicity:'苗族'}, 'precollege')
//    预期：{eligible:true, note:'彭水聚居地少数民族符合预科班资格'}
// 2) GK.Skills.AdmissionSafety.checkVolunteer(
//      {school:'南京农业大学', policy_tag:'少数民族预科班', subjects_required:['物理','化学']},
//      {hukou:{region:'pengshui'}, subjects:['物理','化学','生物'], physical:'unknown', economicLimit:false})
//    预期：passed=true（彭水符合预科），risk='low'，canUseAsSafe=true（若该校未在 removed 列表）
// 3) GK.Skills.AdmissionSafety.checkVolunteer(
//      {school:'某校', major:'临床医学', tuition_note:'中外合作', subjects_required:[]},
//      {hukou:{region:'pengshui'}, physical:'unknown', economicLimit:true})
//    预期：issues 含 tuition_conflict(warn) + data_missing(info)，risk='mid'，canUseAsSafe=false
