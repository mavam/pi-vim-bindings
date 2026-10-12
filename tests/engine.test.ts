import { expect, test } from "bun:test";
import {
  apply,
  type Buffer,
  CTRL_V,
  esc,
  overtype,
  press,
  type Register,
  type State,
} from "../src/engine.ts";

/** Run keys on a buffer written as text with `|` at the cursor. */
function run(before: string, keys: string): string {
  const raw = before.split("\n");
  const line = raw.findIndex((l) => l.includes("|"));
  let buf: Buffer = {
    lines: raw.map((l) => l.replace("|", "")),
    cursor: { line, col: raw[line].indexOf("|") },
  };
  let state: State = { mode: "normal", keys: [] };
  let register: Register | undefined;
  for (const token of keys.match(/<esc>|<C-v>|./gsu) ?? []) {
    const key = token === "<C-v>" ? CTRL_V : token;
    const { cursor } = buf;
    if (key === "<esc>") {
      const result = esc(state, buf);
      state = result.state;
      buf = apply(buf, result.effects);
    } else if (state.mode === "replace") {
      buf = apply(buf, overtype(buf, key).effects);
    } else if (state.mode === "insert") {
      const to = { line: cursor.line, col: cursor.col + key.length };
      const typed = { from: cursor, to: cursor, text: key, cursor: to };
      buf = apply(buf, [{ kind: "replace", ...typed }]);
    } else {
      const result = press(state, key, buf, register);
      state = result.state;
      for (const effect of result.effects) {
        if (effect.kind === "refuse") return "refused";
        if (effect.kind === "yank") register = effect.register;
      }
      buf = apply(buf, result.effects);
    }
  }
  const { line: l, col } = buf.cursor;
  const text = buf.lines
    .map((s, i) => (i === l ? `${s.slice(0, col)}|${s.slice(col)}` : s))
    .join("\n");
  return state.mode === "normal" ? text : `${text} -- ${state.mode}`;
}

const paste = "[paste #1 +3 lines]";

test.each([
  // Motions
  ["foo b|ar", "h", "foo |bar"],
  ["|foo", "l", "f|oo"],
  ["a\n|b\nc", "j", "a\nb\n|c"],
  ["a\n|b", "j", "a\n|b"],
  ["a\n|b", "k", "|a\nb"],
  ["|foo.bar baz", "w", "foo|.bar baz"],
  ["|foo bar\nbaz", "2w", "foo bar\n|baz"],
  ["foo |bar", "b", "|foo bar"],
  ["|foo bar", "e", "fo|o bar"],
  ["  foo b|ar", "0", "|  foo bar"],
  ["  foo b|ar", "^", "  |foo bar"],
  ["f|oo", "$", "fo|o"],
  ["a\nb\n|c", "gg", "|a\nb\nc"],
  ["|a\nb\nc", "2G", "a\n|b\nc"],
  ["|a,b", "f,", "a|,b"],
  ["|ab,c", "t,", "a|b,c"],
  ["a,b|c", "F,", "a|,bc"],
  ["a,b|c", "T,", "a,|bc"],
  [`|${paste} x`, "w", `${paste} |x`],
  // Insert entries
  ["fo|o", "ix<esc>", "fo|xo"],
  ["f|oo", "ax<esc>", "fo|xo"],
  ["  f|oo", "Ix<esc>", "  |xfoo"],
  ["f|oo", "Ax", "foox| -- insert"],
  ["|a", "ob<esc>", "a\n|b"],
  ["|a", "Ob<esc>", "|b\na"],
  // Operators
  ["|foo bar", "dw", "|bar"],
  ["foo |bar\nbaz", "dw", "foo| \nbaz"],
  ["|a b c d", "d2w", "|c d"],
  ["|foo bar", "cwx<esc>", "|x bar"],
  ["a|bc", "d$", "|a"],
  ["ab|c", "d0", "|c"],
  ["|ab,c", "dt,", "|,c"],
  ["|a\nb\nc", "dj", "|c"],
  ["a\n|b", "dk", "|"],
  ["a\n|b\nc", "dd", "a\n|c"],
  ["a\n|b", "dd", "|a"],
  ["a\n|b\nc", "dG", "|a"],
  ["a\n|b", "ccx", "a\nx| -- insert"],
  ["f|oo bar", "diw", "| bar"],
  ["f|oo bar", "daw", "|bar"],
  ['x "a|b" y', 'ci"z<esc>', 'x "|z" y'],
  ["x 'a|b' y", "da'", "x | y"],
  ["f(a, (|b))", "di(", "f(a, (|))"],
  ["f(a, (b)|)", "da)", "|f"],
  [`|${paste} x`, "dw", "refused"],
  // Edits and put
  ["|abc", "2x", "|c"],
  ["|abc", "rx", "|xbc"],
  ["a|bc", "D", "|a"],
  ["a|bc", "Cx", "ax| -- insert"],
  ["|ab", "xp", "b|a"],
  ["a[|b]", "yi[P", "a[|bb]"],
  ["|foo", "yyp", "foo\n|foo"],
  ["|foo", "yyP", "|foo\nfoo"],
  // WORDs, repeated finds, counts
  ["|a.b c", "W", "a.b |c"],
  ["a.b |c", "B", "|a.b c"],
  ["|a.b c", "E", "a.|b c"],
  ["x a.|b y", "diW", "x | y"],
  ["x a.|b y", "daW", "x |y"],
  ["|a,b,c", "f,;", "a,b|,c"],
  ["|a,b,c", "f,;,", "a|,b,c"],
  ["|a,b,c", "t,;", "a,|b,c"],
  ["|a,b,c", "2f,", "a,b|,c"],
  ["|a\nb\nc", "2dd", "|c"],
  ["|a b c d e f g h", "2d3w", "|g h"],
  ["|a", "3.", "|a"],
  // More single-key edits
  ["|abc", "2sx<esc>", "|xc"],
  ["  |ab", "Sx<esc>", "|x"],
  ["|ab", "Yp", "ab\n|ab"],
  ["|a\n  b", "J", "a| b"],
  ["|a\nb\nc", "3J", "a b| c"],
  // Small extras
  ["ab|c", "X", "a|c"],
  ["abc|d", "2X", "a|d"],
  ["|a", "yl3p", "aaa|a"],
  ["foo |bar", "ge", "fo|o bar"],
  ["a.b |c", "gE", "a.|b c"],
  ["|ab", "2~", "A|B"],
  ["|foo bar", "gUiw", "|FOO bar"],
  ["|Foo", "guu", "|foo"],
  ["|(a\nb)", "%", "(a\nb|)"],
  ["|(a\nb) c", "d%", "| c"],
  // Review fixes
  ["foo\n|bar", "db", "|bar"],
  ["|\nbar", "dw", "|bar"],
  ["|foo.bar", "dge", "|foo.bar"],
  ["|abc", "cb", "|abc"],
  ["|abc", "2dd", "|abc"],
  ["|a\nb\nc", "2gg", "a\n|b\nc"],
  ["foo bar |baz", "2ge", "fo|o bar baz"],
  ["中|a\nabcd", "j", "中a\nab|cd"],
  ["|a\nabcdef", "<C-v>jly$P", "|a a\nababcdef"],
  [" \u0301\n|x", "dd", "| \u0301"],
  // Replace mode
  ["|abc", "Rxy<esc>", "x|yc"],
  ["a|b", "Rxyz<esc>", "axy|z"],
  // Visual mode
  ["|ab", "vl", "a|b -- visual"],
  ["|ab", "vl<esc>", "a|b"],
  ["|foo bar baz", "vwd", "|ar baz"],
  ["|foo bar", "vecx<esc>", "|x bar"],
  ["a|bc", "vlohd", "|"],
  ["|a\nb\nc", "Vjd", "|c"],
  ["f|oo bar", "viwd", "| bar"],
  ["|ab", "vlyP", "a|bab"],
  ["|ab cd", "yiwwvep", "ab |ab"],
  ["|abc", "vlrx", "|xxc"],
  ["|ab", "vlU", "|AB"],
  ["|a\nb\nc", "VjJ", "a| b\nc"],
  ["|a\nb", "Vj>", "  |a\n  b"],
  // Indent
  ["|a\nb", "2>>", "  |a\n  b"],
  ["  |a", "<<", "|a"],
  // Visual block
  ["|abc\nabc\nabc", "<C-v>jjld", "|c\nc\nc"],
  ["|abc\nabc", "<C-v>jlrx", "|xxc\nxxc"],
  ["|ab\nabcd", "<C-v>j$d", "|\n"],
  ["a|bc\nabc", "<C-v>jlOhd", "|\n"],
  ["|abc\nabc", "<C-v>jly$p", "abc|ab\nabcab"],
  ["|abc\nabc", "<C-v>jc", "|bc\nbc -- insert"],
])("%j + %j → %j", (before, keys, after) => {
  expect(run(before, keys)).toBe(after);
});
