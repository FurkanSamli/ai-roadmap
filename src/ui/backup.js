// The "Your data" dialog: where progress is saved, export (download / copy), import and reset.

import { D, el } from '../util.js';
import { exportBackup, importBackup, resetAll, sync } from '../store.js';
import { t } from '../strings.js';
import { actions } from '../state.js';

const $ = (id) => D.getElementById(id);
let modal;

export function isModalOpen() { return modal && !modal.hidden; }
export function closeModal() { modal.hidden = true; }

function openModal() {
  const w = $('bkWhere');
  w.dataset.mode = sync.mode;
  w.textContent = sync.mode === 'db' ? t('whereDb', { file: sync.file, kind: sync.storage === 'sqlite' ? 'SQLite' : 'JSON' }) : t('whereBrowser');
  $('bkCopyMsg').textContent = ''; $('bkLoadMsg').textContent = ''; $('bkIn').value = '';
  resetRow();
  modal.hidden = false;
  $('bkClose').focus();
}

function afterChange() { actions.rerender(); }

function resetRow() {
  const r = $('bkResetRow');
  r.innerHTML = '';
  const b = el('button', 'btn warn', t('resetBtn'));
  b.type = 'button';
  b.onclick = () => {
    r.innerHTML = '';
    r.appendChild(el('span', 'confirm', t('sure')));
    const y = el('button', 'btn warn', t('yes'));
    y.type = 'button';
    y.onclick = () => { resetAll(); afterChange(); r.innerHTML = ''; r.appendChild(el('span', 'msg', t('resetDone'))); };
    const n = el('button', 'btn', t('no'));
    n.type = 'button'; n.onclick = resetRow;
    r.appendChild(y); r.appendChild(n);
  };
  r.appendChild(b);
}

function importText(txt) {
  const msg = $('bkLoadMsg');
  try {
    const { n, m } = importBackup(txt);
    afterChange();
    msg.className = 'msg'; msg.textContent = t('loaded', { n, m });
  } catch (e) {
    msg.className = 'msg err'; msg.textContent = t('bad');
  }
}

export function initBackup() {
  modal = $('modal');
  $('bkBtn').addEventListener('click', openModal);
  $('bkClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });
  $('bkDownload').addEventListener('click', () => {
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([exportBackup()], { type: 'application/json' }));
    a.download = 'ai-roadmap-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    D.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('bkCopy').addEventListener('click', () => {
    const msg = $('bkCopyMsg');
    const fail = () => { msg.className = 'msg err'; msg.textContent = t('copyFail'); };
    try { navigator.clipboard.writeText(exportBackup()).then(() => { msg.className = 'msg'; msg.textContent = t('copied'); }, fail); } catch (e) { fail(); }
  });
  $('bkLoad').addEventListener('click', () => importText($('bkIn').value));
  $('bkFile').addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importText(String(r.result));
    r.readAsText(f);
    ev.target.value = '';
  });
}
