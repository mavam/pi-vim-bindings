import { expect, test } from "bun:test";
import {
  apply,
  type Buffer,
  type Effect,
  esc,
  press,
  type State,
  searchInput,
} from "../src/engine.ts";

function run(before: string, keys: string[], pastes?: ReadonlySet<number>) {
  const lines = before.split("\n");
  const line = lines.findIndex((text) => text.includes("|"));
  let buf: Buffer = {
    lines: lines.map((text) => text.replace("|", "")),
    cursor: { line, col: lines[line].indexOf("|") },
    pastes,
  };
  let state: State = { mode: "normal", keys: [] };
  const effects: Effect[] = [];
  for (const key of keys) {
    const result =
      key === "<enter>"
        ? searchInput(state, "confirm", buf)
        : key === "<esc>"
          ? esc(state, buf)
          : key === "<bs>"
            ? searchInput(state, "backspace", buf)
            : press(state, key, buf, undefined);
    state = result.state;
    effects.push(...result.effects);
    buf = apply(buf, result.effects);
  }
  const text = buf.lines
    .map((text, row) =>
      row === buf.cursor.line
        ? `${text.slice(0, buf.cursor.col)}|${text.slice(buf.cursor.col)}`
        : text,
    )
    .join("\n");
  return { text, state, effects };
}

test.each([
  ["|foo Foo foo", ["/", "foo", "<enter>"], "foo Foo |foo"],
  ["foo Foo |foo", ["?", "foo", "<enter>"], "|foo Foo foo"],
  ["|a.* aZZ a.*", ["/", "a.*", "<enter>"], "a.* aZZ |a.*"],
  ["|aaa", ["/", "aa", "<enter>"], "a|aa"],
  ["|a a a", ["2", "/", "a", "<enter>"], "a a |a"],
  ["|a a a", ["/", "a", "<enter>", "4", "n"], "a a |a"],
  ["|a a a", ["?", "a", "<enter>", "N", "n"], "a a |a"],
  ["|a a a", ["/", "a", "<enter>", "?", "<enter>", "n"], "a a |a"],
  ["|a a a", ["/", "a", "<enter>", "/", "x", "<esc>", "n"], "a a |a"],
  ["|a\nb\na\nb", ["/", "a\nb", "<enter>"], "a\nb\n|a\nb"],
  ["|a\n\nb", ["/", "\n", "<enter>"], "a\n|\nb"],
  ["|a é e", ["/", "e", "<enter>"], "a é |e"],
  ["|a é é", ["/", "é", "<enter>"], "a |é é"],
  ["|a 👩‍💻 👩", ["/", "👩", "<enter>"], "a 👩‍💻 |👩"],
  ["|a 👩‍💻", ["/", "💻", "<enter>"], "|a 👩‍💻"],
  ["|a z", ["/", "é", "<bs>", "z", "<enter>"], "a |z"],
  [
    "|a [paste #1 +3 lines] paste",
    ["/", "paste", "<enter>"],
    "a [paste #1 +3 lines] |paste",
  ],
  ["|a [paste #1] z", ["/", "[paste #1]", "<enter>"], "|a [paste #1] z"],
  ["|a [paste #1] z", ["/", "a [paste #1] z", "<enter>"], "|a [paste #1] z"],
  ["|a a", ["f", "a", "/", "a", "<enter>", ";"], "a |a"],
  ["|a / a", ["f", "/"], "a |/ a"],
])("literal search: %s %j", (before, keys, expected) => {
  const result = run(before, keys);
  expect(result.text).toBe(expected);
  expect(
    result.effects.every(
      (effect) => effect.kind === "move" || effect.kind === "message",
    ),
  ).toBe(true);
});

test("search reports wrap and failure without changing the cursor; an accepted miss is remembered", () => {
  expect(run("|a", ["/", "a", "<enter>"]).effects).toContainEqual({
    kind: "message",
    text: "Search wrapped around the prompt.",
  });
  const missed = run("|a", ["/", "z", "<enter>"]);
  expect(missed.text).toBe("|a");
  expect(missed.state.search).toEqual({ text: "z", direction: 1 });
  expect(missed.effects).toEqual([
    { kind: "message", text: "Search: no match in the prompt." },
  ]);
  for (const keys of [["/", "<enter>"], ["n"], ["N"]]) {
    expect(run("|a", keys).effects).toEqual([
      { kind: "message", text: "No previous search." },
    ]);
  }
});

test("only registered paste markers are opaque", () => {
  expect(run("|a [paste #1]", ["/", "paste", "<enter>"], new Set()).text).toBe(
    "a [|paste #1]",
  );
});

test.each(["v", "V", "\x16"])(
  "search keeps the %s selection and cancel keeps its anchor",
  (mode) => {
    const found = run("|a a a", [mode, "2", "/", "a", "<enter>"]);
    expect(found.text).toBe("a a |a");
    expect(found.state.anchor).toEqual({ line: 0, col: 0 });
    const cancelled = run("|a a a", [mode, "l", "/", "a", "<esc>"]);
    expect(cancelled.text).toBe("a| a a");
    expect(cancelled.state.anchor).toEqual({ line: 0, col: 0 });
    expect(cancelled.state.mode).not.toBe("normal");
  },
);

test.each(["d", "c", "y", "gu", "gU", "gq", "gw", "2d3", '"+d', ">"])(
  "unsupported %s/search consumes the whole query without edits",
  (operator) => {
    const result = run("|a a", [...operator, "/", ..."ixx", "<enter>"]);
    expect(result.text).toBe("|a a");
    expect(result.state.query).toBeUndefined();
    expect(result.effects).toEqual([
      {
        kind: "message",
        text: "Operator search isn't supported; use Visual search, then an operator.",
      },
    ]);
    for (const key of ["n", "N"])
      expect(run("|a a", [...operator, key]).text).toBe("|a a");
  },
);
