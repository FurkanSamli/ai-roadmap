// UI strings. Content text (topic titles, descriptions) lives in content/*.txt.

export const UI = {
  brand: 'AI Roadmap',
  search: 'Search topics… (e.g. docker, attention, bayes)', noRes: 'No results',
  backup: 'Backup', nextUp: 'Next up', nextNone: 'Everything is marked. Nice work.',
  overall: '{d} of {t} learned · {p}%',
  st0: 'Not started', st1: 'Learning', st2: 'Learned', st3: 'Skip',
  lv1: 'Basic', lv2: 'Intermediate', lv3: 'Advanced',
  homeT: 'The AI Roadmap', homeP: 'Every topic in AI, from the math underneath to shipping models in production. Click any box to see what it covers and how to learn it; open a field to zoom into its own roadmap.',
  home: 'Roadmap', openRoadmap: 'Open roadmap', details: 'Details', topics: '{n} topics',
  howUse: 'How to use', legendTitle: 'Status',
  tips: 'Click a box for details · Shift + click: learning · Alt + click: learned · Esc: close · /: search',
  progD: '{d} / {t} learned', progL: '{n} learning', progS: '{n} skipped',
  hours: '≈ {h} h of study', hoursLong: '≈ {h} h of study (about {w} weeks at 10 h a week)', hoursNote: 'rough estimate',
  plain: 'In plain words',
  what: 'What you need to learn', whatSub: '{n} subtopics', whatLeaf: 'Tick these off as you go',
  allTicked: 'All ticked. Mark it as learned?', markLearned: 'Mark learned',
  how: 'How to learn it',
  step1: 'Get the intuition', step1d: 'Read the plain-words explanation above, then watch one short visual explanation.',
  step2: 'Study it properly', step2d: 'Work through one of these free resources:',
  step2none: 'Use the search links below to find a good tutorial.',
  step3: 'Practice', step4: 'Check yourself', step4d: 'Explain it in your own words in the notes below. When you can, mark it learned.',
  forTopic: 'for {t}', search4: 'Search the web',
  notes: 'My notes', notesPh: 'Notes, links, questions about this topic…', saved: 'Saved',
  markAll: 'Mark all learned', clearAll: 'Clear marks', sure: 'Are you sure?', yes: 'Yes', no: 'Cancel',
  prev: 'Previous', next: 'Next', close: 'Close', cycle: 'Change status', expand: 'Expand / collapse',
  kind_course: 'Course', kind_video: 'Video', kind_book: 'Book', kind_docs: 'Docs', kind_article: 'Article', kind_interactive: 'Interactive', kind_practice: 'Practice',
  bkTitle: 'Backup',
  bkIntro: 'Your progress, notes and ticks live in this browser. They are lost if you clear browser data or switch computers, so copy the text below and keep it in a file. Backups from AI Learning Tree can be loaded here too.',
  bkExport: 'Create backup', copy: 'Copy', copied: 'Copied', copyFail: 'Could not copy; select the text and copy it manually.',
  bkImport: 'Restore', bkImportPh: 'Paste your backup text here…', load: 'Restore', fromFile: 'Choose file',
  loaded: 'Restored: {n} marks, {m} notes.', bad: 'This text is not a valid backup.',
  bkReset: 'Reset', resetBtn: 'Delete all progress and notes', resetDone: 'Everything was deleted.',
  loadErr: 'The content files could not be loaded. Open this project through a local server: run “npm run dev” or “python3 -m http.server 5174” in the project folder and open that address.',
  notFound: 'That topic does not exist (it may have been renamed).',
};

// t('overall', {d: 3, t: 10, p: 30}) -> filled-in UI string
export function t(k, v) {
  let s = UI[k];
  if (s == null) s = k;
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
}
