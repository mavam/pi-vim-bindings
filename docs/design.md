# pi-vim-editor — architecture design

Status: draft, revised after review · Target host: Pi `main` (≥ 1.1.0) ·
License: MIT

## 1. Goals and non-goals

**Goals**

1. Add modal Vim editing to Pi's prompt editor by **decorating the editor that
   the active factory produces**, instead of shipping a replacement editor
   class. Pi's default editor, or another extension's editor, keeps its
   rendering, callbacks, autocomplete, paste handling, mouse handling, history,
   and inline working indicator.
2. Track Pi `main` with the smallest possible host coupling. All access to
   editor internals lives in one module, checked at attach time, and fails
   closed.
3. Ship the smallest key surface that makes NORMAL mode useful
   (see [`ux.md`](ux.md)). When in doubt, cut.

**Non-goals (v0.1)**

Redo, macros, search, registers beyond one unnamed register,
reading the OS clipboard, Ex commands beyond quitting, cursor shape, settings
beyond the indicator position, remapping, a
`/vim` command, and decorating overlay editors that other extensions create.
Disable the extension with `pi config` or by uninstalling it.

## 2. Why not pi-vim or the other Vim packages

From auditing `lajarre/pi-vim` v0.14.2 and four alternatives
(`@thazhemadam/pi-vim`, `@0xkahi/pi-vim-keys`, `@burneikis/pi-vim`,
`xz-pi-vim`):

| Problem | Evidence | Consequence |
| --- | --- | --- |
| All **replace** the editor with a `CustomEditor` subclass | pi-vim `index.ts:4180–4238`; same in all four alternatives | Last loader wins; other editor extensions silently disappear |
| None pass `embedWorkingStatus: true` | pi-vim `index.ts:348–365` | Working, compaction, and retry spinners fall out of the border (Pi #8799) |
| Private-state mutation scattered through the editor | pi-vim `index.ts:230–239` (`state`, `undoStack`, `historyIndex`, …) | Breaks with `pi-tui` editor churn |
| Synthetic key injection for edits | pi-vim `index.ts:1349–1365` | Remapped or unbound keys break Vim commands (pi-vim PR #54) |
| Monolith | `index.ts` 4,240 LOC; one 9,802-LOC test file | Hard to keep current; fixes stall upstream |
| Composition branch keeps two editors in sync | `origin/feat/composable-editor--hardened`, ~25 commits | Never merged |

pi-vim's pure helpers (`motions.ts`, `text-objects.ts`) are MIT. Port pieces
with attribution where they fit. `@thazhemadam/*` is LGPL: ideas only.

## 3. Composition model

### 3.1 Factory composition, then instance decoration

`ctx.ui.getEditorComponent()` returns a **factory**, not the live editor. We
install a factory that calls the previous one (or builds Pi's default) and
decorates the result:

```ts
pi.on("session_start", (_event, ctx) => {
  if (ctx.mode !== "tui") return;
  const previous = ctx.ui.getEditorComponent();
  if (isOurs(previous)) return;
  ctx.ui.setEditorComponent(
    tagOurs((tui, theme, kb) => {
      const editor =
        previous?.(tui, theme, kb) ??
        new CustomEditor(tui, theme, kb, { embedWorkingStatus: true });
      attach(editor, kb);
      return editor;
    }),
  );
});
```

The host behavior after our factory returns (`interactive-mode.ts:2875–2949`)
is an exact contract, not "free inheritance":

| Host step | Effect on us |
| --- | --- |
| Saves `getText()` of the old editor, calls `setText()` on the new one | Cursor, undo, history, and paste registry of the old editor are **lost**. Paste markers become literal text. This hits every editor extension; it's harmless at `session_start` with an empty prompt. Upstream ask #2. |
| **Replaces** `onSubmit`/`onChange` with the default editor's | Never wrap these; neither can an inner factory. |
| Copies border color, padding, autocomplete, and `actionHandlers` when present | Fine; we don't touch them. |
| Injects the working indicator only if `embedWorkingStatus === true` | True for Pi's default. Another extension's editor keeps its own choice; we don't force it. |

Calling `setEditorComponent` only happens at `session_start`. `/reload` clears
the factory (`interactive-mode.ts:2452–2470`) and re-runs `session_start`, so
reload safety comes from the host; `isOurs()` only prevents stacking when
`session_start` fires again without a reset.

### 3.2 What `attach()` patches

Four members on the **instance**, each delegating to the value it replaced
(whatever an inner factory may already have patched):

| Member | Why it works |
| --- | --- |
| `handleInput(data)` | The TUI dispatches to the focused component's current `handleInput` (`tui.ts:1120–1130`); host paste goes through it too (`interactive-mode.ts:2655`). |
| `renderTopBorder(width, hidden)`, `renderBottomBorder(width, hidden)` | `Editor.render()` calls both through `this` (`editor.ts:564`, `616`). One of them carries the mode label (§7); the other passes through. |
| `render(width)` | Only in Visual mode: reverse-videos the selection in the rows the original `render()` returned (§6.1). Otherwise returns them unchanged. |

A controller is stored under `Symbol.for("pi-vim-editor")`; a second
`attach()` on the same instance is a no-op. There's no `detach()`: removing
patched members could remove a later wrapper.

If the instance lacks `getLines`, `getCursor`, or any capability from §6, we
don't patch it and notify once.

### 3.3 Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Subclass `CustomEditor` | Not composable. |
| Proxy object around the editor | Must mirror a growing duck-typed surface; two objects to keep in sync. |
| `ctx.ui.onTerminalInput` middleware | Global, runs before focus dispatch (`tui.ts:1055–1078`), and has no editor context. |

### 3.4 Ordering with other extensions

| Situation | Result |
| --- | --- |
| Editor extension's factory installed before ours | We decorate its editor. |
| Installed after ours and calls `getEditorComponent()` | It wraps our factory; Vim stays active if it delegates `handleInput`. |
| Installed after ours and replaces blindly | Vim is gone. README: load pi-vim-editor last. |
| `pi-vim` also installed | Unsupported. README says to uninstall it. |

## 4. Modules

```text
src/
├── index.ts      # session_start wiring (§3.1)
├── attach.ts     # instance patching: input routing (§5), mode label (§7)
├── engine.ts     # PURE: key → effects; parser, motions, objects
├── text.ts       # PURE: graphemes, word classes, paste-marker spans
└── port.ts       # editor capability adapter (§6)
```

Split files when one grows past a few hundred lines, not before.

The engine is a pure function over a snapshot:

```ts
type Pos = { line: number; col: number };
type Buffer = { lines: readonly string[]; cursor: Pos };
type Effect =
  | { kind: "move"; to: Pos }
  | { kind: "replace"; from: Pos; to: Pos; text: string; cursor: Pos }
  | { kind: "yank"; register: { text: string; linewise: boolean } }
  | { kind: "mode"; mode: "insert" | "normal" }
  | { kind: "undo" }
  | { kind: "refuse" };                 // operator touched a paste marker

press(state, key, buffer, register): { state; effects: Effect[] }
esc(state, buffer): { state; effects: Effect[]; passthrough: boolean }
```

Most behavior becomes table tests of `buffer + keys → buffer + cursor`.

## 5. Input routing

On each `handleInput(data)`:

**0. Detect external changes.** If text or cursor differ from the snapshot
taken after our last key (mouse click, host action, another extension),
cancel the pending command.

**1. Decode.** Use `pi-tui`'s exported `matchesKey` and
`decodeKittyPrintable`, plus a few lines decoding xterm `modifyOtherKeys`
(mirroring the unexported `decodePrintableKey`, upstream ask #3), so Kitty
CSI-u and `modifyOtherKeys` printable keys, shifted letters, and `Ctrl-[` are
recognized. Esc means `escape` **or** `ctrl+[` in any encoding.

**INSERT**

| Input | Action |
| --- | --- |
| Esc, autocomplete open | Pass `"\x1b"` through so Pi closes the list. Kitty `Ctrl-[` doesn't match Pi's `escape` (`keys.ts:871–877`), so we normalize it. |
| Esc | → NORMAL, cursor one grapheme left. Consume. |
| Anything else | Pass through unchanged. |

**NORMAL** is deliberately hybrid: Vim owns printable keys, Pi owns the rest.

| Input | Action |
| --- | --- |
| Esc with pending command | Cancel. Consume. |
| Esc, nothing pending | Pass `"\x1b"` through → `app.interrupt`. |
| Printable key | Engine. Unmapped keys are consumed and cancel pending. |
| Key bound to `tui.editor.jumpForward`/`jumpBackward` (`Ctrl-]`) | Consume: Pi's jump would swallow the next key outside Vim. |
| Anything else (Enter, Tab, arrows, Ctrl/Alt keys, paste) | Cancel pending, pass through. These can still edit text (Tab completion, `Ctrl-Y`, paste); that's intended. |

Consequence: if a user binds a Pi app action to a bare printable key, Vim
shadows it in NORMAL mode. Documented, not solved.

**Back to INSERT after submit.** After a passthrough, if the text went from
non-empty to empty, switch to INSERT. Enter alone isn't a submit: it can
accept autocomplete or insert a newline.

Bracketed paste arrives as one rewrapped chunk from `ProcessTerminal`
(`terminal.ts:259–263`). In NORMAL it passes through and inserts at the
cursor. No buffering of split pastes in v0.1.

## 6. Port: the only module that touches editor internals

```ts
interface Port {
  read(): Buffer;                    // getLines(), getCursor() — public
  autocompleteOpen(): boolean;       // isShowingAutocomplete() — public
  setCursor(pos: Pos): void;         // private: state + setCursorCol()
  replace(from: Pos, to: Pos, text: string, cursor: Pos): void;
  undo(): void;                      // private: undo()
  undoDepth(): number;               // private: undoStack.length
  collapseUndo(depth: number): void; // private: undoStack.pop()
  closeAutocomplete(): void;         // private: cancelAutocomplete()
  cancelJump(): void;                // private, optional: jumpMode = null
  layout?(width: number): Layout;    // private, optional: see §6.1
}
```

`replace` mirrors the bookkeeping of the public `insertTextAtCursor()`
(`editor.ts:1135–1197`): cancel autocomplete, push one undo snapshot, reset
`lastAction`, exit history browsing, splice lines, set the cursor, fire
`onChange`.

Rules:

- **Fail closed.** `attach()` checks that every private member exists with the
  expected type (`state`, `pastes`, `lastAction`, `undoStack.length/pop/push`,
  and the private methods above). If any is missing, we don't attach and
  notify once that the Pi version is unsupported. No degraded tiers, no
  synthetic keys. `layout` and `cancelJump` are optional: without them, Visual
  mode is off, and Esc doesn't end a pending `Ctrl-]` jump.
- **Esc goes through the port, not through Pi's keys.** With autocomplete open,
  Esc closes it with `closeAutocomplete()`, so a remapped `tui.select.cancel`
  can't trap it. Every Esc we handle also ends Pi's pending character jump,
  which would otherwise catch the next key we pass on.
- **Reconcile before acting.** Before each key and each Visual render, the
  decorator compares the editor with what it saw after its last key. A moved
  cursor drops a pending command; changed text also ends Visual mode, so a
  selection never points past the buffer.
- **Pi's undo inside a change.** If Pi's own undo drops the stack below the
  depth where the open change started, the change restarts from there and
  isn't repeatable with `.`.
- **One Vim change = one undo step.** A change runs from the NORMAL command
  that enters INSERT mode to Esc. Pi splits typed text into several snapshots
  (`editor.ts:1201–1213`), so on Esc we pop every snapshot newer than the one
  the change started with (`collapseUndo`). Snapshots hold the state *before*
  each step, so the remaining one restores the state before the whole change.
  A submit clears Pi's stack and abandons the open change. Commands that edit
  several lines without entering INSERT (`>`, block `d`, `r`) are collapsed
  the same way right after they run. Upstream ask #1 would replace this with
  undo groups.
- **Paste markers.** Motions treat a valid marker (`[paste #N …]` whose ID
  exists, as Pi validates in `editor.ts:385–392`) as one grapheme. Any operator
  whose range touches a marker is **refused** with a notification. The
  register therefore never holds marker text, and we never expand pastes.
- Never call `setText()` on a buffer with markers: it clears the paste
  registry (`editor.ts:1115–1128`).

### 6.1 Visual highlight

Pi's editor can't highlight a range, so `render()` post-processes its output.
`layout(width)` maps rendered rows back to buffer text after the original
`render()` ran, using private members: `buildVisualLineMap(lastWidth)` gives
each wrapped row's logical line and column span, `scrollOffset` and
`renderedVisibleLineCount` give the visible slice, and `getPaddingX()` the left
padding. Row `i` of that slice is rendered line `i + 1` (after the top border).

For each row, the selected columns become visible columns with `visibleWidth`,
and the row gets `ESC[7m … ESC[27m` around them, skipping escape sequences.
After a code that ends reverse video inside the selection (an SGR reset, or the
end of Pi's fake cursor), reverse video is re-applied, so the cursor cell blends
into the selection; the terminal cursor still shows it if Pi uses one. An empty
line in the selection shows one highlighted cell.

`layout` is optional: if those members are missing, `v` and `V` notify that
Visual mode isn't supported and everything else keeps working. Upstream ask #4
would replace this with an editor API for highlighting ranges.

### Upstream asks

Drafts in [`upstream.md`](upstream.md):

1. Public `Editor.setCursor()`, `Editor.replaceRange()`, `Editor.undo()`, and
   undo transactions (begin/end) so one Vim change is one step. Removes every
   private access in `port.ts`.
2. Carry editor state (cursor, paste registry, undo) across
   `setEditorComponent()`, or hand the new factory the previous instance.
3. Export `decodePrintableKey()` from `pi-tui` (`keys.ts:1453`, not exported
   today).
4. Let editor decorators highlight buffer ranges (e.g.
   `Editor.setHighlights(ranges)`), or expose the row layout of the last render.

## 7. Mode indicator

`INSERT` (muted), `NORMAL` / `VISUAL …` (accent), or the pending keys, such as
`2d`, `ci`, or `:q`. Theme foreground tokens only, no reverse video. The
corner comes from `vimEditor.indicator` in Pi's settings (`pi.getSettings()`
at `session_start`), bottom-right by default.

The label needs room at the end of the border line: it must end in plain
dashes, `borderColor("─…")`. On the right, the label replaces the last dashes.
On the left, it goes in after the first dash and the line gives up the same
number of dashes at its end, so Pi's top-left working indicator just moves
over. The scroll indicator and anything else in the middle stay intact. If the
line doesn't end in enough dashes (another extension decorated it, or the
terminal is narrow), the label is left out. No status-line fallback.

Border widgets (open Pi PR #10602) could replace the patch later. Not designed
for now.

The cursor is Pi's (reverse-video block or hardware cursor). NORMAL clamps it
onto a character. No DECSCUSR.

## 8. State

- **Per editor:** mode, pending keys, last snapshot. A new editor starts in
  INSERT.
- **Per extension:** the unnamed register `{ text, linewise }`. It holds plain
  text only (markers are refused), so it survives submits and editor
  recreation. Yanks are also copied to the system clipboard with Pi's exported
  `copyToClipboard`, best effort; `p` never reads the clipboard.
- **Per editor, for `.`:** the keys of the last change, which the engine
  reports as `Result.change`, plus the text typed before Esc. That text is the
  difference between the buffer when INSERT mode started and at Esc, if it's a
  plain insertion at the start cursor; otherwise, or if it contains a paste
  marker, `.` has nothing to repeat. Replaying runs the keys through the
  engine, inserts the text, and collapses the result into one undo step.
- **Visual block:** columns are display columns. The port passes `pi-tui`'s
  `visibleWidth` as `Buffer.measure`, so they agree with what Pi renders; the
  engine stays pure and falls back to a small wide-character table in
  `text.ts`. Block registers also carry their display width, so `p` pads short
  rows and keeps the rectangle. Block `I`, `A`, and `c` return a `BlockInsert` with the lines
  and display column; on Esc, the decorator takes the text typed on the top
  line (the same insertion diff as for `.`) and the engine's `replicate()`
  turns it into one edit per remaining line, all inside the change's undo step.
  Block registers carry `block: true`, so `p`/`P` put them column by column.
  `Ctrl-V` is a control key, so the decorator maps it to the engine's `CTRL_V`
  key in NORMAL and Visual modes before it can reach Pi's image paste.

## 9. Testing and CI

Following the workspace rule: test documented behavior, about one test each.

| Layer | Approach |
| --- | --- |
| Engine | Table tests: `"foo |bar baz" + "dw" → "foo |baz"`. |
| Attach + port | Real `CustomEditor` with a stub TUI: text, cursor, undo depth, refused marker edits, Esc/autocomplete, submit → INSERT. |
| Composition | A fake editor extension that wraps `getEditorComponent()` loaded before us; `embedWorkingStatus` and `setWorkingStatusIndicator` stay intact. |
| Fail closed | Remove one private member → no attach, one notification. |
| Host drift | CI runs on the pinned Pi devDependencies and, weekly, on `@latest`. Testing a Pi `main` checkout is a later addition. |

## 10. Pitfalls from pi-vim history

- Esc from INSERT steps one **grapheme** left (`105537b`).
- `Ctrl-[` equals Esc in every encoding (`879f137`).
- Linewise vs. charwise put cursor placement follows Vim (`59db9e6`, `53e8bda`).
- Autocomplete gets Esc first; Tab/Enter acceptance stays with Pi.
- Don't write terminal escapes we can't restore (`5e216bc`, `0f40d5b`). v0.1
  writes none.
- No subprocesses or host-path probing at startup (`c121bd1`, `6cf2548`).

## References

- Pi: `interactive-mode.ts` (default editor 648–652, factory install
  2871–2949, reload 2452–2470), `custom-editor.ts`, `pi-tui` `editor.ts`,
  `editor-component.ts`, `keys.ts`, `tui.ts`; example `modal-editor.ts`.
- Pi issues/PRs: #3935 (`getEditorComponent`), #8799 (border working
  indicator), #10602 (border widgets, open).
- pi-vim: issues #45 #49 #51 #53 #55; PRs #52 #54 #56 #57.
