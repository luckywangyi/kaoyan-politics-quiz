/* ============ 研政通 · 章节讲义（通读 → 刷题） ============ */
(function () {
  'use strict';
  var Y = window.YZT, V = window.Views;
  var e = Y.esc;
  var DATA = './data/';

  /* 讲义数据按科目懒加载：目录只用 index，正文才拉本科文件 */
  var N = {
    index: null, pIndex: null,
    data: {}, loading: {},
    folded: {},       // cid -> true 全部折叠
    onlyKeys: {},     // cid -> true 只看重点
    err: ''
  };

  function S() { return Y.state; }
  function B() { return Y.BANK; }
  function sub(id) { return B().subjectById[id] || { name: '—', short: '—', code: '' }; }

  function readMap() {
    if (!S().notes) S().notes = {};
    return S().notes;
  }
  function isRead(cid) { return !!readMap()[cid]; }
  function markRead(cid, on) {
    var m = readMap();
    if (on) m[cid] = { t: Date.now() };
    else delete m[cid];
    Y.save();
  }

  function rerender() {
    if (typeof Y.rerender === 'function') Y.rerender();
  }

  function loadIndex() {
    if (N.index) return Promise.resolve(N.index);
    if (N.pIndex) return N.pIndex;
    N.pIndex = fetch(DATA + 'notes-index.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) { N.index = d; N.err = ''; return d; })
      .catch(function (err) { N.err = String(err && err.message || err); N.pIndex = null; throw err; });
    return N.pIndex;
  }
  function loadSubject(code) {
    if (N.data[code]) return Promise.resolve(N.data[code]);
    if (N.loading[code]) return N.loading[code];
    N.loading[code] = fetch(DATA + 'notes-' + code + '.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) { N.data[code] = d; delete N.loading[code]; return d; })
      .catch(function (err) { delete N.loading[code]; N.err = String(err && err.message || err); throw err; });
    return N.loading[code];
  }
  function chapterMeta(cid) {
    for (var i = 0; i < B().meta.chapters.length; i++) if (B().meta.chapters[i].id === cid) return B().meta.chapters[i];
    return null;
  }
  function chaptersOfSub(sid) {
    return B().meta.chapters.filter(function (c) { return c.sub === sid; })
      .sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
  }
  /* 章节练习只组选择题，材料分析题走「材料分析题」页；这里给出实际可练题量 */
  function practiceCount(c) {
    var n = B().questions.filter(function (q) { return q.ch === c.id && q.type !== 'ESSAY'; }).length;
    return n || c.count || 0;
  }

  function loadingCard(msg) {
    return '<div class="card card-pad"><div class="row" style="gap:10px;align-items:center">' +
      '<span class="spin"></span><span class="small muted">' + e(msg) + '</span></div></div>';
  }
  function errCard(msg) {
    return '<div class="card card-pad"><b>讲义加载失败</b>' +
      '<div class="small muted" style="margin:6px 0 10px">' + e(msg || '未知错误') +
      '。请确认 data/notes-index.json 与 data/notes-*.json 已上传完整。</div>' +
      '<button class="btn btn-sm" data-act="nt-retry">重试</button></div>';
  }

  /* ---------- 目录 ---------- */
  V.notes = function (p) {
    var meta = B().meta;
    var all = p.sub === 'all' || p.sub === undefined || p.sub === '';
    var sid = all ? 0 : Number(p.sub);
    var html = '<div class="page-head"><div><h1>章节讲义 · 通读再刷题</h1>' +
      '<p>' + meta.subjects.length + ' 科 ' + meta.chapters.length + ' 章 · ' +
      (N.index ? N.index.totalPoints : '—') + ' 个知识点 · 每章讲义与配套练习一一对应</p></div></div>';

    html += '<div class="chips">' +
      '<button class="chip ' + (all ? 'on' : '') + '" data-act="go" data-view="notes" data-sub="all">全部</button>' +
      meta.subjects.map(function (x) {
        return '<button class="chip ' + (x.id === sid ? 'on' : '') + '" data-act="go" data-view="notes" data-sub="' + x.id + '">' + e(x.short) + '</button>';
      }).join('') + '</div>';

    html += '<div class="nt-intro">' +
      '<div class="nt-intro-h"><span class="nt-ic">⇄</span>章节体系与教材对应</div>' +
      '<div class="small muted">站内 53 章与<b>考试大纲解析</b>、<b>肖秀荣《知识点精讲精练》</b>逐章一一对应，' +
      '每章标注起始页码，可直接翻书对照；<b>徐涛《核心考案》</b>在毛中特、习思想、史纲、思修四科章号章名完全一致，' +
      '仅马原把哲学部分拆为「辩证唯物论 / 唯物辩证法 / 认识论 / 唯物史观」四章，对应关系写在每章页头。</div>' +
      '</div>';

    if (!N.index) {
      if (!N.pIndex) loadIndex().then(rerender).catch(rerender);
      html += N.err ? errCard(N.err) : loadingCard('讲义目录加载中…');
      return html;
    }

    var chs = all ? meta.chapters : chaptersOfSub(sid);
    var readN = chs.filter(function (c) { return isRead(c.id); }).length;
    var qN = chs.reduce(function (a, c) { return a + (c.count || 0); }, 0);

    html += '<div class="card card-pad spread" style="margin-bottom:16px;flex-wrap:wrap;gap:14px">' +
      '<div><div class="small muted">通读进度</div><b style="font-size:17px">已读 ' + readN + ' / ' + chs.length + ' 章</b>' +
      '<div class="small muted" style="margin-top:2px">配套习题合计 ' + qN + ' 道</div></div>' +
      '<div style="min-width:170px;flex:0 0 210px">' + bar(Y.pct(readN, chs.length)) +
      '<div class="small muted" style="margin-top:6px;text-align:right">' + Y.pct(readN, chs.length) + '%</div></div>' +
      '</div>';

    var groups = all ? meta.subjects : [sub(sid)];
    html += groups.map(function (s) {
      var list = all ? chaptersOfSub(s.id) : chs;
      if (!list.length) return '';
      var rn = list.filter(function (c) { return isRead(c.id); }).length;
      return '<div class="nt-group">' +
        '<div class="nt-ghead"><b>' + e(s.name) + '</b>' +
        '<span class="small muted">' + list.length + ' 章 · 已读 ' + rn + '</span></div>' +
        '<div class="card">' + list.map(function (c, i) {
          var info = N.index.chapters[String(c.id)] || { pts: 0, secs: 0, keys: 0 };
          var read = isRead(c.id);
          return '<div class="nt-row' + (read ? ' read' : '') + '" data-act="nt-open" data-id="' + c.id + '">' +
            '<div class="idx">' + (i + 1) + '</div>' +
            '<div class="info"><b>' + e(c.title) + '</b>' +
            '<div class="meta">' + info.secs + ' 节 · ' + info.pts + ' 个知识点 · ' + (info.keys || 0) + ' 条必背 · 配套 ' + practiceCount(c) + ' 题' +
            (info.xp ? ' · <span class="nt-pg">肖 p.' + info.xp + '</span>' : '') + '</div></div>' +
            '<div class="nt-badge">' + (read ? '<span class="tag green">已读</span>' : '<span class="tag">未读</span>') + '</div>' +
            '<button class="btn btn-sm">' + (read ? '复习' : '读讲义') + '</button></div>';
        }).join('') + '</div></div>';
    }).join('');

    return html;
  };

  function bar(v) {
    return '<div class="progress"><i style="width:' + Y.clamp(v, 0, 100) + '%"></i></div>';
  }

  /* ---------- 单章讲义 ---------- */
  V.notesCh = function (p) {
    var cid = Number(p.id);
    var c = chapterMeta(cid);
    if (!c) return '<div class="card card-pad">章节不存在。<button class="btn btn-sm" data-act="go" data-view="notes">返回目录</button></div>';
    var s = sub(c.sub);
    var code = s.code;

    if (!N.data[code]) {
      if (!N.loading[code]) loadSubject(code).then(rerender).catch(rerender);
      return '<div class="page-head"><div><h1>' + e(c.title) + '</h1><p>' + e(s.name) + '</p></div></div>' +
        (N.err ? errCard(N.err) : loadingCard('讲义正文加载中…'));
    }

    var d = (N.data[code].chapters || {})[String(cid)];
    if (!d) return '<div class="card card-pad">本章讲义暂缺。<button class="btn btn-sm" data-act="go" data-view="notes">返回目录</button></div>';

    var read = isRead(cid);
    var folded = !!N.folded[cid];
    var only = !!N.onlyKeys[cid];
    var list = chaptersOfSub(c.sub);
    var at = list.findIndex(function (x) { return x.id === cid; });
    var prev = at > 0 ? list[at - 1] : null;
    var next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;

    var html = '<div class="page-head"><div><h1>' + e(c.title) + '</h1>' +
      '<p>' + e(s.name) + ' · ' + d.secs.length + ' 节 · ' +
      d.secs.reduce(function (a, x) { return a + x.pts.length; }, 0) + ' 个知识点 · 配套 ' + practiceCount(c) + ' 题' +
      (read ? ' · <span class="tag green">已读</span>' : ' · <span class="tag">未读</span>') + '</p></div>' +
      '<div class="head-actions">' +
      (c.count ? '<button class="btn btn-primary" data-act="start" data-mode="chapter" data-arg="' + cid +
        '" data-title="' + e(c.title) + '">开始刷本章 ' + practiceCount(c) + ' 题</button>' : '') +
      '</div></div>';

    /* 教材对应 */
    var xr = (N.index && N.index.chapters[String(cid)]) || {};
    if (xr.xc || xr.uc) {
      html += '<div class="nt-xref">' +
        '<div class="nt-xref-h">⇄ 教材对应位置</div>' +
        '<div class="nt-xref-row"><span class="nt-xref-tag xiao">肖秀荣</span>' +
        '<span class="nt-xref-txt">' + e(xr.xc || '—') + '</span>' +
        (xr.xp ? '<span class="nt-xref-pg">p.' + xr.xp + '</span>' : '') + '</div>' +
        '<div class="nt-xref-row"><span class="nt-xref-tag xu">徐涛</span>' +
        '<span class="nt-xref-txt">' + e(xr.uc || '—') + '</span></div>' +
        (xr.split ? '<div class="nt-xref-note">' + e(xr.split) + '</div>' : '') +
        '</div>';
    }

    /* 工具条 */
    html += '<div class="nt-tools">' +
      '<button class="chip ' + (folded ? 'on' : '') + '" data-act="nt-fold" data-id="' + cid + '">' + (folded ? '展开讲解' : '折叠讲解') + '</button>' +
      '<button class="chip ' + (only ? 'on' : '') + '" data-act="nt-only" data-id="' + cid + '">只看重点</button>' +
      '<button class="chip ' + (read ? 'on' : '') + '" data-act="nt-read" data-id="' + cid + '">' + (read ? '✓ 已读' : '标记已读') + '</button>' +
      '<span style="flex:1"></span>' +
      (prev ? '<button class="chip" data-act="nt-open" data-id="' + prev.id + '">← 上一章</button>' : '') +
      (next ? '<button class="chip" data-act="nt-open" data-id="' + next.id + '">下一章 →</button>' : '') +
      '<button class="chip" data-act="go" data-view="notes" data-sub="' + c.sub + '">目录</button>' +
      '</div>';

    /* 概述 */
    html += '<div class="nt-ov"><div class="nt-ov-lb">本章定位</div>' + e(d.ov) + '</div>';

    /* 正文 */
    if (!only) {
      html += '<div class="card nt-body">' + d.secs.map(function (sec, si) {
        var body = '';
        if (!folded) {
          body = '<div class="nt-pts">' + sec.pts.map(function (pt) {
            return '<div class="nt-pt"><div class="nt-pt-t">' + e(pt.t) + '</div>' +
              '<div class="nt-pt-d">' + e(pt.d) + '</div></div>';
          }).join('') + '</div>';
        }
        return '<div class="nt-sec' + (folded ? ' folded' : '') + '">' +
          '<div class="nt-sec-h" data-act="nt-sec" data-id="' + cid + '" data-i="' + si + '">' +
          '<span class="nt-sec-n">' + (si + 1) + '</span><b>' + e(sec.h) + '</b>' +
          '<span class="small muted">' + sec.pts.length + ' 个知识点</span></div>' +
          body +
          (sec.key && !folded ? '<div class="nt-hint"><span>提示</span>' + e(sec.key) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    /* 重点梳理 */
    if (d.keys && d.keys.length) {
      html += '<div class="card nt-block"><div class="nt-block-h"><span class="nt-ic">★</span>重点梳理<span class="small muted">' +
        d.keys.length + ' 条必背</span></div><ol class="nt-keys">' +
        d.keys.map(function (k) { return '<li>' + e(k) + '</li>'; }).join('') + '</ol></div>';
    }

    /* 易混对比 */
    if (d.confuse && d.confuse.length) {
      html += '<div class="card nt-block"><div class="nt-block-h"><span class="nt-ic">≠</span>易混辨析<span class="small muted">' +
        d.confuse.length + ' 组</span></div>' +
        '<div class="nt-confuse">' + d.confuse.map(function (x) {
          return '<div class="nt-cf"><div class="nt-cf-pair"><b>' + e(x.a) + '</b><i>vs</i><b>' + e(x.b) + '</b></div>' +
            '<div class="nt-cf-d">' + e(x.d) + '</div></div>';
        }).join('') + '</div></div>';
    }

    /* 口诀 */
    if (d.mn) {
      html += '<div class="nt-mn"><span class="nt-mn-lb">记忆口诀</span>' + e(d.mn) + '</div>';
    }

    /* 建议 */
    if (d.tip) {
      html += '<div class="nt-tip"><span class="nt-tip-lb">复习建议</span>' + e(d.tip) + '</div>';
    }

    /* 底部 CTA */
    html += '<div class="nt-foot">' +
      (c.count ? '<button class="btn btn-primary" data-act="nt-start" data-id="' + cid + '" data-count="' + practiceCount(c) +
        '" data-title="' + e(c.title) + '">读完就练 · 开始本章 ' + practiceCount(c) + ' 题</button>' : '') +
      '<button class="btn" data-act="nt-read" data-id="' + cid + '">' + (read ? '取消已读标记' : '标记为已读') + '</button>' +
      '<button class="btn btn-ghost" data-act="go" data-view="notes" data-sub="' + c.sub + '">返回章节目录</button>' +
      '</div>';

    return html;
  };

  /* ---------- 交互 ---------- */
  V.notesAct = function (d) {
    switch (d.act) {
      case 'nt-open':
        location.hash = '#/notesCh?id=' + d.id;
        window.scrollTo(0, 0);
        return false;
      case 'nt-read': {
        var cid = Number(d.id);
        markRead(cid, !isRead(cid));
        return true;
      }
      case 'nt-fold': {
        var k = Number(d.id);
        N.folded[k] = !N.folded[k];
        return true;
      }
      case 'nt-only': {
        var k2 = Number(d.id);
        N.onlyKeys[k2] = !N.onlyKeys[k2];
        if (N.onlyKeys[k2]) N.folded[k2] = false;
        return true;
      }
      case 'nt-sec': {
        /* 单节折叠：复用全局折叠状态过于粗糙，这里用 DOM 直接切换 */
        var el = document.querySelector('[data-act="nt-sec"][data-id="' + d.id + '"][data-i="' + d.i + '"]');
        if (el && el.parentNode) el.parentNode.classList.toggle('folded');
        return false;
      }
      case 'nt-start': {
        var c = Number(d.id);
        if (typeof window.__yztStart === 'function') window.__yztStart('chapter', c, d.title || '章节练习');
        return false;
      }
      case 'nt-retry':
        N.pIndex = null; N.err = '';
        return true;
      default:
        return false;
    }
  };

  /* 供 app.js 判断数据是否就绪 */
  V.notesReady = function () { return !!N.index; };
  V.loadNotesIndex = loadIndex;
  window.NOTES = N;
})();
