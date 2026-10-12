# Upstream asks for Pi (drafts)

Draft issues for `earendil-works/pi`. Not filed yet. Each one removes a
workaround from pi-vim-editor and helps any extension that decorates the
prompt editor.

## 1. Public cursor, range-edit, and undo API on `Editor`

**What do you want to change?**

Add public methods to `Editor` in `pi-tui` (and optional members on
`EditorComponent`):

```ts
setCursor(pos: { line: number; col: number }): void;
replaceRange(
  from: { line: number; col: number },
  to: { line: number; col: number },
  text: string,
  cursor?: { line: number; col: number },
): void;
undo(): void;
beginUndoGroup(): void;
endUndoGroup(): void;
```

`replaceRange` would do the same bookkeeping as `insertTextAtCursor()`:
cancel autocomplete, push one undo snapshot, reset undo coalescing, exit
history browsing, keep the paste registry consistent, and fire `onChange`.
Between `beginUndoGroup()` and `endUndoGroup()`, all edits (including typed
input) would collapse into one undo step.

**Why?**

Extensions that edit the prompt (modal editing, snippets, refactors of the
draft) can only read the buffer today (`getLines()`, `getCursor()`). Moving
the cursor or editing a range needs private members (`setCursorCol`,
`pushUndoSnapshot`, `undo`, `state`) or synthetic key input, which breaks
when users remap keys. `setText()` isn't an option because it clears the paste
registry. A Vim change like `ciwfoo<Esc>` should undo in one step, but Pi's
typing coalescing splits it.

## 2. Preserve editor state across `setEditorComponent()`

**What do you want to change?**

When `setEditorComponent()` installs a new editor, Pi only transfers
`getText()` through `setText()` (`interactive-mode.ts`, `setCustomEditorComponent`).
Cursor, undo history, and the paste registry are lost, so existing
`[paste #N]` markers turn into literal text.

Options:

- Transfer the paste registry and cursor when both editors are `Editor`
  instances, or
- Transfer `getExpandedText()` instead of `getText()` as a minimal fix.

**Why?**

Any extension that installs an editor while the prompt has content (e.g.
toggling a mode, or a factory change after `/reload`) silently corrupts pasted
content.

## 3. Export `decodePrintableKey` from `pi-tui`

**What do you want to change?**

Export `decodePrintableKey()` (`packages/tui/src/keys.ts`) from the package
entry point, next to the already exported `decodeKittyPrintable()`.

**Why?**

Editor decorators need to know whether raw input is a printable character
across legacy, Kitty CSI-u, and `modifyOtherKeys` encodings, the same way
`Editor` decides. Reimplementing it outside Pi drifts from Pi's behavior.

## 4. Highlight buffer ranges in `Editor`

**What do you want to change?**

Add a way for extensions to highlight ranges of the buffer, for example:

```ts
setHighlights(ranges: Array<{ from: Pos; to: Pos; style?: (s: string) => string }>): void;
```

The editor would apply the style while rendering, across wrapped rows and
scrolling, and keep its own cursor rendering intact.

**Why?**

Visual selections, search matches, and lint-style markers all need to mark
text in the prompt. Today an extension has to post-process `render()` output
and map rows back to buffer columns through private members
(`buildVisualLineMap`, `lastWidth`, `scrollOffset`,
`renderedVisibleLineCount`), while working around the fake cursor's reverse
video.

## 5. Export `readClipboardText` from `pi-coding-agent`

**What do you want to change?**

Export `readClipboardText()` (`packages/coding-agent/src/utils/clipboard.ts`)
from the package entry point, next to the already exported
`copyToClipboard()`.

**Why?**

Extensions that put the system clipboard, like a Vim `"+p`, can use
`pi-tui`'s `getNativeClipboard()` for macOS, Windows, and X11, but have to
reimplement Pi's Wayland and Termux fallbacks (`wl-paste`,
`termux-clipboard-get`). Exporting the reader keeps them in line with how Pi
itself reads the clipboard.
