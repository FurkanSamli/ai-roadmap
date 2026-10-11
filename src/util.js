// General helpers: DOM and search folding.

// Browser globals are guarded so this module can also be imported in Node (scripts/check-content.mjs).
export const D = typeof document !== 'undefined' ? document : null;

export function el(tag, cls, txt) {
  const e = D.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

// Normalizes text for search: lower case, accents stripped ("Café" -> "cafe").
// Keeps the length (each character maps to one character).
export function fold(s) {
  s = s || '';
  let o = '';
  for (let k = 0; k < s.length; k++) {
    const l = s[k].toLowerCase();
    if (l.length !== 1) { o += s[k]; continue; }
    const n = l.normalize('NFD');
    o += n.length ? n[0] : l;
  }
  return o;
}

export const reduceMotion = typeof window !== 'undefined' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
