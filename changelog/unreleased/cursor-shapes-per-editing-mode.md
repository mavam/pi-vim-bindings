---
title: Cursor shapes per editing mode
type: feature
authors:
  - mavam
created: 2026-10-12T16:04:06.72133Z
---

You can now show the editing mode through the cursor shape: a bar in INSERT,
a block in NORMAL and Visual modes, and an underline in REPLACE. Enable it
alongside Pi's hardware cursor in `settings.json`:

```json
{
  "showHardwareCursor": true,
  "vimEditor": { "cursorShape": true }
}
```

Cursor shapes are off by default and require a terminal that supports them.
The extension resets the shape when the prompt loses focus, Pi yields the
terminal, or the extension shuts down or reloads. Visual selections remain
highlighted.
