---
title: Paragraph text objects
type: feature
prs:
  - 5
authors:
  - mavam
created: 2026-10-16T10:13:25.431814Z
---

You can now edit whole prose paragraphs with `ip` and `ap`. Use `cip` to rewrite an instruction block, `dap` to remove it with adjacent blank lines, or `yip` to copy its whole lines.

Paragraphs are separated by empty or space/tab-only lines. Counts work with the existing delete, change, yank, and case operators (`d2ap`, `2gUip`), and `vip` / `vap` start linewise Visual selections. Paragraph changes support repeat and undo; edits touching pasted blocks remain protected.
