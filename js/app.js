/* ============ 研政通 · 路由与交互 ============ */
(function () {
  'use strict';
  var Y = window.YZT, V = window.Views;
  var $ = function (id) { return document.getElementById(id); };
  var TITLES = {
    home: '学习总览', notes: '章节讲义', notesCh: '章节讲义', xref: '章节对照', chapters: '章节刷题',
    exams: '真题模考', practice: '刷题练习',
    mistakes: '错题本', review: '到期复习', favorites: '我的收藏', recite: '沉浸背诵',
    timeline: '时间轴图谱', templates: '万能模板', essays: '材料分析题', search: '全文检索',
    report: '学习报告', settings: '设置'
  };
  var lastNonPracticeHash = '#/home';

  /* ---------- hash 路由 ---------- */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var i = h.indexOf('?');
    var view = (i < 0 ? h : h.slice(0, i)) || 'home';
    var p = {};
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var j = kv.indexOf('=');
        try { p[kv.slice(0, j)] = decodeURIComponent(kv.slice(j + 1).replace(/\+/g, ' ')); }
        catch (err) { p[kv.slice(0, j)] = kv.slice(j + 1); }
      });
    }
    return { view: view, p: p };
  }
  function go(view, params) {
    var q = '';
    if (params) {
      q = Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
        .map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    }
    var target = '#/' + view + (q ? '?' + q : '');
    closeSheet();
    closeSidebar();
    if (location.hash === target) render();
    else location.hash = target;
    window.scrollTo(0, 0);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var r = parseHash(), view = r.view, p = r.p;
    if (!V[view]) { view = 'home'; p = {}; }
    if (view !== 'practice') lastNonPracticeHash = location.hash || '#/home';

    $('nav').innerHTML = V.nav(view);
    $('topbar-title').textContent = view === 'practice' && Y.state.session
      ? Y.state.session.title : (TITLES[view] || '研政通');
    $('countdown').innerHTML = '距初试 <b>' + Y.countdownDays() + '</b> 天';

    var stats = Y.stats();
    $('side-progress-label').textContent = '已刷 ' + stats.done + ' / ' + stats.total + ' 题';
    $('side-progress-num').textContent = stats.total ? Y.pct(stats.done, stats.total) + '%' : '';
    $('side-progress-fill').style.width = (stats.total ? Y.pct(stats.done, stats.total) : 0) + '%';

    var needData = ['chapters', 'exams', 'practice', 'mistakes', 'favorites', 'review', 'search', 'report', 'essays', 'timeline', 'notes', 'notesCh', 'xref'].indexOf(view) >= 0;
    if (needData && !Y.BANK.questions.length) {
      $('view').innerHTML = '<div class="card">' + V.empty('⏳', '题库正在装载…', '首次加载约 3 MB，稍候即可开始刷题') + '</div>';
      Y.BANK.ready.then(function () { render(); });
      return;
    }
    try {
      $('view').innerHTML = V[view](p);
      if (view === 'essays' || view === 'practice') restoreFocusScroll();
    } catch (err) {
      console.error('[研政通] 渲染失败', err);
      $('view').innerHTML = '<div class="card">' + V.empty('⚠', '页面渲染出错', String(err && err.message || err)) + '</div>';
    }
  }
  function restoreFocusScroll() { /* 预留：保持滚动位置 */ }

  /* ---------- 弹层 ---------- */
  function showSheet(html) {
    $('sheet').innerHTML = html;
    $('sheet-wrap').classList.remove('hidden');
    $('mask').classList.remove('hidden');
  }
  function closeSheet() {
    $('sheet-wrap').classList.add('hidden');
    $('mask').classList.add('hidden');
  }
  function closeSidebar() { $('sidebar').classList.remove('open'); }
  function confirmSheet(title, desc, onOk) {
    showSheet('<div class="sheet-head"><b>' + V.esc(title) + '</b><button class="icon-btn" data-act="close-sheet">✕</button></div>' +
      '<div class="sheet-body"><div class="small muted" style="line-height:1.8">' + V.esc(desc) + '</div>' +
      '<div class="row" style="margin-top:20px;justify-content:flex-end">' +
      '<button class="btn" data-act="close-sheet">取消</button>' +
      '<button class="btn btn-primary" data-act="confirm-ok">确认</button></div></div>');
    pendingConfirm = onOk;
  }
  var pendingConfirm = null;

  /* ---------- 当前题目 / 考点 ---------- */
  function currentQ() {
    var s = Y.state.session;
    if (!s) return null;
    return Y.sessionQuestions()[s.index] || null;
  }
  function currentPoint() {
    var p = parseHash().p, sid = Number(p.sub || 0);
    var pts = Y.BANK.points.filter(function (x) { return !sid || x.sub === sid; });
    var idx = Y.clamp(Number(p.i || 0), 0, Math.max(0, pts.length - 1));
    return pts[idx] || null;
  }
  function blankKeys(pt) {
    var n = 0;
    pt.cloze.replace(/\{\{.+?\}\}/g, function () { n++; return ''; });
    return n;
  }
  function autoSubmit() {
    var pend = Y.state.ui.pending;
    Y.state.ui.pending = null;
    if (pend && pend.sel && pend.sel.length) {
      var q = Y.q(pend.qid);
      if (q) Y.submit(q, pend.sel, 0);
    }
    Y.save();
  }
  function moveTo(i) {
    var s = Y.state.session;
    if (!s) return;
    autoSubmit();
    s.index = Y.clamp(i, 0, s.ids.length - 1);
    Y.save();
    closeSheet();
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- 组卷 ---------- */
  function startSession(mode, arg, title, ids) {
    var run = function () {
      var s = ids ? Y.makeSession('ids', '', title, ids) : Y.makeSession(mode, arg, title);
      if (!s) { Y.toast('当前条件下没有可练习的题目', 'warn'); return; }
      s.fromHash = lastNonPracticeHash;
      Y.save();
      go('practice');
    };
    if (!Y.BANK.questions.length) { Y.toast('题库加载中，请稍候…'); Y.BANK.ready.then(run); }
    else run();
  }

  /* ---------- 数据导入导出 ---------- */
  function exportData() {
    var blob = new Blob([JSON.stringify(Y.state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = '研政通-进度备份-' + Y.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    Y.toast('学习进度已导出', 'ok');
  }
  $('import-file').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Y.importState(JSON.parse(reader.result));
        Y.applyTheme(); render(); Y.toast('进度导入成功', 'ok');
      } catch (err) { Y.toast('导入失败：' + err.message, 'err'); }
    };
    reader.readAsText(f, 'utf-8');
    ev.target.value = '';
  });

  /* ---------- 点击分发 ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (ev.target.closest('#sidebar') && el && el.dataset.act !== 'go' && el.dataset.act !== 'menu') closeSidebar();
    if (!el) {
      if ($('sidebar').classList.contains('open') && !ev.target.closest('#sidebar')) closeSidebar();
      return;
    }
    var d = el.dataset, act = d.act, s = Y.state.session, q = currentQ();

    switch (act) {
      case 'go': {
        var params = {};
        ['sub', 'cat', 'i', 'ym', 'd', 'q', 'type', 'm', 'id'].forEach(function (k) { if (d[k] !== undefined) params[k] = d[k]; });
        go(d.view, params);
        break;
      }
      case 'menu': $('sidebar').classList.toggle('open'); break;
      case 'tl':
        if (window.TL && TL.act(d)) render();
        break;
      case 'nt-practice': startSession('xref', d.arg, d.title || '本节练习'); break;
      case 'nt':
      case 'nt-open': case 'nt-read': case 'nt-fold': case 'nt-only':
      case 'nt-sec': case 'nt-start': case 'nt-retry':
        if (V.notesAct && V.notesAct(d)) render();
        break;
      case 'nt-dummy': break;
      case 'close-sheet': closeSheet(); break;
      case 'confirm-ok': {
        var fn = pendingConfirm; pendingConfirm = null; closeSheet();
        if (fn) fn();
        break;
      }
      case 'start': startSession(d.mode, d.arg || '', d.title || '自由刷题'); break;
      case 'practice-one': startSession('ids', '', '单题精练', [d.id]); break;
      case 'wrongall': startSession('wrongall', '', '全部错题回顾'); break;
      case 'back': {
        autoSubmit();
        var target = (s && s.fromHash) || '#/home';
        if (location.hash === target) render();
        else location.hash = target;
        break;
      }
      case 'view-mode':
        if (!s) break;
        autoSubmit(); s.view = d.v; Y.save(); render();
        break;
      case 'fav': {
        var arr = Y.state.favorites, ix = arr.indexOf(d.id);
        if (ix >= 0) { arr.splice(ix, 1); Y.toast('已取消收藏'); }
        else { arr.push(d.id); Y.toast('已收藏 ⭐', 'ok'); }
        Y.save(); render();
        break;
      }
      case 'opt': {
        if (!q || s.view === 'memorize' || Y.state.answers[q.id]) break;
        var pend = (Y.state.ui.pending && Y.state.ui.pending.qid === q.id)
          ? Y.state.ui.pending : { qid: q.id, sel: [] };
        if (q.type === 'SINGLE_CHOICE') {
          Y.submit(q, [d.lab], 0);
          Y.state.ui.pending = null;
        } else {
          var pos = pend.sel.indexOf(d.lab);
          if (pos >= 0) pend.sel.splice(pos, 1); else pend.sel.push(d.lab);
          pend.sel.sort();
          Y.state.ui.pending = pend;
        }
        Y.save(); render();
        break;
      }
      case 'submit-multi': {
        if (!q) break;
        var pp = Y.state.ui.pending;
        if (!pp || !pp.sel.length) { Y.toast('请先选择答案', 'warn'); break; }
        Y.submit(q, pp.sel, 0);
        Y.state.ui.pending = null;
        Y.save(); render();
        break;
      }
      case 'prev': moveTo(s.index - 1); break;
      case 'next': moveTo(s.index + 1); break;
      case 'jump': moveTo(Number(d.i)); break;
      case 'sheet': showSheet(V.answerSheet()); break;
      case 'finish': showSheet(V.practiceReport()); break;
      case 'save-note': {
        var ta = $('note-input');
        if (!ta) break;
        var a = Y.state.answers[d.id];
        if (!a) { Y.state.answers[d.id] = { a: [], ok: 0, t: Date.now(), note: '' }; a = Y.state.answers[d.id]; }
        a.note = ta.value; Y.save(); Y.toast('笔记已保存 ✓', 'ok');
        break;
      }
      case 'redo':
        delete Y.state.answers[d.id];
        Y.state.ui.pending = null; Y.save(); render(); Y.toast('已重置本题作答');
        break;
      case 'master': {
        var m = Y.state.mistakes[d.id];
        if (m) { m.mastered = m.mastered ? 0 : 1; Y.save(); render(); }
        break;
      }
      case 'remove-mistake':
        delete Y.state.mistakes[d.id]; Y.save(); render(); Y.toast('已移出错题本');
        break;
      case 'clear-fav':
        confirmSheet('清空收藏', '将移除全部 ' + Y.state.favorites.length + ' 道收藏题，此操作不可撤销。', function () {
          Y.state.favorites = []; Y.save(); render(); Y.toast('收藏已清空');
        });
        break;
      case 'blank': {
        var pt = currentPoint(); if (!pt) break;
        if (!Y.state.ui.clozeShown[pt.id]) Y.state.ui.clozeShown[pt.id] = {};
        Y.state.ui.clozeShown[pt.id][d.k] = !Y.state.ui.clozeShown[pt.id][d.k];
        render();
        break;
      }
      case 'reveal-all':
      case 'hide-all': {
        var p2 = (Y.BANK.points.filter(function (x) { return x.id === d.id; })[0]);
        if (!p2) break;
        var map = {};
        if (act === 'reveal-all') {
          for (var i = 0; i < blankKeys(p2); i++) map['k' + i] = true;
        }
        Y.state.ui.clozeShown[p2.id] = map;
        render();
        break;
      }
      case 'rate':
        Y.reciteGrade(d.id, d.lv);
        render();
        Y.toast(d.lv === 'SOLID' ? '已标记牢固掌握！复习间隔递增' : d.lv === 'VAGUE' ? '已标记模糊，近期加练复习' : '已标记生疏，明天重点推送', 'ok');
        break;
      case 'recite-reset':
        Y.state.ui.clozeShown = {}; render(); Y.toast('已重新遮挡全部考眼');
        break;
      case 'recite-nav': {
        var pp2 = parseHash().p;
        go('recite', { sub: pp2.sub, i: Number(d.i) });
        break;
      }
      case 'essay-check': {
        var input = $('essay-input');
        if (!input) break;
        var text = input.value.trim();
        if (!text) { Y.toast('请先写下你的作答要点', 'warn'); break; }
        var eq = Y.q(d.id), crit = Y.parseJSON(eq.criteria, []);
        var kws = Array.from(new Set(crit.reduce(function (a, c) { return a.concat(c.keywords || []); }, [])));
        var hit = kws.filter(function (k) { return text.toLowerCase().indexOf(k.toLowerCase()) >= 0; });
        var rate = kws.length ? hit.length / kws.length : 0.5;
        var score = Math.round(rate * (eq.score || 10) * 10) / 10;
        Y.state.essays[eq.id] = { text: text, score: score, hit: hit.length, t: Date.now() };
        Y.save(); render(); Y.toast('智能采分完成 · 命中 ' + hit.length + '/' + kws.length + ' 个考眼词', 'ok');
        break;
      }
      case 'find-template': {
        var t = Y.BANK.templates.filter(function (x) { return x.id === d.tpl; })[0];
        if (!t) { Y.toast('未找到关联模板', 'warn'); break; }
        showSheet('<div class="sheet-head"><b>关联万能模板</b><button class="icon-btn" data-act="close-sheet">✕</button></div>' +
          '<div class="sheet-body"><h3 style="font-size:15px;margin:0 0 12px">' + V.esc(t.title) + '</h3>' +
          '<div class="tpl-block"><div class="lb">💎 原理默写金句</div><div class="bd">' + V.esc(t.theory) + '</div></div>' +
          '<div class="tpl-block"><div class="lb">⚖️ 方法论要求</div><div class="bd">' + V.esc(t.method) + '</div></div>' +
          '<div class="tpl-block"><div class="lb">🧩 材料串联公式</div><div class="bd">' + V.esc(t.formula) + '</div></div>' +
          '<button class="btn btn-block" data-act="go" data-view="templates" style="margin-top:16px">查看全部模板 →</button></div>');
        break;
      }
      case 'page-search': {
        var v = ($('page-search') || {}).value || '';
        go('search', { q: v.trim() });
        break;
      }
      case 'search-filter': {
        var cur = parseHash().p;
        var np = { q: cur.q || '' };
        if (d.sub !== undefined) { np.sub = d.sub; if (cur.type) np.type = cur.type; }
        if (d.type !== undefined) {
          np.type = cur.type === d.type ? '' : d.type;
          if (cur.sub) np.sub = cur.sub;
        }
        go('search', np);
        break;
      }
      case 'search-practice': {
        var cp = parseHash().p;
        var res = Y.search(cp.q, cp.sub, cp.type);
        var ids = res.questions.filter(function (x) { return x.type !== 'ESSAY'; }).map(function (x) { return x.id; });
        if (!ids.length) { Y.toast('没有可练习的题目', 'warn'); break; }
        startSession('ids', '', '检索结果 · ' + cp.q, ids);
        break;
      }
      case 'pick-day': {
        var ds3 = d.d;
        go('report', { ym: ds3.slice(0, 7), d: ds3 });
        break;
      }
      case 'cal-nav': {
        var rp = parseHash().p, ym = rp.ym || Y.today().slice(0, 7);
        var dt = new Date(ym + '-01T00:00:00');
        dt.setMonth(dt.getMonth() + Number(d.m));
        var nym = dt.getFullYear() + '-' + Y.pad(dt.getMonth() + 1);
        go('report', { ym: nym });
        break;
      }
      case 'save-quota': {
        var n = Number(($('quota-input') || {}).value || 30);
        Y.state.plan.quota = Y.clamp(Math.round(n) || 30, 5, 200);
        Y.save(); render(); Y.toast('学习计划已更新！每日配额 ' + Y.state.plan.quota + ' 题', 'ok');
        break;
      }
      case 'save-exam': {
        var v2 = ($('exam-input') || {}).value;
        if (v2) { Y.state.plan.examDate = v2; Y.save(); render(); Y.toast('考试日期已保存', 'ok'); }
        break;
      }
      case 'theme':
        Y.state.settings.theme = d.t; Y.applyTheme(); Y.save(); render();
        break;
      case 'export': exportData(); break;
      case 'import': $('import-file').click(); break;
      case 'reset':
        confirmSheet('清空全部学习数据',
          '将删除所有作答记录、错题本、收藏、背诵排期、打卡统计与笔记，且不可恢复。建议先「导出备份」。确定继续吗？',
          function () { Y.resetState(); Y.applyTheme(); render(); Y.toast('学习数据已清空'); });
        break;
      default: break;
    }
  });

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', function (ev) {
    var tag = (ev.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || ev.target.isContentEditable;
    if (ev.key === 'Enter') {
      if (ev.target.id === 'global-search') {
        go('search', { q: ev.target.value.trim() });
        ev.target.blur();
        return;
      }
      if (ev.target.id === 'page-search') { go('search', { q: ev.target.value.trim() }); return; }
    }
    if (typing) return;
    if (parseHash().view !== 'practice') return;
    var s = Y.state.session, q = currentQ();
    if (!s || !q) return;
    var k = ev.key.toUpperCase();
    if ('ABCD'.indexOf(k) >= 0 && k.length === 1) {
      var opt = q.options.filter(function (o) { return o.label === k; })[0];
      if (opt) {
        var fake = document.querySelector('[data-act="opt"][data-lab="' + k + '"]');
        if (fake && !fake.disabled) fake.click();
      }
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      var submit = document.querySelector('[data-act="submit-multi"]:not(:disabled)');
      if (submit) submit.click();
      else if (Y.state.answers[q.id] || s.view === 'memorize') {
        var nx = document.querySelector('[data-act="next"]');
        if (nx) nx.click();
      }
      ev.preventDefault();
    } else if (ev.key === 'ArrowLeft') {
      var pv = document.querySelector('[data-act="prev"]:not(:disabled)'); if (pv) pv.click();
    } else if (ev.key === 'ArrowRight') {
      var nt = document.querySelector('[data-act="next"]'); if (nt) nt.click();
    } else if (k === 'F') {
      var fv = document.querySelector('[data-act="fav"]'); if (fv) fv.click();
    }
  });

  window.addEventListener('hashchange', render);

  /* ---------- 供其它模块调用 ---------- */
  Y.rerender = render;
  window.__yztStart = startSession;

  /* ---------- 启动 ---------- */
  (function boot() {
    var fill = $('boot-fill'), tip = $('boot-tip');
    Y.initData(function (msg, pct) {
      if (fill) fill.style.width = pct + '%';
      if (tip) tip.textContent = msg;
    });
    Y.BANK.small.then(function () {
      $('boot').classList.add('hidden');
      $('shell').classList.remove('hidden');
      render();
      Y.BANK.ready.then(function () {
        render();
        Y.toast('题库已就绪 · ' + Y.BANK.meta.stats.questions + ' 道题', 'ok');
      }).catch(function (err) {
        $('view').innerHTML = '<div class="card">' + V.empty('⚠', '题库加载失败', err.message) + '</div>';
      });
    }).catch(function (err) {
      $('boot').innerHTML = '<div class="boot-mark">!</div><div class="boot-title">题库加载失败</div>' +
        '<div class="boot-sub">' + V.esc(err.message) + '</div>' +
        '<div class="boot-tip">请通过 HTTP 服务访问（不要直接双击 file:// 打开），并确认 data/ 目录完整。</div>';
    });
  })();
})();
