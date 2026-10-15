---
title: Vim status for editor frame extensions
type: feature
authors:
  - mavam
created: 2026-10-15T07:18:58.835328Z
---

Extensions that draw their own editor frame can now show the current Vim mode
and any pending command, such as `2d` or `:q`, even when their frame hides the
mode label in the editor border. A decorated editor publishes its status under
`Symbol.for("pi-vim-editor")`:

```ts
const vim = editor[Symbol.for("pi-vim-editor")];
const { mode, pending, label } = vim.status();
// mode: "normal", pending: "2d", label: "2d"
```

The border label stays as before. See `docs/integration.md` for the contract.
