Edit prose paragraphs with new text objects and navigation motions, and manually reflow text with gq and gw. Search the prompt with literal, case-sensitive / and ? queries, then repeat matches with n or N.

## 🚀 Features

### Literal prompt search

Find text in the prompt with literal, case-sensitive `/` and `?` searches in NORMAL and Visual modes. Type `/timeout` and press Enter to move to the next match, then use `n` or `N` to repeat in the same or opposite direction. Counts and wraparound work across prompt lines; pasted blocks stay opaque.

The border shows the query. Backspace edits it, paste adds text to it, and Esc or `Ctrl-[` cancels without moving. Enter confirms without submitting the prompt. Searches don't change text, registers, undo, or dot repeat. Regex and operator search aren't supported; use Visual search followed by an operator to edit a selection.

*By @mavam in #9.*

### Manual prose reflow

You can now hard-wrap prose with `gq` and `gw`. Use `gwap` to reflow the current paragraph while keeping your place in its text, or `gqap` to move to its end. Both preserve blank paragraph separators. Motions, text objects, line forms (`gqq`, `gww`), counts, and Visual selections work too; formatting preserves the register and supports one-step undo and `.` repeat.

Set `"vimEditor": { "textWidth": 72 }` in Pi’s settings to wrap at 72 display columns. The default is a fixed 79 columns, independent of the editor’s width. Wrapping retains indentation, keeps long words intact, accounts for Unicode display width, and refuses whole operations touching pasted blocks. Formatting is manual only, without Markdown, comment, or filetype parsing.

*By @mavam in #7.*

### Paragraph navigation motions

You can now navigate paragraphs with `{` and `}` in NORMAL and Visual modes, using empty lines as boundaries. Use `2}` to move forward two boundaries, `d}` to delete up to the next boundary, or `c}` to rewrite that range. Counts work with delete, change, yank, and case operators; changes support undo and `.` repeat.

Consecutive empty lines form one separator run. Space/tab-only lines are content for these motions, unlike the existing `ip` and `ap` objects, whose behavior is unchanged. A count past the available boundaries does nothing. Paragraph motions do not interpret Markdown, nroff macros, or section markers.

*By @mavam in #6.*

### Paragraph text objects

You can now edit whole prose paragraphs with `ip` and `ap`. Use `cip` to rewrite an instruction block, `dap` to remove it with adjacent blank lines, or `yip` to copy its whole lines.

Paragraphs are separated by empty or space/tab-only lines. Counts work with the existing delete, change, yank, and case operators (`d2ap`, `2gUip`), and `vip` / `vap` start linewise Visual selections. Paragraph changes support repeat and undo; edits touching pasted blocks remain protected.

*By @mavam in #5.*
