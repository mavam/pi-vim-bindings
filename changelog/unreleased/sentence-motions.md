---
title: Sentence motions
type: feature
authors:
  - mavam
created: 2026-10-16T06:54:12.655751Z
---

NORMAL and Visual mode now support Vim's sentence motions: `)` moves forward
to the start of the next sentence and `(` moves back to the start of the
current or previous one. They take counts and work with every operator, so you
can rewrite a prompt one sentence at a time:

- `d)` deletes from the cursor to the next sentence, or through the end of the
  last one
- `c2)` changes the next two sentences, and `y(`, `gu)`, and `gU)` work too
- `v)` extends a Visual selection by a sentence
- `.` repeats a sentence edit, and `u` undoes it in one step

A sentence ends at `.`, `!`, or `?`, optionally followed by closing `)`,
`]`, `"`, or `'`, and then a space, a tab, or the end of a line. Empty lines
separate sentences too. Pasted blocks count as a single character, and edits
that would cut into one are refused.

The sentence motion code is derived from Vim, so the package now also includes
the Vim license for that part. Its license is `MIT AND Vim`; see
`THIRD_PARTY_NOTICES.md`.
