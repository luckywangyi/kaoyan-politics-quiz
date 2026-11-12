/* ============ 研政通 · 视图渲染 ============ */
(function () {
  'use strict';
  var Y = window.YZT, V = window.Views = {};
  var e = Y.esc;
  function S() { return Y.state; }
  function B() { return Y.BANK; }
  function sub(id) { return B().subjectById[id] || { name: '—', short: '—', code: '' }; }
  function chTitle(q) { var c = Y.chapterOf(q); return c ? c.title : '综合 / 真题'; }
  function pctBar(v, cls) {
    return '<div class="progress ' + (cls || '') + '"><i style="width:' + Y.clamp(v, 0, 100) + '%"></i></div>';
  }
  function head(t, s, actions) {
    return '<div class="page-head"><div><h1>' + e(t) + '</h1><p>' + e(s) + '</p></div>' +
      (actions ? '<div class="head-actions">' + actions + '</div>' : '') + '</div>';
  }
  function empty(icon, title, desc, btn) {
    return '<div class="empty"><div class="big">' + icon + '</div><b>' + e(title) + '</b>' +
      '<div class="small">' + e(desc) + '</div>' + (btn || '') + '</div>';
  }
  function startBtn(label, mode, arg, title, cls) {
    return '<button class="btn ' + (cls || '') + '" data-act="start" data-mode="' + mode +
      '" data-arg="' + e(arg == null ? '' : arg) + '" data-title="' + e(title) + '">' + e(label) + '</button>';
  }
  function typeTag(q) {
    return q.type === 'SINGLE_CHOICE' ? '<span class="tag blue">单选题 · 1分</span>'
      : q.type === 'MULTI_CHOICE' ? '<span class="tag purple">多选题 · 2分</span>'
        : '<span class="tag amber">分析题 · ' + (q.score || 10) + '分</span>';
  }
  function statusTag(q) {
    var a = S().answers[q.id], r = S().review[q.id];
    if (r && r.state === 'MASTERED') return '<span class="tag green">🟢 已掌握</span>';
    if (a) return '<span class="tag amber">🟡 学习中</span>';
    return '<span class="tag">⚪ 未做</span>';
  }
  V.esc = e; V.head = head; V.empty = empty; V.startBtn = startBtn;

  /* ---------- 侧栏导航 ---------- */
  V.nav = function (active) {
    var st = Y.stats();
    var groups = [
      { label: '开始学习', items: [
        { v: 'home', ico: '⌂', t: '学习总览' },
        { v: 'notes', ico: '❏', t: '章节讲义' },
        { v: 'syllabus', ico: '纲', t: '大纲考点' },
        { v: 'xref', ico: '⇄', t: '章节对照' },
        { v: 'chapters', ico: '☰', t: '章节刷题' },
        { v: 'exams', ico: '▤', t: '真题模考' },
        { v: 'practice', ico: '✍', t: '继续刷题' }
      ] },
      { label: '巩固提升', items: [
        { v: 'mistakes', ico: '✕', t: '错题本', badge: st.mistakes },
        { v: 'review', ico: '↻', t: '到期复习', badge: st.due },
        { v: 'favorites', ico: '★', t: '我的收藏', badge: st.favorites },
        { v: 'recite', ico: '📖', t: '沉浸背诵' },
        { v: 'timeline', ico: '⌛', t: '时间轴图谱' },
        { v: 'templates', ico: '◇', t: '万能模板' },
        { v: 'essays', ico: '✎', t: '材料分析题' }
      ] },
      { label: '数据与设置', items: [
        { v: 'report', ico: '▦', t: '学习报告' },
        { v: 'settings', ico: '⚙', t: '设置' }
      ] }
    ];
    return groups.map(function (g) {
      return '<div class="nav-group">' + g.label + '</div>' + g.items.map(function (it) {
        return '<button class="nav-item ' + (active === it.v ? 'active' : '') + '" data-act="go" data-view="' + it.v + '">' +
          '<span class="ico">' + it.ico + '</span><span>' + it.t + '</span>' +
          (it.badge ? '<span class="badge">' + it.badge + '</span>' : '') + '</button>';
      }).join('');
    }).join('');
  };

  /* ---------- 首页 ---------- */
  V.home = function () {
    var st = Y.stats(), meta = B().meta;
    var goal = st.todayLog.n + st.todayLog.r;
    var quota = st.quota;
    var reached = goal >= quota;
    var html = head('学习总览', '离线全真题库 · ' + meta.stats.questions + ' 题全量就绪');
    html += '<div class="hero"><h2>咬定青山不放松 · 一战成硕</h2>' +
      '<p>六大体系知识树 · ' + meta.stats.chapters + ' 个章节 · ' + meta.stats.examPapers + ' 套历年真题 · ' + meta.stats.knowledgePoints + ' 个背诵考点</p>' +
      '<div class="hero-stats">' +
      '<div><b>' + st.done + '</b><span>已刷题目</span></div>' +
      '<div><b>' + st.accuracy + '%</b><span>累计正确率</span></div>' +
      '<div><b>' + st.streak + '</b><span>连续打卡（天）</span></div>' +
      '<div><b>' + Y.countdownDays() + '</b><span>距初试（天）</span></div>' +
      '</div><div class="goal"><div class="txt">今日进度 <b>' + goal + ' / ' + quota + ' 题</b>' +
      (reached ? '　🎉 今日目标已达成' : '　还差 ' + (quota - goal) + ' 题') +
      '<div style="margin-top:6px">' + pctBar(Y.pct(goal, quota)) + '</div></div>' +
      startBtn(reached ? '🌟 加练新题 15 题' : '开始今日刷题', reached ? 'new' : 'new', reached ? 15 : quota, reached ? '超额加练 · 新题' : '今日新题任务', 'btn-primary') +
      '</div></div>';

    html += '<div class="sec-title"><i class="dot"></i>快捷入口</div><div class="quick">' +
      quick('✕', '艾宾浩斯错题本', st.mistakes + ' 道待攻克', 'mistakes') +
      quick('↻', '到期复习', st.due + ' 道待复习', 'start', 'review') +
      quick('📖', '沉浸背诵', '挖空遮挡自测', 'recite') +
      quick('◇', '万能模板', meta.stats.templates + ' 套答题框架', 'templates') +
      quick('✎', '肖四大题', '智能采分对比', 'essays') +
      quick('★', '我的收藏', st.favorites + ' 道已收藏', 'favorites') +
      '</div>' +
      '<button class="tl-banner nt-banner" data-act="go" data-view="notes">' +
      '<span class="tl-banner-em">❏</span>' +
      '<span class="tl-banner-txt"><b>章节讲义 · 先读后练</b>' +
      '<span>' + meta.stats.chapters + ' 章全覆盖 · 587 个知识点，每章含知识点讲解 / 重点梳理 / 易混辨析 / 配套练习（已读 ' +
      Object.keys(S().notes || {}).length + ' 章）</span></span>' +
      '<span class="tl-banner-go">去通读 →</span></button>' +
      '<button class="tl-banner" data-act="go" data-view="timeline">' +
      '<span class="tl-banner-em">⌛</span>' +
      '<span class="tl-banner-txt"><b>时间轴记忆图谱</b>' +
      '<span>1840—2026 · 41 个高频考点，按时期分色串联背景 / 内容 / 意义，可折叠、可挖空自测</span></span>' +
      '<span class="tl-banner-go">查看 →</span></button>';

    html += '<div class="sec-title"><i class="dot"></i>六大体系知识树' +
      '<span class="more">肖1000题 + 统考真题 + 时政专项</span></div><div class="grid g2">' +
      st.bySubject.map(function (x) {
        var s = x.subject;
        return '<button class="subj-card" data-act="go" data-view="chapters" data-sub="' + s.id + '">' +
          '<div class="top"><span class="sq" style="background:' + subjColor(s.code) + '">' + e(s.short.slice(0, 1)) + '</span>' +
          '<b>' + e(s.name) + '</b></div>' +
          '<div class="cnt"><span>已刷 ' + x.done + ' / ' + x.total + ' 题</span><span>' + x.pct + '%</span></div>' +
          pctBar(x.pct, x.pct >= 100 ? 'green' : '') +
          '<div class="cnt" style="margin:8px 0 0"><span>正确率 ' + (x.done ? x.acc + '%' : '—') + '</span><span>' + (x.done ? '继续 →' : '去刷题 →') + '</span></div>' +
          '</button>';
      }).join('') + '</div>';

    var papers = meta.examPapers.slice(0, 6);
    html += '<div class="sec-title"><i class="dot"></i>历年统考真题模考' +
      '<span class="more">' + meta.examPapers.length + ' 套 · 按年份倒序</span></div><div class="list-col">' +
      papers.map(paperRow).join('') +
      '<button class="btn btn-block" data-act="go" data-view="exams">查看全部 ' + meta.examPapers.length + ' 套真题卷 →</button></div>';
    return html;
  };
  function quick(em, t, s, act, mode) {
    if (act === 'start') {
      return '<button class="q" data-act="start" data-mode="' + mode + '" data-arg="" data-title="今日到期复习"><span class="em">' + em + '</span><b>' + t + '</b><span>' + s + '</span></button>';
    }
    return '<button class="q" data-act="go" data-view="' + act + '"><span class="em">' + em + '</span><b>' + t + '</b><span>' + s + '</span></button>';
  }
  function subjColor(code) {
    return { MY: '#B23A32', MZT: '#1E3A5F', XGS: '#C0562F', SG: '#6D4FA8', SX: '#1B8A56', SZ: '#2D6CA8' }[code] || '#68707C';
  }
  function paperRow(p) {
    var st = Y.stats();
    var qs = B().questions.filter(function (q) { return q.sid === p.sid && q.type !== 'ESSAY'; });
    var done = qs.filter(function (q) { return S().answers[q.id]; }).length;
    var cor = qs.filter(function (q) { return S().answers[q.id] && S().answers[q.id].ok === 2; }).length;
    var label = done >= qs.length && qs.length ? '已完卷' : done ? '做题中 ' + Y.pct(done, qs.length) + '%' : '未开考';
    return '<div class="paper"><div class="yr">' + p.year + '</div><div class="info">' +
      '<b>' + e(p.name) + '</b><div>共 ' + p.count + ' 题 · 标准 50 分制 · 答题 ' + done + '/' + qs.length +
      ' · 正确率 ' + (done ? Y.pct(cor, done) + '%' : '—') + ' · ' + label + '</div></div>' +
      startBtn(done ? '继续模考' : '开始模考', 'exam', p.sid, p.year + ' 年统考真题') + '</div>';
  }

  /* ---------- 章节 ---------- */
  V.chapters = function (p) {
    var meta = B().meta;
    var sid = Number(p.sub || meta.subjects[0].id);
    var s = sub(sid);
    var chapters = meta.chapters.filter(function (c) { return c.sub === sid; });
    var all = B().qBySubject[s.code] || [];
    var done = all.filter(function (q) { return S().answers[q.id]; }).length;
    var cor = all.filter(function (q) { return S().answers[q.id] && S().answers[q.id].ok === 2; }).length;
    var html = head('章节目录 · 地毯式过题', s.name);
    html += '<div class="chips">' + meta.subjects.map(function (x) {
      return '<button class="chip ' + (x.id === sid ? 'on' : '') + '" data-act="go" data-view="chapters" data-sub="' + x.id + '">' + e(x.short) + '</button>';
    }).join('') + '</div>';
    html += '<div class="card card-pad spread" style="margin-bottom:16px;flex-wrap:wrap;gap:14px">' +
      '<div><div class="small muted">本科目刷题大盘</div><b style="font-size:17px">共 ' + chapters.length + ' 章 · ' + all.length + ' 道核心习题</b></div>' +
      '<div class="row wrap"><div class="stat" style="padding:8px 14px"><div class="lb">已刷</div><div class="vl" style="font-size:18px">' + done + '</div></div>' +
      '<div class="stat" style="padding:8px 14px"><div class="lb">已掌握</div><div class="vl" style="font-size:18px">' +
      Object.keys(S().review).filter(function (id) { return S().review[id].state === 'MASTERED' && (B().byId[id] || {}).sub === sid; }).length + '</div></div>' +
      '<div class="stat" style="padding:8px 14px"><div class="lb">正确率</div><div class="vl" style="font-size:18px">' + (done ? Y.pct(cor, done) : 0) + '%</div></div></div>' +
      startBtn('全科顺序连刷（从首道未做题继续）', 'subject', s.code, s.short + ' · 全科连刷', 'btn-primary') + '</div>';
    html += '<div class="card">' + chapters.map(function (c, i) {
      // 统考真题没有自带章节，用「讲义 ↔ 题目」对照表按内容归章，章节刷题一并覆盖
      var list = all.filter(function (q) { return Y.chapterIdOf(q) === c.id; });
      var d = list.filter(function (q) { return S().answers[q.id]; }).length;
      var cc = list.filter(function (q) { return S().answers[q.id] && S().answers[q.id].ok === 2; }).length;
      var pp = Y.pct(d, list.length);
      var status = pp >= 100 ? '<span class="tag green">已学完</span>' : d ? '<span class="tag amber">进行中</span>' : '<span class="tag">未开始</span>';
      return '<div class="chapter-row" data-act="start" data-mode="chapter" data-arg="' + c.id + '" data-title="' + e(c.title) + '">' +
        '<div class="idx">' + (i + 1) + '</div><div class="info"><b>' + e(c.title) + '</b>' +
        '<div class="meta">' + list.length + ' 题 · 已刷 ' + d + ' · 正确率 ' + (d ? Y.pct(cc, d) + '%' : '—') + ' ' + status + '</div></div>' +
        '<div class="bar">' + pctBar(pp, pp >= 100 ? 'green' : '') + '</div>' +
        '<button class="btn btn-sm btn-ghost" data-act="go" data-view="notesCh" data-id="' + c.id + '" title="先读本章讲义">读讲义</button>' +
        '<button class="btn btn-sm">' + (d ? '继续' : '去刷题') + '</button></div>';
    }).join('') + '</div>';
    return html;
  };

  /* ---------- 章节对照：讲义 × 教材 × 题目 ---------- */
  /* ---------- 2027 大纲考点总览 ---------- */
  V.syllabus = function (p) {
    var meta = B().meta, SY = Y.SY(), st = SY.stat || {};
    var sid = Number(p.sub || meta.subjects[0].id);
    var chapters = meta.chapters.filter(function (c) { return c.sub === sid; });
    var editions = SY.editions || {};
    var html = head('2027 大纲考点 · 讲义总览',
      (st.chapters || 0) + ' 章 / ' + (st.sections || 0) + ' 节 / ' + (st.items || 0) +
      ' 个官方考点，逐条挂讲义精讲、真题要点与配套题');

    html += '<div class="card card-pad xr-note">' +
      '<div class="xr-note-h">⇄ 这一层讲义是怎么写出来的</div>' +
      '<div class="xr-note-b">' +
      '章节、分节、考点名称逐条取自 <b>' + e(SY.source || '2027 考试大纲') + '</b>——两本辅导书都按大纲考点化编排，' +
      '因此按大纲重排即与两书章节体系对齐；表内另标注两本书<b>公开目录中的页码、考点编号区间、徐涛讲次与对应章</b>，供在自己正版书里定位。' +
      '每个考点的「讲义精讲」来自本站讲义对应段落、「真题要点」由站内 ' + B().questions.length + ' 道题自带的解析归纳，' +
      '<b>不收录《核心考案》《精讲精练》正文</b>。' +
      '</div><div class="xr-note-src">' +
      '<span>肖：' + e(editions.xiao || '《知识点精讲精练》2027') + '</span>' +
      '<span>徐：' + e(editions.xu || '《核心考案》2027') + '</span>' +
      '<span>' + e(editions.note || '') + '</span></div></div>';

    html += '<div class="chips">' + meta.subjects.map(function (x) {
      return '<button class="chip ' + (x.id === sid ? 'on' : '') + '" data-act="go" data-view="syllabus" data-sub="' + x.id + '">' + e(x.short) + '</button>';
    }).join('') + '</div>';

    html += '<div class="card xr-table sy-table"><div class="xr-row xr-th">' +
      '<div>章节</div><div>大纲结构</div><div>肖 · 页码 / 考点</div>' +
      '<div>徐涛 · 对应章 / 讲次</div><div>讲义与进度</div><div>操作</div></div>';

    html += chapters.map(function (c) {
      var sy = Y.syllabusOf(c.id) || { sections: [], ed: {} };
      var ed = sy.ed || {};
      var items = sy.sections.reduce(function (a, s) { return a + (s.items || []).length; }, 0);
      var withText = sy.sections.reduce(function (a, s) {
        return a + (s.items || []).filter(function (it) { return it.nd || it.d; }).length;
      }, 0);
      var list = B().questions.filter(function (q) { return Y.chapterIdOf(q) === c.id; });
      var done = list.filter(function (q) { return S().answers[q.id]; }).length;
      return '<div class="xr-row">' +
        '<div class="xr-ch"><b>' + e(c.title) + '</b>' +
        '<div class="xr-sub">' + e(sub(c.sub).short) + ' · 第 ' + c.id + ' 章</div></div>' +
        '<div class="xr-shape"><b>' + sy.sections.length + '</b> 节 · <b>' + items + '</b> 考点' +
        '<div class="xr-sub">官方考查要点逐条</div></div>' +
        '<div class="xr-ed">' + (ed.xp ? 'p.' + e(ed.xp) : '—') +
        (ed.xk ? '<div class="xr-sub">考点 ' + e(ed.xk) + '</div>' : '') +
        (ed.hp ? '<div class="xr-sub">核心考案 ' + e(ed.hp) + '</div>' : '') + '</div>' +
        '<div class="xr-ed">' + e(String(ed.uc || '—').slice(0, 22)) +
        (ed.lec ? '<div class="xr-sub">' + e(String(ed.lec).slice(0, 20)) + '</div>' : '') + '</div>' +
        '<div class="xr-q"><b>' + done + '</b> / ' + list.length + ' 题已刷' +
        '<div class="xr-sub">' + withText + ' / ' + items + ' 考点有讲解</div></div>' +
        '<div class="xr-act">' +
        '<button class="btn btn-sm btn-ghost" data-act="go" data-view="notesCh" data-id="' + c.id + '">看考点</button>' +
        '<button class="btn btn-sm" data-act="start" data-mode="syl" data-arg="' + c.id +
        '" data-title="' + e(c.title + ' · 大纲考点') + '">练考点</button>' +
        '</div></div>';
    }).join('') + '</div>';

    html += '<div class="card card-pad xr-note" style="margin-top:16px">' +
      '<div class="xr-note-h">使用建议</div><div class="xr-note-b">' +
      '点「看考点」进入该章讲义：顶部是按大纲逐条列出的考点清单，每条都有精讲、真题要点与配套题；' +
      '下面是按同一章重排的讲义正文、重点梳理与易混辨析。点「练考点」则直接组一套该章所有大纲考点对应的题目。' +
      '页码与讲次按 2027 版公开目录整理，不同印次可能有数页偏差，以手上的正版书为准。' +
      '</div></div>';
    return html;
  };

  V.xref = function (p) {
    var meta = B().meta, X = Y.X(), st = X.stat || {};
    var sid = Number(p.sub || meta.subjects[0].id);
    var chapters = meta.chapters.filter(function (c) { return c.sub === sid; });
    var edt = X.editions || {};
    var html = head('章节对照 · 讲义 × 教材 × 题目',
      st.questions + ' 道题全部挂到 ' + st.chapters + ' 章 / ' + st.sections + ' 节 / ' + st.points + ' 个知识点，含按内容归章的历年真题');

    html += '<div class="card card-pad xr-note">' +
      '<div class="xr-note-h">⇄ 这一页解决什么</div>' +
      '<div class="xr-note-b">' +
      '左边是章节，中间是两本主流辅导书的<b>公开目录位置</b>（只对齐章名与页码，不收录原书正文），右边是本站自编讲义的知识点与题目。' +
      '原来 15 套统考真题没有章节，现已按题干与讲义的语义重合度归到对应章节；每道题在刷题页都有「↗ 讲义」回链，每个知识点也能直接练相关题。' +
      '</div>' +
      '<div class="xr-note-src">' +
      '<span>肖：' + e(edt.xiao || '《知识点精讲精练》') + '</span>' +
      '<span>徐：' + e(edt.xu || '《核心考案》') + '</span>' +
      '<span>' + e(edt.note || '') + '</span></div>' +
      '</div>';

    html += '<div class="chips">' + meta.subjects.map(function (x) {
      return '<button class="chip ' + (x.id === sid ? 'on' : '') + '" data-act="go" data-view="xref" data-sub="' + x.id + '">' + e(x.short) + '</button>';
    }).join('') + '</div>';

    html += '<div class="card xr-table"><div class="xr-row xr-th">' +
      '<div>章节</div><div>肖 · 页码</div><div>徐 · 对应章</div>' +
      '<div>讲义结构</div><div>题目构成</div><div>操作</div></div>';

    html += chapters.map(function (c) {
      var k = String(c.id), ed = X.ed[k] || {}, sp = (X.shape || {})[k] || [0, 0, 0];
      var src = X.chapterSrc[k] || {}, total = X.chapterCount[k] || 0;
      var list = B().questions.filter(function (q) { return Y.chapterIdOf(q) === c.id; });
      var done = list.filter(function (q) { return S().answers[q.id]; }).length;
      return '<div class="xr-row">' +
        '<div class="xr-ch"><b>' + e(c.title) + '</b>' +
        '<div class="xr-sub">已刷 ' + done + ' / ' + list.length + ' 题</div></div>' +
        '<div class="xr-ed">' + (ed.xp ? 'p.' + ed.xp : '—') + '<div class="xr-sub">' + e(String(ed.xc || '').slice(0, 18)) + '</div></div>' +
        '<div class="xr-ed">' + e(String(ed.uc || '—').slice(0, 26)) +
        (ed.split ? '<div class="xr-sub">' + e(String(ed.split).slice(0, 22)) + '</div>' : '') + '</div>' +
        '<div class="xr-shape">' + sp[0] + ' 节 · ' + sp[1] + ' 点<div class="xr-sub">' + sp[2] + ' 条必背</div></div>' +
        '<div class="xr-q"><b>' + total + '</b> 题<div class="xr-sub">' +
        '习题 ' + (src.book || 0) + ' · 真题 ' + (src.real || 0) + ' · 扩充 ' + (src.extra || 0) + '</div></div>' +
        '<div class="xr-act">' +
        '<button class="btn btn-sm btn-ghost" data-act="go" data-view="notesCh" data-id="' + c.id + '">读讲义</button>' +
        '<button class="btn btn-sm" data-act="start" data-mode="chapter" data-arg="' + c.id + '" data-title="' + e(c.title) + '">练本章</button>' +
        '</div></div>';
    }).join('') + '</div>';

    html += '<div class="card card-pad xr-note" style="margin-top:16px">' +
      '<div class="xr-note-h">关于对应关系</div><div class="xr-note-b">' +
      '练习题沿用题库原有章节；真题与扩充题按题干、选项、解析同讲义小节的关键词重合度自动归章，属于<b>复习导航</b>而非官方知识点编号。' +
      '一道题可能同时关联多个知识点，刷题页的「↗ 讲义」指向匹配度最高的那一节。' +
      '</div></div>';
    return html;
  };

  /* ---------- 真题模考 ---------- */
  V.exams = function () {
    var meta = B().meta;
    var html = head('全国统考真题模考全卷', meta.examPapers.length + ' 套历年全真试卷 · 标准 50 分制 · 按年份倒序');
    html += '<div class="card card-pad" style="margin-bottom:16px"><div class="row wrap spread">' +
      '<div><b>2010—2024 完整收录</b><div class="small muted">单选 1 分 / 多选 2 分，交卷后生成学情诊断报告</div></div>' +
      startBtn('随机组卷 20 题', 'random', 20, '随机组卷 · 20 题') + '</div></div>';
    html += '<div class="list-col">' + meta.examPapers.map(paperRow).join('') + '</div>';
    return html;
  };

  /* ---------- 练习 ---------- */
  V.practice = function () {
    var s = S().session;
    if (!s) return head('刷题练习', '请从章节、科目或真题卷开始') + empty('✍', '还没有进行中的练习', '从「章节刷题」或「真题模考」挑一组题开始吧',
      '<button class="btn btn-primary" data-act="go" data-view="chapters">去章节刷题</button>');
    var qs = Y.sessionQuestions(), q = qs[s.index];
    if (!q) return practiceDone(qs);
    var ans = S().answers[q.id];
    var pending = S().ui.pending;
    var sel = ans ? ans.a : (pending && pending.qid === q.id ? pending.sel : []);
    var memorize = s.view === 'memorize';
    var locked = !!ans || memorize;
    var key = Y.answerKey(q);
    var isFav = S().favorites.indexOf(q.id) >= 0;
    var subj = sub(q.sub);
    var xr = Y.xrefOf(q);

    var html = '<div class="practice"><div class="pr-top">' +
      '<button class="icon-btn" data-act="back" title="返回">←</button>' +
      '<div class="ttl">' + e(s.title) + '</div>' +
      '<div class="cnt">' + (s.index + 1) + ' / ' + qs.length + ' 题 · 已答 ' + qs.filter(function (x) { return S().answers[x.id]; }).length + '</div>' +
      '<div class="seg"><button class="' + (s.view === 'do' ? 'on' : '') + '" data-act="view-mode" data-v="do">✍ 做题</button>' +
      '<button class="' + (memorize ? 'on' : '') + '" data-act="view-mode" data-v="memorize">📖 背题</button></div>' +
      '<button class="icon-btn" data-act="fav" data-id="' + e(q.id) + '" title="收藏" style="font-size:18px;color:' + (isFav ? 'var(--amber)' : 'var(--text2)') + '">' + (isFav ? '★' : '☆') + '</button>' +
      '</div><div class="pr-progress"><i style="width:' + ((s.index + 1) / qs.length * 100) + '%"></i></div>';

    html += '<div class="qcard"><div class="qmeta">' + typeTag(q) + statusTag(q) +
      '<span class="tag">' + e(subj.short) + '</span><span class="tag">' + e(chTitle(q)) + '</span>' +
      (xr ? '<button class="tag xr-link" data-act="go" data-view="notesCh" data-id="' + xr.cid +
        '" title="回到本题对应的讲义小节">↗ 讲义 · ' + e(String(xr.sec || '本章').slice(0, 12)) + '</button>' : '') +
      '<span class="tag">' + e(q.tag) + '</span>' +
      (q.year ? '<span class="tag">' + q.year + ' 年</span>' : '') +
      (S().mistakes[q.id] && S().mistakes[q.id].count ? '<span class="tag amber">历史失误 ' + S().mistakes[q.id].count + ' 次</span>' : '') +
      '</div>';
    if (q.material) html += '<div class="material">' + e(q.material) + '</div>';
    html += '<div class="qstem">' + e(q.stem) + '</div><div class="opts">';
    q.options.forEach(function (o) {
      var cls = 'opt';
      if (memorize) {
        if (o.correct) cls += ' correct';
        cls += ' locked';
      } else if (ans) {
        cls += ' locked';
        if (o.correct) cls += (sel.indexOf(o.label) >= 0 ? ' correct' : ' miss');
        else if (sel.indexOf(o.label) >= 0) cls += ' wrong';
      } else if (sel.indexOf(o.label) >= 0) cls += ' selected';
      html += '<button class="' + cls + '" data-act="opt" data-lab="' + o.label + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="lab">' + o.label + '</span><span class="txt">' + e(o.text) + '</span></button>';
    });
    html += '</div>';

    if (!locked && q.type === 'MULTI_CHOICE') {
      html += '<div class="submit-row"><button class="btn btn-primary" data-act="submit-multi" ' + (sel.length ? '' : 'disabled') + '>确认提交（已选 ' + sel.length + ' 项）</button>' +
        '<span class="small muted">多选题需手动提交；多选、少选、错选均不得分</span></div>';
    }
    if (locked) html += feedback(q, ans, memorize, key);
    html += '</div>';

    html += '<div class="pr-bottom">' +
      '<button class="btn" data-act="prev" ' + (s.index === 0 ? 'disabled' : '') + '>← 上一题</button>' +
      '<button class="btn mid" data-act="sheet">📋 答题卡 <span class="small muted">' +
      qs.filter(function (x) { return S().answers[x.id]; }).length + '/' + qs.length + '</span></button>' +
      (s.index === qs.length - 1
        ? '<button class="btn btn-primary" data-act="finish">交卷 / 报告</button>'
        : '<button class="btn btn-primary" data-act="next">下一题 →</button>') + '</div>';
    html += '<div class="small muted" style="text-align:center;margin-top:14px">进度自动保存在本浏览器 · 可随时离开后继续</div></div>';
    return html;
  };
  function feedback(q, ans, memorize, key) {
    var cls = memorize ? '' : ans.ok === 2 ? 'ok' : 'bad';
    var missed = ans && key && ans.a.length > 0 && ans.a.length < key.length &&
      ans.a.every(function (x) { return key.indexOf(x) >= 0; });
    var title = memorize ? '背题模式 · 官方标准考点精析'
      : ans.ok === 2 ? '✓ 回答正确！'
      : missed ? '✗ 漏选（少选同样 0 分，已编入错题本）'
      : '✗ 回答错误（已编入艾宾浩斯复习流）';
    var h = '<div class="feedback ' + cls + '"><div class="fb-head">' + title + '</div>' +
      '<div class="answers"><span>正确答案：<b>' + key.join('') + '</b></span>' +
      (ans ? '<span>你的作答：<b>' + (ans.a.length ? ans.a.join('') : '未作答') + '</b></span>' : '') +
      '<span>章节考点：' + e(chTitle(q)) + '</span></div>' +
      '<h4>【答案解析与考点溯源】</h4><div class="analysis">' + e(q.analysis) + '</div>';
    var traps = q.options.filter(function (o) { return o.trap; });
    if (traps.length) {
      h += '<h4>【干扰项辨识】</h4><div class="analysis">' +
        traps.map(function (o) { return o.label + '. ' + e(o.trap); }).join('\n') + '</div>';
    }
    if (ans) {
      h += '<div class="note-box"><div class="small muted" style="margin-bottom:6px">考点笔记与心得总结</div>' +
        '<textarea id="note-input" placeholder="记录该题考点口诀、辨析陷阱或错因反思…">' + e(ans.note || '') + '</textarea>' +
        '<div class="row" style="margin-top:8px"><button class="btn btn-sm" data-act="save-note" data-id="' + e(q.id) + '">保存笔记</button>' +
        '<button class="btn btn-sm" data-act="redo" data-id="' + e(q.id) + '">↺ 重做本题</button>' +
        '<button class="btn btn-sm" data-act="practice-one" data-id="' + e(q.id) + '">单题再练</button></div></div>';
    }
    return h + '</div>';
  }
  function practiceDone(qs) {
    var done = qs.filter(function (x) { return S().answers[x.id]; }).length;
    var score = qs.reduce(function (a, q) {
      var r = S().answers[q.id];
      if (!r || r.ok !== 2) return a;
      return a + (q.type === 'MULTI_CHOICE' ? 2 : 1);
    }, 0);
    return head('本组已完成', '状态已实时同步至打卡日历与艾宾浩斯复习流') +
      '<div class="card card-pad" style="text-align:center">' +
      empty('🎉', '本组题目已完成！', '共 ' + qs.length + ' 题 · 已作答 ' + done + ' 题 · 预估得分 ' + score + ' 分') +
      '<div class="row wrap" style="justify-content:center">' +
      '<button class="btn btn-primary" data-act="finish">查看诊断报告</button>' +
      startBtn('再来一组新题', 'new', 15, '再来一组新题') +
      startBtn('专项弱项扫雷', 'weak', '', '专项弱项扫雷') + '</div></div>';
  }

  /* ---------- 答题卡 / 诊断报告 弹层 ---------- */
  V.answerSheet = function () {
    var s = S().session, qs = Y.sessionQuestions();
    var done = 0, cor = 0;
    var cells = qs.map(function (q, i) {
      var a = S().answers[q.id], cls = '';
      if (a) { done++; if (a.ok === 2) cor++; cls = a.ok === 2 ? 'ok' : 'bad'; }
      if (i === s.index) cls += ' cur';
      return '<button class="ans-cell ' + cls + '" data-act="jump" data-i="' + i + '">' + (i + 1) +
        '<small>' + (q.type === 'MULTI_CHOICE' ? '多选' : '单选') + '</small></button>';
    }).join('');
    return '<div class="sheet-head"><b>📋 全卷答题卡</b><button class="icon-btn" data-act="close-sheet">✕</button></div>' +
      '<div class="sheet-body"><div class="spread" style="margin-bottom:12px"><span class="small muted">已答 ' + done + ' / ' + qs.length + ' 题 · 答对 ' + cor + ' 题</span>' +
      '<button class="btn btn-sm btn-primary" data-act="finish">诊断报告</button></div>' +
      '<div class="legend"><span><i style="background:var(--green-soft);border:1px solid var(--green)"></i>正确</span>' +
      '<span><i style="background:var(--danger-soft);border:1px solid var(--danger)"></i>错误（含少选、错选）</span>' +
      '<span><i style="background:var(--surface2);border:1px solid var(--brand)"></i>当前题</span>' +
      '<span><i style="background:var(--surface3);border:1px solid var(--line)"></i>未答</span></div>' +
      '<div class="answer-sheet-grid">' + cells + '</div></div>';
  };
  V.practiceReport = function () {
    var s = S().session, qs = Y.sessionQuestions();
    var done = 0, cor = 0, singleCor = 0, multiCor = 0, score = 0, max = 0, bad = [];
    qs.forEach(function (q, i) {
      var pt = q.type === 'MULTI_CHOICE' ? 2 : 1;
      max += pt;
      var a = S().answers[q.id];
      if (!a) return;
      done++;
      if (a.ok === 2) {
        cor++; score += pt;
        if (q.type === 'MULTI_CHOICE') multiCor++; else singleCor++;
      } else bad.push(i + 1);
    });
    return '<div class="sheet-head"><b>模考成绩与学情诊断</b><button class="icon-btn" data-act="close-sheet">✕</button></div>' +
      '<div class="sheet-body"><div class="grid g2" style="margin-bottom:16px">' +
      '<div class="stat hl"><div class="lb">预估得分（标准考研分值）</div><div class="vl">' + score + ' / ' + max + '</div><div class="sub">' + e(s.title) + '</div></div>' +
      '<div class="stat"><div class="lb">答题进度 / 正确率</div><div class="vl">' + done + '/' + qs.length + '</div>' +
      '<div class="sub">正确率 ' + Y.pct(cor, done) + '% · 单选题答对 ' + singleCor + ' · 多选题答对 ' + multiCor + '</div></div></div>' +
      '<div class="tpl-block"><div class="lb">❌ 失分 / 未拿全题目</div><div class="bd">' +
      (bad.length ? bad.map(function (n) { return '<button class="btn btn-sm" style="margin:3px" data-act="jump" data-i="' + (n - 1) + '">第 ' + n + ' 题</button>'; }).join('')
        : '全部答对，太棒了！') + '</div></div>' +
      '<div class="row" style="margin-top:18px;justify-content:flex-end">' +
      startBtn('再来一组新题', 'new', 15, '再来一组新题') +
      '<button class="btn btn-primary" data-act="close-sheet">继续做题</button></div></div>';
  };

  /* ---------- 错题 / 收藏 / 复习 ---------- */
  function qListCard(q, idx, extra) {
    return '<div class="search-item" data-act="practice-one" data-id="' + e(q.id) + '">' +
      '<div class="qmeta" style="margin-bottom:7px">' + typeTag(q) + '<span class="tag">' + e(sub(q.sub).short) + '</span>' +
      '<span class="tag">' + e(q.tag) + '</span>' + (extra || '') + '</div>' +
      '<div class="st">' + (idx + 1) + '. ' + e(q.stem) + '</div>' +
      '<div class="ex">正确答案 ' + Y.answerKey(q).join('') + ' · ' + e(chTitle(q)) + ' · ' + e((q.analysis || '').slice(0, 90)) + '…</div></div>';
  }
  V.mistakes = function () {
    var ids = Object.keys(S().mistakes).filter(function (id) { return B().byId[id]; });
    var open = ids.filter(function (id) { return !S().mistakes[id].mastered; });
    ids.sort(function (a, b) { return (S().mistakes[b].count || 0) - (S().mistakes[a].count || 0); });
    var html = head('艾宾浩斯智能错题本', '基于记忆衰减算法动态排序，重刷高频失分盲点');
    html += '<div class="grid g4" style="margin-bottom:16px">' +
      statBox('待攻克错题', open.length) + statBox('累计错题', ids.length) +
      statBox('已掌握', ids.length - open.length) + statBox('累计失误次数', ids.reduce(function (a, id) { return a + S().mistakes[id].count; }, 0)) + '</div>';
    if (!ids.length) return html + '<div class="card">' + empty('✨', '错题本还是空的', '去刷题吧，答错的题会自动进入复习流',
      '<button class="btn btn-primary" data-act="go" data-view="chapters">去章节刷题</button>') + '</div>';
    html += '<div class="row wrap" style="margin-bottom:14px">' +
      startBtn('立即复习全部错题', 'mistakes', '', '错题本 · 智能重刷', 'btn-primary') +
      startBtn('专项弱项扫雷 15 题', 'weak', '', '专项弱项扫雷') +
      '<button class="btn" data-act="wrongall">查看全部错题（含已掌握）</button></div>';
    html += '<div class="list-col">' + ids.slice(0, 100).map(function (id, i) {
      var m = S().mistakes[id];
      return qListCard(B().byId[id], i, '<span class="tag ' + (m.mastered ? 'green' : 'amber') + '">' +
        (m.mastered ? '已掌握' : '错 ' + m.count + ' 次') + '</span>') +
        '<div class="row" style="padding:0 14px 12px;gap:6px"><button class="btn btn-sm" data-act="master" data-id="' + e(id) + '">' +
        (m.mastered ? '重新加入复习' : '标记已掌握') + '</button>' +
        '<button class="btn btn-sm" data-act="remove-mistake" data-id="' + e(id) + '">移出错题本</button></div>';
    }).join('') + '</div>';
    return html;
  };
  function statBox(label, val, sub) {
    return '<div class="stat"><div class="lb">' + label + '</div><div class="vl">' + val + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }
  V.favorites = function () {
    var ids = S().favorites.filter(function (id) { return B().byId[id]; });
    var html = head('我的收藏', '星标题目集中重刷，随时取消收藏');
    if (!ids.length) return html + '<div class="card">' + empty('☆', '还没有收藏题目', '在练习页点击右上角星标即可收藏',
      '<button class="btn btn-primary" data-act="go" data-view="practice">去刷题</button>') + '</div>';
    html += '<div class="row wrap" style="margin-bottom:14px">' + startBtn('练习全部收藏题', 'favorites', '', '我的收藏', 'btn-primary') +
      '<button class="btn" data-act="clear-fav">清空收藏</button></div>';
    return html + '<div class="list-col">' + ids.map(function (id, i) {
      return qListCard(B().byId[id], i, '') + '<div style="padding:0 14px 12px"><button class="btn btn-sm" data-act="fav" data-id="' + e(id) + '">取消收藏</button></div>';
    }).join('') + '</div>';
  };
  V.review = function () {
    var st = Y.stats();
    var ids = st.dueList.sort(function (a, b) {
      return (S().review[a].due < S().review[b].due ? -1 : 1) || (S().review[a].ef - S().review[b].ef);
    });
    var html = head('今日艾宾浩斯复习任务', '按记忆衰减曲线动态排序，易忘 + 高频错优先');
    html += '<div class="grid g3" style="margin-bottom:16px">' + statBox('今日到期', ids.length) +
      statBox('已掌握题目', st.mastered) + statBox('明日到期', Object.keys(S().review).filter(function (id) { return S().review[id].due === Y.addDays(Y.today(), 1); }).length) + '</div>';
    if (!ids.length) return html + '<div class="card">' + empty('🌿', '当前没有到期的复习题', '继续刷点新题，系统会自动安排最佳复习日期',
      startBtn('开始今日新题', 'new', st.quota, '今日新题任务', 'btn-primary')) + '</div>';
    html += '<div class="row wrap" style="margin-bottom:14px">' +
      startBtn('消化到期复习（' + Math.min(ids.length, 100) + ' 题）', 'review', '', '今日到期复习', 'btn-primary') + '</div>';
    return html + '<div class="list-col">' + ids.slice(0, 60).map(function (id, i) {
      var r = S().review[id];
      return qListCard(B().byId[id], i, '<span class="tag amber">间隔 ' + r.interval + ' 天 · EF ' + r.ef + '</span>');
    }).join('') + '</div>';
  };

  /* ---------- 背诵卡片 ---------- */
  V.recite = function (p) {
    var sid = Number(p.sub || 0);
    var pts = B().points.filter(function (x) { return !sid || x.sub === sid; });
    var idx = Y.clamp(Number(p.i || 0), 0, Math.max(0, pts.length - 1));
    var doneCount = B().points.filter(function (x) { return S().recite[x.id]; }).length;
    var html = head('沉浸式背诵自测', '挖空遮挡自测 · 艾宾浩斯抗遗忘调度');
    html += '<div class="chips"><button class="chip ' + (!sid ? 'on' : '') + '" data-act="go" data-view="recite">全部高频考点</button>' +
      B().meta.subjects.map(function (s) {
        return '<button class="chip ' + (sid === s.id ? 'on' : '') + '" data-act="go" data-view="recite" data-sub="' + s.id + '">' + e(s.short) + '</button>';
      }).join('') + '</div>';
    html += '<div class="row wrap spread" style="margin-bottom:14px"><span class="small muted">当前库内考点 <b>' + pts.length + '</b> 个 · 已自评 ' + doneCount + ' 个 · 💡 点击灰色遮块即可揭晓考眼</span>' +
      '<button class="btn btn-sm" data-act="recite-reset">重置遮挡</button></div>';
    if (!pts.length) return html + '<div class="card">' + empty('📖', '当前科目暂无专属考点', '切换到「全部高频考点」试试',
      '<button class="btn" data-act="go" data-view="recite">查看全部高频考点</button>') + '</div>';
    var pt = pts[idx];
    var shown = S().ui.clozeShown[pt.id] || {};
    var parts = pt.cloze.split(/(\{\{.+?\}\})/g), ci = 0;
    var cloze = parts.map(function (seg) {
      if (/^\{\{.+?\}\}$/.test(seg)) {
        var word = seg.slice(2, -2), k = 'k' + (ci++);
        return '<span class="blank' + (shown[k] ? ' revealed' : '') + '" data-act="blank" data-k="' + k + '">' + e(word) + '</span>';
      }
      return e(seg);
    }).join('');
    var r = S().recite[pt.id];
    html += '<div class="recite-card"><div class="qmeta"><span class="tag brand">' + e(sub(pt.sub).short) + '</span>' +
      '<span class="tag">' + e(pt.book) + '</span>' +
      '<span class="tag amber">' + '★'.repeat(pt.importance) + '</span>' +
      (pt.subjective ? '<span class="tag green">🔥 大题考点</span>' : '') +
      (r ? '<span class="tag blue">已自评 · ' + ({ SOLID: '牢固', VAGUE: '模糊', UNFAMILIAR: '生疏' }[r.level] || '') + ' · 下次 ' + r.due + '</span>' : '') +
      '<span class="tag">' + (idx + 1) + ' / ' + pts.length + '</span></div>' +
      '<h2 style="font-size:17px;margin:8px 0 12px">' + e(pt.title) + '</h2>' +
      '<div class="tpl-block"><div class="lb">【核心要义】</div><div class="bd">' + e(pt.summary) + '</div></div>' +
      '<div class="tpl-block"><div class="lb">🎯 核心考眼挖空自测</div><div class="cloze">' + cloze + '</div></div>' +
      '<div class="row wrap" style="margin-top:12px"><button class="btn btn-sm" data-act="reveal-all" data-id="' + e(pt.id) + '">一键揭晓</button>' +
      '<button class="btn btn-sm" data-act="hide-all" data-id="' + e(pt.id) + '">重新遮挡</button>' +
      '<span class="small muted">完整原文：</span></div>' +
      '<div class="tpl-block"><div class="bd">' + e(pt.content) + '</div></div>' +
      '<div class="lb" style="font-size:12px;font-weight:700;color:var(--brand);margin-top:16px">自评掌握程度（写入复习排期）</div>' +
      '<div class="self-rate">' +
      '<button class="btn" data-act="rate" data-lv="UNFAMILIAR" data-id="' + e(pt.id) + '">生疏（明天再来）</button>' +
      '<button class="btn" data-act="rate" data-lv="VAGUE" data-id="' + e(pt.id) + '">模糊（近期加练）</button>' +
      '<button class="btn btn-primary" data-act="rate" data-lv="SOLID" data-id="' + e(pt.id) + '">牢固（间隔递增）</button></div>' +
      '<div class="row" style="margin-top:16px"><button class="btn" data-act="recite-nav" data-i="' + (idx - 1) + '" ' + (idx === 0 ? 'disabled' : '') + '>← 上一张</button>' +
      '<div style="flex:1;text-align:center" class="small muted">' + pts.length + ' 张卡片</div>' +
      '<button class="btn btn-primary" data-act="recite-nav" data-i="' + (idx + 1) + '" ' + (idx >= pts.length - 1 ? 'disabled' : '') + '>下一张 →</button></div></div>';
    return html;
  };
  /* ---------- 万能模板 ---------- */
  V.templates = function (p) {
    var cat = p.cat || '';
    var list = B().templates.filter(function (t) { return !cat || t.category === cat; });
    var cats = Array.from(new Set(B().templates.map(function (t) { return t.category; })));
    var html = head('考研政治万能答题模板库', '点 · 默 · 析 · 升 —— 万能金句与材料套话公式');
    html += '<div class="chips"><button class="chip ' + (!cat ? 'on' : '') + '" data-act="go" data-view="templates">全部模板</button>' +
      cats.map(function (c) { return '<button class="chip ' + (cat === c ? 'on' : '') + '" data-act="go" data-view="templates" data-cat="' + e(c) + '">' + e(c) + '</button>'; }).join('') + '</div>';
    html += list.map(function (t) {
      return '<div class="tpl-card"><div class="qmeta"><span class="tag brand">第 ' + t.targetNo + ' 题</span>' +
        '<span class="tag">' + e(t.category) + '</span><span class="tag blue">' + e(sub(t.sub).short) + '</span>' +
        '<span class="tag">' + e(t.tags) + '</span></div>' +
        '<h3 style="font-size:15px;margin:8px 0 4px">' + e(t.title) + '</h3>' +
        block('💎 原理默写金句（点明原理分）', t.theory) +
        block('⚖️ 方法论要求（行动指南分）', t.method) +
        block('🧩 材料串联公式（结合材料分析分）', t.formula) +
        block('📌 适用设问场景', t.scenarios) +
        (t.answer ? block('📖 规范范文', t.answer) : '') +
        (t.scoring && t.scoring.length ? '<div class="tpl-block"><div class="lb">📋 采分点清单</div>' +
          t.scoring.map(function (sp) { return '<div class="score-point"><b>' + sp.point_no + '. ' + e(sp.title) + '（' + sp.score + ' 分）</b><div class="small muted">' + e(sp.desc || '') + '</div><div class="small">关键词：' + e((sp.keywords || []).join(' / ')) + '</div></div>'; }).join('') + '</div>' : '') +
        '</div>';
    }).join('');
    return html;
  };
  function block(lb, bd) {
    return '<div class="tpl-block"><div class="lb">' + e(lb) + '</div><div class="bd">' + e(bd) + '</div></div>';
  }

  /* ---------- 材料分析题（智能采分） ---------- */
  V.essays = function (p) {
    var list = B().essays;
    if (!list.length) return head('材料分析大题实训', '肖四押题热点 · 采分点拆解 · 关键词比对') + empty('✎', '暂无分析题', '');
    var idx = Y.clamp(Number(p.i || 0), 0, list.length - 1);
    var q = list[idx], rec = S().essays[q.id];
    var criteria = Y.parseJSON(q.criteria, []);
    var html = head('材料分析大题实训', '统考真题 · 押题热点 · 采分点拆解 · 关键词比对');
    html += '<div class="chips">' + list.map(function (x, i) {
      return '<button class="chip ' + (i === idx ? 'on' : '') + '" data-act="go" data-view="essays" data-i="' + i + '">分析题 ' + (i + 1) + ' · ' + e(sub(x.sub).short) + '</button>';
    }).join('') + '</div>';
    html += '<div class="card card-pad"><div class="qmeta">' + typeTag(q) + '<span class="tag">' + e(sub(q.sub).short) + '</span>' +
      '<span class="tag">' + e(q.tag) + '</span></div>' +
      (q.material ? block('背景材料', q.material) : '') +
      block('【设问】', q.stem) +
      (q.guide ? block('审题思路逻辑树', q.guide) : '') + '</div>';
    html += '<div class="card card-pad" style="margin-top:14px"><div class="lb" style="font-size:13px;font-weight:700;color:var(--brand);margin-bottom:8px">✍️ 我的作答（键入或粘贴作答要点）</div>' +
      '<textarea class="essay-input" id="essay-input" placeholder="在此写下你的作答思路：点明原理 -> 结合材料分层论述 -> 总结升华…">' + e(rec ? rec.text : '') + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="essay-check" data-id="' + e(q.id) + '">提交智能核验 · 对照真题采分点</button>' +
      (q.tpl ? '<button class="btn" data-act="find-template" data-tpl="' + e(q.tpl) + '">查看关联万能模板</button>' : '') + '</div></div>';
    if (rec) {
      var kws = Array.from(new Set(criteria.reduce(function (a, c) { return a.concat(c.keywords || []); }, [])));
      var hit = kws.filter(function (k) { return rec.text.toLowerCase().indexOf(k.toLowerCase()) >= 0; });
      var miss = kws.filter(function (k) { return hit.indexOf(k) < 0; });
      html += '<div class="card card-pad" style="margin-top:14px"><b>📊 智能采分对照报告</b>' +
        '<div class="grid g2" style="margin:14px 0">' + statBox('关键词命中率', Y.pct(hit.length, kws.length) + '%') +
        statBox('系统建议得分', rec.score + ' / ' + (q.score || 10) + ' 分') + '</div>' +
        '<div class="lb small">✓ 命中考眼词</div><div>' + (hit.length ? hit.map(function (k) { return '<span class="kw hit">' + e(k) + '</span>'; }).join('') : '<span class="small muted">暂未命中考点关键词</span>') + '</div>' +
        '<div class="lb small" style="margin-top:10px">✗ 遗漏考眼词</div><div>' + (miss.length ? miss.map(function (k) { return '<span class="kw miss">' + e(k) + '</span>'; }).join('') : '<span class="small muted">太棒了！已全部命中采分关键词</span>') + '</div>' +
        '<div class="lb small" style="margin-top:14px;color:var(--brand);font-weight:700">📋 官方权威采分点拆解细则</div>' +
        criteria.map(function (sp) { return '<div class="score-point"><b>' + sp.point_no + '. ' + e(sp.title) + '（' + sp.score + ' 分）</b><div class="small muted">' + e(sp.desc || '') + '</div></div>'; }).join('') +
        block('📖 完整标准答案与解析', q.analysis) + '</div>';
    }
    return html;
  };

  /* ---------- 搜索 ---------- */
  V.search = function (p) {
    var kw = p.q || '', sid = Number(p.sub || 0), type = p.type || '';
    var r = Y.search(kw, sid, type);
    var html = head('全文检索', '检索题干、解析、材料与背诵考点' + (kw ? ' · 关键词「' + kw + '」' : ''));
    html += '<div class="card card-pad" style="margin-bottom:14px"><div class="row wrap">' +
      '<input type="text" id="page-search" style="flex:1;min-width:180px" placeholder="例如：新质生产力 / 矛盾 / 全过程人民民主" value="' + e(kw) + '">' +
      '<button class="btn btn-primary" data-act="page-search">检索</button></div></div>';
    html += '<div class="chips"><button class="chip ' + (!sid ? 'on' : '') + '" data-act="search-filter" data-sub="0">全部科目</button>' +
      B().meta.subjects.map(function (s) { return '<button class="chip ' + (sid === s.id ? 'on' : '') + '" data-act="search-filter" data-sub="' + s.id + '">' + e(s.short) + '</button>'; }).join('') +
      '<button class="chip ' + (type === 'SINGLE_CHOICE' ? 'on' : '') + '" data-act="search-filter" data-type="SINGLE_CHOICE">单选</button>' +
      '<button class="chip ' + (type === 'MULTI_CHOICE' ? 'on' : '') + '" data-act="search-filter" data-type="MULTI_CHOICE">多选</button></div>';
    if (!kw) return html + '<div class="card">' + empty('⌕', '输入关键词开始检索', '支持题干、选项解析、材料与 69 篇背诵考点全文') + '</div>';
    if (!r.count) return html + '<div class="card">' + empty('🔍', '没有找到相关内容', '试试更短的关键词，例如「生产力」「统一战线」') + '</div>';
    html += '<div class="small muted" style="margin-bottom:10px">共命中 ' + r.questions.length + ' 道题 · ' + r.points.length + ' 个考点' +
      (r.questions.length ? ' <button class="btn btn-sm" data-act="search-practice" style="margin-left:8px">练习这些题目</button>' : '') + '</div>';
    if (r.points.length) {
      html += '<div class="sec-title"><i class="dot"></i>关联背诵考点</div><div class="list-col">' + r.points.slice(0, 12).map(function (pt) {
        return '<div class="search-item" data-act="go" data-view="recite" data-sub="' + pt.sub + '"><b>' + Y.highlight(pt.title, kw) + '</b>' +
          '<div class="ex">' + Y.highlight(pt.summary, kw) + '</div></div>';
      }).join('') + '</div>';
    }
    html += '<div class="sec-title"><i class="dot"></i>关联题目</div><div class="list-col">' +
      r.questions.slice(0, 80).map(function (q, i) {
        return '<div class="search-item" data-act="practice-one" data-id="' + e(q.id) + '">' +
          '<div class="qmeta" style="margin-bottom:7px">' + typeTag(q) + '<span class="tag">' + e(sub(q.sub).short) + '</span><span class="tag">' + e(q.tag) + '</span></div>' +
          '<div class="st">' + (i + 1) + '. ' + Y.highlight(q.stem, kw) + '</div>' +
          '<div class="ex">' + Y.highlight((q.analysis || '').slice(0, 130), kw) + '…</div></div>';
      }).join('') + '</div>';
    return html;
  };

  /* ---------- 学习报告 ---------- */
  V.report = function (p) {
    var st = Y.stats();
    var ym = p.ym || Y.today().slice(0, 7);
    var html = head('学习报告 & 打卡日历', '近 12 周刷题热力图 · 每日战况 · 科目掌握度');
    html += '<div class="grid g4" style="margin-bottom:18px">' +
      statBox('累计答题次数', st.attempts) + statBox('累计正确率', st.accuracy + '%') +
      statBox('已刷 / 总题量', st.done + ' / ' + st.total) + statBox('连续打卡', st.streak + ' 天') + '</div>';
    html += '<div class="grid g2"><div class="card card-pad"><b>各科目掌握度</b><div style="margin-top:14px">' +
      st.bySubject.map(function (x) {
        return '<div class="bar-row"><span class="nm">' + e(x.subject.short) + '</span><span class="track">' + pctBar(x.pct) + '</span>' +
          '<span class="vv">' + x.done + '/' + x.total + ' · ' + x.pct + '%</span></div>';
      }).join('') + '</div></div>' +
      '<div class="card card-pad"><b>各科目正确率</b><div style="margin-top:14px">' +
      st.bySubject.map(function (x) {
        return '<div class="bar-row"><span class="nm">' + e(x.subject.short) + '</span><span class="track">' + pctBar(x.acc, 'green') + '</span>' +
          '<span class="vv">' + (x.done ? x.acc + '%' : '—') + '</span></div>';
      }).join('') + '</div></div></div>';

    // 热力图：12 周 × 7 天
    var end = Y.today(), cells = '';
    for (var w = 11; w >= 0; w--) {
      var col = '';
      for (var d = 6; d >= 0; d--) {
        var ds = Y.addDays(end, -(w * 7 + d));
        var log = S().daily[ds], n = log ? log.t : 0;
        var lv = n === 0 ? '' : n <= 10 ? 'l1' : n <= 25 ? 'l2' : n <= 50 ? 'l3' : 'l4';
        col += '<div class="heat-cell ' + lv + '" title="' + ds + ' · ' + n + ' 题" data-act="pick-day" data-d="' + ds + '"></div>';
      }
      cells += '<div class="heat-col">' + col + '</div>';
    }
    html += '<div class="sec-title"><i class="dot"></i>近 12 周刷题热力图' +
      '<span class="more">少 <i style="display:inline-block;width:10px;height:10px;background:var(--surface3);border-radius:2px"></i> ' +
      '<i style="display:inline-block;width:10px;height:10px;background:#8ED0AC;border-radius:2px"></i> ' +
      '<i style="display:inline-block;width:10px;height:10px;background:#1B7B4B;border-radius:2px"></i> 多</span></div>' +
      '<div class="card card-pad"><div class="heat">' + cells + '</div></div>';

    // 月历
    var first = new Date(ym + '-01T00:00:00');
    var daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    var lead = first.getDay();
    var cal = ['日', '一', '二', '三', '四', '五', '六'].map(function (x) { return '<div class="wd">' + x + '</div>'; }).join('');
    for (var i = 0; i < lead; i++) cal += '<div class="day empty"></div>';
    for (var dd = 1; dd <= daysInMonth; dd++) {
      var ds2 = ym + '-' + Y.pad(dd), log2 = S().daily[ds2];
      var c = 'day n';
      if (log2 && log2.t) {
        var over = log2.t > st.quota;
        c = over ? 'day over' : log2.n >= st.quota ? 'day done' : 'day part';
      }
      if (ds2 === Y.today()) c += ' today';
      cal += '<div class="' + c + '" data-act="pick-day" data-d="' + ds2 + '">' + dd +
        (log2 && log2.t ? '<small>' + log2.t + '题</small>' : '') + '</div>';
    }
    var sel = p.d || Y.today(), sl = S().daily[sel] || { n: 0, r: 0, c: 0, t: 0 };
    html += '<div class="sec-title"><i class="dot"></i>📅 ' + ym + ' 打卡足迹' +
      '<span class="more"><button class="btn btn-sm" data-act="cal-nav" data-m="-1">← 上月</button> ' +
      '<button class="btn btn-sm" data-act="cal-nav" data-m="1">下月 →</button></span></div>' +
      '<div class="grid g2"><div class="card card-pad"><div class="cal">' + cal + '</div>' +
      '<div class="legend"><span><i style="background:var(--green-soft)"></i>达标</span><span><i style="background:var(--amber-soft)"></i>超额</span>' +
      '<span><i style="background:var(--blue-soft)"></i>部分</span></div></div>' +
      '<div class="card card-pad"><b>📌 ' + sel + ' 学习战况</b>' +
      (sl.t ? '<div class="tag green" style="margin-top:8px">已打卡 · ' + (sl.n >= st.quota ? '达标 🎉' : '部分完成') + '</div>' : '<div class="small muted" style="margin-top:8px">该日期暂未产生刷题打卡记录，坚持就是胜利！</div>') +
      '<div class="grid g2" style="margin-top:14px">' + statBox('新题', sl.n) + statBox('艾宾浩斯复习', sl.r) +
      statBox('当日答题', sl.t) + statBox('当天正确率', Y.pct(sl.c, sl.t) + '%') + '</div></div></div>';
    return html;
  };

  /* ---------- 设置 ---------- */
  V.settings = function () {
    var meta = B().meta, st = S();
    var html = head('设置', '个性化学习计划 · 数据管理 · 题库信息');
    html += '<div class="card card-pad"><b>学习计划</b>' +
      '<div class="setting-row"><div class="info"><b>每日新题配额</b><div>用于今日目标进度与打卡达标判定</div></div>' +
      '<input type="number" id="quota-input" min="5" max="200" step="5" value="' + st.plan.quota + '" style="width:90px">' +
      '<button class="btn btn-sm btn-primary" data-act="save-quota">保存</button></div>' +
      '<div class="setting-row"><div class="info"><b>考试日期</b><div>用于首页倒计时 banner</div></div>' +
      '<input type="date" id="exam-input" value="' + e(st.plan.examDate) + '">' +
      '<button class="btn btn-sm btn-primary" data-act="save-exam">保存</button></div>' +
      '<div class="setting-row"><div class="info"><b>界面主题</b><div>浅色 / 深色，跟随系统不强制</div></div>' +
      '<button class="btn btn-sm" data-act="theme" data-t="light">浅色</button>' +
      '<button class="btn btn-sm" data-act="theme" data-t="dark">深色</button></div></div>';

    html += '<div class="card card-pad" style="margin-top:14px"><b>数据管理</b>' +
      '<div class="small muted" style="margin:6px 0 12px">做题记录、错题本、收藏、背诵排期保存在本浏览器（localStorage）。换设备或清除浏览器数据会丢失，建议定期导出备份。</div>' +
      '<div class="setting-row"><div class="info"><b>导出学习进度</b><div>下载 JSON 备份文件，可在另一台设备导入</div></div>' +
      '<button class="btn btn-sm" data-act="export">导出备份</button></div>' +
      '<div class="setting-row"><div class="info"><b>导入学习进度</b><div>从备份 JSON 恢复（会覆盖当前进度）</div></div>' +
      '<button class="btn btn-sm" data-act="import">选择文件</button></div>' +
      '<div class="setting-row"><div class="info"><b>清空全部学习数据</b><div>删除所有作答、错题、收藏与统计，不可恢复</div></div>' +
      '<button class="btn btn-sm" style="color:var(--danger)" data-act="reset">清空数据</button></div></div>';

    html += '<div class="card card-pad" style="margin-top:14px"><b>题库信息</b>' +
      '<div class="small muted" style="margin:8px 0 12px">' +
      '数据版本 web-1.1 · 生成于 ' + e(meta.generated) + '<br>' +
      '源自 Android 端预置库 politics_prepackaged.db；补充题已写回该库，SQLite 为单一数据源。</div>' +
      '<div class="grid g4">' + statBox('题目', meta.stats.questions) + statBox('单选题', meta.stats.single) +
      statBox('多选题', meta.stats.multi) + statBox('材料分析题', meta.stats.essay) + '</div>' +
      '<div class="grid g4" style="margin-top:12px">' + statBox('章节', meta.stats.chapters) +
      statBox('真题卷', meta.stats.examPapers) + statBox('背诵考点', meta.stats.knowledgePoints) +
      statBox('答题模板', meta.stats.templates) + '</div>' +
      '<div class="divider"></div><div class="small muted">' +
      '章节讲义：' + meta.stats.chapters + ' 章全覆盖，含知识点讲解 / 重点梳理 / 易混辨析 / 记忆口诀 / 配套练习。' +
      '讲义为依据教育部考试大纲与统编教材章节体系自编，<b>不含徐涛核心教案、肖秀荣系列等商业出版物的原文</b>，' +
      '与这两套资料共用同一套考纲，但表述为独立撰写；固定表述与数字请以官方原文和大纲为准。' +
      '</div><div class="divider"></div><div class="small muted">' +
      '来源标签（可在首页按标签专项练习）：' + meta.tags.map(function (t) { return '<span class="tag" style="margin:2px">' + e(t) + '</span>'; }).join('') +
      '<br>补充题共 ' + meta.extraCount + ' 道：2026 时政 42 道（依据新华社公报、中国人大网等官方原文编写）、习思想新表述加练 26 道、近年真题回忆版 6 道，另有 45 道旧版时政题。' +
      '<br>2027 大纲时政考查范围为 2026 年 1—12 月；标签「2025时政特训」及部分「2026时政更新」涉及 2025 年事件，解析内已附范围提示，仅供知识点练习。' +
      '<br>标注「回忆版」的题目非官方原题；标注「依据官方原文编写」的题目为练习编写题，固定表述与数字请回原文核对。' +
      '<br>判分规则与真实考试一致：多选、少选、错选均不得分，没有部分分。' +
      '<br><br>提示：本站为静态网页，无需登录、无需后端，断网后已加载的题库仍可继续刷题。</div></div>';
    return html;
  };
})();
