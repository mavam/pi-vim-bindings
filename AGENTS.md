# pi-vim-editor

`pi-vim-editor` adds minimal Vim-style modal editing to Pi's prompt editor
by decorating whatever editor is installed instead of replacing it. See
`docs/design.md` for the architecture and `docs/ux.md` for the supported keys.

## Setup

Install Lefthook once per clone:

```bash
uvx lefthook install
```

Pushing runs the quality gates automatically. You don't need to run checks
manually.

## Tests

- Test documented guarantees and user-visible behavior, about one test each.
- Engine behavior uses table tests of buffer, keys, and expected buffer.
- Editor integration tests use a real `CustomEditor` with a stub TUI, not
  fakes of Pi internals.
- Delete tests together with the behavior they cover.

## Release engineering

- Use `tenzir-ship` for changelog management and releasing.
- Add changelog entries for user-facing changes.
- Before releasing, ensure `main` is in sync with `origin/main`.
- To release, dispatch `.github/workflows/release.yaml` with a title and
  introduction.
