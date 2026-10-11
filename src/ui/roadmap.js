// The roadmap view: a vertical spine of main boxes, each with its children in side
// clusters to the left and right, joined by SVG wires. The home roadmap shows the
// 18 fields grouped into sections; any box with children can be opened as its own roadmap.

import { D, el, reduceMotion } from '../util.js';
import { state, actions } from '../state.js';
import { model } from '../data/model.js';
import { GROUPS, gById } from '../data/groups.js';
import { hours, nextUp } from '../data/learn.js';
import { store } from '../store.js';
import { t } from '../strings.js';
import { statusBtn, bindTopic, progBlock } from './common.js';
import { levelFilter, levelOn } from './levels.js';
import { levelOf } from '../data/learn.js';
import { refreshStatus } from './status.js';

const $ = (id) => D.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';

export function hoursText(e) {
  const h = hours(e);
  return h >= 40 ? t('hoursLong', { h, w: Math.round(h / 10) }) : t('hours', { h });
}

export function crumbs(e, onPick) {
  const nav = el('nav', 'crumbs');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const chain = [];
  for (let p = e; p; p = p.parent) chain.unshift(p);
  chain.forEach((x, i) => {
    if (i) nav.appendChild(el('span', 'sep', '›'));
    const label = x.kind === 'core' ? t('home') : x.kind === 'branch' ? x.short : x.t;
    if (i === chain.length - 1) nav.appendChild(el('span', 'cur', label));
    else { const b = el('button', null, label); b.type = 'button'; b.onclick = () => onPick(x); nav.appendChild(b); }
  });
  return nav;
}

/* ---------- Header ---------- */

function legend() {
  const w = el('div', 'legend');
  [0, 1, 2, 3].forEach((v) => {
    const s = el('span', 'lg');
    s.dataset.st = v;
    s.appendChild(el('span', 'st-ico'));
    s.appendChild(el('span', null, t('st' + v)));
    w.appendChild(s);
  });
  w.appendChild(el('p', 'tips', t('tips')));
  return w;
}

function header(root) {
  const h = $('rmHead');
  h.innerHTML = '';
  if (root.kind === 'core') {
    h.appendChild(el('h1', 'title', t('homeT')));
    h.appendChild(el('p', 'lead', t('homeP')));
    const stats = el('div', 'stats');
    stats.appendChild(el('span', null, t('topics', { n: model.total })));
    stats.appendChild(el('span', null, hoursText(root)));
    h.appendChild(stats);
    h.appendChild(progBlock(root));
    const nx = el('button', 'btn solid', t('nextUp') + ' →');
    nx.type = 'button';
    nx.onclick = () => { const n = nextUp(levelOn); if (n) actions.goTo(n.parent, n); else nx.textContent = t('nextNone'); };
    h.appendChild(nx);
  } else {
    h.dataset.group = root.branch.group;
    h.appendChild(crumbs(root, (x) => actions.goTo(x)));
    h.appendChild(el('div', 'eyebrow', root.kind === 'branch' ? gById[root.group].t : root.branch.t));
    h.appendChild(el('h1', 'title', root.t));
    if (root.d) h.appendChild(el('p', 'lead', root.d));
    const stats = el('div', 'stats');
    stats.appendChild(el('span', null, t('topics', { n: root.all.length })));
    stats.appendChild(el('span', null, hoursText(root)));
    h.appendChild(stats);
    h.appendChild(progBlock(root));
    const det = el('button', 'btn', t('details'));
    det.type = 'button'; det.onclick = () => actions.openTopic(root);
    h.appendChild(det);
  }
  h.appendChild(levelFilter(root));
  h.appendChild(legend());
}

/* ---------- Boxes and rows ---------- */

function box(e, spine) {
  const d = el('div', 'node ' + (spine ? 'spine' : 'side'));
  d.dataset.id = e.id;
  d.dataset.group = e.branch.group;
  if (store.nt[e.id]) d.classList.add('noted');
  if (e.kind === 'node') { d.dataset.sid = e.id; d.dataset.lv = levelOf(e); d.appendChild(statusBtn(e)); }
  const main = el('button', 'node-main');
  main.type = 'button';
  main.appendChild(el('span', 'nm', e.t));
  if (e.children.length) { const k = el('span', 'cnt'); k.dataset.cnt = e.id; main.appendChild(k); }
  bindTopic(main, e);
  d.appendChild(main);
  if (spine && e.children.length) {
    const a = el('a', 'dive', '→');
    a.href = '#/' + e.id;
    a.title = t('openRoadmap');
    a.setAttribute('aria-label', t('openRoadmap') + ': ' + e.t);
    d.appendChild(a);
  }
  if (e.kind === 'branch') d.appendChild(progBlock(e, true));
  return d;
}

function side(list, where) {
  const s = el('div', 'side-col ' + where);
  if (list.length) {
    const c = el('div', 'cluster' + (list.length > 4 ? ' two' : ''));
    list.forEach((n) => c.appendChild(box(n, false)));
    s.appendChild(c);
  }
  return s;
}

function row(e) {
  const r = el('section', 'rm-row');
  r.dataset.group = e.branch.group;
  const kids = e.children, half = Math.ceil(kids.length / 2);
  r.appendChild(side(kids.slice(0, half), 'left'));
  const mid = el('div', 'mid');
  mid.appendChild(box(e, true));
  r.appendChild(mid);
  r.appendChild(side(kids.slice(half), 'right'));
  return r;
}

function secRow(g) {
  const r = el('div', 'rm-sec');
  r.dataset.group = g.id;
  const p = el('div', 'sec-pill');
  p.appendChild(el('b', null, g.t));
  p.appendChild(el('span', null, g.d));
  r.appendChild(p);
  return r;
}

export function renderRoadmap(root) {
  header(root);
  const host = $('rm');
  host.innerHTML = '';
  host.appendChild(D.createElementNS(SVG, 'svg')).setAttribute('class', 'wires');
  if (root.kind === 'core') {
    GROUPS.forEach((g) => {
      const list = root.children.filter((b) => b.group === g.id);
      if (!list.length) return;
      host.appendChild(secRow(g));
      list.forEach((b) => host.appendChild(row(b)));
    });
  } else {
    root.children.forEach((c) => host.appendChild(row(c)));
  }
  refreshStatus();
  markSelected();
  drawWires();
}

/* ---------- Wires ---------- */

export function drawWires() {
  const host = $('rm'), svg = host.querySelector('svg.wires');
  if (!svg) return;
  const hb = host.getBoundingClientRect();
  svg.setAttribute('width', hb.width);
  svg.setAttribute('height', hb.height);
  svg.setAttribute('viewBox', `0 0 ${hb.width} ${hb.height}`);
  svg.innerHTML = '';
  if (innerWidth < 760) return; // stacked layout: the order itself shows the path
  const R = (x) => {
    const b = x.getBoundingClientRect();
    return { l: b.left - hb.left, r: b.right - hb.left, t: b.top - hb.top, b: b.bottom - hb.top, cx: (b.left + b.right) / 2 - hb.left, cy: (b.top + b.bottom) / 2 - hb.top };
  };
  let spine = '', wires = '', dots = '';
  const stops = [...host.querySelectorAll('.node.spine, .sec-pill')].map(R);
  for (let i = 1; i < stops.length; i++) spine += `M${stops[i - 1].cx} ${stops[i - 1].b}L${stops[i].cx} ${stops[i].t}`;
  host.querySelectorAll('.rm-row').forEach((rw) => {
    const s = R(rw.querySelector('.node.spine'));
    rw.querySelectorAll('.cluster').forEach((c) => {
      const k = R(c), left = !!c.closest('.left');
      const x0 = left ? s.l : s.r, x1 = left ? k.r : k.l, y1 = Math.min(Math.max(s.cy, k.t + 14), k.b - 14);
      const mx = (x0 + x1) / 2;
      wires += `M${x0} ${s.cy}C${mx} ${s.cy} ${mx} ${y1} ${x1} ${y1}`;
      dots += `<circle cx="${x1}" cy="${y1}" r="3.5"/>`;
    });
  });
  svg.innerHTML = `<path class="w-spine" d="${spine}"/><path class="w-side" d="${wires}"/><g class="w-dots">${dots}</g>`;
}

let raf = 0;
export function initWires() {
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawWires); };
  new ResizeObserver(redraw).observe($('rm'));
  window.addEventListener('resize', redraw);
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(redraw);
}

// Marks the box of the topic open in the drawer and scrolls it into view.
export function markSelected(scroll) {
  D.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
  if (!state.open) return;
  const n = $('rm').querySelector(`.node[data-id="${CSS.escape(state.open.id)}"]`);
  if (!n) return;
  n.classList.add('sel');
  if (scroll) n.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}
