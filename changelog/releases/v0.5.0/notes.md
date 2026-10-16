Navigate and edit whole sentences with Vim-style motions and text objects, including counted, repeatable sentence changes. Backtick text objects let you edit inline code, and multiline deletes and case changes now behave more like Vim.

## 🚀 Features

### Backtick text objects

You can now edit backtick-quoted text with `` i` `` and `` a` `` in NORMAL and Visual modes. For example, with the cursor inside `` `src/old.ts` ``, `` ci` `` clears the path and enters INSERT mode while keeping the backticks.

Backtick objects support delete, change, yank, and case changes, using the same single-line pairing as single and double quotes. They don't interpret Markdown multi-backtick spans or fences.

*By @mavam in #4.*

### Sentence motions

NORMAL and Visual mode now support Vim's sentence motions: `)` moves forward to the start of the next sentence and `(` moves back to the start of the current or previous one. They take counts and work with every operator, so you can rewrite a prompt one sentence at a time:

- `d)` deletes from the cursor to the next sentence, or through the end of the last one
- `c2)` changes the next two sentences, and `y(`, `gu)`, and `gU)` work too
- `v)` extends a Visual selection by a sentence
- `.` repeats a sentence edit, and `u` undoes it in one step

A sentence ends at `.`, `!`, or `?`, optionally followed by closing `)`, `]`, `"`, or `'`, and then a space, a tab, or the end of a line. Empty lines separate sentences too. Pasted blocks count as a single character, and edits that would cut into one are refused.

*By @mavam in #2.*

### Sentence text objects

You can now edit a whole sentence from anywhere inside it with `is` (inner sentence) and `as` (a sentence with adjacent whitespace). Use `cis` to rewrite the current sentence, `d2as` to delete two sentences, or `vis` to select one—even across lines.

Both objects work with delete, change, yank, and case operators, accept counts, and extend Visual selections. Sentence changes support `.` repeat and single-step undo. Pasted blocks remain opaque, and operations that touch them are refused.

*By @mavam in #3.*

## 🐞 Bug fixes

### Vim-like multi-line deletes and case changes

Deletes and case changes across lines now match Vim in a few more cases:

- Deleting a Visual selection that spans lines keeps the line break after it. Previously, `vjld` from the start of a line deleted the lines entirely. Selecting an empty line includes its line break.
- A delete with a motion that starts in the indent and leaves only blanks on its last line removes the lines entirely, and a motion from a line of only blanks to the start of a later line works on whole lines. After a whole-line delete leaves a line of only blanks, the cursor lands on its last blank.
- After `gu` or `gU` with a motion that starts on an empty line, such as `gUj`, the cursor stays where the change starts instead of jumping to the next line. Whole-line case changes preserve the cursor column.

*By @mavam in #2.*
