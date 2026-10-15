---
title: No crash for Visual mode in framed editors
type: bugfix
authors:
  - mavam
created: 2026-10-15T07:18:57.980593Z
---

Pi no longer crashes when you start Visual mode in an editor that another
extension frames differently, such as pi-zentui's Accent Rail style.
Previously, pressing `V` on the last line of a multi-line prompt could exit Pi
with a `TypeError`, and other frames highlighted the wrong cells, such as the
rail or the row above the text.

When the editor's rows don't match Pi's own layout, the selection is now left
unhighlighted instead. Visual mode commands still edit the selected text.
