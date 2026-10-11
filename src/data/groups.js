// The five groups the 18 fields belong to. Their colors are CSS tokens
// (--g1 … --g5 in src/styles.css), picked through the data-group attribute.

export const GROUPS = [
  { id: 'g1', t: 'Foundations', d: 'The ground everything is built on.' },
  { id: 'g2', t: 'Core methods', d: 'The engine of AI: search, learning, neural networks.' },
  { id: 'g3', t: 'Specializations', d: 'Core methods applied to specific kinds of data and problems.' },
  { id: 'g4', t: 'Engineering & Deployment', d: 'Running models in the real world.' },
  { id: 'g5', t: 'Responsibility & Career', d: 'Managing impact and growing in the field.' },
];

export const gById = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
