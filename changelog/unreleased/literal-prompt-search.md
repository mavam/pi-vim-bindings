---
title: Literal prompt search
type: feature
authors:
  - mavam
created: 2026-10-16T13:28:07.300983Z
---

Find text in the prompt with literal, case-sensitive `/` and `?` searches in NORMAL and Visual modes. Type `/timeout` and press Enter to move to the next match, then use `n` or `N` to repeat in the same or opposite direction. Counts and wraparound work across prompt lines; pasted blocks stay opaque.

The border shows the query. Backspace edits it, paste adds text to it, and Esc or `Ctrl-[` cancels without moving. Enter confirms without submitting the prompt. Searches don't change text, registers, undo, or dot repeat. Regex and operator search aren't supported; use Visual search followed by an operator to edit a selection.
