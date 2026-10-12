Pi Vim Editor brings Vim's INSERT, NORMAL, and Visual modes to Pi's prompt editor. It adds them to whatever editor is installed, so Pi's inline working indicator and other editor extensions keep working.

## 🚀 Features

### Vim modes for the prompt editor

Pi's prompt editor now has Vim modes. Press `Esc` for NORMAL mode and edit the prompt with Vim motions, operators, and text objects, such as `w`, `ge`, `%`, `dw`, `ciw`, `ci"`, `da(`, `gUiw`, `yy`, `p`, `J`, and `>>`, with counts. `u` undoes a whole change such as `ciwfoo<Esc>` in one step, `.` repeats it, and yanks also go to the system clipboard. `ZZ` or `:q` quit Pi when the prompt is empty. Press `Esc` again in NORMAL mode to interrupt the agent as usual.

Press `v`, `V`, or `Ctrl-V` to select characters, lines, or a block. The selection shows in reverse video; `d`, `c`, `y`, `p`, `r`, `J`, `>`, `~`, and text objects such as `viw` work on it. In a block, `I` and `A` insert or append text on every line, and `$` extends the block to each line's end.

Instead of replacing Pi's editor, the extension adds the modes to whatever editor is installed. Pi's inline working indicator, autocomplete, paste handling, and editors from other extensions keep working. The current mode shows in a corner of the editor border; `vimEditor.indicator` in Pi's settings picks the corner.

*By @mavam.*
