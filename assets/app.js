/* Life of P Worksheets.
   data/topics.json   one topic per channel video
   data/index.json    a light list of every worksheet (built by tools/build.py)
   data/worksheets/<topic>.json   the full worksheets for one topic, loaded when needed */
(function () {
  'use strict';
  const CHANNEL = 'https://www.youtube.com/@lifeofp5750';
  const SUBSCRIBE = CHANNEL + '?sub_confirmation=1';
  const SUBJECTS = ['All', 'Maths', 'English', 'Science'];
  const LEVELS = ['All', 'Starter', 'Practice', 'Challenge'];
  const BADGE = ['#2F5BE7', '#C2410C', '#15803D', '#C8336B', '#6D4AD9', '#0E7490'];
  const PRINT_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';
  const PLAY_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>';
  const BELL_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  const state = { topics: [], index: [], full: {}, subject: 'All', level: 'All', q: '', withKey: false, previewIds: [] };
  const app = document.getElementById('app');
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const topicById = (id) => state.topics.find((t) => t.id === id);
  const listFor = (topicId) => state.index.filter((s) => s.topic === topicId).sort((a, b) => a.number - b.number);
  const sheetById = (id) => { for (const k in state.full) { const s = state.full[k].find((x) => x.id === id); if (s) return s; } return null; };

  async function loadTopic(topicId) {
    if (!state.full[topicId]) {
      const r = await fetch(`data/worksheets/${encodeURIComponent(topicId)}.json${bust}`);
      state.full[topicId] = r.ok ? await r.json() : [];
    }
    return state.full[topicId];
  }
  async function loadSheets(ids) {
    const topics = [...new Set(ids.map((id) => (state.index.find((x) => x.id === id) || {}).topic).filter(Boolean))];
    await Promise.all(topics.map(loadTopic));
    return ids.map(sheetById).filter(Boolean);
  }

  /* ---------- worksheet rendering ---------- */
  const letter = (i) => String.fromCharCode(65 + i);
  const rotate = (arr, n) => arr.slice(n % arr.length).concat(arr.slice(0, n % arr.length));

  function renderSection(sec, i) {
    const head = `<div class="ws-sec-h"><span class="badge" style="background:${BADGE[i % BADGE.length]}">${letter(i)}</span><b>${esc(sec.title)}</b><span>${sec.marks} mark${sec.marks === 1 ? '' : 's'}</span></div>`;
    const it = sec.items || [];
    const num = (k) => `<span class="num">${k + 1}.</span>`;
    let body = '';
    switch (sec.type) {
      case 'pairs':
        body = `<div class="pairs">${it.map((x) => `<div class="pair"><b>${esc(x.q)}</b><span aria-hidden="true">→</span><span class="blankline"></span></div>`).join('')}</div>`; break;
      case 'fill':
        body = `<ol class="ws-list fill">${it.map((x, k) => `<li>${num(k)}${esc(x.q).replace('___', '<span class="blank"></span>')}</li>`).join('')}</ol>`; break;
      case 'choice':
        body = `<ol class="ws-list">${it.map((x, k) => `<li>${num(k)}<span>${esc(x.before)}</span>${x.options.map((o, j) => (j ? '<span class="slash">/</span>' : '') + `<span class="opt">${esc(o)}</span>`).join('')}<span>${esc(x.after)}</span></li>`).join('')}</ol>`; break;
      case 'rewrite':
        body = `<ol class="ws-list rewrite">${it.map((x, k) => `<li><span>${num(k)}${esc(x.q)}</span><span class="rule"></span></li>`).join('')}</ol>`; break;
      case 'lines':
        body = `<div class="ws-lines">${'<span class="rule"></span>'.repeat(sec.lines || 2)}</div>`; break;
      case 'truefalse':
        body = `<ol class="ws-list">${it.map((x, k) => `<li>${num(k)}<span class="tf-q">${esc(x.q)}</span><span class="opt">True</span><span class="opt">False</span></li>`).join('')}</ol>`; break;
      case 'match': {
        const right = rotate(it.map((x) => x.right), 2);
        body = `<div class="match">${it.map((x, k) => `<div class="m-row"><span class="m-l">${num(k)}${esc(x.left)}</span><span class="m-dot"></span><span class="m-dot"></span><span class="m-r"><b>${letter(k).toLowerCase()}.</b> ${esc(right[k])}</span></div>`).join('')}</div>`; break;
      }
      case 'sort': {
        const rows = Math.max(2, Math.ceil(sec.words.length / sec.groups.length));
        body = `<div class="wordbox">${sec.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
          <div class="sort" style="grid-template-columns:repeat(${sec.groups.length},minmax(0,1fr))">${sec.groups.map((g) => `<div class="sort-col"><b>${esc(g)}</b>${'<span class="rule"></span>'.repeat(rows)}</div>`).join('')}</div>`; break;
      }
      case 'column':
        body = `<div class="columns">${it.map((x) => `<div class="col-sum"><span>${esc(x.top)}</span><span><i>${esc(x.op === '-' ? '−' : x.op)}</i>${esc(x.bottom)}</span><span class="col-ans"></span></div>`).join('')}</div>`; break;
    }
    return `<section class="ws-sec">${head}${body}</section>`;
  }

  function renderSheet(ws) {
    const t = topicById(ws.topic) || { subject: '', name: '' };
    const total = ws.sections.reduce((n, s) => n + (s.marks || 0), 0);
    return `<article class="page">
      <header class="ws-head">
        <div>
          <div class="ws-tag">${esc(t.subject)} · ${esc(t.name)} · Sheet ${ws.number} of ${t.target || 15} · ${esc(ws.level)}</div>
          <h1>${esc(ws.title)}</h1>
          <div class="ws-intro">${esc(ws.intro)}</div>
        </div>
        <div class="ws-fields">
          <div class="field"><span>Name</span><i></i></div>
          <div class="field"><span>Date</span><i></i></div>
          <div class="field score"><span>Score</span><i></i><span>/ ${total}</span></div>
        </div>
      </header>
      ${ws.sections.map(renderSection).join('')}
      <footer class="ws-foot"><span><b>Stuck?</b> Watch “${esc(t.name)}” on the Life of P YouTube channel.</span><span>${esc(ws.id)}</span></footer>
    </article>`;
  }

  function keyItems(sec) {
    const it = sec.items || [];
    switch (sec.type) {
      case 'match': return it.map((x, k) => `<li>${esc(x.left)} → <b>${esc(x.right)}</b></li>`).join('');
      case 'sort': return sec.groups.map((g) => `<li>${esc(g)}: <b>${esc(Object.keys(sec.a).filter((w) => sec.a[w] === g).join(', '))}</b></li>`).join('');
      case 'truefalse': return it.map((x) => `<li>${esc(x.q)} → <b>${x.a ? 'True' : 'False'}</b></li>`).join('');
      case 'column': return it.map((x) => `<li>${esc(x.top)} ${esc(x.op)} ${esc(x.bottom)} = <b>${esc(x.a)}</b></li>`).join('');
      case 'choice': return it.map((x) => `<li>${esc(x.before)} … ${esc(x.after)} → <b>${esc(x.a)}</b></li>`).join('');
      case 'lines': return `<li>${esc(sec.a)}</li>`;
      default: return it.map((x) => `<li>${esc((x.q || '').replace('___', '…'))} → <b>${esc(x.a)}</b></li>`).join('');
    }
  }
  function renderKey(ws) {
    const t = topicById(ws.topic) || { name: '' };
    const parts = ws.sections.map((sec, i) => `<section class="ws-sec"><div class="ws-sec-h"><span class="badge" style="background:${BADGE[i % BADGE.length]}">${letter(i)}</span><b>${esc(sec.title)}</b></div><ol>${keyItems(sec)}</ol></section>`).join('');
    return `<article class="page key-page"><div class="ws-tag">Answer key · ${esc(t.name)} · ${esc(ws.id)}</div><h2>${esc(ws.title)}</h2>${parts}</article>`;
  }
  const pagesFor = (sheets, withKey) => sheets.map((ws) => renderSheet(ws) + (withKey ? renderKey(ws) : '')).join('');

  /* ---------- printing ---------- */
  async function printSheets(ids, withKey) {
    const sheets = await loadSheets(ids);
    $('print-area').innerHTML = pagesFor(sheets, withKey);
    const log = JSON.parse(store.get('lop-printed') || '[]');
    ids.forEach((id) => log.unshift({ id, at: Date.now() }));
    store.set('lop-printed', JSON.stringify(log.slice(0, 20)));
    await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
    setTimeout(() => window.print(), 50);
  }
  window.addEventListener('afterprint', () => { $('print-area').innerHTML = ''; });

  /* ---------- preview ---------- */
  async function openPreview(ids, title) {
    state.previewIds = ids;
    $('preview-title').textContent = title;
    $('preview-key').checked = state.withKey;
    $('preview').hidden = false;
    document.body.style.overflow = 'hidden';
    await fillPreview();
    $('preview-close').focus();
  }
  async function fillPreview() {
    const body = $('preview-body');
    body.innerHTML = pagesFor(await loadSheets(state.previewIds), $('preview-key').checked);
    body.style.setProperty('--z', Math.min(1, (body.clientWidth - 32) / 794).toFixed(3));
  }
  function closePreview() { $('preview').hidden = true; document.body.style.overflow = ''; }
  $('preview-close').addEventListener('click', closePreview);
  $('preview-key').addEventListener('change', () => { state.withKey = $('preview-key').checked; fillPreview(); });
  $('preview-print').addEventListener('click', () => printSheets(state.previewIds, $('preview-key').checked));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('preview').hidden) closePreview(); });
  window.addEventListener('resize', () => { if (!$('preview').hidden) fillPreview(); });

  /* ---------- pages ---------- */
  const videoBtn = (t) => t.videoUrl
    ? `<a class="btn btn-video" href="${esc(t.videoUrl)}" target="_blank" rel="noopener">${PLAY_ICON}Video</a>`
    : `<span class="btn btn-video" aria-disabled="true">${PLAY_ICON}Soon</span>`;

  function topicCard(t) {
    const n = listFor(t.id).length;
    const pct = Math.round(Math.min(n, t.target) / t.target * 100);
    return `<article class="card s-${t.subject}">
      <span class="chip">${esc(t.subject)}</span>
      <div><h2>${esc(t.name)}</h2><p>${esc(t.blurb)}</p></div>
      <div class="progress"><div class="progress-row"><span><b>${n}</b> of ${t.target} worksheets</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="actions"><a class="btn btn-main" href="#${esc(t.id)}">Open worksheets</a>${videoBtn(t)}</div>
    </article>`;
  }

  function sheetCard(s) {
    const t = topicById(s.topic) || {};
    return `<article class="card sheet-card s-${t.subject || 'All'}">
      <div class="thumb" aria-hidden="true"><i></i><i style="width:70%"></i><i style="width:88%"></i><i style="width:60%"></i><i style="width:82%"></i><i style="width:54%"></i><i style="width:76%"></i></div>
      <div><div class="meta"><span>Sheet ${s.number}</span><span>${esc(s.level)}</span></div><h3>${esc(s.title)}</h3><p>${esc(t.name)} · 1 page</p></div>
      <div class="actions"><button type="button" class="btn btn-soft" data-preview="${esc(s.id)}" style="flex:1">Preview</button><button type="button" class="btn btn-print" data-print="${esc(s.id)}" aria-label="Print sheet ${s.number}, ${esc(s.title)}">${PRINT_ICON}Print</button></div>
    </article>`;
  }

  const matches = (text) => !state.q || state.q.split(/\s+/).every((w) => text.toLowerCase().includes(w));

  function renderHome() {
    const topics = state.topics.filter((t) => state.subject === 'All' || t.subject === state.subject)
      .filter((t) => matches(`${t.name} ${t.blurb} ${t.subject} ${listFor(t.id).map((s) => s.title).join(' ')}`));
    const sheetHits = state.q ? state.index.filter((s) => { const t = topicById(s.topic) || {}; return (state.subject === 'All' || t.subject === state.subject) && matches(`${s.title} ${t.name} ${t.subject}`); }).slice(0, 24) : [];
    const counts = { All: state.topics.length };
    state.topics.forEach((t) => { counts[t.subject] = (counts[t.subject] || 0) + 1; });
    const total = state.index.length;
    const target = state.topics.reduce((n, t) => n + t.target, 0);
    const printed = JSON.parse(store.get('lop-printed') || '[]').slice(0, 5).map((p) => {
      const s = state.index.find((x) => x.id === p.id); if (!s) return '';
      return `<li>${esc((topicById(s.topic) || {}).name)} · Sheet ${s.number}<small>${new Date(p.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</small></li>`;
    }).join('');
    const started = state.topics.filter((t) => { const n = listFor(t.id).length; return n > 0 && n < t.target; });
    const done = state.topics.filter((t) => listFor(t.id).length >= t.target).length;

    app.innerHTML = `
      <section class="hero">
        <div><h1>Practice sheets for every <span>Life of P</span> video</h1>
        <p>Pick a subject, open a topic, print a sheet. Each topic grows to 15 worksheets, each with a fresh real-life scenario.</p></div>
        <div class="stats">
          <div class="stat"><b style="color:var(--maths)">${state.topics.length}</b><span>topics</span></div>
          <div class="stat"><b style="color:var(--english)">${total}</b><span>worksheets</span></div>
          <div class="stat"><b style="color:var(--science)">${Math.max(0, target - total)}</b><span>to go</span></div>
        </div>
      </section>
      <nav class="tabs" aria-label="Subjects">${SUBJECTS.map((s) => `<button type="button" class="tab s-${s}" data-subject="${s}" aria-pressed="${state.subject === s}">${s} <span class="n">${counts[s] || 0}</span></button>`).join('')}</nav>
      ${sheetHits.length ? `<section class="hits"><h2>Worksheets matching “${esc(state.q)}”</h2><div class="sheets">${sheetHits.map(sheetCard).join('')}</div></section>` : ''}
      <div class="layout">
        <section class="grid" aria-label="Topics">${topics.map(topicCard).join('') || `<p class="empty">No topic matches “${esc(state.q)}”. Try a shorter word, like “tense” or “table”.</p>`}</section>
        <aside class="side">
          <section class="panel panel-agent"><h2>Worksheet agent</h2>
            <p class="agent-line"><b>${done} of ${state.topics.length}</b> topics have all 15 sheets.</p>
            <ul>${started.slice(0, 4).map((t) => `<li><b>${esc(t.name)}</b><small>${listFor(t.id).length} of ${t.target} ready</small></li>`).join('') || '<li><small>Starting tonight with the first topics.</small></li>'}</ul>
            <small>It writes new sheets every night and adds a topic for every new video on the channel.</small></section>
          <section class="panel panel-sub"><h2>Life of P on YouTube</h2><p class="agent-line">Every topic here has its own video. Subscribe to get new ones first.</p>
            <a class="btn btn-sub" href="${SUBSCRIBE}" target="_blank" rel="noopener">${BELL_ICON}Subscribe</a></section>
          <section class="panel panel-sun"><h2>Printed on this device</h2><ul>${printed || '<li><small>Nothing printed yet.</small></li>'}</ul></section>
        </aside>
      </div>`;
    app.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => { state.subject = b.dataset.subject; render(); }));
    bindSheetButtons();
  }

  function renderTopic(t) {
    const all = listFor(t.id);
    const list = all.filter((s) => state.level === 'All' || s.level === state.level).filter((s) => matches(s.title));
    const pendingCount = Math.max(0, t.target - all.length);
    const pending = state.level === 'All' && !state.q ? Array.from({ length: pendingCount }, (_, i) => `<div class="pending"><span class="meta">Sheet ${all.length + i + 1}</span><b>On the way</b><span>The worksheet agent is writing this one.</span></div>`).join('') : '';
    const thumb = t.videoId ? `<img src="https://i.ytimg.com/vi/${esc(t.videoId)}/hqdefault.jpg" alt="" loading="lazy">` : `<b>${esc(t.name)}</b>`;
    app.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All subjects</a><span aria-hidden="true">/</span><span>${esc(t.subject)}</span><span aria-hidden="true">/</span><b>${esc(t.name)}</b></nav>
      <section class="topic-head s-${t.subject}">
        <div class="topic-text">
          <span class="chip">${esc(t.subject)}</span>
          <h1>${esc(t.name)}</h1>
          <p>${esc(t.about || t.blurb)}</p>
          <div class="progress" style="max-width:420px"><div class="progress-row"><span><b>${all.length} of ${t.target}</b> worksheets ready</span><span style="color:var(--muted)">${pendingCount} on the way</span></div><div class="bar"><i style="width:${Math.round(all.length / t.target * 100)}%"></i></div></div>
          <div class="actions">
            ${all.length ? `<button type="button" class="btn btn-print" id="print-all">${PRINT_ICON}Print all ${all.length}</button>` : ''}
            <label class="switch"><input type="checkbox" id="key-all" ${state.withKey ? 'checked' : ''}> Include answer keys</label>
          </div>
        </div>
        <div class="video-card">
          ${t.videoUrl ? `<a class="video-thumb" href="${esc(t.videoUrl)}" target="_blank" rel="noopener" aria-label="Watch ${esc(t.name)} on YouTube">${thumb}<span class="play">${PLAY_ICON.replace('width="18" height="18"', 'width="26" height="26"')}</span></a>` : `<div class="video-thumb">${thumb}</div>`}
          <div class="vrow"><span class="vtitle">${t.videoUrl ? 'Watch the video first' : 'Video link coming soon'}</span>
            <span class="vbtns">${t.videoUrl ? `<a class="btn btn-video" href="${esc(t.videoUrl)}" target="_blank" rel="noopener">${PLAY_ICON}Watch</a>` : ''}<a class="btn btn-sub" href="${SUBSCRIBE}" target="_blank" rel="noopener">${BELL_ICON}Subscribe</a></span></div>
        </div>
      </section>
      <section class="s-${t.subject} sheets-wrap" aria-label="Worksheets">
        <div class="sheets-head"><h2>Worksheets</h2>
          <div class="levels" role="group" aria-label="Level">${LEVELS.map((l) => `<button type="button" class="tab s-${t.subject}" data-level="${l}" aria-pressed="${state.level === l}">${l}</button>`).join('')}</div>
        </div>
        <div class="sheets">${list.map(sheetCard).join('')}${pending}</div>
        ${!list.length && !pending ? '<p class="empty">No worksheets at this level yet.</p>' : ''}
      </section>`;
    app.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { state.level = b.dataset.level; render(); }));
    $('key-all').addEventListener('change', (e) => { state.withKey = e.target.checked; });
    const pa = $('print-all');
    if (pa) pa.addEventListener('click', () => printSheets(all.map((s) => s.id), state.withKey));
    bindSheetButtons();
  }

  function bindSheetButtons() {
    app.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => {
      const s = state.index.find((x) => x.id === b.dataset.preview);
      openPreview([s.id], `Sheet ${s.number} · ${s.title}`);
    }));
    app.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printSheets([b.dataset.print], state.withKey)));
  }

  function render() {
    const t = topicById(decodeURIComponent(location.hash.replace(/^#/, '')));
    document.title = t ? `${t.name} · Life of P Worksheets` : 'Life of P Worksheets';
    t ? renderTopic(t) : renderHome();
  }

  $('search').addEventListener('input', (e) => {
    state.q = e.target.value.trim().toLowerCase();
    if (location.hash && location.hash !== '#') { history.replaceState(null, '', location.pathname); }
    render();
  });
  window.addEventListener('hashchange', () => { state.level = 'All'; render(); window.scrollTo(0, 0); });

  const bust = '?v=' + Math.floor(Date.now() / 3600000); // refresh data at least hourly despite caching
  Promise.all([fetch('data/topics.json' + bust).then((r) => r.json()), fetch('data/index.json' + bust).then((r) => r.ok ? r.json() : [])])
    .then(([topics, index]) => { state.topics = topics; state.index = index; render(); })
    .catch(() => { app.innerHTML = '<p class="empty">The worksheets could not load. Refresh the page; if it keeps happening, the data files may have a typo.</p>'; });
})();
