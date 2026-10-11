# AI Roadmap — project notes for Claude Code

An interactive 2D learning roadmap of AI in the style of roadmap.sh. The owner is a Computer
Science & AI student who uses it to plan their studies and track progress. It is the 2D sibling
of AI Learning Tree (3D) and shares its content and topic ids.
Talk to the user in **Turkish**. Everything in the repository (code, comments, content, docs,
commit messages) is **English only**.

## Running

- No build step: plain HTML + CSS + ES modules, no dependencies.
- `npm run dev` runs `server.mjs` (http://localhost:5174): a dependency-free Node server that
  serves the site and saves progress to `data/progress.db` (built-in `node:sqlite`, JSON-file
  fallback on older Node). `python3 -m http.server 5174` still works, with localStorage only.
- Content check: `npm run check`. Run it after every change to `content/`.
- No automated tests yet; after a change check by hand: home → field roadmap → topic roadmap,
  the drawer (status, checklist, resources, notes), search, Esc/back, the Data dialog and the
  save badge (also with the server stopped), and a narrow
  (phone) width. Check both light and dark mode.

## Structure

```
server.mjs              Local server: static files + GET/PUT /api/state, SQLite in data/ (never served, never committed)
index.html              Top bar, page skeleton, drawer and data dialog
src/main.js             Entry: loads content + resources, hash routing (#/<id>?t=<id>), keyboard
src/state.js            Shared state (view, open) and `actions` (avoids import cycles)
src/store.js            Status (st: 1 learning, 2 learned, 3 skip), notes (nt), ticks (ck); initStore() loads from server or localStorage, save() syncs; export/import
src/strings.js          All UI strings; t()
src/util.js             DOM helper el(), search fold()
src/data/groups.js      The 5 groups (titles only; colors are CSS tokens)
src/data/model.js       content/*.txt parser and data model (core, branches, nodes, byId)
src/data/learn.js       "How to learn": levels, time estimate, key points/checklist, resources, practice, search links, next up
src/ui/roadmap.js       Roadmap view: header, spine + side clusters, SVG wires, selection highlight
src/ui/drawer.js        Topic drawer: status, plain words, what to learn, how to learn, notes, prev/next
src/ui/common.js        Shared pieces: status button, level pips, progress block, topic list, click shortcuts (bindTopic)
src/ui/levels.js        Level filter (view only): body.hide-l1..3 fades boxes/rows with that data-lv; remembered in localStorage
src/ui/status.js        Status changes + refreshing every indicator (data-sid / data-pid)
src/ui/search.js        Search
src/ui/backup.js        Data dialog: where it is saved, export (download / copy), import, reset
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
- Saving: always call `save()` after changing `store`; it writes localStorage and (with the server)
  sends the whole state with a short debounce. Unconfirmed changes are marked `_pending` and
  re-sent on the next start. `data/` must stay in `.gitignore`.
- Database changes: add a migration in `server.mjs` and bump `PRAGMA user_version`.
- The `localStorage` key is `ai-roadmap-v1`. If you change the stored format, bump the version
  and read/migrate the old one.
- UI modules talk through `actions` (goTo, openTopic, closeDrawer, rerender); keep that pattern.
- Colors and fonts are tokens at the top of `src/styles.css`; group accents come from
  `data-group` → `--c`. No hard-coded colors in components.
- New UI text goes into `src/strings.js`.
- Small, focused commits; `npm run check` and a manual check after each step.
