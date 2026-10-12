Repeat every change with `.`, including Visual changes, block inserts, and complex insert sessions. An opt-in clipboard setting also makes plain `p` and `P` use the system clipboard.

## 🚀 Features

### Clipboard setting for plain p

Set `"vimEditor": { "clipboard": "unnamedplus" }` to use the system clipboard as the unnamed register, like Vim's `clipboard=unnamedplus`: plain `p` and `P` paste what the clipboard holds, and every yank, delete, and change copies to it.

*By @mavam.*

### Repeat every change with .

`.` now repeats every change: Visual changes on a selection of the same size, block inserts, `"+p`, and INSERT sessions that used Backspace, Delete, or pasted blocks. `{n}.` replaces the count of the change, or repeats typed text `n` times. Counts now also work on `r`, `S`, `C`, `D`, `$`, and word objects, as in `3rx`, `2D`, or `2diw`.

*By @mavam.*
