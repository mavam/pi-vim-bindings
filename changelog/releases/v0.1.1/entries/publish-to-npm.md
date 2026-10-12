---
title: Publish to npm
type: bugfix
authors:
  - mavam
created: 2026-10-12T13:39:49.771881Z
---

Version 0.1.0 was released on GitHub but never reached npm, because npm had
already seen that version number for the package name. This release publishes
the same extension to npm, so `pi install npm:pi-vim-editor` installs it.
