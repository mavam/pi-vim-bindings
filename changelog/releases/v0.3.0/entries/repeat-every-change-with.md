---
title: Repeat every change with .
type: feature
authors:
  - mavam
created: 2026-10-12T16:43:56.170632Z
---

`.` now repeats every change: Visual changes on a selection of the same size,
block inserts, `"+p`, and INSERT sessions that used Backspace, Delete, or
pasted blocks. `{n}.` replaces the count of the change, or repeats typed text
`n` times. Counts now also work on `r`, `S`, `C`, `D`, `$`, and word objects,
as in `3rx`, `2D`, or `2diw`.
