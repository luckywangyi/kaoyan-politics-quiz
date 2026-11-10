/* ============ 研政通 · 核心：数据、状态、判题、复习算法、统计 ============ */
(function () {
  'use strict';
  var Y = window.YZT = {};
  var DATA = './data/';
  var KEY = 'yzt_state_v1';

  Y.BANK = {
    meta: null, points: [], templates: [], essays: [],
    questions: [], byId: {}, qBySubject: {}, chapterById: {}, subjectById: {},
    loaded: 0, small: null, ready: null
  };

  /* ---------- 工具 ---------- */
  var esc = Y.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  Y.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  Y.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  Y.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + Y.pad(d.getMonth() + 1) + '-' + Y.pad(d.getDate());
  };
  Y.addDays = function (ds, n) {
    var d = new Date(ds + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + Y.pad(d.getMonth() + 1) + '-' + Y.pad(d.getDate());
  };
  Y.diffDays = function (a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  };
  Y.pct = function (a, b) { return b > 0 ? Math.round(a / b * 100) : 0; };
  Y.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  Y.parseJSON = function (s, fb) {
    if (!s) return fb;
    try { return JSON.parse(s); } catch (e) { return fb; }
  };
  Y.toast = function (msg, type) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2100);
    setTimeout(function () { el.remove(); }, 2500);
  };

  /* ---------- 状态 ---------- */
  function defaultState() {
    return {
      v: 1,
      answers: {},      // qid -> {a:[labels], ok:2正确/0错误（少选也计0分）, t, note}
      favorites: [],    // qid[]
      review: {},       // qid -> SM-2 调度
      mistakes: {},     // qid -> {count, streak, mastered, last}
      recite: {},       // kpid -> {level, rep, ef, interval, due}
      daily: {},        // YYYY-MM-DD -> {n,r,c,t}
      essays: {},       // qid -> {text, score, hit}
      notes: {},        // chapterId -> {t} 讲义已读标记
      plan: { quota: 30, examDate: '2026-12-19' },
      settings: { theme: 'light' },
      session: null,
      revealed: {},     // 背诵临时揭晓状态（不持久亦可）
      ui: { pending: null, clozeShown: {} }
    };
  }
  function loadState() {
    var base = defaultState();
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var s = JSON.parse(raw);
      for (var k in base) if (!(k in s)) s[k] = base[k];
      s.plan = Object.assign({}, base.plan, s.plan || {});
      s.settings = Object.assign({}, base.settings, s.settings || {});
      s.ui = { pending: null, clozeShown: {} };
      return s;
    } catch (e) { return base; }
  }
  Y.state = loadState();
  var saveTimer = null;
  Y.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(Y.state)); }
      catch (e) { Y.toast('本地存储写入失败，进度可能无法保存', 'err'); }
    }, 200);
  };
  Y.resetState = function () { Y.state = defaultState(); Y.save(); };
  Y.importState = function (obj) {
    if (!obj || typeof obj !== 'object' || !obj.answers) throw new Error('文件格式不正确');
    var s = defaultState();
    for (var k in s) if (k in obj) s[k] = obj[k];
    s.plan = Object.assign({}, defaultState().plan, obj.plan || {});
    s.settings = Object.assign({}, defaultState().settings, obj.settings || {});
    s.ui = { pending: null, clozeShown: {} };
    Y.state = s; Y.save();
  };

  /* ---------- 数据加载 ---------- */
  function getJSON(name) {
    return fetch(DATA + name, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error('无法读取 ' + name + ' (' + r.status + ')');
      return r.json();
    });
  }
  Y.initData = function (onProgress) {
    var B = Y.BANK;
    B.small = getJSON('meta.json').then(function (meta) {
      B.meta = meta;
      meta.subjects.forEach(function (s) { B.subjectById[s.id] = s; });
      meta.chapters.forEach(function (c) { B.chapterById[c.id] = c; });
      onProgress && onProgress('读取科目与章节…', 8);
      return Promise.all([getJSON('points.json'), getJSON('templates.json'), getJSON('essays.json')]);
    }).then(function (arr) {
      B.points = arr[0]; B.templates = arr[1]; B.essays = arr[2];
      onProgress && onProgress('装载考点与模板…', 16);
      return true;
    });

    B.ready = B.small.then(function () {
      var codes = B.meta.subjects.map(function (s) { return s.code; });
      return Promise.all(codes.map(function (code) {
        return getJSON('q-' + code + '.json').then(function (list) {
          B.qBySubject[code] = list;
          B.loaded++;
          onProgress && onProgress('装载题库 ' + B.loaded + '/' + codes.length, 16 + Math.round(80 * B.loaded / codes.length));
          return list;
        });
      }));
    }).then(function (lists) {
      B.questions = [];
      lists.forEach(function (l) { B.questions = B.questions.concat(l); });
      B.questions.forEach(function (q) { B.byId[q.id] = q; });
      onProgress && onProgress('就绪', 100);
      return B.questions;
    });
    return B;
  };
  Y.q = function (id) { return Y.BANK.byId[id] || null; };
  Y.subjectOf = function (q) { return Y.BANK.subjectById[q.sub] || { name: '未知', short: '—', code: '' }; };
  Y.chapterOf = function (q) { return q.ch ? (Y.BANK.chapterById[q.ch] || null) : null; };
  Y.sourceOf = function (q) {
    var s = (Y.BANK.meta.sources || []).filter(function (x) { return x.id === q.sid; })[0];
    return s ? s.name : (q.source || '');
  };

  /* ---------- 判题与记录 ---------- */
  Y.answerKey = function (q) {
    return (q.options || []).filter(function (o) { return o.correct; })
      .map(function (o) { return o.label; }).sort();
  };
  Y.grade = function (q, selected) {
    var key = Y.answerKey(q);
    var sel = Array.from(new Set(selected || [])).sort();
    if (sel.length === 0) return { ok: 0, key: key, sel: sel, kind: 'empty' };
    var allHit = key.length > 0 && key.every(function (x) { return sel.indexOf(x) >= 0; });
    var noExtra = sel.every(function (x) { return key.indexOf(x) >= 0; });
    if (allHit && noExtra) return { ok: 2, key: key, sel: sel, kind: 'correct' };
    // 真实考试：多选、少选、错选均不得分，没有部分分。kind 仅用于提示「漏选」
    if (noExtra && sel.length < key.length) return { ok: 0, key: key, sel: sel, kind: 'partial' };
    return { ok: 0, key: key, sel: sel, kind: 'wrong' };
  };

  function schedule(qid, ok, seconds) {
    var st = Y.state;
    var r = st.review[qid] || { rep: 0, interval: 1, ef: 2.5, due: Y.today(), mistakes: 0, state: 'NEW' };
    var q = ok === 2 ? (seconds > 45 ? 4 : 5) : 0;
    var dq = 5 - q;
    var ef = Y.clamp(r.ef + 0.1 - dq * (0.08 + dq * 0.02), 1.3, 2.8);
    var rep, iv;
    if (q < 4) { rep = 0; iv = 1; }
    else {
      rep = r.rep + 1;
      iv = rep === 1 ? 1 : rep === 2 ? 2 : rep === 3 ? 4 : rep === 4 ? 7
        : Math.max(10, Math.round(4 * Math.pow(ef, rep - 3)));
    }
    var state = (rep >= 5 && ef >= 2.4) ? 'MASTERED' : (q < 3 ? 'LEARNING' : 'REVIEW');
    st.review[qid] = {
      rep: rep, interval: iv, ef: Math.round(ef * 100) / 100,
      due: Y.addDays(Y.today(), iv),
      mistakes: (r.mistakes || 0) + (ok === 2 ? 0 : 1),
      state: state, last: Date.now()
    };
  }
  Y.submit = function (q, selected, seconds) {
    var g = Y.grade(q, selected);
    var st = Y.state;
    var prev = st.answers[q.id] || {};
    st.answers[q.id] = { a: g.sel, ok: g.ok, t: Date.now(), note: prev.note || '' };

    var d = Y.today();
    if (!st.daily[d]) st.daily[d] = { n: 0, r: 0, c: 0, t: 0 };
    var day = st.daily[d];
    day.t++; if (g.ok === 2) day.c++;
    if (!st.review[q.id]) day.n++; else day.r++;

    schedule(q.id, g.ok, seconds || 0);
    if (g.ok !== 2) {
      var m = st.mistakes[q.id] || { count: 0, streak: 0, mastered: 0, last: 0 };
      m.count++; m.streak = 0; m.mastered = 0; m.last = Date.now();
      st.mistakes[q.id] = m;
    } else if (st.mistakes[q.id]) {
      var m2 = st.mistakes[q.id];
      m2.streak = (m2.streak || 0) + 1;
      if (m2.streak >= 3) m2.mastered = 1;
    }
    Y.save();
    return g;
  };
  Y.reciteGrade = function (id, level) {
    var st = Y.state;
    var r = st.recite[id] || { level: 'UNFAMILIAR', rep: 0, ef: 2.5, interval: 1, due: Y.today() };
    var ef = r.ef, iv = r.interval;
    if (level === 'SOLID') {
      ef = Math.min(ef + 0.1, 3.0);
      iv = r.rep === 0 ? 1 : r.rep === 1 ? 3 : r.rep === 2 ? 7
        : Math.max(Math.round(iv * ef), iv + 1);
    } else if (level === 'VAGUE') {
      ef = Math.max(ef - 0.1, 1.3); iv = Math.min(iv + 1, 3);
    } else { ef = Math.max(ef - 0.2, 1.3); iv = 1; }
    st.recite[id] = { level: level, rep: r.rep + 1, ef: Math.round(ef * 100) / 100, interval: iv, due: Y.addDays(Y.today(), iv), last: Date.now() };
    var d = Y.today();
    if (!st.daily[d]) st.daily[d] = { n: 0, r: 0, c: 0, t: 0 };
    st.daily[d].r++;
    Y.save();
  };

  /* ---------- 统计 ---------- */
  function calcStreak() {
    var st = Y.state, n = 0, d = Y.today();
    if (!st.daily[d] || st.daily[d].t === 0) d = Y.addDays(d, -1);
    while (st.daily[d] && st.daily[d].t > 0) { n++; d = Y.addDays(d, -1); }
    return n;
  }
  Y.stats = function () {
    var st = Y.state, B = Y.BANK;
    var ids = Object.keys(st.answers);
    var done = ids.length, correct = 0, partial = 0, wrong = 0;
    ids.forEach(function (id) {
      var ok = st.answers[id].ok;
      if (ok === 2) correct++; else wrong++; // 真实考试无部分分，partial 恒为 0
    });
    var days = Object.keys(st.daily);
    var attempts = 0, totalCorrect = 0;
    days.forEach(function (d) { attempts += st.daily[d].t || 0; totalCorrect += st.daily[d].c || 0; });
    var todayLog = st.daily[Y.today()] || { n: 0, r: 0, c: 0, t: 0 };
    var dueList = Object.keys(st.review).filter(function (id) {
      var r = st.review[id]; return r.state !== 'MASTERED' && r.due <= Y.today();
    });
    var mastered = Object.keys(st.review).filter(function (id) { return st.review[id].state === 'MASTERED'; }).length;
    var mistakes = Object.keys(st.mistakes).filter(function (id) { return !st.mistakes[id].mastered; }).length;
    var bySubject = (B.meta ? B.meta.subjects : []).map(function (s) {
      var list = B.qBySubject[s.code] || [];
      var total = list.length || s.count;
      var d2 = 0, c2 = 0;
      list.forEach(function (q) {
        if (st.answers[q.id]) { d2++; if (st.answers[q.id].ok === 2) c2++; }
      });
      return { subject: s, total: total, done: d2, correct: c2, pct: Y.pct(d2, total), acc: Y.pct(c2, d2) };
    });
    return {
      done: done, correct: correct, partial: partial, wrong: wrong,
      accuracy: Y.pct(totalCorrect, attempts), attempts: attempts,
      todayLog: todayLog, quota: st.plan.quota || 30,
      due: dueList.length, dueList: dueList, mastered: mastered,
      mistakes: mistakes, favorites: st.favorites.length,
      streak: calcStreak(), bySubject: bySubject,
      total: B.meta ? B.meta.stats.questions : 0
    };
  };

  /* ---------- 组卷 ---------- */
  function choiceIds(list) {
    return list.filter(function (q) { return q.type !== 'ESSAY' && q.options && q.options.length; })
      .map(function (q) { return q.id; });
  }
  Y.makeSession = function (mode, arg, title, customIds) {
    var B = Y.BANK, st = Y.state;
    var ids = [];
    switch (mode) {
      case 'ids': ids = (customIds || []).slice(); break;
      case 'chapter': ids = choiceIds(B.questions.filter(function (q) { return q.ch === Number(arg); })); break;
      case 'subject': ids = choiceIds(B.qBySubject[arg] || B.questions.filter(function (q) { return (B.subjectById[q.sub] || {}).code === arg; })); break;
      case 'exam': ids = choiceIds(B.questions.filter(function (q) { return q.sid === Number(arg); })); break;
      case 'tag': ids = choiceIds(B.questions.filter(function (q) { return q.tag === arg; })); break;
      case 'mistakes':
        ids = Object.keys(st.mistakes).filter(function (id) { return !st.mistakes[id].mastered && B.byId[id]; });
        ids.sort(function (a, b) { return (st.mistakes[b].count || 0) - (st.mistakes[a].count || 0); });
        break;
      case 'wrongall':
        ids = Object.keys(st.mistakes).filter(function (id) { return B.byId[id]; });
        break;
      case 'favorites': ids = st.favorites.filter(function (id) { return B.byId[id]; }); break;
      case 'review': ids = Y.stats().dueList.slice(0, 100); break;
      case 'new':
        ids = choiceIds(B.questions.filter(function (q) { return !st.answers[q.id]; })).slice(0, Number(arg) || 30);
        break;
      case 'weak':
        ids = Object.keys(st.mistakes).filter(function (id) { return !st.mistakes[id].mastered && B.byId[id]; })
          .sort(function (a, b) { return (st.mistakes[b].count || 0) - (st.mistakes[a].count || 0); }).slice(0, 15);
        break;
      case 'random':
        ids = Y.shuffle(choiceIds(B.questions)).slice(0, Number(arg) || 20); break;
      default: ids = choiceIds(B.questions);
    }
    ids = ids.filter(function (id, i, a) { return a.indexOf(id) === i && B.byId[id]; });
    if (!ids.length) return null;
    var s = {
      mode: mode, arg: arg, title: title || '自由刷题', ids: ids,
      index: 0, created: Date.now(), view: 'do', shuffled: false
    };
    if (mode === 'subject' || mode === 'chapter') {
      var first = ids.findIndex(function (id) { return !st.answers[id]; });
      if (first > 0) s.index = first;
    }
    st.session = s;
    st.ui.pending = null;
    Y.save();
    return s;
  };
  Y.sessionQuestions = function () {
    var s = Y.state.session;
    if (!s) return [];
    return s.ids.map(function (id) { return Y.BANK.byId[id]; }).filter(Boolean);
  };

  /* ---------- 搜索 ---------- */
  Y.search = function (kw, subjectId, type) {
    var k = (kw || '').trim().toLowerCase();
    if (!k) return { questions: [], points: [] };
    var qs = Y.BANK.questions.filter(function (q) {
      if (subjectId && q.sub !== Number(subjectId)) return false;
      if (type && q.type !== type) return false;
      var hay = q.stem + '\n' + (q.analysis || '') + '\n' + (q.material || '') + '\n' + (q.tag || '');
      return hay.toLowerCase().indexOf(k) >= 0;
    }).slice(0, 200);
    var ps = Y.BANK.points.filter(function (p) {
      if (subjectId && p.sub !== Number(subjectId)) return false;
      return (p.title + p.summary + p.content + (p.keywords || []).join('')).toLowerCase().indexOf(k) >= 0;
    }).slice(0, 40);
    return { questions: qs, points: ps, count: qs.length + ps.length };
  };
  Y.highlight = function (text, kw) {
    var t = Y.esc(text), k = (kw || '').trim();
    if (!k) return t;
    try {
      var re = new RegExp('(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return t.replace(re, '<mark>$1</mark>');
    } catch (e) { return t; }
  };

  /* ---------- 主题 / 倒计时 ---------- */
  Y.applyTheme = function () {
    var t = Y.state.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#161A20' : '#B23A32');
  };
  Y.countdownDays = function () {
    return Math.max(0, Y.diffDays(Y.today(), Y.state.plan.examDate || '2026-12-19'));
  };
  Y.applyTheme();
})();
