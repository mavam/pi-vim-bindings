---
title: Paragraph navigation motions
type: feature
prs:
  - 6
authors:
  - mavam
created: 2026-10-16T10:42:19.339393Z
---

You can now navigate paragraphs with `{` and `}` in NORMAL and Visual modes, using empty lines as boundaries. Use `2}` to move forward two boundaries, `d}` to delete up to the next boundary, or `c}` to rewrite that range. Counts work with delete, change, yank, and case operators; changes support undo and `.` repeat.

Consecutive empty lines form one separator run. Space/tab-only lines are content for these motions, unlike the existing `ip` and `ap` objects, whose behavior is unchanged. A count past the available boundaries does nothing. Paragraph motions do not interpret Markdown, nroff macros, or section markers.
