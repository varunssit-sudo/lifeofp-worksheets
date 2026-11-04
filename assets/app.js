/* Life of P Worksheets — renders topics and worksheets from data/*.json.
   New worksheets are added by appending to data/worksheets.json (see README). */
(function () {
  'use strict';
  const SUBJECTS = ['All', 'Maths', 'English', 'Science'];
  const LEVELS = ['All', 'Starter', 'Practice', 'Challenge'];
  const BADGE = ['#2F5BE7', '#C2410C', '#15803D', '#C8336B', '#6D4AD9', '#0E7490'];
  const SUBJECT_CODE = { Maths: 'Maths', English: 'English', Science: 'Science' };
  const PRINT_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';
  const PLAY_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>';

  const state = { topics: [], sheets: [], subject: 'All', level: 'All', q: '', withKey: false, previewIds: [] };
  const app = document.getElementById('app');
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  const sheetsFor = (topicId) => state.sheets.filter((s) => s.topic === topicId).sort((a, b) => a.number - b.number);
  const topicById = (id) => state.topics.find((t) => t.id === id);

  /* ---------- worksheet rendering ---------- */
  function renderSection(sec, i) {
    const head = `<div class="ws-sec-h"><span class="badge" style="background:${BADGE[i % BADGE.length]}">${String.fromCharCode(65 + i)}</span><b>${esc(sec.title)}</b><span>${sec.marks} mark${sec.marks === 1 ? '' : 's'}</span></div>`;
    let body = '';
    if (sec.type === 'pairs') {
      body = `<div class="pairs">${sec.items.map((it) => `<div class="pair"><b>${esc(it.q)}</b><span aria-hidden="true">→</span><span class="blankline"></span></div>`).join('')}</div>`;
    } else if (sec.type === 'fill') {
      body = `<ol class="ws-list">${sec.items.map((it, k) => `<li><span class="num">${k + 1}.</span>${esc(it.q).replace('___', '<span class="blank"></span>')}</li>`).join('')}</ol>`;
    } else if (sec.type === 'choice') {
      body = `<ol class="ws-list">${sec.items.map((it, k) => `<li><span class="num">${k + 1}.</span><span>${esc(it.before)}</span>${it.options.map((o, k) => (k ? '<span class="slash">/</span>' : '') + `<span class="opt">${esc(o)}</span>`).join('')}<span>${esc(it.after)}</span></li>`).join('')}</ol>`;
    } else if (sec.type === 'rewrite') {
      body = `<ol class="ws-list rewrite">${sec.items.map((it, k) => `<li><span><span class="num">${k + 1}.</span>${esc(it.q)}</span><span class="rule"></span></li>`).join('')}</ol>`;
    } else if (sec.type === 'lines') {
      body = `<div class="ws-lines">${'<span class="rule"></span>'.repeat(sec.lines || 2)}</div>`;
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

  function renderKey(ws) {
    const t = topicById(ws.topic) || { name: '' };
    const parts = ws.sections.map((sec, i) => {
      const L = String.fromCharCode(65 + i);
      const items = sec.items ? sec.items.map((it) => `<li>${esc(it.q ? it.q.replace('___', '…') + ' → ' : '')}<b>${esc(it.a)}</b></li>`).join('') : `<li>${esc(sec.a)}</li>`;
      return `<section class="ws-sec"><div class="ws-sec-h"><span class="badge" style="background:${BADGE[i % BADGE.length]}">${L}</span><b>${esc(sec.title)}</b></div><ol>${items}</ol></section>`;
    }).join('');
    return `<article class="page key-page"><div class="ws-tag">Answer key · ${esc(t.name)} · ${esc(ws.id)}</div><h2>${esc(ws.title)}</h2>${parts}</article>`;
  }

  const pagesFor = (ids, withKey) => ids.map((id) => state.sheets.find((s) => s.id === id)).filter(Boolean)
    .map((ws) => renderSheet(ws) + (withKey ? renderKey(ws) : '')).join('');

  /* ---------- printing ---------- */
  function printSheets(ids, withKey) {
    const area = $('print-area');
    area.innerHTML = pagesFor(ids, withKey);
    const log = JSON.parse(store.get('lop-printed') || '[]');
    ids.forEach((id) => log.unshift({ id, at: Date.now() }));
    store.set('lop-printed', JSON.stringify(log.slice(0, 20)));
    const go = () => { window.print(); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 50));
  }
  window.addEventListener('afterprint', () => { $('print-area').innerHTML = ''; if (!location.hash || location.hash === '#') render(); });

  /* ---------- preview ---------- */
  function openPreview(ids, title) {
    state.previewIds = ids;
    $('preview-title').textContent = title;
    $('preview-key').checked = state.withKey;
    fillPreview();
    $('preview').hidden = false;
    document.body.style.overflow = 'hidden';
    $('preview-close').focus();
  }
  function fillPreview() {
    const body = $('preview-body');
    body.innerHTML = pagesFor(state.previewIds, $('preview-key').checked);
    const z = Math.min(1, (body.clientWidth - 32) / 794);
    body.style.setProperty('--z', z.toFixed(3));
  }
  function closePreview() { $('preview').hidden = true; document.body.style.overflow = ''; }
  $('preview-close').addEventListener('click', closePreview);
  $('preview-key').addEventListener('change', () => { state.withKey = $('preview-key').checked; fillPreview(); });
  $('preview-print').addEventListener('click', () => printSheets(state.previewIds, $('preview-key').checked));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('preview').hidden) closePreview(); });
  window.addEventListener('resize', () => { if (!$('preview').hidden) fillPreview(); });

  /* ---------- pages ---------- */
  function topicCard(t) {
    const n = sheetsFor(t.id).length;
    const pct = Math.round(Math.min(n, t.target) / t.target * 100);
    const video = t.videoUrl
      ? `<a class="btn btn-video" href="${esc(t.videoUrl)}" target="_blank" rel="noopener">${PLAY_ICON}Video</a>`
      : `<span class="btn btn-video" aria-disabled="true" title="Video link coming soon">${PLAY_ICON}Soon</span>`;
    return `<article class="card s-${SUBJECT_CODE[t.subject]}">
      <span class="chip">${esc(t.subject)}</span>
      <div><h2>${esc(t.name)}</h2><p>${esc(t.blurb)}</p></div>
      <div class="progress"><div class="progress-row"><span><b>${n}</b> of ${t.target} worksheets</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="actions"><a class="btn btn-main" href="#${esc(t.id)}">Open worksheets</a>${video}</div>
    </article>`;
  }

  function matches(text) { return !state.q || text.toLowerCase().includes(state.q); }

  function renderHome() {
    const topics = state.topics.filter((t) => state.subject === 'All' || t.subject === state.subject)
      .filter((t) => matches(`${t.name} ${t.blurb} ${t.subject} ${sheetsFor(t.id).map((s) => s.title).join(' ')}`));
    const sheetHits = state.q ? state.sheets.filter((s) => matches(`${s.title} ${s.intro} ${(topicById(s.topic) || {}).name}`)) : [];
    const counts = { All: state.topics.length };
    state.topics.forEach((t) => { counts[t.subject] = (counts[t.subject] || 0) + 1; });
    const total = state.sheets.length;
    const target = state.topics.reduce((n, t) => n + t.target, 0);
    const printed = JSON.parse(store.get('lop-printed') || '[]').slice(0, 5)
      .map((p) => { const s = state.sheets.find((x) => x.id === p.id); return s ? `<li>${esc((topicById(s.topic) || {}).name)} · Sheet ${s.number}<small>${new Date(p.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</small></li>` : ''; }).join('');
    const growing = state.topics.filter((t) => sheetsFor(t.id).length < t.target).slice(0, 4)
      .map((t) => `<li><b>${esc(t.name)}</b><small>${sheetsFor(t.id).length} of ${t.target} ready</small></li>`).join('');

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
      ${sheetHits.length ? `<section><h2 style="margin:0 0 12px;font-family:var(--display)">Worksheets matching “${esc(state.q)}”</h2><div class="sheets">${sheetHits.map(sheetCard).join('')}</div></section>` : ''}
      <div class="layout">
        <section class="grid" aria-label="Topics">${topics.map(topicCard).join('') || `<p class="empty">No topic matches “${esc(state.q)}”. Try a shorter word, like “tense” or “table”.</p>`}</section>
        <aside class="side">
          <section class="panel panel-agent"><h2>Worksheet agent</h2><ul>${growing || '<li>Every topic has its full set.</li>'}</ul><small>New video in the tracker? The agent opens a topic for it and works up to 15 sheets.</small></section>
          <section class="panel panel-sun"><h2>Printed on this device</h2><ul>${printed || '<li><small>Nothing printed yet.</small></li>'}</ul></section>
        </aside>
      </div>`;
    app.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => { state.subject = b.dataset.subject; render(); }));
    bindSheetButtons();
  }

  function sheetCard(s) {
    const t = topicById(s.topic) || {};
    const q = s.sections.reduce((n, sec) => n + (sec.items ? sec.items.length : (sec.lines || 1)), 0);
    return `<article class="card sheet-card s-${SUBJECT_CODE[t.subject] || 'All'}">
      <div class="thumb" aria-hidden="true"><i></i><i style="width:70%"></i><i style="width:88%"></i><i style="width:60%"></i><i style="width:82%"></i><i style="width:54%"></i><i style="width:76%"></i></div>
      <div><div class="meta"><span>Sheet ${s.number}</span><span>${esc(s.level)}</span></div><h3>${esc(s.title)}</h3><p>${q} questions · 1 page</p></div>
      <div class="actions"><button type="button" class="btn btn-soft" data-preview="${esc(s.id)}" style="flex:1">Preview</button><button type="button" class="btn btn-print" data-print="${esc(s.id)}" aria-label="Print sheet ${s.number}, ${esc(s.title)}">${PRINT_ICON}Print</button></div>
    </article>`;
  }

  function renderTopic(t) {
    const all = sheetsFor(t.id);
    const list = all.filter((s) => state.level === 'All' || s.level === state.level)
      .filter((s) => matches(`${s.title} ${s.intro}`));
    const pendingCount = Math.max(0, t.target - all.length);
    const pending = state.level === 'All' && !state.q ? Array.from({ length: pendingCount }, (_, i) => `<div class="pending"><span class="meta">Sheet ${all.length + i + 1}</span><b>On the way</b><span>The worksheet agent is writing this one.</span></div>`).join('') : '';
    const sc = SUBJECT_CODE[t.subject];
    app.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All subjects</a><span aria-hidden="true">/</span><span>${esc(t.subject)}</span><span aria-hidden="true">/</span><b>${esc(t.name)}</b></nav>
      <section class="topic-head s-${sc}">
        <div class="topic-text">
          <span class="chip">${esc(t.subject)}</span>
          <h1>${esc(t.name)}</h1>
          <p>${esc(t.about)}</p>
          <div class="progress" style="max-width:420px"><div class="progress-row"><span><b>${all.length} of ${t.target}</b> worksheets ready</span><span style="color:var(--muted)">${pendingCount} on the way</span></div><div class="bar"><i style="width:${Math.round(all.length / t.target * 100)}%"></i></div></div>
          <div class="actions">
            ${all.length ? `<button type="button" class="btn btn-print" id="print-all">${PRINT_ICON}Print all ${all.length}</button>` : ''}
            <label class="switch"><input type="checkbox" id="key-all" ${state.withKey ? 'checked' : ''}> Include answer keys</label>
          </div>
        </div>
        ${t.videoUrl ? `<a class="video-card" href="${esc(t.videoUrl)}" target="_blank" rel="noopener">` : '<div class="video-card">'}
          <div class="video-thumb"><b>${esc(t.name)}</b><span class="play">${PLAY_ICON.replace('width="18" height="18"', 'width="26" height="26"')}</span></div>
          <div class="vrow">${t.videoUrl ? 'Watch the video on YouTube' : 'Video link coming soon'}<span>Life of P</span></div>
        ${t.videoUrl ? '</a>' : '</div>'}
      </section>
      <section class="s-${sc}" aria-label="Worksheets" style="display:flex;flex-direction:column;gap:14px">
        <div class="sheets-head"><h2>Worksheets</h2>
          <div class="levels" role="group" aria-label="Level">${LEVELS.map((l) => `<button type="button" class="tab s-${sc}" data-level="${l}" aria-pressed="${state.level === l}">${l}</button>`).join('')}</div>
        </div>
        <div class="sheets">${list.map(sheetCard).join('')}${pending}</div>
        ${!list.length && !pending ? '<p class="empty">No worksheets at this level yet.</p>' : ''}
      </section>`;
    app.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { state.level = b.dataset.level; render(); }));
    const keyAll = $('key-all');
    keyAll.addEventListener('change', () => { state.withKey = keyAll.checked; });
    const pa = $('print-all');
    if (pa) pa.addEventListener('click', () => printSheets(all.map((s) => s.id), state.withKey));
    bindSheetButtons();
  }

  function bindSheetButtons() {
    app.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => {
      const s = state.sheets.find((x) => x.id === b.dataset.preview);
      openPreview([s.id], `Sheet ${s.number} · ${s.title}`);
    }));
    app.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printSheets([b.dataset.print], state.withKey)));
  }

  function render() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    const t = id && topicById(id);
    if (t) { document.title = `${t.name} · Life of P Worksheets`; renderTopic(t); }
    else { document.title = 'Life of P Worksheets'; renderHome(); }
  }

  $('search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
  window.addEventListener('hashchange', () => { state.level = 'All'; render(); window.scrollTo(0, 0); });

  Promise.all([fetch('data/topics.json').then((r) => r.json()), fetch('data/worksheets.json').then((r) => r.json())])
    .then(([topics, sheets]) => { state.topics = topics; state.sheets = sheets; render(); })
    .catch(() => { app.innerHTML = '<p class="empty">The worksheets could not load. Refresh the page; if it keeps happening, the data files may have a typo.</p>'; });
})();
