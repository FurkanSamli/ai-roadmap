// The "Backup" dialog: copy progress as JSON, restore it, or reset everything.

import { D, el } from '../util.js';
import { exportBackup, importBackup, resetAll } from '../store.js';
import { t } from '../strings.js';
import { actions } from '../state.js';

const $ = (id) => D.getElementById(id);
let modal;

export function isModalOpen() { return modal && !modal.hidden; }
export function closeModal() { modal.hidden = true; }

function openModal() {
  $('bkOut').value = exportBackup();
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
    y.onclick = () => { resetAll(); afterChange(); r.innerHTML = ''; r.appendChild(el('span', 'msg', t('resetDone'))); $('bkOut').value = exportBackup(); };
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
  $('bkCopy').addEventListener('click', () => {
    const ta = $('bkOut'), msg = $('bkCopyMsg');
    const fallback = () => { ta.focus(); ta.select(); msg.className = 'msg err'; msg.textContent = t('copyFail'); };
    try { navigator.clipboard.writeText(ta.value).then(() => { msg.className = 'msg'; msg.textContent = t('copied'); }, fallback); } catch (e) { fallback(); }
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
