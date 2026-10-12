# Replace two timeout values, restore an overtyped character, repeat, and undo.
# Run `demo/record.sh replace` to regenerate demo/replace.gif.
# Uses the same isolated, offline Pi setup as demo/demo.tape.
# demo/record.sh supplies the output path with vhs -o.

Set Shell "bash"
Set FontFamily "FiraCode Nerd Font Mono"
Set FontSize 16
Set Width 1000
Set Height 560
Set Padding 12
Set Framerate 15
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"

Hide
Type `export HOME="$DEMO" PI_CODING_AGENT_DIR="$DEMO/.pi/agent" PS1='$ '` Enter
Type `alias pi='pi --no-extensions -e "$VIM_EDITOR/src/index.ts" -e "$VIM_EDITOR/demo/provider.ts" --no-session --offline --no-skills --no-context-files --no-prompt-templates --no-themes --model demo/sol'` Enter
Type `cd "$DEMO/parser" && clear` Enter
Show

Type "pi"
Enter
Sleep 2.5s

# Draft in INSERT, with two timeout values to correct.
Type "Set timeouts for the parser:"
Ctrl+J
Type "Read:  10 seconds"
Ctrl+J
Type "Write: 10 seconds"
Sleep 1s
Escape
Sleep 0.7s

# Move to the first value, then make the REPLACE label visible.
Type "ggjf1"
Sleep 0.8s
Type "R"
Sleep 1s

# Overshoot by one character: Backspace restores the space after 30.
Type "30x"
Sleep 1.5s
Backspace
Sleep 1.5s
Escape
Sleep 1s

# Repeat the whole replacement on the second value, including Backspace.
Type "j0f1"
Sleep 0.8s
Type "."
Sleep 0.4s
Type "$"
Sleep 1.6s

# One undo restores only the second value; the first stays at 30.
Type "u"
Sleep 0.4s
Type "$"
Sleep 2.6s
