/** Manual prose wrapping, from public Vim help and black-box observations. */
import type { Buffer, Pos } from "./engine.js";
import { blank, clusters, firstNonBlank, width } from "./text.js";

/** A fixed width, deliberately independent of the editor's viewport. */
export function textWidth(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 79;
}

/** Reflow whole lines, retaining blank separators and tracking the cursor's text. */
export function reflow(buf: Buffer, first: number, last: number) {
  const lines: string[] = [];
  let cursor: Pos | undefined;
  const measure = buf.measure ?? width;
  const columns = (text: string, start = 0) => {
    let col = start;
    for (const span of clusters(text)) {
      const char = text.slice(span.start, span.end);
      col += char === "\t" ? 8 - (col % 8) : measure(char);
    }
    return col;
  };
  const limit = textWidth(buf.textWidth);
  for (let n = first; n <= last; ) {
    if (blank(buf.lines[n])) {
      if (n === buf.cursor.line)
        cursor = { line: first + lines.length, col: buf.cursor.col };
      lines.push(buf.lines[n++]);
      continue;
    }
    const indent = /^[ \t]*/.exec(buf.lines[n])?.[0] ?? "";
    let row = indent;
    let used = columns(indent);
    let words = 0;
    while (n <= last && !blank(buf.lines[n])) {
      const source = buf.lines[n];
      let end = 0;
      for (const match of source.matchAll(/[^ \t]+/g)) {
        const word = match[0];
        const gap = words ? (end ? source.slice(end, match.index) : " ") : "";
        const next = columns(word, columns(gap, used));
        const wrap = words > 0 && next > limit;
        // A cursor in whitespace removed at a wrap stays on the preceding
        // character; a cursor inside a word follows that word to its new line.
        if (n === buf.cursor.line && buf.cursor.col < match.index && !cursor)
          cursor = {
            line: first + lines.length,
            col: !words
              ? Math.min(buf.cursor.col, indent.length)
              : wrap
                ? Math.max(0, row.length - 1)
                : row.length + Math.min(buf.cursor.col - end, gap.length),
          };
        if (wrap) {
          lines.push(row);
          row = indent;
          used = columns(indent);
          words = 0;
        }
        if (words) row += gap;
        if (
          n === buf.cursor.line &&
          buf.cursor.col >= match.index &&
          buf.cursor.col < match.index + word.length
        )
          cursor = {
            line: first + lines.length,
            col: row.length + buf.cursor.col - match.index,
          };
        row += word;
        used = columns(word, words ? columns(gap, used) : used);
        words++;
        end = match.index + word.length;
      }
      if (n === buf.cursor.line && !cursor)
        cursor = {
          line: first + lines.length,
          col: Math.max(0, row.length - 1),
        };
      n++;
    }
    lines.push(row);
  }
  if (!cursor) {
    const delta = lines.length - (last - first + 1);
    cursor = {
      ...buf.cursor,
      line: buf.cursor.line > last ? buf.cursor.line + delta : buf.cursor.line,
    };
  }
  const end = lines.length - 1;
  return {
    lines,
    cursor,
    end: { line: first + end, col: firstNonBlank(lines[end]) },
  };
}
