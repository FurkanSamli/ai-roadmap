// Changing a topic's status and refreshing every indicator on screen at once.
// Any element with data-sid="<id>" gets data-st="<status>"; CSS does the rest.
// Any element with data-pid="<id>" is a progress block (see progBlock in common.js).

import { D } from '../util.js';
import { model } from '../data/model.js';
import { save, st, prog, setStatusValue } from '../store.js';
import { t } from '../strings.js';

export function setStatus(n, v) { setStatusValue(n, v); save(); refreshStatus(); }
export function setMany(list, v) { list.forEach((n) => setStatusValue(n, v)); save(); refreshStatus(); }

// none → learning → learned → none (skip is set from the drawer)
export function cycle(n) { const v = st(n); setStatus(n, v === 1 ? 2 : v === 2 || v === 3 ? 0 : 1); }

const byId = (id) => (id === 'core' ? model.core : model.byId[id]);

export function fillProg(w) {
  const e = byId(w.dataset.pid);
  if (!e) return;
  const p = prog(e), pct = (x) => (p.t ? x / p.t * 100 : 0) + '%';
  const f = w.querySelectorAll('.bar i');
  if (f[0]) { f[0].style.width = pct(p.d); f[1].style.width = pct(p.l); }
  const a = w.querySelector('.a'), b = w.querySelector('.b'), c = w.querySelector('.c');
  if (a) a.textContent = t('progD', { d: p.d, t: p.t });
  if (b) b.textContent = p.l ? t('progL', { n: p.l }) : '';
  if (c) c.textContent = p.s ? t('progS', { n: p.s }) : '';
}

export function refreshStatus() {
  D.querySelectorAll('[data-sid]').forEach((x) => {
    const n = model.byId[x.dataset.sid];
    if (!n) return;
    const v = st(n);
    x.dataset.st = v;
    const b = x.querySelector(':scope > .st-btn');
    if (b) { b.title = t('cycle') + ': ' + t('st' + v); b.setAttribute('aria-label', n.t + ': ' + t('st' + v)); }
  });
  D.querySelectorAll('[data-seg]').forEach((g) => {
    const n = model.byId[g.dataset.seg];
    g.querySelectorAll('button').forEach((bt) => bt.setAttribute('aria-pressed', String(+bt.dataset.v === st(n))));
  });
  D.querySelectorAll('[data-pid]').forEach(fillProg);
  D.querySelectorAll('[data-cnt]').forEach((s) => { const p = prog(byId(s.dataset.cnt)); s.textContent = p.d + '/' + p.t; });
  const p = prog(model.core);
  D.getElementById('overall').textContent = t('overall', { d: p.d, t: p.t, p: Math.round(p.d / p.t * 100) });
  const ob = D.getElementById('overallBar');
  ob.style.setProperty('--d', (p.d / p.t * 100) + '%');
  ob.style.setProperty('--l', (p.l / p.t * 100) + '%');
}
