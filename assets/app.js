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

  const PEN_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
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
      <button type="button" class="thumb" data-preview="${esc(s.id)}" data-thumb="${esc(s.id)}" aria-label="Preview sheet ${s.number}, ${esc(s.title)}"><span class="thumb-lines" aria-hidden="true"><i></i><i style="width:70%"></i><i style="width:88%"></i><i style="width:60%"></i><i style="width:82%"></i></span></button>
      <div><div class="meta"><span>Sheet ${s.number}</span><span>${esc(s.level)}</span></div><h3>${esc(s.title)}</h3><p>${esc(t.name)} · 1 page</p></div>
      <div class="actions sheet-actions"><a class="btn btn-main btn-online" href="#do/${esc(s.id)}" aria-label="Do sheet ${s.number}, ${esc(s.title)}, online">${PEN_ICON}Do it online</a><button type="button" class="btn btn-soft" data-preview="${esc(s.id)}">Preview</button><button type="button" class="btn btn-print" data-print="${esc(s.id)}" aria-label="Print sheet ${s.number}, ${esc(s.title)}">${PRINT_ICON}Print</button></div>
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
    app.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => {
      const h = b.dataset.subject === 'All' ? '' : b.dataset.subject.toLowerCase();
      if (location.hash.replace(/^#/, '') === h) { state.subject = b.dataset.subject; render(); } else { location.hash = h; }
    }));
    bindSheetButtons();
  }

  function renderTopic(t) {
    const all = listFor(t.id);
    const list = all.filter((s) => state.level === 'All' || s.level === state.level).filter((s) => matches(s.title));
    const pendingCount = Math.max(0, t.target - all.length);
    const pending = state.level === 'All' && !state.q ? Array.from({ length: pendingCount }, (_, i) => `<div class="pending"><span class="meta">Sheet ${all.length + i + 1}</span><b>On the way</b><span>The worksheet agent is writing this one.</span></div>`).join('') : '';
    const thumb = t.videoId ? `<img src="https://i.ytimg.com/vi/${esc(t.videoId)}/hqdefault.jpg" alt="" loading="lazy">` : `<b>${esc(t.name)}</b>`;
    app.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All subjects</a><span aria-hidden="true">/</span><a href="#${esc(t.subject.toLowerCase())}">${esc(t.subject)}</a><span aria-hidden="true">/</span><b>${esc(t.name)}</b></nav>
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

  /* ---------- online worksheets: fill in on screen, then check ---------- */
  const norm = (v) => String(v ?? '').toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[−–—]/g, '-').replace(/[x*]/g, (c, i, str) => (/\d\s*$/.test(str.slice(0, i)) ? '×' : c))
    .replace(/₹|\brs\.?(?=\s*\d)/g, '').replace(/[\s,]+/g, '').replace(/[.!?]+$/, '');
  const isOpen = (a) => /^\s*(e\.g\.|answers? (will )?vary|any )/i.test(String(a));
  function accepts(a, given) {
    if (!/[a-z0-9]/i.test(String(a))) return String(given).trim() === String(a).trim(); // punctuation answers: . , ? !
    const g = norm(given);
    if (!g) return false;
    const opts = String(a).split(/\s+\/\s+/);
    const more = [];
    opts.forEach((o) => { const m = o.match(/^(.*?)\s*\((.+)\)\s*$/); if (m) more.push(m[1], m[2]); });
    return [...opts, ...more].some((o) => norm(o) === g);
  }
  const loose = (v) => norm(v).replace(/[^a-z0-9×+\-=]/g, '');
  const field = (key, a, cls = '') => `<input class="ol-in ${cls}" data-k="${key}" ${/^\d+$/.test(String(a)) ? 'inputmode="numeric"' : ''} autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Answer">`;
  const fb = (key) => `<span class="ol-fb" data-fb="${key}" aria-live="polite"></span>`;

  function onlineSection(sec, i) {
    const it = sec.items || [];
    const k = (j) => `${i}.${j}`;
    const head = `<div class="ws-sec-h"><span class="badge" style="background:${BADGE[i % BADGE.length]}">${letter(i)}</span><b>${esc(sec.title)}</b><span>${sec.marks} mark${sec.marks === 1 ? '' : 's'}</span></div>`;
    let body = '';
    switch (sec.type) {
      case 'fill':
        body = `<ol class="ol-list">${it.map((x, j) => { const [a, b] = esc(x.q).split('___'); return `<li class="ol-item" data-item="${k(j)}">${a}${field(k(j), x.a, 'inline')}${b ?? ''}${fb(k(j))}</li>`; }).join('')}</ol>`; break;
      case 'pairs':
        body = `<div class="ol-pairs">${it.map((x, j) => `<label class="ol-item ol-pair" data-item="${k(j)}"><b>${esc(x.q)}</b><span aria-hidden="true">→</span>${field(k(j), x.a)}${fb(k(j))}</label>`).join('')}</div>`; break;
      case 'column':
        body = `<div class="ol-cols">${it.map((x, j) => `<div class="ol-item ol-col" data-item="${k(j)}"><span>${esc(x.top)}</span><span><i>${esc(x.op === '-' ? '−' : x.op)}</i>${esc(x.bottom)}</span>${field(k(j), x.a)}${fb(k(j))}</div>`).join('')}</div>`; break;
      case 'choice':
        body = `<ol class="ol-list">${it.map((x, j) => `<li class="ol-item" data-item="${k(j)}"><span>${esc(x.before)}</span> <span class="ol-opts" role="radiogroup">${x.options.map((o) => `<button type="button" class="ol-opt" role="radio" aria-checked="false" data-k="${k(j)}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</span> <span>${esc(x.after)}</span>${fb(k(j))}</li>`).join('')}</ol>`; break;
      case 'truefalse':
        body = `<ol class="ol-list">${it.map((x, j) => `<li class="ol-item" data-item="${k(j)}"><span>${esc(x.q)}</span> <span class="ol-opts" role="radiogroup">${['True', 'False'].map((o) => `<button type="button" class="ol-opt" role="radio" aria-checked="false" data-k="${k(j)}" data-v="${o}">${o}</button>`).join('')}</span>${fb(k(j))}</li>`).join('')}</ol>`; break;
      case 'match': {
        const right = rotate(it.map((x) => x.right), 2);
        body = `<ol class="ol-list">${it.map((x, j) => `<li class="ol-item" data-item="${k(j)}"><span>${esc(x.left)}</span> <span aria-hidden="true">→</span> <select class="ol-in" data-k="${k(j)}" aria-label="Match for ${esc(x.left)}"><option value="">Choose…</option>${right.map((r) => `<option>${esc(r)}</option>`).join('')}</select>${fb(k(j))}</li>`).join('')}</ol>`; break;
      }
      case 'sort':
        body = `<ol class="ol-list">${sec.words.map((w, j) => `<li class="ol-item" data-item="${k(j)}"><b>${esc(w)}</b> <span class="ol-opts" role="radiogroup">${sec.groups.map((g) => `<button type="button" class="ol-opt" role="radio" aria-checked="false" data-k="${k(j)}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</span>${fb(k(j))}</li>`).join('')}</ol>`; break;
      case 'rewrite':
        body = `<ol class="ol-list">${it.map((x, j) => `<li class="ol-item ol-block" data-item="${k(j)}"><span>${esc(x.q)}</span><textarea class="ol-in" data-k="${k(j)}" rows="2" aria-label="Write your sentence"></textarea>${fb(k(j))}</li>`).join('')}</ol>`; break;
      case 'lines':
        body = `<div class="ol-item ol-block" data-item="${k(0)}"><textarea class="ol-in" data-k="${k(0)}" rows="${Math.max(2, sec.lines || 2)}" aria-label="Write your answer"></textarea>${fb(k(0))}</div>`; break;
    }
    return `<section class="ws-sec ol-sec">${head}${body}</section>`;
  }

  // every answerable item on a sheet: { key, kind: 'auto' | 'self' | 'open', answer, show }
  function onlineKey(ws) {
    const out = [];
    ws.sections.forEach((sec, i) => {
      const it = sec.items || [];
      const add = (j, kind, answer, show) => out.push({ key: `${i}.${j}`, kind, answer, show: show ?? String(answer) });
      switch (sec.type) {
        case 'fill': case 'pairs': case 'column': it.forEach((x, j) => add(j, isOpen(x.a) ? 'open' : 'auto', x.a)); break;
        case 'choice': it.forEach((x, j) => add(j, 'exact', x.a)); break;
        case 'truefalse': it.forEach((x, j) => add(j, 'exact', x.a ? 'True' : 'False')); break;
        case 'match': it.forEach((x, j) => add(j, 'exact', x.right)); break;
        case 'sort': sec.words.forEach((w, j) => add(j, 'exact', sec.a[w])); break;
        case 'rewrite': it.forEach((x, j) => add(j, 'self', x.a)); break;
        case 'lines': add(0, 'open', sec.a); break;
      }
    });
    return out;
  }

  const saveKey = (id) => `lop-online-${id}`;
  function readAnswers() {
    const v = {};
    app.querySelectorAll('.ol-in[data-k]').forEach((el) => { v[el.dataset.k] = el.value; });
    app.querySelectorAll('.ol-opt[aria-checked="true"]').forEach((el) => { v[el.dataset.k] = el.dataset.v; });
    return v;
  }
  function writeAnswers(v) {
    app.querySelectorAll('.ol-in[data-k]').forEach((el) => { if (v[el.dataset.k] != null) el.value = v[el.dataset.k]; });
    app.querySelectorAll('.ol-opt').forEach((el) => el.setAttribute('aria-checked', String(v[el.dataset.k] === el.dataset.v)));
  }

  async function renderOnline(id) {
    const meta = state.index.find((x) => x.id === id);
    const t = meta && topicById(meta.topic);
    if (!meta || !t) { app.innerHTML = '<p class="empty">That worksheet could not be found. <a href="#">Back to all subjects</a></p>'; return; }
    document.title = `${meta.title} · Do it online · Life of P Worksheets`;
    app.innerHTML = '<p class="empty">Loading the worksheet…</p>';
    const ws = (await loadSheets([id]))[0];
    if (!ws || location.hash !== '#do/' + id) return;
    const key = onlineKey(ws);
    const nAuto = key.filter((x) => x.kind !== 'open').length;
    const sib = listFor(t.id);
    const pos = sib.findIndex((x) => x.id === id);
    const next = sib[pos + 1];
    app.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All subjects</a><span aria-hidden="true">/</span><a href="#${esc(t.subject.toLowerCase())}">${esc(t.subject)}</a><span aria-hidden="true">/</span><a href="#${esc(t.id)}">${esc(t.name)}</a><span aria-hidden="true">/</span><b>Sheet ${ws.number}</b></nav>
      <section class="online s-${t.subject}">
        <header class="ol-head">
          <div class="ws-tag">${esc(t.subject)} · ${esc(t.name)} · Sheet ${ws.number} · ${esc(ws.level)}</div>
          <h1>${esc(ws.title)}</h1>
          <p class="ws-intro">${esc(ws.intro)}</p>
          <label class="ol-name">Your name <input id="ol-name" autocomplete="off" placeholder="Type your name"></label>
        </header>
        <div id="ol-result" class="ol-result" hidden></div>
        <form id="ol-form" class="ol-form" novalidate>
          ${ws.sections.map(onlineSection).join('')}
          <div class="ol-bar">
            <button type="submit" class="btn btn-main ol-submit">Submit and check</button>
            <button type="button" class="btn btn-ghost" id="ol-reset">Start again</button>
          </div>
        </form>
        <div class="ol-after" id="ol-after" hidden>
          <button type="button" class="btn btn-ghost ol-again">Try again</button>
          <a class="btn btn-soft" href="#${esc(t.id)}">Back to ${esc(t.name)}</a>
          ${next ? `<a class="btn btn-main" href="#do/${esc(next.id)}">Next sheet: ${esc(next.title)}</a>` : ''}
          <button type="button" class="btn btn-print" data-print="${esc(ws.id)}">${PRINT_ICON}Print it</button>
        </div>
      </section>`;

    let saved = {};
    try { saved = JSON.parse(store.get(saveKey(id)) || '{}'); } catch (e) { saved = {}; }
    if (saved.answers) writeAnswers(saved.answers);
    $('ol-name').value = saved.name || store.get('lop-name') || '';
    const persist = () => store.set(saveKey(id), JSON.stringify({ answers: readAnswers(), name: $('ol-name').value }));

    app.querySelectorAll('.ol-opts').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('.ol-opt');
      if (!b || $('ol-form').classList.contains('checked')) return;
      g.querySelectorAll('.ol-opt').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      persist();
    }));
    app.querySelectorAll('.ol-in').forEach((el) => el.addEventListener('input', persist));
    $('ol-name').addEventListener('input', () => { store.set('lop-name', $('ol-name').value); persist(); });

    const grade = () => {
      const v = readAnswers();
      let right = 0;
      key.forEach((x) => {
        const item = app.querySelector(`[data-item="${x.key}"]`);
        const box = app.querySelector(`[data-fb="${x.key}"]`);
        const given = v[x.key] || '';
        let ok;
        if (x.kind === 'exact') ok = given === x.answer;
        else if (x.kind === 'auto') ok = accepts(x.answer, given);
        else if (x.kind === 'self') ok = loose(given) === loose(x.answer);
        item.classList.remove('is-right', 'is-wrong', 'is-open');
        if (x.kind === 'open') {
          item.classList.add('is-open');
          box.innerHTML = `<span class="ol-tag">Check with a grown-up</span> ${esc(x.show)}`;
          return;
        }
        if (ok) right++;
        item.classList.add(ok ? 'is-right' : 'is-wrong');
        box.innerHTML = ok
          ? '<span class="ol-tag">Correct</span>'
          : `<span class="ol-tag">${given.trim() ? 'Wrong' : 'Not answered'}</span> Correct answer: <b>${esc(x.show)}</b>${x.kind === 'self' ? ' <small>(small spelling or punctuation differences are fine; check with a grown-up)</small>' : ''}`;
        app.querySelectorAll(`.ol-opt[data-k="${x.key}"]`).forEach((o) => { if (o.dataset.v === x.answer) o.classList.add('is-answer'); });
      });
      const pct = nAuto ? Math.round(right / nAuto * 100) : 0;
      const msg = pct === 100 ? 'Excellent! Every answer is correct.' : pct >= 80 ? 'Great work! Look at the red ones to see where to fix.' : pct >= 50 ? 'Good try! Read the correct answers in red, then try again.' : 'Keep practising! Watch the video, then try again.';
      const name = $('ol-name').value.trim();
      const res = $('ol-result');
      res.hidden = false;
      res.innerHTML = `<div class="ol-score"><b>${right}</b><span>/ ${nAuto}</span></div>
        <div><h2>${name ? esc(name) + ', you' : 'You'} got ${right} out of ${nAuto} correct (${pct}%)</h2><p>${msg}</p>
        <p class="ol-legend"><span class="ol-key r">Correct</span><span class="ol-key w">Wrong, with the correct answer</span>${key.some((x) => x.kind === 'open') ? '<span class="ol-key o">Open answer: check with a grown-up</span>' : ''}</p></div>`;
      $('ol-form').classList.add('checked');
      app.querySelectorAll('.ol-in').forEach((el) => { el.readOnly = true; el.disabled = el.tagName === 'SELECT'; });
      $('ol-after').hidden = false;
      app.querySelector('.ol-bar').hidden = true;
      res.insertAdjacentHTML('beforeend', `<div class="ol-after">${$('ol-after').innerHTML}</div>`);
      res.querySelectorAll('.ol-again').forEach((b) => b.addEventListener('click', again));
      res.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printSheets([b.dataset.print], state.withKey)));
      const log = (() => { try { return JSON.parse(store.get('lop-scores') || '{}'); } catch (e) { return {}; } })();
      log[id] = { right, total: nAuto, at: Date.now() };
      store.set('lop-scores', JSON.stringify(log));
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $('ol-form').addEventListener('submit', (e) => { e.preventDefault(); grade(); });
    function again() {
      store.set(saveKey(id), '');
      renderOnline(id);
      window.scrollTo(0, 0);
    }
    $('ol-reset').addEventListener('click', again);
    app.querySelectorAll('.ol-again').forEach((b) => b.addEventListener('click', again));
    bindSheetButtons();
  }

  /* ---------- worksheet thumbnails: a live, scaled-down copy of the real sheet ---------- */
  const PAGE_PX = 794; // 210mm at 96dpi
  function sizeThumbs() {
    app.querySelectorAll('.thumb.ready').forEach((el) => el.style.setProperty('--ts', (el.clientWidth / PAGE_PX).toFixed(4)));
  }
  async function fillThumbs() {
    const els = [...app.querySelectorAll('[data-thumb]')];
    if (!els.length) return;
    const sheets = await loadSheets([...new Set(els.map((el) => el.dataset.thumb))]);
    const byId = Object.fromEntries(sheets.map((ws) => [ws.id, ws]));
    els.forEach((el) => {
      const ws = byId[el.dataset.thumb];
      if (!ws || !el.isConnected) return;
      el.innerHTML = `<span class="thumb-page" aria-hidden="true" inert>${renderSheet(ws)}</span>`;
      el.classList.add('ready');
    });
    sizeThumbs();
  }
  window.addEventListener('resize', sizeThumbs);

  function bindSheetButtons() {
    fillThumbs().catch(() => { /* keep the placeholder lines */ });
    app.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => {
      const s = state.index.find((x) => x.id === b.dataset.preview);
      openPreview([s.id], `Sheet ${s.number} · ${s.title}`);
    }));
    app.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printSheets([b.dataset.print], state.withKey)));
  }

  function render() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (h.startsWith('do/')) { renderOnline(h.slice(3)); return; }
    const t = topicById(h);
    if (!t) state.subject = SUBJECTS.find((s) => s.toLowerCase() === h.toLowerCase()) || 'All'; // #maths, #english, #science

    document.title = t ? `${t.name} · Life of P Worksheets` : 'Life of P Worksheets';
    t ? renderTopic(t) : renderHome();
  }

  $('search').addEventListener('input', (e) => {
    state.q = e.target.value.trim().toLowerCase();
    if (topicById(decodeURIComponent(location.hash.replace(/^#/, '')))) { history.replaceState(null, '', state.subject === 'All' ? location.pathname : '#' + state.subject.toLowerCase()); }
    render();
  });
  window.addEventListener('hashchange', () => { state.level = 'All'; render(); window.scrollTo(0, 0); });

  const bust = '?v=' + Math.floor(Date.now() / 3600000); // refresh data at least hourly despite caching
  Promise.all([fetch('data/topics.json' + bust).then((r) => r.json()), fetch('data/index.json' + bust).then((r) => r.ok ? r.json() : [])])
    .then(([topics, index]) => { state.topics = topics; state.index = index; render(); })
    .catch(() => { app.innerHTML = '<p class="empty">The worksheets could not load. Refresh the page; if it keeps happening, the data files may have a typo.</p>'; });
})();
