/** Prose paragraphs, based on public Vim help and black-box checks. */
import type { Buffer, Pos, Range } from "./engine.js";
import { blank } from "./text.js";

/**
 * Exclusive paragraph motion: only literal empty lines are boundaries.
 * Skip the current empty run, then stop at the next one or the buffer edge.
 * EOF uses an exclusive end column; the caller clamps navigation by grapheme.
 * A count past either edge fails without moving partway.
 */
export function paragraphMotion(
  { lines, cursor }: Buffer,
  forward: boolean,
  count: number,
): Pos | undefined {
  const step = forward ? 1 : -1;
  const edge = forward ? lines.length - 1 : 0;
  let line = cursor.line;
  for (let n = 0; n < count; n++) {
    if (line === edge && n > 0) return undefined;
    while (line !== edge && lines[line] === "") line += step;
    while (line !== edge) {
      line += step;
      if (lines[line] === "") break;
    }
  }
  return { line, col: forward && line === edge ? lines[line].length : 0 };
}

type Run = { first: number; last: number; blank: boolean };

/**
 * Paragraph objects treat space/tab-only lines as separators (unlike Vim's
 * paragraph motions). Both text and separator runs are whole-line objects.
 * Paste markers are ordinary nonblank text here; the operator refuses them.
 * `direction` extends an existing Visual selection at its active end.
 * Extensions stop at the buffer boundary even when the count asks for more.
 */
export function paragraphObject(
  buf: Buffer,
  around: boolean,
  count = 1,
  direction?: 1 | -1,
): Range | undefined {
  const runs: Run[] = [];
  for (let line = 0; line < buf.lines.length; line++) {
    const separator = blank(buf.lines[line]);
    const previous = runs.at(-1);
    if (previous?.blank === separator) previous.last = line;
    else runs.push({ first: line, last: line, blank: separator });
  }
  const step = direction ?? 1;
  let start = runs.findIndex(
    (run) => run.first <= buf.cursor.line && buf.cursor.line <= run.last,
  );
  if (start < 0) return undefined;
  if (
    direction &&
    buf.cursor.line === (step === 1 ? runs[start].last : runs[start].first)
  )
    start += step;
  if (!runs[start]) return undefined;

  // ip counts alternating text/separator runs. ap counts pairs, except that
  // the separator after the final text run is optional at a buffer boundary.
  let end = start + step * (count * (around ? 2 : 1) - 1);
  if (around && !runs[start].blank && !runs[end] && runs[end - step])
    end -= step;
  if (!runs[end]) {
    if (!direction) return undefined;
    end = step === 1 ? runs.length - 1 : 0;
  }
  let first = Math.min(start, end);
  const last = Math.max(start, end);
  // A fresh ap on text prefers trailing separators, falling back to leading
  // ones only when the entire counted range reaches the last paragraph.
  if (
    around &&
    !direction &&
    !runs[start].blank &&
    !runs[end].blank &&
    runs[first - 1]?.blank
  )
    first--;
  return {
    from: { line: runs[first].first, col: 0 },
    to: { line: runs[last].last, col: 0 },
    linewise: true,
  };
}
