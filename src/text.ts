/** Pure text helpers: grapheme clusters, character classes, paste markers. */

export type Span = { start: number; end: number };

/** Character class: blank, punctuation, word, or paste marker. */
export type Class = 0 | 1 | 2 | 3;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const MARKER = /\[paste #(\d+)( (\+\d+ lines|\d+ chars))?\]/g;

/** Paste marker spans on a line. Without `pastes`, every match counts. */
export function markers(line: string, pastes?: ReadonlySet<number>): Span[] {
  const spans: Span[] = [];
  for (const match of line.matchAll(MARKER))
    if (!pastes || pastes.has(Number(match[1])))
      spans.push({ start: match.index, end: match.index + match[0].length });
  return spans;
}

/** Grapheme clusters of a line; a paste marker is a single cluster. */
export function clusters(line: string, pastes?: ReadonlySet<number>): Span[] {
  const spans = markers(line, pastes);
  const result: Span[] = [];
  let m = 0;
  for (const { index, segment } of segmenter.segment(line)) {
    while (m < spans.length && spans[m].end <= index) m++;
    const marker = spans[m];
    if (marker && index >= marker.start) {
      if (index === marker.start) result.push({ ...marker });
      continue;
    }
    result.push({ start: index, end: index + segment.length });
  }
  return result;
}

export function classify(cluster: string): Class {
  if (cluster.length > 1 && cluster.startsWith("[paste #")) return 3;
  if (/^\s+$/.test(cluster)) return 0;
  if (/^[\p{L}\p{N}\p{M}_]/u.test(cluster)) return 2;
  return 1;
}

/** Column of the first non-blank character, or 0. */
export function firstNonBlank(line: string): number {
  const span = clusters(line).find(
    (c) => !/^\s+$/.test(line.slice(c.start, c.end)),
  );
  return span?.start ?? 0;
}

/** Whether `[start, end)` overlaps a paste marker. */
export function touchesMarker(
  line: string,
  start: number,
  end: number,
  pastes?: ReadonlySet<number>,
): boolean {
  return markers(line, pastes).some(
    (span) => span.start < end && start < span.end,
  );
}

const WIDE =
  /^(?:\p{Emoji_Presentation}|\p{Regional_Indicator}|[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{3FFFD}])/u;

/**
 * Terminal columns a cluster takes: 2 for wide characters, else 1. A fallback
 * for when the host doesn't pass its own measure (see `Buffer.measure`).
 */
export function width(cluster: string): number {
  if (cluster.length > 1 && cluster.startsWith("[paste #"))
    return cluster.length;
  return WIDE.test(cluster) ? 2 : 1;
}
