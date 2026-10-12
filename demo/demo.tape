# The README demo: write a prompt, fix it up in NORMAL, Visual block, and
# Visual mode, and submit it. Run `demo/record.sh` from anywhere to regenerate
# demo/vim.gif.
#
# pi runs with DEMO as its HOME, offline, and with demo/provider.ts as its
# only model provider, so the recording shows neither personal settings nor
# accounts, and nothing is sent anywhere.

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

# A first draft, with a typo, in INSERT mode.
Type "Revew the parser changes and list risks"
Ctrl+J
Type "parser.ts"
Ctrl+J
Type "lexer.ts"
Ctrl+J
Type "tests.ts"
Sleep 1s

# NORMAL mode: turn the file names into a list with Visual block insert.
Escape
Sleep 0.8s
Type "gg"
Sleep 0.4s
Type "j0"
Sleep 0.4s
Ctrl+V
Sleep 0.4s
Type "jj"
Sleep 1s
Type "I"
Sleep 0.4s
Type "- "
Sleep 0.6s
Escape
Sleep 1.2s

# Fix the typo: change the word under the cursor.
Type "gg0"
Sleep 0.5s
Type "ciw"
Sleep 0.5s
Type "Review"
Escape
Sleep 1s

# Visual mode: select the end of the sentence and change it.
Type "4w"
Sleep 0.6s
Type "v$"
Sleep 1.2s
Type "c"
Sleep 0.4s
Type "for error handling risks"
Sleep 0.4s
Escape
Sleep 1.2s

# Submit. Pi's working indicator stays in the editor border.
Enter
Sleep 2.5s
Wait+Screen@30s /neither path is covered/
Sleep 3s
