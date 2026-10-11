# Content format

Each branch is a separate `.txt` file under `content/`. The load order lives in
`content/index.json`.

## Branch header

```
## g1 | math | Mathematical Foundations | Mathematics
> Short description
? Simple explanation
```

Fields in order: group (`g1`–`g5`), branch id, full name, short name (used in
breadcrumbs and search results).

Groups: `g1` Foundations · `g2` Core methods · `g3` Specializations ·
`g4` Engineering & Deployment · `g5` Responsibility & Career.

## Topics

```
- [1] Linear Algebra
  > The language of data and models
  ? An image or a sentence is stored as lists of numbers...
  - [2] Eigenvalues & eigenvectors
    ? ...
```

- `- ` starts a topic. An indent of **2 spaces** = one level deeper.
- `[1]` basic, `[2]` intermediate, `[3]` advanced. Optional, but first-level topics should have one.
- `>` short description (optional), `?` simple explanation (required; shown as “In plain words”
  in the topic drawer). These lines go under their topic, indented 2 more spaces.
- ` | ` is only used in branch headers. Content is English-only; `npm run check` rejects
  Turkish characters.
- Run `npm run check` after editing any file.

## A warning about ids

A topic's id is derived from its title (and its parents' titles). Renaming a title or
moving a topic disconnects the saved progress and note for that topic.

## Resources (`content/resources.json`)

```json
{
  "areas": {
    "math": {
      "practice": "Work through three exercises on {topic} by hand…",
      "resources": [ { "t": "Mathematics for Machine Learning", "u": "https://mml-book.github.io/", "k": "book" } ]
    }
  },
  "topics": {
    "math/linear-algebra": [ { "t": "Essence of Linear Algebra", "u": "https://…", "k": "video" } ]
  }
}
```

- `areas.<field id>`: resources shown for every topic in that field, and a practice idea where
  `{topic}` is replaced by the topic's title.
- `topics.<topic id>`: resources for that topic and everything below it; they are listed before
  the field's resources.
- `k` (kind) is one of `course`, `video`, `book`, `docs`, `article`, `interactive`, `practice`.
- `npm run check` reports unknown ids (for example after a rename) and malformed entries.
