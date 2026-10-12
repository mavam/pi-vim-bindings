# pi-vim-editor — minimal key binding UX

Scope principle: **Vim muscle memory for fixing up a prompt**, not a text
editor. Prompts are usually 1–20 lines. Everything Pi already does stays with
Pi. When in doubt, cut.

## 1. Modes

| Mode | Entered by | Bottom-right border label |
| --- | --- | --- |
| INSERT (start mode) | Startup, after submit, `i a I A o O c…` | `INSERT`, muted |
| NORMAL | Esc / `Ctrl-[` from INSERT | `NORMAL`, accent; pending keys replace it (`2d`, `ci`, `f`) |
| REPLACE | `R` from NORMAL | `REPLACE`, accent |
| VISUAL / VISUAL LINE / VISUAL BLOCK | `v` / `V` / `Ctrl-V` from NORMAL | `VISUAL` / `VISUAL LINE` / `VISUAL BLOCK`, accent |

No reverse video. The working, compaction, and retry spinners stay in the top
border, as in stock Pi.

## 2. Esc

| Situation | Esc / `Ctrl-[` does |
| --- | --- |
| INSERT or REPLACE, autocomplete open | Close autocomplete; stay in the mode |
| INSERT or REPLACE | → NORMAL, cursor one character left |
| NORMAL, pending command | Cancel it |
| NORMAL, nothing pending | Pi's interrupt (abort the agent, double-Esc behavior) |

Esc Esc from INSERT aborts a running agent.

## 3. What stays with Pi

- **INSERT:** every key except Esc / `Ctrl-[`.
- **NORMAL:** Enter (submit), Tab, arrows, Home/End, PageUp/PageDown, all
  Ctrl/Alt keys (`Ctrl-G` external editor, `Ctrl-C`, model selection,
  extension shortcuts, …), paste, and mouse. Some of these edit text, such as
  Tab completion or `Ctrl-Y`; that's intended.
- **Prompt history:** Pi's own keys (arrows at the buffer edge, or the history
  actions if bound) in both modes.

Exceptions in NORMAL: `Ctrl-]` (Pi's jump-to-char) does nothing, `Ctrl-V`
starts Visual block mode instead of Pi's image paste (which still works in
INSERT mode), `Ctrl-R` redoes, and a Pi action bound to a bare printable key is
shadowed by Vim.

## 4. NORMAL mode (v0.1)

Counts: `{n}` works on the motions `h j k l w b e W B E f F t T ; ,`, on
`{n}G` / `{n}gg`, `ge` / `gE`, on operators (`2dd`, `3cw`, `y3j`; `2d3w`
deletes six words), and on `x`, `X`, `s`, `J`, `~`, `p`, and `P`. Not on text
objects, `%`, or `.`.

### Enter INSERT

| Key | Action |
| --- | --- |
| `i` / `a` | Before / after cursor |
| `I` / `A` | First non-blank / end of line |
| `o` / `O` | Open line below / above |

### Replace mode

`R` starts REPLACE mode. Each typed character overwrites the one under the
cursor; at the end of the line, it's appended. Backspace puts back what the
last typed character overwrote; past where you started, it only moves left,
also onto the previous line. Esc returns to NORMAL. One `u` undoes the whole
session, and `.` repeats it, Backspaces included.

Keys that aren't text, such as arrows, Enter, and Pi shortcuts, go to Pi. If
one moves the cursor or edits, as do clicks and pastes, Backspace and `.`
start over from there. Backspace always restores, even if Pi binds another
key to delete backward. Overwriting a pasted block is refused, and Backspace
never restores over one.

### Motions

| Key | Motion |
| --- | --- |
| `h` `l` | Character left / right, within the line |
| `j` `k` | Line down / up; no-op at the last / first line; never history |
| `w` `b` `e` | Next word start / previous word start / word end, across lines |
| `W` `B` `E` | Same for WORDs (whitespace-delimited) |
| `ge` `gE` | Back to the end of the previous word / WORD |
| `0` `^` `$` | Line start / first non-blank / last character |
| `gg` `G` `{n}G` | First line / last line / line n |
| `%` | From the first bracket at or after the cursor on the line, to its partner, across lines |
| `f{c}` `F{c}` `t{c}` `T{c}` | To / till character on the line |
| `;` `,` | Repeat the last `f F t T` / in reverse |

Paste markers (`[paste #1 +24 lines]`) count as one character.

### Operators

`d` delete · `c` change (delete, then INSERT) · `y` yank · `gu` lowercase ·
`gU` uppercase.

| Form | Example |
| --- | --- |
| Operator + motion | `dw`, `c$`, `d2w`, `dt,`, `y3j`, `dG` (`j k gg G` are linewise) |
| Doubled = whole line | `dd`, `cc`, `yy`, `guu`, `gUU` |
| Word / WORD object | `diw`, `caw`, `ciW`, `daW` |
| Quote object, same line | `ci"`, `da'` |
| Bracket object, same line | `ci(`, `da[`, `yi{`; the closing bracket works too (`ci)`) |

Any operator whose range touches a paste marker is refused with a notice.

### Single-key edits

| Key | Action |
| --- | --- |
| `x` / `{n}x` | Delete character(s) under cursor |
| `X` / `{n}X` | Delete character(s) before the cursor |
| `~` / `{n}~` | Toggle the case of character(s) and move right |
| `s` / `{n}s` | Substitute character(s): delete, then INSERT |
| `S` | Substitute the line (= `cc`) |
| `Y` | Yank the line (= `yy`) |
| `J` / `{n}J` | Join with the next line(s), one space between |
| `>>` / `<<` / `{n}>>` | Indent / outdent line(s) by two spaces |
| `r{c}` | Replace character |
| `D` / `C` | Delete / change to end of line |
| `p` / `P` / `{n}p` | Put after / before, `n` times; linewise text goes below / above the line |
| `u` | Undo one whole change: `ciwfoo<Esc>` or `ihello world<Esc>` is one step |
| `Ctrl-R` | Redo what `u` undid, with the cursor at the start of the change. Any edit, including typing, a paste, or a submit, forgets what can be redone |
| `.` | Repeat the last change, including text typed in INSERT mode |

### Quitting Pi

| Keys | Action |
| --- | --- |
| `ZZ`, `:q`, `:qa` | Quit Pi if the prompt is empty; otherwise show a notice |
| `ZQ`, `:q!`, `:qa!` | Quit Pi, dropping the prompt |

`:` shows the command in the border as you type it. Enter runs it, Backspace
edits it, and Esc cancels. Other commands report that they're not supported.

## 5. Visual mode

`v` selects characters, `V` whole lines, `Ctrl-V` a block (the same columns on
several lines). The selection runs from where you started to the cursor,
inclusive, and shows in reverse video. Every NORMAL motion moves the cursor,
with counts. Keys that stay with Pi in NORMAL mode (§3) stay with Pi here too.

| Key | Action |
| --- | --- |
| `v` / `V` / `Ctrl-V` | Switch between charwise, linewise, and block; the same key again leaves |
| `o` | Jump to the other end of the selection |
| `O` | Block: jump to the other corner on the same line; otherwise like `o` |
| `iw` `aw` `iW` `aW` `i"` `a(` … | Select a text object (charwise) |
| `d` / `x` | Delete the selection |
| `c` / `s` | Change the selection: delete, then INSERT |
| `y` | Yank the selection; also goes to the system clipboard |
| `p` / `P` | Replace the selection with the register; the replaced text goes into the register (not in block mode) |
| `r{c}` | Replace every selected character with `c` |
| `J` | Join the selected lines |
| `~` / `u` / `U` | Toggle case / lowercase / uppercase the selection |
| `>` / `<` | Indent / outdent the selected lines by two spaces |
| Esc | Leave without changing anything |

Block mode adds:

| Key | Action |
| --- | --- |
| `$` | Extend the block to the end of every line |
| `I` | Insert before the block on every line; lines shorter than the block are skipped |
| `A` | Append after the block on every line; short lines are padded with spaces. After `$`, append at each line's end |
| `c` / `s` | Change the block: delete it, then type the new text for every line |

Text typed with block `I`, `A`, or `c` goes to the other lines when you press
Esc, and only if it's a single line. A yanked or deleted block puts back as a
block: `p` / `P` insert it column by column, starting at the cursor.

Block columns are display columns, so wide characters count twice. `u` undoes
any Visual change in one step. `.` doesn't repeat Visual changes.

## 6. Registers and the system clipboard

One unnamed register inside the extension, plain text plus a linewise flag.
`d`, `c`, `x`, `s`, `y` write it; `p`/`P` read it. Visual block deletes and
yanks store a block. It survives submits. Pi's own kill ring (`Ctrl-K` /
`Ctrl-Y`) works independently.

Yanks (`y`, `Y`) also go to the system clipboard through Pi; deletes and
changes don't, and `p`/`P` never read it. To use the system clipboard
explicitly, put `"+` or `"*` in front of a command, before or after a count.
Counts on both sides multiply (`2"+3dd` deletes six lines), and repeating the
prefix (`"+"+p`) is fine.

| Keys | Action |
| --- | --- |
| `"+yy`, `"+dw`, `"+x`, `"+D`, `"+ciw` … | Yank, delete, or change, and copy to the system clipboard |
| `"+y` / `"+d` / `"+c` in Visual mode | Same for the selection |
| `"+p` / `"+P`, `"+3p` | Put the system clipboard after / before the cursor, `n` times |

`"*` is the same register as `"+`; it isn't X11's primary selection. Other
registers (`"a`, `"0`, …) aren't supported.

How `"+p` treats the clipboard:

- If it still holds our last copy, it puts with that copy's shape:
  characterwise, linewise, or block.
- Other text is characterwise, unless it ends in a line break, which makes it
  linewise, as in Vim.
- An empty clipboard puts nothing, with a notice. If the clipboard can't be
  read (no display, an SSH session), `"+p` puts our last copy with a warning,
  or does nothing if there's none. It never falls back to the unnamed
  register.
- Reading is asynchronous, so typing never waits for it. If anything changes
  the prompt, cursor, or mode before the text arrives, even if it changes
  back, nothing is put. Several `"+p` in a row put one after another, in
  order. Each put is one undo step and isn't repeated by `.`.
- Line breaks become `\n` and tabs four spaces, as in Pi. A read gives up
  after two seconds or 10 MB.
- Clipboard text that contains a pasted-block marker (`[paste #1 +3 lines]`)
  is refused, since it would put that block's content.

## 7. Differences from Vim

Deliberate, to keep the scope small:

- **Counts:** `2dd` works, `d2d` and `2d$` don't. A count on an operator needs
  a motion that takes counts (`d3w`, `2y3j`). No counts on text objects, `%`,
  or `.`. `{n}dd` on the last line does nothing, as in Vim.
- **`j` / `k`** keep the display column of the line you leave, without Vim's
  sticky column.
- **Text objects** stay on the current line. Bracket objects need the cursor
  inside the brackets, and `a"` doesn't take the surrounding whitespace.
- **`%`** also matches brackets inside quotes.
- **Visual mode:** a charwise selection doesn't include line breaks, so `v$d`
  keeps the newline. Block `p` / `P` do nothing. Text that changes from
  outside Vim (Pi's history, another extension, `Ctrl-H`) ends Visual mode.
- **Words and case:** CJK characters are word characters like letters; `~`,
  `gu`, and `gU` use JavaScript's Unicode case mapping.
- **`.`** repeats text typed in INSERT mode only if it was a plain insertion at
  one spot. Block `I`, `A`, and `c` copy typed text to the other lines only if
  it's a single line without pasted blocks.
- **Pasted blocks:** `J`, `>`, and `<` keep them; other edits that touch one
  are refused.
- **Replace mode:** no counts (`3R`) or `gR`. Backspace doesn't remove a line
  break typed in Replace mode, and after an arrow key `.` repeats only what
  was typed after it, overwriting as Replace mode does.
- **Redo** only redoes what `u` undid, not Pi's own undo (`Ctrl-_`), and
  takes no count.
- **Clipboard:** `"+` and `"*` are the only named registers; `"*` isn't the
  primary selection. In Visual mode, `"+p` puts the unnamed register, like
  plain `p`.
- **Indent** is two spaces. **Clipboard** copies are best effort.

## 8. Cut from v0.1

Candidates for later, roughly by demand:

- Backtick quotes, `b`/`B` bracket aliases, multi-line bracket objects

Not planned: `jj`/`jk` escape (pi-vim #45).

Out of scope: search, `{ }`, named registers, macros, marks, `{n}R`, `gR`, Ex commands
beyond quitting, remapping, history on `j`/`k`, `.` for Visual changes, `>`/`<` with
motions, a configurable indent width.

## 9. Configuration

Settings go in Pi's `settings.json` (global or project):

```json
{ "vimEditor": { "indicator": "top-left" } }
```

`indicator` places the mode label: `bottom-right` (default), `bottom-left`,
`top-right`, or `top-left`. On the top border, the label sits next to Pi's
working indicator; when a border has no room, the label is left out.

Set `"vimEditor": { "cursorShape": true }` and `"showHardwareCursor": true`
to use steady cursor shapes: bar in INSERT, block in NORMAL and all Visual
modes, underline in REPLACE. Cursor shapes are off by default and never
change Pi’s hardware-cursor visibility setting. When the hardware cursor is
hidden, Pi’s software cursor stays unchanged. Visual selections remain
highlighted when the hardware cursor is shown.

The terminal and any multiplexer must support DECSCUSR. When the prompt
loses focus or Pi yields the terminal, the shape resets with DECSCUSR 0
(typically blinking block); the previous terminal shape is not queried. Returning to the prompt
reapplies the current mode’s shape. Shutdown and reload also reset it.

## 10. Decisions

| Question | Decision |
| --- | --- |
| Start mode | INSERT |
| Mode after submit | INSERT, when the prompt is actually submitted (text cleared), not on every Enter |
| `j`/`k` at buffer edges | No history; line movement only |
| INSERT label | Shown, muted |
| `$` | On the last character, as in Vim |
| Undo granularity | One step per Vim change, from the command that enters INSERT to Esc. Typing in the initial INSERT mode follows Pi's steps |
| Edits across paste markers | Refused |
| Passthrough keys that edit in NORMAL | Allowed, except `Ctrl-]` |
