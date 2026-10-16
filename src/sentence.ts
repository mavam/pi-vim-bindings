/**
 * Sentence motions `(` and `)`, written from Vim's documented behavior
 * (`:help sentence`) and black-box comparisons with Vim.
 *
 * The prompt is flattened into a list of stops: one per grapheme cluster, one
 * for the end of each non-empty line, and one for each empty line. A paste
 * marker is a single stop that is never punctuation.
 */

import type { Pos } from "./engine.js";
import { clusters } from "./text.js";

type Kind = "blank" | "eol" | "empty" | "end" | "close" | "other";
type Stop = Pos & { kind: Kind };

const ENDS = new Set([".", "!", "?"]);
const CLOSERS = new Set([")", "]", '"', "'"]);

function kindOf(cluster: string, marker: boolean): Kind {
  if (marker) return "other";
  // Vim looks at the base character, so a combining mark doesn't hide it.
  const base = String.fromCodePoint(cluster.codePointAt(0) ?? 0);
  if (base === " " || base === "\t") return "blank";
  if (ENDS.has(base)) return "end";
  if (CLOSERS.has(base)) return "close";
  return "other";
}

function stopsOf(lines: readonly string[], pastes?: ReadonlySet<number>) {
  const stops: Stop[] = [];
  lines.forEach((text, line) => {
    if (!text) {
      stops.push({ line, col: 0, kind: "empty" });
      return;
    }
    for (const span of clusters(text, pastes)) {
      const cluster = text.slice(span.start, span.end);
      const marker =
        span.end - span.start > 1 && cluster.startsWith("[paste #");
      stops.push({ line, col: span.start, kind: kindOf(cluster, marker) });
    }
    stops.push({ line, col: text.length, kind: "eol" });
  });
  return stops;
}

/** Spaces, tabs, and line ends separate sentences; empty lines don't count. */
const white = (stop: Stop) => stop.kind === "blank" || stop.kind === "eol";

/**
 * If stop `i` ends a sentence, the stop where the next one starts: the first
 * stop after the closers and white, or the last stop if only white follows.
 * A sentence ends at `.`, `!`, or `?`, then closers on the same line, then
 * white.
 */
function ending(stops: Stop[], i: number) {
  if (stops[i]?.kind !== "end") return undefined;
  let j = i + 1;
  while (stops[j].kind === "close") j++;
  if (!white(stops[j])) return undefined;
  while (j < stops.length - 1 && white(stops[j])) j++;
  return j;
}

/**
 * The sentence starts of the prompt, as sorted stop indices. Moving forward
 * lands on the first line of a run of empty lines, and moving backward on
 * its last line, so each direction has its own list. `first` is where `(`
 * stops at the start of the prompt.
 */
function startsOf(stops: Stop[]) {
  // Maps the stop where a sentence starts to the stop the cursor lands on.
  const forward = new Map<number, number>();
  const backward = new Map<number, number>();
  const both = (i: number) => {
    forward.set(i, i);
    backward.set(i, i);
  };
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].kind === "empty") {
      let last = i;
      while (stops[last + 1]?.kind === "empty") last++;
      forward.set(i, i);
      backward.set(last, last);
      // The text after empty lines starts a sentence too.
      let j = last + 1;
      while (j < stops.length && white(stops[j])) j++;
      if (j < stops.length && stops[j].kind !== "empty") {
        // Blanks in front of it count as part of it.
        forward.set(last + 1, j);
        backward.set(last + 1, j);
      }
      i = last;
    } else {
      const j = ending(stops, i);
      if (j !== undefined && stops[j].kind !== "empty") both(j);
    }
  }
  const sorted = (map: Map<number, number>) =>
    [...map].sort(([x], [y]) => x - y);
  return {
    forward: sorted(forward),
    backward: sorted(backward),
    first: ending(stops, 0) ?? 0,
  };
}

/**
 * Walks back from `i` while the stops are of the given kinds, and returns the
 * index of the first stop that isn't, or -1. Line ends are skipped, so a line
 * that starts with closers continues the sentence end above it.
 */
function back(stops: Stop[], i: number, kinds: readonly Kind[]) {
  let j = i;
  while (j >= 0 && (stops[j].kind === "eol" || kinds.includes(stops[j].kind)))
    j--;
  return j;
}

/** The stop holding `pos`, or the line end past the last cluster. */
function indexOf(stops: Stop[], pos: Pos) {
  let found = 0;
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (stop.line > pos.line) break;
    if (stop.line === pos.line && stop.col > pos.col) break;
    found = i;
  }
  return found;
}

/**
 * Moves `count` sentences forward or backward from `cursor`. Returns the
 * position to move to, which may be the end of the last line, or undefined if
 * the motion fails because it runs past the start or end of the prompt.
 */
export function sentence(
  lines: readonly string[],
  cursor: Pos,
  forward: boolean,
  count: number,
  pastes?: ReadonlySet<number>,
): Pos | undefined {
  const stops = stopsOf(lines, pastes);
  const starts = startsOf(stops);
  let i = indexOf(stops, cursor);
  // A sentence boundary at EOF (or an empty line at BOF) and the buffer
  // edge consume separate counts, even though their positions coincide.
  let terminalBoundary = false;
  let backwardBoundary = i === 0 && stops[i].kind === "empty";
  for (let k = 0; k < count; k++) {
    if (forward && i === stops.length - 1) {
      if (k > 0 && !terminalBoundary) return undefined;
      terminalBoundary = false;
      continue;
    }
    const step = forward ? next(stops, starts.forward, i) : undefined;
    const to = step?.to ?? previous(stops, starts.backward, starts.first, i);
    terminalBoundary = step?.boundary ?? false;
    // A fresh motion may stay at BOF; further counts need an unconsumed
    // empty-line boundary. Some leading punctuation instead moves forward.
    if (!forward && i === 0 && to === 0) {
      if (k > 0 && !backwardBoundary) return undefined;
      backwardBoundary = false;
    } else if (!forward) {
      backwardBoundary = to === 0 && stops[to].kind === "empty";
    }
    i = to;
  }
  const { line, col } = stops[i];
  return { line, col };
}

type Starts = [at: number, land: number][];

function next(stops: Stop[], starts: Starts, i: number) {
  let from = i;
  if (stops[i].kind === "empty") {
    // From inside a run of empty lines, the run counts as one stop.
    while (stops[from + 1]?.kind === "empty") from++;
  } else {
    // In the closers and blanks after a sentence's end, `)` goes to the start
    // that follows that end, even if that is where the cursor already is.
    from = continued(stops, i) ?? endBefore(stops, i) ?? i;
  }
  const start = starts.find(([at]) => at > from);
  return {
    to: start?.[1] ?? stops.length - 1,
    boundary: start !== undefined || stops[i].kind === "empty",
  };
}

/**
 * The `.`, `!`, or `?` ending a sentence, if `i` is on it or on the closers
 * and white after it.
 */
function endBefore(stops: Stop[], i: number) {
  let j = white(stops[i]) ? back(stops, i, ["blank"]) : i;
  while (
    stops[j]?.kind === "close" &&
    stops[j - 1]?.kind !== "eol" &&
    stops[j - 1]?.kind !== "empty"
  )
    j--;
  return ending(stops, j) !== undefined ? j : undefined;
}

/**
 * Vim keeps a sentence end going onto the next line when that line starts
 * with one more `.`, `!`, `?`, or closer (the lead), followed by closers or
 * blanks. For the cursor on that continuation, returns the end on the line
 * above. A lead alone on its line before empty lines continues into them.
 */
function continued(stops: Stop[], i: number) {
  const lineStart = (k: number) => {
    while (k > 0 && stops[k - 1].line === stops[k].line) k--;
    return k;
  };
  // Whether the stops from `from` through `i` are closers, then blanks.
  const trailing = (from: number) => {
    let j = from;
    while (j <= i && (stops[j].kind === "close" || stops[j].kind === "eol"))
      j++;
    while (j <= i && (stops[j].kind === "blank" || stops[j].kind === "eol"))
      j++;
    return j > i;
  };
  const punctuation = (k: number) =>
    stops[k]?.kind === "end" || stops[k]?.kind === "close";
  // Find the earliest lead whose closers and blanks extend to the cursor,
  // including continuations spanning several lines.
  let lead = lineStart(i);
  let found: number | undefined;
  while (lead >= 0) {
    const end =
      punctuation(lead) && trailing(lead + 1) ? endAbove(lead) : undefined;
    if (end !== undefined) found = end;
    if (lead === 0 || (end === undefined && !trailing(lead))) break;
    lead = lineStart(lead - 1);
  }
  return found;

  // For a lead, the end on the line above it that it continues.
  function endAbove(lead: number) {
    if (stops[lead - 1]?.kind !== "eol") return undefined;
    let end = lead - 2;
    while (stops[end]?.kind === "close" && end > lineStart(lead - 1)) end--;
    if (stops[end]?.kind !== "end") return undefined;
    if (stops[lead].kind === "end" && end !== lead - 2) return undefined;
    let after = lead + 1;
    while (stops[after]?.kind === "eol") after++;
    const next = stops[after]?.kind;
    if (next === "close" || next === "blank") return end;
    if (next === "empty" && stops[lead + 1].kind === "eol") {
      while (stops[after + 1]?.kind === "empty") after++;
      return after;
    }
    // A bare terminator at the start of the next line isn't a new end
    // when moving from that lead: skip the start it would otherwise create.
    if (i === lead && stops[lead].kind === "end") {
      if (
        stops[after]?.kind === "end" &&
        (stops[after + 1]?.kind === "blank" ||
          stops[after + 1]?.kind === "close")
      )
        return after - 1;
      return ending(stops, lead);
    }
    return undefined;
  }
}

function previous(stops: Stop[], starts: Starts, first: number, i: number) {
  let before = i;
  // From inside a run of empty lines, the run counts as one stop.
  while (stops[before].kind === "empty" && stops[before - 1]?.kind === "empty")
    before--;
  // Right after a sentence's end, `(` goes to that sentence's start. Right
  // after punctuation that follows empty lines, it goes to the empty lines.
  const blanks = back(stops, before - 1, ["blank"]);
  const end = back(stops, blanks, ["close"]);
  let limit = before - 1;
  if (stops[end]?.kind === "end") {
    if (stops[end - 1]?.kind === "empty") limit = end - 1;
    else if (ending(stops, end) !== undefined) limit = end;
  }
  let found = first;
  for (const [, land] of starts) if (land <= limit) found = land;
  return found;
}
