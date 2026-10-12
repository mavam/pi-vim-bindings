#!/usr/bin/env bash
# Regenerates a README demo: demo/record.sh [vim|replace].
#
# Needs nix, which provides vhs and gifsicle, plus pi on the PATH.
set -euo pipefail

cd "$(dirname "$0")/.."
demo=${1:-vim}
case "$demo" in
  vim) tape=demo/demo.tape ;;
  replace) tape=demo/replace.tape ;;
  *) echo "Usage: $0 [vim|replace]" >&2; exit 2 ;;
esac
nix="nix --extra-experimental-features nix-command --extra-experimental-features flakes"
work=$(mktemp -d)
# Resolve macOS's /tmp symlink so pi can shorten the throwaway HOME to `~`.
work=$(cd "$work" && pwd -P)
trap 'rm -rf "$work"' EXIT

export VIM_EDITOR="$PWD"
export DEMO="$work/home"
mkdir -p "$DEMO/.pi/agent" "$DEMO/parser"
printf '%s\n' '{ "theme": "dark", "quietStartup": "header" }' \
  > "$DEMO/.pi/agent/settings.json"

$nix run nixpkgs#vhs -- "$tape" -o "$work/recording.gif"
$nix run nixpkgs#gifsicle -- -O3 --lossy=80 --colors 128 "$work/recording.gif" -o "demo/$demo.gif"

ls -lh "demo/$demo.gif"
