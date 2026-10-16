# Third-party notices

pi-vim-editor is licensed under the [MIT License](LICENSE), except for the
code described below.

## Vim

`src/sentence.ts`, which implements the sentence motions `(` and `)`, is
derived from `findsent()` in Vim's `src/textobject.c`:

- Upstream: <https://github.com/vim/vim>
- Version: Vim 9.2, commit `5a9a0518b153b8571ff4d55c5727b72341080cef`
- File: <https://github.com/vim/vim/blob/5a9a0518b153b8571ff4d55c5727b72341080cef/src/textobject.c>
- License: [Vim license](licenses/Vim-LICENSE.txt), included unmodified

It is a modified version of that code. The changes:

- Translated from C to TypeScript, and returns a position instead of moving
  Vim's cursor.
- Works on grapheme clusters, treats a paste marker
  (`[paste #1 +24 lines]`) as one cluster that is never punctuation, and
  treats only spaces and tabs as blanks.
- Only empty lines separate paragraphs: nroff macros (`'paragraphs'`,
  `'sections'`), form feeds, and the `J` flag of `'cpoptions'` aren't
  supported.

As section II.2.c of the Vim license requires, the complete source code of
these changes ships with every copy of the package, in `src/sentence.ts`.
The changes are licensed under the MIT License, which doesn't restrict
anyone from making their own changes to Vim. To ask about the changes, open an
issue at <https://github.com/mavam/pi-vim-editor/issues>.

The derived file is therefore subject to both licenses (SPDX:
`MIT AND Vim`). Everything else in this package is MIT only.
