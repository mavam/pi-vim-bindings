---
title: Vim-like multi-line deletes and case changes
type: bugfix
authors:
  - mavam
created: 2026-10-16T06:54:14.103789Z
---

Deletes and case changes across lines now match Vim in a few more cases:

- Deleting a Visual selection that spans lines keeps the line break after it.
  Previously, `vjld` from the start of a line deleted the lines entirely.
- A delete with a motion that starts in the indent and leaves only blanks on
  its last line removes the lines entirely, and a motion from a line of only
  blanks to the start of a later line works on whole lines.
- After `gu` or `gU` with a motion that starts on an empty line, such as
  `gUj`, the cursor stays where the change starts instead of jumping to the
  next line.
