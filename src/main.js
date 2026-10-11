// Entry point: loads the content and resources, builds the model, and routes between
// roadmaps. URLs are hashes: #/ (home), #/ml (a field's roadmap),
// #/ml/supervised-learning (a topic's roadmap), plus ?t=<topic id> for the open drawer.

import { D } from './util.js';
import { state, actions } from './state.js';
import { t } from './strings.js';
import { buildModel, model } from './data/model.js';
import { setResources } from './data/learn.js';
import { renderRoadmap, initWires, markSelected } from './ui/roadmap.js';
import { showDrawer, hideDrawer, isOpen } from './ui/drawer.js';
import { refreshStatus } from './ui/status.js';
import { initSearch, focusSearch } from './ui/search.js';
import { initBackup, isModalOpen, closeModal } from './ui/backup.js';
import { initStore, onSync } from './store.js';

async function loadContent() {
  const get = async (f) => { const r = await fetch('content/' + f); if (!r.ok) throw new Error('Could not load: ' + f); return r; };
  const idx = await (await get('index.json')).json();
  const texts = await Promise.all(idx.map((f) => get(f).then((r) => r.text())));
  const res = await (await get('resources.json')).json();
  return { src: texts.join('\n'), res };
}

/* ---------- Routing ---------- */

const byId = (id) => (!id || id === 'core' ? model.core : model.byId[id]);

function hashFor(view, open) {
  const path = view && view.kind !== 'core' ? view.id : '';
  return '#/' + path + (open ? '?t=' + open.id : '');
}

function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, query] = h.split('?');
  let view = byId(path);
  // a topic without subtopics has no roadmap of its own: show its parent's with it open
  let open = query && query.startsWith('t=') ? byId(query.slice(2)) : null;
  if (view && !view.children.length) { open = view; view = view.parent; }
  if (!view) { view = model.core; open = null; }
  if (view !== state.view) {
    state.view = view;
    state.open = open;
    renderRoadmap(view);
    D.title = (view.kind === 'core' ? '' : (view.short || view.t) + ' · ') + t('brand');
    if (!open) window.scrollTo(0, 0);
  }
  if (open && open.kind !== 'core') { state.open = open; showDrawer(open); }
  else if (isOpen()) { state.open = null; hideDrawer(); }
}

function go(view, open) {
  const h = hashFor(view, open);
  if (location.hash === h) route(); else location.hash = h;
}

actions.goTo = (view, open) => go(view || model.core, open);
actions.openTopic = (e) => (e.kind === 'core' ? go(model.core) : go(state.view, e));
actions.closeDrawer = () => go(state.view, null);
actions.rerender = () => { renderRoadmap(state.view); if (state.open) showDrawer(state.open); refreshStatus(); };

/* ---------- Save status badge ---------- */

function initSyncBadge() {
  const b = D.getElementById('sync');
  onSync((s) => {
    const k = s.mode === 'browser' ? 'browser' : s.error ? 'error' : s.saving ? 'saving' : 'db';
    b.dataset.state = k;
    b.textContent = t('sync_' + k);
    b.title = t('syncTip_' + k, { file: s.file });
  });
}

/* ---------- Start ---------- */

async function start() {
  D.querySelectorAll('[data-t]').forEach((x) => { x.textContent = t(x.dataset.t); });
  D.querySelectorAll('[data-t-ph]').forEach((x) => { x.placeholder = t(x.dataset.tPh); });
  try {
    const [{ src, res }] = await Promise.all([loadContent(), initStore()]);
    buildModel(src);
    setResources(res);
  } catch (err) {
    console.error(err);
    const le = D.getElementById('loadErr');
    le.hidden = false; le.textContent = t('loadErr');
    return;
  }

  initWires();
  initSyncBadge();
  initSearch();
  initBackup();
  D.getElementById('brandLink').addEventListener('click', (ev) => { ev.preventDefault(); go(model.core); });
  D.getElementById('drawerClose').addEventListener('click', () => actions.closeDrawer());
  D.getElementById('scrim').addEventListener('click', () => actions.closeDrawer());

  D.addEventListener('keydown', (ev) => {
    const tag = D.activeElement && D.activeElement.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'INPUT';
    if (ev.key === 'Escape') {
      if (isModalOpen()) { closeModal(); return; }
      if (typing) { D.activeElement.blur(); return; }
      if (isOpen()) { actions.closeDrawer(); return; }
      if (state.view && state.view.kind !== 'core') go(state.view.parent);
      return;
    }
    if (ev.key === '/' && !typing && !ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); focusSearch(); }
  });

  window.addEventListener('hashchange', route);
  route();
  markSelected(true);
}

start();
