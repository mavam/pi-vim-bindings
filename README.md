# ⌨️ pi-vim-editor

Minimal Vim-style modal editing for [Pi](https://pi.dev)'s prompt editor.
Instead of replacing the editor, it adds INSERT and NORMAL modes to whatever
editor is installed, so Pi's inline working indicator, autocomplete, paste
handling, and other editor extensions keep working.

<table>
  <tr>
    <td width="50%"><img src="https://github.com/mavam/pi-vim-editor/raw/main/demo/vim.gif" alt="Visual block insert formats a file list, ciw fixes a typo, and a Visual selection changes the prompt before submission."></td>
    <td width="50%"><img src="https://github.com/mavam/pi-vim-editor/raw/main/demo/replace.gif" alt="Replace mode overtypes a timeout, Backspace restores a space, dot repeats the edit, undo restores the second timeout, and Ctrl-R redoes the change."></td>
  </tr>
  <tr>
    <td align="center">
      <strong>Shape prompts with Vim motions</strong><br>
      <small>Fix a typo, format a list, and rewrite a selection before submitting.</small>
    </td>
    <td align="center">
      <strong>Replace mode, undo, and redo</strong><br>
      <small>Overtype text, restore it with Backspace, repeat with <code>.</code>, and undo and redo.</small>
    </td>
  </tr>
</table>

## 🚀 Installation

```sh
pi install npm:pi-vim-editor
```

## ✨ Usage

The prompt starts in INSERT mode. Press `Esc` for NORMAL mode, where the
common Vim motions, operators, and text objects edit the prompt, and `v`, `V`,
or `Ctrl-V` start Visual mode. Press `Esc` again in NORMAL mode to interrupt
the agent, as usual. The current mode shows in a corner of the editor border.

If another extension also customizes the editor, load pi-vim-editor after
it.

## ⌨️ Key bindings

Counts work on motions and most edits, as in `3w`, `d3w`, or `2dd`. Keys Vim
doesn't use, such as Enter, Tab, arrows, and Ctrl or Alt shortcuts, keep
doing what they do in Pi. The exceptions in NORMAL mode are `Ctrl-V`, which
starts Visual block mode instead of pasting an image, `Ctrl-R`, which redoes,
and `Ctrl-]`.

**Modes and Esc**

| Key | Action |
| --- | --- |
| `Esc` / `Ctrl-[` | INSERT or REPLACE → NORMAL; closes autocomplete first if it's open |
| `Esc` in NORMAL | Cancels a pending command, otherwise interrupts the agent as usual |
| `i` `a` / `I` `A` | INSERT before / after the cursor, at the first non-blank / line end |
| `o` / `O` | Open a line below / above |
| `R` | REPLACE: typed characters overwrite; Backspace restores |
| `v` / `V` / `Ctrl-V` | Visual, Visual line, Visual block |

After you submit a prompt, the editor is back in INSERT mode.

**Motions**

| Key | Motion |
| --- | --- |
| `h` `j` `k` `l` | Left, down, up, right |
| `w` `b` `e` / `W` `B` `E` | Word / WORD start, back, end |
| `ge` / `gE` | Back to the end of the previous word / WORD |
| `0` `^` `$` | Line start, first non-blank, last character |
| `gg` / `G` / `{n}G` | First line, last line, line n |
| `f` `F` `t` `T` + char | To / till a character on the line |
| `;` / `,` | Repeat the last `f F t T` / in reverse |
| `%` | Jump to the matching bracket |

**Operators and text objects**

`d` deletes, `c` changes, `y` yanks, `gu` lowercases, and `gU` uppercases.
Combine them with a motion (`dw`, `c$`, `y3j`, `d%`), double them for whole
lines (`dd`, `cc`, `yy`, `guu`, `gUU`), or use a text object:

| Object | Inner / around |
| --- | --- |
| word / WORD | `iw` `aw` / `iW` `aW` |
| quotes | `i"` `a"`, `i'` `a'` |
| brackets | `i(` `a(`, `i[` `a[`, `i{` `a{` (closing brackets work too) |

Quote and bracket objects stay on the current line.

**Edits, undo, and repeat**

| Key | Action |
| --- | --- |
| `x` / `X` | Delete the character under / before the cursor |
| `s` / `S` | Substitute a character / the line |
| `r` + char | Replace the character under the cursor |
| `~` | Toggle case and move right |
| `D` / `C` / `Y` | Delete / change to the line end, yank the line |
| `J` | Join with the next line |
| `>>` / `<<` | Indent / outdent by two spaces |
| `p` / `P` | Put after / before the cursor |
| `u` | Undo a whole change, such as `ciwfoo<Esc>` |
| `Ctrl-R` | Redo what `u` undid |
| `.` | Repeat the last change |

Deletes, changes, and yanks share one register. Yanks also go to the system
clipboard. Edits that would cut into a pasted block (`[paste #1 +24 lines]`)
are refused.

**Visual modes**

Motions and text objects (`viw`, `vi(`) extend the selection.

| Key | Action |
| --- | --- |
| `o` / `O` | Jump to the other end / the other corner of a block |
| `d` `x` / `c` `s` / `y` | Delete / change / yank the selection |
| `p` | Replace the selection with the register (not in a block) |
| `r` + char | Replace every selected character |
| `~` / `u` / `U` | Toggle case, lowercase, uppercase |
| `J` / `>` / `<` | Join, indent, outdent the selected lines |
| `$` | Block: extend to the end of every line |
| `I` / `A` | Block: insert / append on every line |

**Quitting Pi**

| Keys | Action |
| --- | --- |
| `ZZ`, `:q`, `:qa` | Quit if the prompt is empty |
| `ZQ`, `:q!`, `:qa!` | Quit, dropping the prompt |

The full spec, including where it differs from Vim, is in
[docs/ux.md](https://github.com/mavam/pi-vim-editor/blob/main/docs/ux.md).

## 🆚 Comparison

How pi-vim-editor compares with the most downloaded Vim extensions for Pi,
based on reading their source as of October 2026:

| | **pi‑vim‑editor** | [pi‑vim](https://www.npmjs.com/package/pi-vim) | [pi‑command‑deck](https://www.npmjs.com/package/@ian-pascoe/pi-command-deck) | [pi‑vim‑keys](https://www.npmjs.com/package/@0xkahi/pi-vim-keys) | [pixit](https://www.npmjs.com/package/@sentomk/pixit) | [pi‑vimmode](https://www.npmjs.com/package/pi-vimmode) |
| --- | --- | --- | --- | --- | --- | --- |
| Downloads/month | new | 2,766 | 1,017 | 916 | 462 | 337 |
| Keeps Pi's editor | ✅ | ❌ replaces it | ❌ replaces it | ❌ replaces it | ❌ replaces it | ❌ replaces it |
| Works with other editor extensions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Inline working indicator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Visual modes | `v` `V` `Ctrl-V` | `v` `V` | `v` `V` | `v` `V` | ❌ | `v` `V` `Ctrl-V` |
| Operators | `d` `c` `y` `gu` `gU` | `d` `c` `y` | `d` `c` `y` `gu` `gU` `g~` | limited | `d` `c` `y` | `d` `c` `y` `gu` `gU` `g~` |
| Text objects | word, quotes, brackets | word, quotes, brackets | + paragraph | ❌ | word | + more |
| Counts | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `.` repeat | ⚠️ partial | ✅ | ✅ | ❌ | ❌ | ⚠️ partial |
| `Ctrl-R` redo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Replace mode `R` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Search `/` `?` `n` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Macros, named registers | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| System clipboard | yanks | both ways | yanks | ❌ | ❌ | both ways |
| Ex commands | `:q` | Pi commands | Pi commands | ❌ | ❌ | Pi commands, editing |
| Cursor shape per mode | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |

## ⚙️ Configuration

Move the mode label to another corner in Pi's `settings.json`:

```json
{ "vimEditor": { "indicator": "top-left" } }
```

Choose `bottom-right` (default), `bottom-left`, `top-right`, or `top-left`.
