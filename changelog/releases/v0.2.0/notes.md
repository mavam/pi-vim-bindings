Pi Vim Editor now has Replace mode, Ctrl-R redo, and the "+ and "\* registers for using the system clipboard both ways. You can also show the editing mode through the cursor shape.

## 🚀 Features

### Cursor shapes per editing mode

You can now show the editing mode through the cursor shape: a bar in INSERT, a block in NORMAL and Visual modes, and an underline in REPLACE. Enable it alongside Pi's hardware cursor in `settings.json`:

```json
{
  "showHardwareCursor": true,
  "vimEditor": { "cursorShape": true }
}
```

Cursor shapes are off by default and require a terminal that supports them. The extension resets the shape when the prompt loses focus, Pi yields the terminal, or the extension shuts down or reloads. Visual selections remain highlighted.

*By @mavam.*

### Redo with Ctrl-R

Press `Ctrl-R` in NORMAL mode to redo what `u` undid. The cursor lands where the redone change starts, and any new edit forgets what can be redone.

*By @mavam.*

### Replace mode

Press `R` in NORMAL mode to overwrite text: each typed character replaces the one under the cursor, and Backspace puts back what it replaced. One `u` undoes the whole change, and `.` repeats it. The border shows `REPLACE`.

*By @mavam.*

### System clipboard registers

Prefix a command with `"+` or `"*` to use the system clipboard: `"+yy`, `"+dd`, or `"+y` on a Visual selection copy to it, and `"+p` puts what it holds in NORMAL mode. Your own copies keep their line or block shape, and text from elsewhere that ends in a line break puts as whole lines. Plain `p` keeps using the internal register.

*By @mavam.*
