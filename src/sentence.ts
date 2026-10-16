// SPDX-License-Identifier: MIT AND Vim
//
// Derived from findsent() in Vim's src/textobject.c (Vim 9.2, commit
// 5a9a0518b153b8571ff4d55c5727b72341080cef), modified and translated to
// TypeScript. The Vim parts are under the Vim license, included unmodified in
// licenses/Vim-LICENSE.txt; the changes are MIT. See THIRD_PARTY_NOTICES.md.

/**
 * Sentence motions `(` and `)`, following Vim's rules (`:help sentence`) and
 * its behavior, including at the edges of the buffer.
 *
 * A sentence ends at `.`, `!`, or `?`, followed by any number of closing
 * `)`, `]`, `"`, or `'`, and then a space, a tab, or the end of a line. The
 * next sentence starts at the first non-blank after that, unless an empty
 * line comes first. Empty lines separate paragraphs, which also start new
 * sentences. Positions are grapheme clusters; a paste marker is one cluster
 * that is never punctuation.
 */

import type { Pos } from "./engine.js";
import { clusters } from "./text.js";

const ENDS = new Set(".!?");
const CLOSERS = new Set(")]\"'");
const BLANKS = new Set(" \t");

/** A cluster on a line; `i` at the line's length is the end of the line. */
type Cell = { line: number; i: number };

const same = (a: Cell, b: Cell) => a.line === b.line && a.i === b.i;

/**
 * Where `count` sentences forward or backward from `cursor` start, or
 * undefined if the count runs past the buffer. As in Vim, only the last step
 * may run off the last sentence to the end of the buffer, or off the first
 * one to its start.
 */
export function sentence(
  lines: readonly string[],
  cursor: Pos,
  forward: boolean,
  count: number,
  pastes?: ReadonlySet<number>,
): Pos | undefined {
  const spans = lines.map((text) => clusters(text, pastes));
  const chars = lines.map((text, n) =>
    spans[n].map((s) =>
      // Only a cluster's first character counts; a paste marker is opaque.
      s.end - s.start > 1 && text.startsWith("[paste #", s.start)
        ? ""
        : String.fromCodePoint(text.codePointAt(s.start) ?? 0),
    ),
  );
  const last = lines.length - 1;
  const empty = (line: number) => chars[line].length === 0;
  const charAt = (c: Cell): string | undefined => chars[c.line][c.i];
  const top: Cell = { line: 0, i: 0 };
  const bottom: Cell = { line: last, i: chars[last].length };

  /** The cluster after `c`, across line ends; empty lines count. */
  const after = (c: Cell): Cell | undefined => {
    if (c.i + 1 < chars[c.line].length) return { line: c.line, i: c.i + 1 };
    return c.line < last ? { line: c.line + 1, i: 0 } : undefined;
  };
  /** The cluster before `c`, across line ends; empty lines count. */
  const before = (c: Cell): Cell | undefined => {
    if (c.i > 0) return { line: c.line, i: c.i - 1 };
    if (c.line === 0) return undefined;
    return { line: c.line - 1, i: Math.max(0, chars[c.line - 1].length - 1) };
  };

  /** The first non-blank from a cell on, stopping at an empty line. */
  const nonBlank = (c: Cell): Cell => {
    let { line, i } = c;
    for (;;) {
      while (i < chars[line].length && BLANKS.has(chars[line][i])) i++;
      if (i < chars[line].length || line === last) return { line, i };
      line++;
      i = 0;
      if (empty(line)) return { line, i };
    }
  };

  /** If a sentence ends at `c`, where the next one starts. */
  const endsAt = (c: Cell): Cell | undefined => {
    const row = chars[c.line];
    if (!ENDS.has(row[c.i])) return undefined;
    let j = c.i + 1;
    while (j < row.length && CLOSERS.has(row[j])) j++;
    if (j < row.length && !BLANKS.has(row[j])) return undefined;
    return nonBlank({ line: c.line, i: j });
  };

  const punctuation = (c?: string) =>
    c !== undefined && (ENDS.has(c) || CLOSERS.has(c));
  /**
   * Blanks, one sentence end, and closers after it just before a sentence
   * still belong to the sentence they end, so a search starts in front of
   * them. Moving forward, an empty line stops this.
   */
  const backOver = (c: Cell): Cell => {
    let dot = false;
    for (;;) {
      const char = charAt(c);
      if (char === undefined || !(BLANKS.has(char) || punctuation(char)))
        return c;
      const prior = before(c);
      if (!prior || (forward && empty(prior.line)) || dot) return c;
      dot = ENDS.has(char);
      if (CLOSERS.has(char) && !punctuation(charAt(prior))) return c;
      c = prior;
    }
  };

  /** One step from `from`; undefined when it runs off the buffer. */
  const step = (from: Cell): Cell | undefined => {
    if (forward && empty(from.line)) {
      // Past the empty lines, to where the next paragraph starts.
      let line = from.line;
      while (line < last && empty(line)) line++;
      return empty(line) ? { line, i: 0 } : nonBlank({ line, i: 0 });
    }
    let c: Cell = from;
    if (!forward) {
      // Look before the cursor, or before the empty lines it's on.
      if (empty(c.line)) {
        while (c.line > 0 && empty(c.line)) c = before(c) as Cell;
      } else c = before(c) ?? c;
    }
    c = backOver(c);
    const home = c.line;
    for (;;) {
      if (empty(c.line))
        return forward || c.line === home
          ? { line: c.line, i: 0 }
          : nonBlank({ line: c.line + 1, i: 0 });
      const start = endsAt(c);
      if (start) return start;
      const next = forward ? after(c) : before(c);
      if (!next) return undefined;
      c = next;
    }
  };

  const row = spans[cursor.line];
  let i = row.findIndex((s) => cursor.col < s.end);
  if (i === -1) i = Math.max(0, row.length - 1);
  let pos: Cell = { line: cursor.line, i };
  for (let k = 0; k < count; ) {
    const final = k === count - 1;
    const next = step(pos);
    if (!next) {
      if (!final) return undefined;
      pos = forward ? bottom : top;
      break;
    }
    if (same(next, pos)) {
      // Stuck at a sentence start: move one cluster and look again.
      const moved = forward ? after(pos) : before(pos);
      if (!moved) {
        if (!final) return undefined;
        pos = forward ? bottom : pos;
        break;
      }
      pos = moved;
      continue;
    }
    pos = next;
    k++;
  }
  return {
    line: pos.line,
    col: spans[pos.line][pos.i]?.start ?? lines[pos.line].length,
  };
}
