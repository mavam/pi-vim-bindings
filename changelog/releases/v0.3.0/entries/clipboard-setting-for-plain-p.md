---
title: Clipboard setting for plain p
type: feature
authors:
  - mavam
created: 2026-10-12T17:17:50.26218Z
---

Set `"vimEditor": { "clipboard": "unnamedplus" }` to use the system clipboard
as the unnamed register, like Vim's `clipboard=unnamedplus`: plain `p` and `P`
paste what the clipboard holds, and every yank, delete, and change copies to
it.
