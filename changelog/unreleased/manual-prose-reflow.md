---
title: Manual prose reflow
type: feature
authors:
  - mavam
prs:
  - 7
created: 2026-10-16T13:13:13.638992Z
---

You can now hard-wrap prose with `gq` and `gw`. Use `gwap` to reflow the current paragraph while keeping your place in its text, or `gqap` to move to its end. Both preserve blank paragraph separators. Motions, text objects, line forms (`gqq`, `gww`), counts, and Visual selections work too; formatting preserves the register and supports one-step undo and `.` repeat.

Set `"vimEditor": { "textWidth": 72 }` in Pi’s settings to wrap at 72 display columns. The default is a fixed 79 columns, independent of the editor’s width. Wrapping retains indentation, keeps long words intact, accounts for Unicode display width, and refuses whole operations touching pasted blocks. Formatting is manual only, without Markdown, comment, or filetype parsing.
