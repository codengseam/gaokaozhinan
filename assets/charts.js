// assets/charts.js — 2026 志愿填报门户数据图表
(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var success = style.getPropertyValue('--success').trim();
  var warning = style.getPropertyValue('--warning').trim();
  var danger = style.getPropertyValue('--danger').trim();

  var baseAxis = {
    axisLine: { lineStyle: { color: rule } },
    axisTick: { show: false },
    axisLabel: { color: muted, fontSize: 11 },
    splitLine: { lineStyle: { color: rule, type: 'dashed' } }
  };

  // ---------- Chart 1: 2026 国考各类别招录人数 ----------
  var c1 = document.getElementById('chart-guokao');
  if (c1) {
    var chart1 = echarts.init(c1, null, { renderer: 'svg' });
    chart1.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        formatter: function (p) {
          var d = p[0];
          return d.name + '<br/>招录 <b>' + d.value + '</b> 人<br/>占比 <b>' + d.data.pct + '</b>';
        }
      },
      grid: { left: '3%', right: '12%', top: 30, bottom: 20, containLabel: true },
      xAxis: { type: 'value', ...baseAxis },
      yAxis: {
        type: 'category',
        data: ['计算机类', '财会审计类', '财政学类'],
        ...baseAxis,
        splitLine: { show: false },
        axisLabel: { color: ink, fontSize: 12, fontWeight: 600 }
      },
      series: [{
        type: 'bar',
        data: [
          { value: 10456, pct: '27.4%', itemStyle: { color: accent2 } },
          { value: 8799, pct: '23.08%', itemStyle: { color: warning } },
          { value: 12905, pct: '33.85%', itemStyle: { color: accent } }
        ],
        barWidth: '52%',
        label: {
          show: true,
          position: 'right',
          color: ink,
          fontWeight: 700,
          fontFamily: 'Outfit',
          formatter: function (p) { return p.value + ' 人'; }
        },
        itemStyle: { borderRadius: [0, 6, 6, 0] }
      }]
    });
    window.addEventListener('resize', function () { chart1.resize(); });
  }

  // ---------- Chart 2: 12 大专业 ESTJ 匹配度 ----------
  var c2 = document.getElementById('chart-estj');
  if (c2) {
    var majors = [
      { name: '软件工程', v: 3 },
      { name: '计算机科学与技术', v: 3 },
      { name: '网络空间安全', v: 3.5 },
      { name: '网络工程', v: 4 },
      { name: '信息安全', v: 4 },
      { name: '能源与动力工程', v: 4 },
      { name: '新能源科学与工程', v: 4 },
      { name: '自动化', v: 4 },
      { name: '会计学', v: 5 },
      { name: '审计学', v: 5 },
      { name: '税收学/财政学', v: 5 },
      { name: '电气工程及其自动化', v: 5 }
    ];
    function colorFor(v) {
      if (v >= 5) return accent;
      if (v >= 4) return accent2;
      return muted;
    }
    var chart2 = echarts.init(c2, null, { renderer: 'svg' });
    chart2.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        formatter: function (p) {
          var d = p[0];
          var stars = '★'.repeat(Math.round(d.value)) + '☆'.repeat(5 - Math.round(d.value));
          return d.name + '<br/>ESTJ 匹配 <b>' + stars + '</b>（' + d.value + '/5）';
        }
      },
      grid: { left: '3%', right: '14%', top: 20, bottom: 20, containLabel: true },
      xAxis: { type: 'value', max: 5, ...baseAxis },
      yAxis: {
        type: 'category',
        data: majors.map(function (m) { return m.name; }),
        ...baseAxis,
        splitLine: { show: false },
        axisLabel: { color: ink, fontSize: 11 }
      },
      series: [{
        type: 'bar',
        data: majors.map(function (m) {
          return { value: m.v, itemStyle: { color: colorFor(m.v), borderRadius: [0, 5, 5, 0] } };
        }),
        barWidth: '58%',
        label: {
          show: true,
          position: 'right',
          color: ink,
          fontWeight: 700,
          fontFamily: 'Outfit',
          formatter: function (p) { return p.value + '/5'; }
        }
      }]
    });
    window.addEventListener('resize', function () { chart2.resize(); });
  }

  // ---------- Chart 3: 96 志愿分配 ----------
  var c3 = document.getElementById('chart-plan96');
  if (c3) {
    var chart3 = echarts.init(c3, null, { renderer: 'svg' });
    chart3.setOption({
      animation: false,
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        formatter: '{b}<br/>志愿数 <b>{c}</b> 个（{d}%）'
      },
      legend: {
        bottom: 0,
        textStyle: { color: muted, fontSize: 12 },
        icon: 'roundRect'
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: bg2, borderWidth: 3, borderRadius: 6 },
        label: {
          show: true,
          color: ink,
          fontWeight: 700,
          formatter: '{b}\n{c} 个'
        },
        labelLine: { length: 12, length2: 10 },
        data: [
          { value: 15, name: '冲刺层', itemStyle: { color: danger } },
          { value: 55, name: '稳妥层', itemStyle: { color: accent2 } },
          { value: 26, name: '保底层', itemStyle: { color: success } }
        ]
      }]
    });
    window.addEventListener('resize', function () { chart3.resize(); });
  }
})();
