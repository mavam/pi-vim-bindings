This release stops Visual mode from crashing Pi or highlighting the wrong cells when another extension frames the editor differently. Editor frame extensions can also read the current Vim mode and pending command from a new status interface.

## 🚀 Features

### Vim status for editor frame extensions

Extensions that draw their own editor frame can now show the current Vim mode and any pending command, such as `2d` or `:q`, even when their frame hides the mode label in the editor border. A decorated editor publishes its status under `Symbol.for("pi-vim-editor")`:

```ts
const vim = editor[Symbol.for("pi-vim-editor")];
const { mode, pending, label } = vim.status();
// mode: "normal", pending: "2d", label: "2d"
```

The border label stays as before. See `docs/integration.md` for the contract.

*By @mavam.*

## 🐞 Bug fixes

### No crash for Visual mode in framed editors

Pi no longer crashes when you start Visual mode in an editor that another extension frames differently, such as pi-zentui's Accent Rail style. Previously, pressing `V` on the last line of a multi-line prompt could exit Pi with a `TypeError`, and other frames highlighted the wrong cells, such as the rail or the row above the text.

When the editor's rows don't match Pi's own layout, the selection is now left unhighlighted instead. Visual mode commands still edit the selected text.

*By @mavam.*
