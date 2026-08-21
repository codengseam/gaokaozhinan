{id:4,  title:'信息系统架构',       sec:'it',  page:136, cards:[
  {t:'架构本质与总体参考框架', f:'high', s:3, m:'架构即决策；框架四层：战、业、用、信。', b:`
<p><b>架构的本质是决策</b>——在权衡方向、结构、关系以及原则等方面因素后进行的决策。信息系统架构体现信息系统相关组件、关系以及系统的设计和演化原则。</p>
<p><b>信息系统体系架构总体参考框架</b>由四部分组成，与管理金字塔相一致：</p>
<figure class="kd-fig">
<div class="dg">
  <div class="dg-box" style="border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.05)"><b style="color:#fde68a">战略系统 · 第一层</b><span>战略管理：战略制定与高层决策的计算机辅助系统 · 向业务、应用系统提出要求</span></div>
  <div class="dg-varrow">▼</div>
  <div class="dg-box" style="border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.08)"><b style="color:#cfc8ff">业务系统 · 第二层</b><span>战术管理：完成一定业务功能的系统，在战略系统指导下采用业务流程重组（BPR）优化</span></div>
  <div class="dg-varrow">▼</div>
  <div class="dg-box" style="border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.05)"><b style="color:#a5e8f5">应用系统 · 第二层</b><span>战术管理：信息系统中的应用软件部分（TPS、MIS、DSS等）· 含内部功能实现与外部界面两部分</span></div>
  <div class="dg-varrow">▼</div>
  <div class="dg-box" style="border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.05)"><b style="color:#6ee7b7">信息基础设施 · 第三层</b><span>运行管理：组织信息化的基础 · 三大组成——<b>技术基础设施、信息资源设施、管理基础设施</b></span></div>
</div>
<figcaption>总体参考框架四层：战略系统在顶、信息基础设施在底、业务与应用居中</figcaption>
</figure>
<div class="pit"><b>坑点：</b>① "信息基础设施的组成"必背三件套：技术、信息资源、管理——选"硬件、软件、网络"是望文生义。② 战略系统是最顶层，别与应用系统（软件部分）混淆；口诀"战业用信"自上而下记。</div>`},
  {t:'物理架构：集中式与分布式', f:'mid', s:2, m:'集中好管理，分布易扩展。', b:`
<p><b>物理架构</b>不考虑功能，只抽象考察硬件系统的空间分布，分两类：</p>
<table class="kt"><tr><th>维度</th><th>集中式架构</th><th>分布式架构</th></tr>
<tr><td>资源分布</td><td>资源集中配置于主机</td><td>资源分散在多节点</td></tr>
<tr><td>优点</td><td>管理便利、资源利用率高</td><td>扩展方便、故障影响隔离</td></tr>
<tr><td>缺点</td><td>单点故障风险（主机瘫则全瘫）、维护成本高、扩展性差</td><td>管理复杂、多节点标准不易统一</td></tr>
<tr><td>典型场景</td><td>早期银行柜面、工厂控制主机</td><td>云计算、微服务、物联网</td></tr></table>
<p><b>逻辑架构</b>是信息系统各功能子系统的综合体，融合方式三种：<b>横向融合</b>（同一层次综合）、<b>纵向融合</b>（上下级沟通整合）、<b>纵横融合</b>（建立公用数据体系）。</p>
<div class="pit"><b>坑点：</b>① "集中式架构不存在单点故障"是错误选项——单点风险正是它被分布式取代的主因。② "分布式架构管理更简单"也是反话——分布式以管理复杂度为代价换扩展性。</div>`},
  {t:'C/S、B/S与MVC模式', f:'mid', s:2, m:'C/S胖客户端，B/S零安装，MVC三分离。', b:`
<p>软件架构模式从简单到复杂一路演进：</p>
<ul>
<li><b>单机应用模式：</b>运行在一台物理机上的独立程序，不依赖网络。</li>
<li><b>两层C/S：</b>客户端 + 数据库服务器，界面与业务逻辑都压在客户端——"胖客户端"，部署升级要挨个装机。</li>
<li><b>三层C/S与B/S：</b>表现层、业务逻辑层、数据层分离；<b>B/S（浏览器/服务器）是三层C/S最典型的实现</b>，客户端只需浏览器、以HTTP通信，升级只改服务端。</li>
<li><b>MVC模式：</b>Model模型（业务逻辑+数据持久化）、View视图（界面展示）、Controller控制器（接收请求、协调模型与视图）——多层C/S结构的标准化模式。</li>
</ul>
<div class="pit"><b>坑点：</b>① B/S最大卖点是<b>客户端零安装</b>，"服务器负荷更低"不是它的特征。② MVC的Model不只是"存数据"，还包含业务逻辑；View与Model必须分离——"视图直接读写数据库"是找错题常见描述。</div>`},
  {t:'SOA与微服务对比', f:'high', s:3, m:'SOA靠总线，微服务去中心。', b:`
<p><b>SOA面向服务架构：</b>把功能封装成可复用的服务，通过服务注册、发现、调用实现松耦合集成；其本质是<b>消息机制或远程过程调用（RPC）</b>，<b>Web Service是SOA最典型的应用</b>（SOAP负责通信、WSDL负责服务描述、UDDI负责注册发现）。</p>
<table class="kt"><tr><th>维度</th><th>SOA</th><th>微服务</th></tr>
<tr><td>服务粒度</td><td>粗粒度，服务偏大</td><td>细粒度，小而专</td></tr>
<tr><td>通信方式</td><td>企业服务总线ESB集中转发</td><td>轻量协议（HTTP/REST、gRPC）直接调用</td></tr>
<tr><td>治理模式</td><td>中心化（依赖ESB）</td><td>去中心化</td></tr>
<tr><td>部署与伸缩</td><td>整体部署较重</td><td>独立部署、独立伸缩</td></tr>
<tr><td>技术栈</td><td>倾向统一</td><td>各服务可异构</td></tr></table>
<div class="pit"><b>坑点：</b>① "微服务依赖企业服务总线ESB"是典型错误选项——ESB是SOA的标志，微服务恰恰去中心化。② 见到SOAP/WSDL/Web Service→SOA；见到独立部署、细粒度、去中心化→微服务。</div>`},
  {t:'企业架构与TOGAF ADM', f:'mid', s:2, m:'业务、数据应用、技术，BCD顺序不乱。', b:`
<p><b>企业架构四大子架构：</b>业务架构、应用架构、数据架构、技术架构——从业务出发逐层落到技术实现。</p>
<p><b>TOGAF</b>是开放式企业架构框架，核心是<b>ADM架构开发方法</b>：</p>
<figure class="kd-fig">
<div class="dg">
  <div class="dg-row">
    <div class="dg-box"><b>预备阶段</b><span>确定原则与工具</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box"><b>A 架构愿景</b><span>明确范围与目标</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box" style="border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.05)"><b style="color:#fde68a">B 业务架构</b><span>业务流程建模</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box" style="border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.08)"><b style="color:#cfc8ff">C 信息系统架构</b><span>数据架构+应用架构</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box" style="border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.05)"><b style="color:#a5e8f5">D 技术架构</b><span>支撑软硬件选型</span></div>
  </div>
  <div class="dg-varrow">▼ 后续阶段</div>
  <div class="dg-box"><b>E机会及解决方案 → F迁移规划 → G实施治理 → H架构变更管理</b><span>需求管理贯穿全程、位于中心</span></div>
</div>
<figcaption>ADM核心顺序：B业务 → C信息系统 → D技术，先业务后技术</figcaption>
</figure>
<div class="pit"><b>坑点：</b>① B→C→D的顺序是"业务架构→信息系统架构→技术架构"，选项把技术架构提到C位即错。② C阶段是"信息系统架构"，内含<b>数据架构与应用架构</b>两个子架构，别被拆开后的表述绕晕。</div>`},
  {t:'网络架构：三层组网与SDN', f:'mid', s:2, m:'核心快转发、汇聚做策略、接入连终端。', b:`
<p>园区网络经典三层架构：</p>
<figure class="kd-fig">
<div class="dg">
  <div class="dg-box" style="border-color:rgba(251,191,36,.5);background:rgba(251,191,36,.05)"><b style="color:#fde68a">核心层 · 高速骨干</b><span>高速数据转发与骨干互联 · 通常双机冗余设计，可靠性要求最高 · 做得越少越稳</span></div>
  <div class="dg-varrow">▼ 上联</div>
  <div class="dg-box" style="border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.08)"><b style="color:#cfc8ff">汇聚层 · 策略枢纽</b><span>汇聚接入层流量 · VLAN间路由 · 实施ACL、QoS等策略控制</span></div>
  <div class="dg-varrow">▼ 上联</div>
  <div class="dg-box" style="border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.05)"><b style="color:#a5e8f5">接入层 · 终端门户</b><span>终端设备接入网络 · 端口密度大 · 端口安全、接入认证、PoE供电</span></div>
</div>
<figcaption>三层自上而下：核心管转发、汇聚管策略、接入管终端</figcaption>
</figure>
<p><b>SDN软件定义网络：</b>控制平面与数据平面分离，由控制器集中统一下发流表、设备只负责转发，OpenFlow是其代表性南向协议——网络像软件一样可编程。</p>
<div class="pit"><b>坑点：</b>① "接入层承担高速骨干转发"错——接入层面向终端，速度与策略要求最低。② SDN的核心特征是<b>控制与转发分离、集中控制</b>，选项写成"转发与控制合一、分布式决策"即反向陷阱。</div>`},
  {t:'安全架构：WPDRRC模型', f:'high', s:3, m:'预保检应恢反六环节，人策技三要素。', b:`
<p><b>WPDRRC</b>是我国863信息安全专家组提出的、适合中国国情的信息安全保障体系模型，有<b>6个环节和3大要素</b>。</p>
<figure class="kd-fig">
<div class="dg">
  <div class="dg-row">
    <div class="dg-box"><b>W 预警</b><span>提前发现威胁</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box"><b>P 保护</b><span>加固防护措施</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box"><b>D 检测</b><span>发现攻击行为</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box"><b>R 响应</b><span>应急处置告警</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box"><b>R 恢复</b><span>还原系统运行</span></div>
    <div class="dg-harrow">→</div>
    <div class="dg-box" style="border-color:rgba(248,113,113,.5);background:rgba(248,113,113,.05)"><b style="color:#fda4af">C 反击</b><span>溯源与反制</span></div>
  </div>
  <div class="dg-varrow">▼ 三大要素支撑六大环节</div>
  <div class="dg dg-3">
    <div class="dg-box" style="border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.05)"><b style="color:#a5e8f5">人员 · 核心</b><span>决定安全文化的第一道防线</span></div>
    <div class="dg-box" style="border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.08)"><b style="color:#cfc8ff">策略 · 桥梁</b><span>把管理要求转化为可执行规则</span></div>
    <div class="dg-box" style="border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.05)"><b style="color:#6ee7b7">技术 · 保证</b><span>让策略真正落地为防护能力</span></div>
  </div>
</div>
<figcaption>六环节具时序性与动态性；三要素把安全策略变为安全现实</figcaption>
</figure>
<div class="pit"><b>坑点：</b>① 三要素是<b>人员、策略、技术</b>——"人员是核心、策略是桥梁、技术是保证"；选项换成"人员、组织、技术"或"管理、制度、流程"即错。② 模型是在PDRR基础上前后增加了<b>预警和反击</b>，"反击"环节别漏。</div>`},
  {t:'云原生架构七原则', f:'high', s:3, m:'服弹观韧动，零信任，持续演进。', b:`
<p><b>定义：</b>云原生架构是基于云原生技术的一组<b>架构原则和设计模式</b>的集合，把应用中的非业务代码最大化剥离，让云设施接管弹性、韧性、安全、可观测等非功能特性，使应用具备<b>轻量、敏捷、高度自动化</b>的特点。</p>
<p><b>七大设计原则（列举题原题考过）：</b></p>
<table class="kt"><tr><th>原则</th><th>要点</th></tr>
<tr><td>服务化</td><td>拆分为微服务、小服务架构</td></tr>
<tr><td>弹性</td><td>部署规模随业务量变化自动伸缩</td></tr>
<tr><td>可观测</td><td>靠日志、链路跟踪、度量看清每次调用</td></tr>
<tr><td>韧性</td><td>抵御软硬件异常，提升平均无故障时间</td></tr>
<tr><td>所有过程自动化</td><td>软件交付与运维全流程自动化</td></tr>
<tr><td>零信任</td><td>默认不信任网络内外部任何人、设备、系统，以身份为中心</td></tr>
<tr><td>架构持续演进</td><td>架构随业务高速迭代持续演化</td></tr></table>
<p><b>常用架构模式：</b>服务化架构、Mesh化架构、Serverless、存储计算分离、分布式事务、可观测、事件驱动。</p>
<div class="pit"><b>坑点：</b>① 列举题的杜撰干扰项："集中化管控原则""数据本地化原则"都不在七原则之列。② 弹性讲<b>自动伸缩</b>、韧性讲<b>故障抵御</b>，两者别混；"零信任"不是"只防外网"，内网同样默认不信任。</div>`},
  {t:'本章易错易混速查表', f:'mid', s:2, m:'四层、三层、六环节、七原则，数字排排站。', b:`
<table class="kt"><tr><th>易混点</th><th>辨析关键</th></tr>
<tr><td>总体框架四层</td><td>战略系统、业务系统、应用系统、信息基础设施（技术/信息资源/管理三设施）</td></tr>
<tr><td>集中式 vs 分布式</td><td>集中式管理便利但单点故障；分布式扩展方便但管理复杂</td></tr>
<tr><td>C/S vs B/S</td><td>胖客户端要装软件；B/S零安装、升级只改服务端、HTTP通信</td></tr>
<tr><td>SOA vs 微服务</td><td>SOA靠ESB总线集中转发；微服务细粒度、去中心化、独立部署</td></tr>
<tr><td>TOGAF ADM</td><td>B业务架构→C信息系统架构（数据+应用）→D技术架构，先业务后技术</td></tr>
<tr><td>网络三层</td><td>核心高速转发、汇聚策略路由、接入终端门户；SDN=控制转发分离</td></tr>
<tr><td>WPDRRC</td><td>6环节（预警保护检测响应恢复反击）+3要素（人员核心、策略桥梁、技术保证）</td></tr>
<tr><td>云原生7原则</td><td>服务化、弹性、可观测、韧性、所有过程自动化、零信任、架构持续演进</td></tr>
<tr><td>数字速记</td><td>参考框架4层、组网3层、WPDRRC 6+3、云原生7原则、ADM核心BCD</td></tr></table>
<div class="tip"><b>考情：</b>本章约3~5分，只考上午选择题；SOA与微服务、云原生七原则、WPDRRC是近两年新大纲的稳定考点，速查表过一遍即可应试。</div>`}
], quiz:[
  {q:'信息系统体系架构总体参考框架中，信息基础设施分为（ ）', o:['技术基础设施、信息资源设施、管理基础设施','硬件设施、软件设施、网络设施','计算设施、存储设施、安全设施','机房设施、服务器设施、数据库设施'], a:0, k:'总体参考框架', e:'信息基础设施是组织信息化的基础，由技术基础设施、信息资源设施、管理基础设施三部分组成。业务系统、应用系统、战略系统与其共同构成总体参考框架四个部分，硬件软件网络是望文生义的干扰项。'},
  {q:'以下关于微服务架构特点的描述中，不正确的是（ ）', o:['服务粒度细，每个服务小而专','服务治理去中心化','每个服务可独立部署和伸缩','依赖企业服务总线ESB集中转发消息'], a:3, k:'SOA与微服务', e:'ESB企业服务总线是SOA架构集中式治理的标志；微服务恰恰强调去中心化治理，采用HTTP/REST、gRPC等轻量协议点对点通信，并支持独立部署、独立伸缩和异构技术栈。'},
  {q:'WPDRRC信息安全体系架构模型的三要素是（ ）', o:['人员、组织、技术','人员、策略、技术','管理、制度、流程','人员、流程、设备'], a:1, k:'WPDRRC三要素', e:'WPDRRC模型有6个环节（预警、保护、检测、响应、恢复、反击）和3大要素——人员是核心、策略是桥梁、技术是保证。把策略换成组织或制度是常见干扰手法。'},
  {q:'以下不属于云原生架构设计原则的是（ ）', o:['服务化原则','弹性原则','集中化管控原则','可观测原则'], a:2, k:'云原生七原则', e:'云原生架构七大原则为服务化、弹性、可观测、韧性、所有过程自动化、零信任、架构持续演进。集中化管控原则属于杜撰干扰项，与云原生去中心化的演进方向相悖。'},
  {q:'与两层C/S架构相比，B/S架构最突出的优点是（ ）', o:['客户端零安装，通过浏览器即可访问','客户端需要安装专用软件才能使用','系统只能部署在局域网内部使用','服务器端的处理负荷显著更低'], a:0, k:'B/S与C/S', e:'B/S是三层C/S最典型的实现，客户端只需浏览器、以HTTP通信，应用升级只需更新服务器端，维护成本大幅降低。它并非必须限定局域网，且大量逻辑集中到服务端反而使服务器负荷更高。'},
  {q:'园区网络三层架构中，核心层的主要功能是（ ）', o:['为终端设备提供网络接入端口','高速数据转发与骨干互联','实施VLAN划分和访问控制策略','对上网用户进行身份认证与计费'], a:1, k:'网络三层架构', e:'核心层是网络的高速骨干，负责高速转发与设备互联，通常做冗余设计且尽量少叠加策略；接入层面向终端提供端口并做端口安全，汇聚层负责VLAN间路由和ACL、QoS等策略控制。'},
  {q:'TOGAF的ADM架构开发方法中，阶段B、C、D依次开发的架构是（ ）', o:['业务架构、技术架构、信息系统架构','信息系统架构、业务架构、技术架构','业务架构、信息系统架构、技术架构','技术架构、业务架构、信息系统架构'], a:2, k:'TOGAF ADM', e:'ADM的核心开发顺序为先业务后技术：阶段B业务架构、阶段C信息系统架构（内含数据架构与应用架构）、阶段D技术架构。此顺序体现业务驱动IT的设计思想，选项乱序即为陷阱。'},
  {q:'云原生架构零信任原则的核心含义是（ ）', o:['默认信任内网流量以提升效率','仅对来自外网的访问进行认证','依靠防火墙构筑边界即可高枕无忧','默认不信任网络内外部的任何人与设备'], a:3, k:'云原生零信任', e:'零信任原则要求默认不信任网络内部和外部的任何人员、设备与系统，基于认证和授权重构访问控制的信任基础，架构从网络中心化走向身份中心化。只防外网、依赖边界的说法均违背其本意。'}
]},
