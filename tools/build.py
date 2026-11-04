#!/usr/bin/env python3
"""Life of P Worksheets build tool.

  python3 tools/build.py sync     add any video in tools/videos.txt that has no topic yet
  python3 tools/build.py check    validate every worksheet file and rebuild data/index.json

The worksheet agent runs `check` before every commit; a failing check means do not push.
"""
import json, re, sys, pathlib, hashlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
TOPICS = DATA / 'topics.json'
SHEETS = DATA / 'worksheets'
CHANNEL = 'https://www.youtube.com/@lifeofp5750'

LEVELS = {'Starter', 'Practice', 'Challenge'}
TYPES = {
    'pairs':     dict(items=(4, 8)),
    'fill':      dict(items=(3, 6)),
    'choice':    dict(items=(3, 5)),
    'rewrite':   dict(items=(1, 3)),
    'lines':     dict(),
    'match':     dict(items=(4, 6)),
    'sort':      dict(),
    'truefalse': dict(items=(3, 6)),
    'column':    dict(items=(4, 8)),
}
# rough height budget in "rows" so one sheet fits one A4 page
ROWS = {'pairs': lambda s: 1 + (len(s['items']) + 3) // 4 * 1.25,
        'fill': lambda s: 1 + len(s['items']),
        'choice': lambda s: 1 + len(s['items']),
        'rewrite': lambda s: 1 + len(s['items']) * 1.9,
        'lines': lambda s: 1 + s.get('lines', 2) * 1.1,
        'match': lambda s: 1 + len(s['items']),
        'sort': lambda s: 1 + 1 + max(2, (len(s['words']) + len(s['groups']) - 1) // len(s['groups'])) * 0.9,
        'truefalse': lambda s: 1 + len(s['items']),
        'column': lambda s: 1 + (len(s['items']) + 3) // 4 * 3.6}
PAGE_ROWS = 28  # calibrated: the Beach Day sheet (≈27) fills one A4 page


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def load_topics():
    return json.loads(TOPICS.read_text()) if TOPICS.exists() else []


def sync():
    topics = load_topics()
    have = {t['videoId'] for t in topics if t.get('videoId')}
    added = 0
    for line in (ROOT / 'tools' / 'videos.txt').read_text().splitlines():
        if not line.strip():
            continue
        vid, title, *rest = [p.strip() for p in line.split('|')]
        if vid in have:
            continue
        m = re.match(r'(.+?) for Kids\s+–\s+(?:Grade 2 )?(Maths|English|Science|Arabic|French)', title)
        if not m:
            print('skip (cannot read subject):', line)
            continue
        name, subject = m.group(1).strip(), m.group(2)
        tid = slug(name)
        waiting = next((t for t in topics if t['id'] == tid and not t.get('videoId')), None)
        if waiting:  # a topic added from a parent request now has its video
            waiting.update(videoId=vid, videoUrl=f'https://www.youtube.com/watch?v={vid}')
            have.add(vid)
            added += 1
            continue
        if any(t['id'] == tid for t in topics):
            tid += '-2'
        topics.append({'id': tid, 'subject': subject, 'name': name,
                       'blurb': (rest[0] if rest else '') or name,
                       'about': '', 'videoId': vid,
                       'videoUrl': f'https://www.youtube.com/watch?v={vid}', 'target': 15})
        added += 1
    topics.sort(key=lambda t: (['Maths', 'English', 'Science', 'Arabic', 'French'].index(t['subject']), t['name']))
    TOPICS.write_text(json.dumps(topics, indent=2, ensure_ascii=False) + '\n')
    print(f'{added} topic(s) added, {len(topics)} total')


def fail(errors, where, msg):
    errors.append(f'{where}: {msg}')


def stamp_assets():
    """Give assets/app.js and assets/style.css a ?v=<content hash> in index.html, so browsers fetch new versions."""
    page = ROOT / 'index.html'
    html = page.read_text()
    for name in ('app.js', 'style.css'):
        v = hashlib.sha1((ROOT / 'assets' / name).read_bytes()).hexdigest()[:8]
        html = re.sub(r'assets/' + re.escape(name) + r'(\?v=[0-9a-f]+)?"', f'assets/{name}?v={v}"', html)
    page.write_text(html)


def check():
    topics = load_topics()
    by_id = {t['id']: t for t in topics}
    errors, index, ids = [], [], set()
    for f in sorted(SHEETS.glob('*.json')):
        tid = f.stem
        if tid not in by_id:
            fail(errors, f.name, 'no topic with this id in topics.json')
            continue
        try:
            sheets = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            fail(errors, f.name, f'bad JSON: {e}')
            continue
        numbers = set()
        titles = set()
        for ws in sheets:
            w = f"{f.name}#{ws.get('id', '?')}"
            for k in ('id', 'topic', 'number', 'level', 'title', 'intro', 'sections'):
                if k not in ws:
                    fail(errors, w, f'missing "{k}"')
            if errors and errors[-1].startswith(w + ': missing'):
                continue
            if ws['topic'] != tid:
                fail(errors, w, 'topic does not match file name')
            if ws['id'] != f"{tid}-{ws['number']:02d}":
                fail(errors, w, f"id should be {tid}-{ws['number']:02d}")
            if ws['id'] in ids:
                fail(errors, w, 'duplicate id')
            ids.add(ws['id'])
            if ws['number'] in numbers or not 1 <= ws['number'] <= 15:
                fail(errors, w, 'number must be unique and 1–15')
            numbers.add(ws['number'])
            if ws['title'].lower() in titles:
                fail(errors, w, 'scenario title repeats another sheet in this topic')
            titles.add(ws['title'].lower())
            if ws['level'] not in LEVELS:
                fail(errors, w, f'level must be one of {sorted(LEVELS)}')
            secs = ws['sections']
            if not 4 <= len(secs) <= 6:
                fail(errors, w, 'needs 4–6 sections')
            rows, marks = 4.5, 0  # header + footer
            for i, s in enumerate(secs):
                sw = f'{w} section {chr(65 + i)}'
                t = s.get('type')
                if t not in TYPES:
                    fail(errors, sw, f'unknown type "{t}"')
                    continue
                if not s.get('title') or not isinstance(s.get('marks'), int):
                    fail(errors, sw, 'needs "title" and integer "marks"')
                    continue
                marks += s['marks']
                lim = TYPES[t].get('items')
                if lim:
                    items = s.get('items') or []
                    if not lim[0] <= len(items) <= lim[1]:
                        fail(errors, sw, f'{t} needs {lim[0]}–{lim[1]} items')
                    for it in items:
                        if 'a' not in it and t != 'match':
                            fail(errors, sw, 'every item needs an answer "a"')
                            break
                    if t == 'fill' and any('___' not in it.get('q', '') for it in items):
                        fail(errors, sw, 'each fill question needs ___')
                    if t == 'choice' and any(it.get('a') not in it.get('options', []) for it in items):
                        fail(errors, sw, 'choice answer must be one of the options')
                    if t == 'match' and any(not it.get('left') or not it.get('right') for it in items):
                        fail(errors, sw, 'match items need "left" and "right"')
                    if t == 'truefalse' and any(it.get('a') not in (True, False) for it in items):
                        fail(errors, sw, 'truefalse answers must be true or false')
                    if t == 'column' and any(it.get('op') not in ('+', '-', '×') or 'top' not in it or 'bottom' not in it for it in items):
                        fail(errors, sw, 'column items need top, bottom and op (+, -, ×)')
                if t == 'sort':
                    if not s.get('groups') or not s.get('words') or not isinstance(s.get('a'), dict):
                        fail(errors, sw, 'sort needs groups, words and a {word: group}')
                        continue
                if t == 'lines' and 'a' not in s:
                    fail(errors, sw, 'lines needs a marking note in "a"')
                try:
                    rows += ROWS[t](s)
                except Exception:
                    pass
            if rows > PAGE_ROWS:
                fail(errors, w, f'too long for one A4 page (≈{rows:.0f} rows, max {PAGE_ROWS}) — trim items')
            if not 15 <= marks <= 30:
                fail(errors, w, f'total marks {marks}; aim for 15–30')
            index.append({'id': ws['id'], 'topic': tid, 'number': ws['number'], 'level': ws['level'], 'title': ws['title']})
    if errors:
        print('\n'.join(errors))
        print(f'\nFAILED: {len(errors)} problem(s)')
        sys.exit(1)
    index.sort(key=lambda x: (x['topic'], x['number']))
    (DATA / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n')
    stamp_assets()
    counts = {}
    for x in index:
        counts[x['topic']] = counts.get(x['topic'], 0) + 1
    done = sum(1 for t in topics if counts.get(t['id'], 0) >= t['target'])
    print(f'OK: {len(index)} worksheets across {len(counts)} topics; {done} of {len(topics)} topics complete')


if __name__ == '__main__':
    {'sync': sync, 'check': check}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: print(__doc__))()
