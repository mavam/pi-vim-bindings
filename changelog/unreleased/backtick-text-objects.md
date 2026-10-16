---
title: Backtick text objects
type: feature
authors:
  - mavam
created: 2026-10-16T09:32:14.191535Z
---

You can now edit backtick-quoted text with `` i` `` and `` a` `` in NORMAL
and Visual modes. For example, with the cursor inside `` `src/old.ts` ``,
`` ci` `` clears the path and enters INSERT mode while keeping the backticks.

Backtick objects support delete, change, yank, and case changes, using the
same single-line pairing as single and double quotes. They don't interpret
Markdown multi-backtick spans or fences.
