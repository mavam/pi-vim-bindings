# Integrating with pi-vim-editor

pi-vim-editor shows its mode label in the editor border. If your extension
draws its own frame around Pi's editor, that label may disappear. Read the
Vim status from the editor and show it yourself instead.

## Read the status

A decorated editor publishes a read-only capability under
`Symbol.for("pi-vim-editor")`. You don't need to depend on this package:

```ts
const vim = (editor as Record<symbol, unknown>)[Symbol.for("pi-vim-editor")] as
  | { version: 1; status(): { mode: string; pending: string; label: string } }
  | undefined;

if (vim?.version === 1) {
  const { mode, pending, label } = vim.status();
}
```

The capability is a frozen object on the editor instance. The property isn't
writable, enumerable, or configurable. `status()` returns a new frozen
object on every call:

| Field | Meaning |
| --- | --- |
| `mode` | `insert`, `normal`, `visual`, `visual-line`, `visual-block`, or `replace` |
| `pending` | The keys of an unfinished command, such as `2d`, `ci`, `"+`, or `:q`; otherwise `""` |
| `label` | The text of pi-vim-editor's own label: `pending` if it isn't empty, otherwise the mode name, such as `NORMAL` or `VISUAL LINE` |

The label is plain text without styling. pi-vim-editor's own border mutes
`INSERT` and uses the accent color for everything else.

The package also exports the TypeScript types `VimEditorCapability`,
`VimEditorStatus`, and `VimEditorMode`.

## Keep it current

- Call `status()` while you render, and don't cache the result. Every key
  that changes the mode or the pending keys also makes Pi render the editor.
- Look up the capability on the editor you decorate or wrap. If you wrap the
  editor in another object, read it from the inner editor.
- Each editor instance has its own status. A new editor starts in `insert`.
  After a submit, the status is back in `insert`.
- If pi-vim-editor can't decorate an editor, for example on an unsupported Pi
  version, the editor has no capability.

The status doesn't depend on border rendering. It stays current if your
extension never calls `renderTopBorder()` or `renderBottomBorder()`, or
drops the rows they return.

## Visual selections

pi-vim-editor highlights a Visual selection in the rows that Pi's editor
renders. It only does so when the decorated editor's `render(width)` returns
Pi's layout unchanged: Pi's border rows at that width, with the text rows
between them.

If the editor renders Pi's rows at another width, or drops, adds, or indents
rows before returning them, the selection isn't highlighted. Editing in
Visual mode still works. There's no API yet to highlight a selection in rows
that another extension rearranged.
