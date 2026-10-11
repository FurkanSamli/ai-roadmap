// The detail drawer: everything about one topic — what it is, its status, what you need
// to learn (subtopics or a checklist), how to learn it (steps, resources, practice,
// search links), your notes, and the neighbouring topics.

import { D, el } from '../util.js';
import { actions } from '../state.js';
import { gById } from '../data/groups.js';
import { store, save, st, isChecked, setChecked, LEARNED } from '../store.js';
import { levelOf, checklist, resourcesFor, practiceFor, searchLinks } from '../data/learn.js';
import { t } from '../strings.js';
import { pips, progBlock, topicList } from './common.js';
import { setStatus, setMany, refreshStatus } from './status.js';
import { crumbs, hoursText, markSelected } from './roadmap.js';

const $ = (id) => D.getElementById(id);
let lastFocus = null;

export function isOpen() { return !$('drawer').hidden; }

export function showDrawer(e) {
  const dr = $('drawer'), body = $('drawerBody');
  if (dr.hidden) lastFocus = D.activeElement;
  body.innerHTML = '';
  dr.dataset.group = e.branch.group;
  body.appendChild(crumbs(e, (x) => (x.kind === 'core' ? actions.closeDrawer() : actions.openTopic(x))));
  head(body, e);
  if (e.kind === 'node') body.appendChild(statusSeg(e));
  if (e.s) {
    body.appendChild(el('h3', 'sec-t', t('plain')));
    body.appendChild(el('p', 'plain', e.s));
  }
  what(body, e);
  how(body, e);
  body.appendChild(notesBox(e));
  if (e.kind === 'node') neighbours(body, e);
  dr.hidden = false;
  $('scrim').hidden = false;
  D.body.classList.add('drawer-open');
  $('drawerScroll').scrollTop = 0;
  refreshStatus();
  markSelected(true);
  $('drawerClose').focus({ preventScroll: true });
}

export function hideDrawer() {
  $('drawer').hidden = true;
  $('scrim').hidden = true;
  D.body.classList.remove('drawer-open');
  markSelected();
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
}

function head(body, e) {
  const ey = el('div', 'eyebrow');
  ey.appendChild(el('span', null, e.kind === 'branch' ? gById[e.group].t : e.branch.short));
  if (e.kind === 'node') {
    const lv = el('span', 'lvl');
    lv.appendChild(pips(levelOf(e)));
    lv.appendChild(el('span', null, t('lv' + levelOf(e))));
    ey.appendChild(lv);
  }
  body.appendChild(ey);
  const h = el('h2', 'd-title', e.t);
  h.id = 'drawerTitle';
  body.appendChild(h);
  if (e.d) body.appendChild(el('p', 'd-desc', e.d));
  const meta = el('div', 'd-meta');
  meta.appendChild(el('span', null, hoursText(e)));
  meta.appendChild(el('span', 'faint', t('hoursNote')));
  body.appendChild(meta);
}

function statusSeg(n) {
  const seg = el('div', 'seg');
  seg.dataset.seg = n.id;
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', t('legendTitle'));
  [0, 1, 2, 3].forEach((v) => {
    const b = el('button');
    b.type = 'button'; b.dataset.v = v; b.dataset.st = v;
    b.appendChild(el('span', 'st-ico'));
    b.appendChild(el('span', null, t('st' + v)));
    b.addEventListener('click', () => setStatus(n, v));
    seg.appendChild(b);
  });
  return seg;
}

/* ---------- What you need to learn ---------- */

function what(body, e) {
  body.appendChild(el('h3', 'sec-t', t('what')));
  if (e.children.length) {
    body.appendChild(el('p', 'sec-sub', t('whatSub', { n: e.all.length })));
    body.appendChild(progBlock(e));
    body.appendChild(topicList(e.children));
    const acts = el('div', 'acts');
    if (e.kind !== 'core') {
      const open = el('a', 'btn solid', t('openRoadmap') + ' →');
      open.href = '#/' + e.id;
      acts.appendChild(open);
    }
    acts.appendChild(bulk(e));
    body.appendChild(acts);
    return;
  }
  body.appendChild(el('p', 'sec-sub', t('whatLeaf')));
  const items = checklist(e);
  const ul = el('ul', 'checks');
  const done = el('div', 'all-ticked');
  const update = () => {
    const all = items.every((it) => isChecked(e.id, it.key));
    done.hidden = !all || st(e) === LEARNED;
  };
  items.forEach((it) => {
    const li = el('li', it.goal ? 'goal' : '');
    const lab = el('label');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = isChecked(e.id, it.key);
    cb.addEventListener('change', () => { setChecked(e.id, it.key, cb.checked); update(); });
    lab.appendChild(cb);
    lab.appendChild(el('span', null, it.text));
    li.appendChild(lab);
    ul.appendChild(li);
  });
  body.appendChild(ul);
  done.appendChild(el('span', null, t('allTicked')));
  const mk = el('button', 'btn solid', t('markLearned'));
  mk.type = 'button';
  mk.onclick = () => { setStatus(e, LEARNED); update(); };
  done.appendChild(mk);
  body.appendChild(done);
  update();
}

// "Mark all learned" / "Clear marks" (with confirmation)
function bulk(e) {
  const w = el('span', 'bulk');
  const list = (e.kind === 'node' ? [e] : []).concat(e.all);
  const a = el('button', 'btn', t('markAll'));
  a.type = 'button'; a.onclick = () => setMany(list, LEARNED);
  const b = el('button', 'btn warn', t('clearAll'));
  b.type = 'button';
  const restore = () => { w.innerHTML = ''; w.appendChild(a); w.appendChild(b); };
  b.onclick = () => {
    w.innerHTML = '';
    w.appendChild(el('span', 'confirm', t('sure')));
    const y = el('button', 'btn warn', t('yes')); y.type = 'button'; y.onclick = () => { setMany(list, 0); restore(); };
    const n = el('button', 'btn', t('no')); n.type = 'button'; n.onclick = restore;
    w.appendChild(y); w.appendChild(n); n.focus();
  };
  restore();
  return w;
}

/* ---------- How to learn it ---------- */

function step(n, title, ...content) {
  const li = el('li', 'step');
  li.appendChild(el('span', 'step-n', String(n)));
  const c = el('div', 'step-c');
  c.appendChild(el('h4', null, title));
  content.filter(Boolean).forEach((x) => c.appendChild(typeof x === 'string' ? el('p', null, x) : x));
  li.appendChild(c);
  return li;
}

function link(href, text, cls) {
  const a = el('a', cls || null, text);
  a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}

function how(body, e) {
  if (e.kind === 'core') return;
  body.appendChild(el('h3', 'sec-t', t('how')));
  const ol = el('ol', 'steps');
  const sl = searchLinks(e);
  const yt = link(sl[0].u, 'YouTube: ' + e.t + ' explained', 'inline');
  ol.appendChild(step(1, t('step1'), t('step1d'), yt));

  const res = resourcesFor(e);
  const list = el('ul', 'res');
  res.slice(0, 6).forEach((r) => {
    const li = el('li');
    const a = link(r.u, '', 'res-a');
    a.appendChild(el('span', 'kind', t('kind_' + r.k)));
    const tx = el('span', 'res-t');
    tx.appendChild(el('b', null, r.t));
    let host = '';
    try { host = new URL(r.u).hostname.replace(/^www\./, ''); } catch (err) { /* keep empty */ }
    const sub = [host];
    if (r.from && r.from !== e) sub.push(t('forTopic', { t: r.from.kind === 'branch' ? r.from.short : r.from.t }));
    tx.appendChild(el('span', 'res-h', sub.filter(Boolean).join(' · ')));
    a.appendChild(tx);
    li.appendChild(a);
    list.appendChild(li);
  });
  ol.appendChild(step(2, t('step2'), res.length ? t('step2d') : t('step2none'), res.length ? list : null));

  const pr = practiceFor(e);
  if (pr) ol.appendChild(step(3, t('step3'), pr));
  ol.appendChild(step(pr ? 4 : 3, t('step4'), t('step4d')));
  body.appendChild(ol);

  const sw = el('div', 'search-links');
  sw.appendChild(el('span', 'faint', t('search4')));
  sl.forEach((l) => sw.appendChild(link(l.u, l.t, 'chip')));
  body.appendChild(sw);
}

/* ---------- Notes and neighbours ---------- */

function notesBox(e) {
  const w = el('div', 'notes');
  const lab = el('label');
  lab.htmlFor = 'note-' + e.id.replace(/[^a-z0-9]/gi, '_');
  lab.appendChild(el('span', null, t('notes')));
  const ok = el('span', 'ok', t('saved'));
  lab.appendChild(ok);
  const ta = el('textarea');
  ta.id = lab.htmlFor; ta.placeholder = t('notesPh'); ta.value = store.nt[e.id] || '';
  let timer = null;
  ta.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = ta.value;
      if (v.trim()) store.nt[e.id] = v; else delete store.nt[e.id];
      save();
      ok.classList.add('show'); setTimeout(() => ok.classList.remove('show'), 1200);
      D.querySelectorAll(`.node[data-id="${CSS.escape(e.id)}"]`).forEach((x) => x.classList.toggle('noted', !!store.nt[e.id]));
    }, 450);
  });
  w.appendChild(lab); w.appendChild(ta);
  return w;
}

function neighbours(body, n) {
  const sibs = n.parent.children, i = sibs.indexOf(n);
  if (sibs.length < 2) return;
  const pn = el('div', 'pn');
  const nb = (x, label, right) => {
    const b = el('button', right ? 'r' : '');
    b.type = 'button';
    b.appendChild(el('span', 'd', label)); b.appendChild(el('span', 'n', x.t));
    b.addEventListener('click', () => actions.openTopic(x));
    return b;
  };
  pn.appendChild(i > 0 ? nb(sibs[i - 1], '← ' + t('prev')) : el('span'));
  pn.appendChild(i < sibs.length - 1 ? nb(sibs[i + 1], t('next') + ' →', true) : el('span'));
  body.appendChild(pn);
}
