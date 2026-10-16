---
title: Sentence text objects
type: feature
authors:
  - mavam
created: 2026-10-16T08:31:50.170704Z
---

You can now edit a whole sentence from anywhere inside it with `is` (inner sentence) and `as` (a sentence with adjacent whitespace). Use `cis` to rewrite the current sentence, `d2as` to delete two sentences, or `vis` to select one—even across lines.

Both objects work with delete, change, yank, and case operators, accept counts, and extend Visual selections. Sentence changes support `.` repeat and single-step undo. Pasted blocks remain opaque, and operations that touch them are refused.
