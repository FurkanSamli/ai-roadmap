// Small UI pieces shared by the roadmap and the drawer.

import { el } from '../util.js';
import { actions } from '../state.js';
import { store, st } from '../store.js';
import { t } from '../strings.js';
import { cycle, setStatus, refreshStatus } from './status.js';
import { levelOf } from '../data/learn.js';

// Level dots: ●○○ basic, ●●○ intermediate, ●●● advanced
export function pips(level) {
  const s = el('span', 'pips');
  s.title = t('lv' + level);
  s.setAttribute('aria-label', t('lv' + level));
  for (let i = 1; i <= 3; i++) s.appendChild(el('i', i <= level ? 'on' : ''));
  return s;
}

// Round status button. Click cycles none → learning → learned; its look comes from the
// data-st attribute of the closest [data-sid] parent.
export function statusBtn(n) {
  const b = el('button', 'st-btn');
  b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); cycle(n); });
  return b;
}

// Click handler used by every topic box/row: plain click opens the drawer,
// Shift + click marks learning, Alt + click marks learned.
export function topicClick(n) {
  return (ev) => {
    if (n.kind === 'node' && ev.shiftKey) { setStatus(n, st(n) === 1 ? 0 : 1); return; }
    if (n.kind === 'node' && ev.altKey) { setStatus(n, st(n) === 2 ? 0 : 2); return; }
    actions.openTopic(n);
  };
}

// Progress block: bar + "x / y learned · z learning · w skipped"
export function progBlock(e, small) {
  const w = el('div', small ? 'prog sm' : 'prog');
  w.dataset.pid = e.id;
  const bar = el('div', 'bar');
  bar.appendChild(el('i', 'd')); bar.appendChild(el('i', 'l'));
  w.appendChild(bar);
  if (!small) {
    const tx = el('div', 'ptx');
    tx.appendChild(el('span', 'a')); tx.appendChild(el('span', 'b')); tx.appendChild(el('span', 'c'));
    w.appendChild(tx);
  }
  return w;
}

// Collapsible list of topics with status buttons (sub-levels are built on first open).
export function topicList(list) {
  const ul = el('ul', 'tl');
  list.forEach((n) => {
    const li = el('li'), row = el('div', 'tl-row');
    row.dataset.sid = n.id;
    if (n.children.length) {
      const ch = el('button', 'tl-chev');
      ch.type = 'button'; ch.setAttribute('aria-expanded', 'false'); ch.setAttribute('aria-label', t('expand'));
      ch.addEventListener('click', () => {
        const open = ch.getAttribute('aria-expanded') !== 'true';
        ch.setAttribute('aria-expanded', String(open));
        if (open && !li._sub) { li._sub = topicList(n.children); li.appendChild(li._sub); refreshStatus(); }
        if (li._sub) li._sub.hidden = !open;
      });
      row.appendChild(ch);
    } else row.appendChild(el('span', 'tl-sp'));
    row.appendChild(statusBtn(n));
    const nm = el('button', 'tl-nm', n.t);
    nm.type = 'button';
    nm.addEventListener('click', topicClick(n));
    row.appendChild(nm);
    if (store.nt[n.id]) row.appendChild(el('span', 'tl-note', '✎'));
    row.appendChild(pips(levelOf(n)));
    if (n.children.length) { const k = el('span', 'tl-k'); k.dataset.cnt = n.id; row.appendChild(k); }
    li.appendChild(row);
    ul.appendChild(li);
  });
  return ul;
}
