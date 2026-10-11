# AI Roadmap — project notes for Claude Code

An interactive 2D learning roadmap of AI in the style of roadmap.sh. The owner is a Computer
Science & AI student who uses it to plan their studies and track progress. It is the 2D sibling
of AI Learning Tree (3D) and shares its content and topic ids.
Talk to the user in **Turkish**. Everything in the repository (code, comments, content, docs,
commit messages) is **English only**.

## Running

- No build step: plain HTML + CSS + ES modules, no dependencies.
- Needs a local server: `npm run dev` (http://localhost:5174) or `python3 -m http.server 5174`.
- Content check: `npm run check`. Run it after every change to `content/`.
- No automated tests yet; after a change check by hand: home → field roadmap → topic roadmap,
  the drawer (status, checklist, resources, notes), search, Esc/back, backup, and a narrow
  (phone) width. Check both light and dark mode.

## Structure

```
index.html              Top bar, page skeleton, drawer and backup dialog
src/main.js             Entry: loads content + resources, hash routing (#/<id>?t=<id>), keyboard
src/state.js            Shared state (view, open) and `actions` (avoids import cycles)
src/store.js            localStorage: status (st: 1 learning, 2 learned, 3 skip), notes (nt), checklist ticks (ck), backup
src/strings.js          All UI strings; t()
src/util.js             DOM helper el(), search fold()
src/data/groups.js      The 5 groups (titles only; colors are CSS tokens)
src/data/model.js       content/*.txt parser and data model (core, branches, nodes, byId)
src/data/learn.js       "How to learn": levels, time estimate, key points/checklist, resources, practice, search links, next up
src/ui/roadmap.js       Roadmap view: header, spine + side clusters, SVG wires, selection highlight
src/ui/drawer.js        Topic drawer: status, plain words, what to learn, how to learn, notes, prev/next
src/ui/common.js        Shared pieces: status button, level pips, progress block, topic list, click shortcuts
src/ui/status.js        Status changes + refreshing every indicator (data-sid / data-pid)
src/ui/search.js        Search
src/ui/backup.js        Backup dialog
src/styles.css          All styles; colors in :root tokens (light) + prefers-color-scheme dark
content/*.txt           Content, one file per field; order in content/index.json
content/resources.json  Curated resources per field ("areas") and per topic ("topics"), practice ideas
scripts/check-content.mjs  Content + resources checker
```

## Rules and pitfalls

- Status is shown through attributes: any element with `data-sid` gets `data-st`, and CSS styles
  it. Don't set status classes by hand; call `setStatus()` / `refreshStatus()`.
- **Topic ids are derived from titles** (`field/parent-slug/topic-slug`). Renaming a title or
  moving a topic disconnects saved progress, notes, checklist ticks and its entries in
  `resources.json`. Warn the user first or write a migration. Keep ids identical to AI Learning
  Tree so backups stay compatible.
- Only add resource URLs you have opened and checked; prefer free resources. `k` is one of
  course, video, book, docs, article, interactive, practice.
- The `localStorage` key is `ai-roadmap-v1`. If you change the stored format, bump the version
  and read/migrate the old one.
- UI modules talk through `actions` (goTo, openTopic, closeDrawer, rerender); keep that pattern.
- Colors and fonts are tokens at the top of `src/styles.css`; group accents come from
  `data-group` → `--c`. No hard-coded colors in components.
- New UI text goes into `src/strings.js`.
- Small, focused commits; `npm run check` and a manual check after each step.
