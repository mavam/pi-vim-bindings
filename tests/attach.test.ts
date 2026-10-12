import { expect, test } from "bun:test";
import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { attach, type Shared } from "../src/attach.ts";
import { keybindings as createKeybindings, theme, tui } from "./fixtures.ts";

function setup(position: Shared["position"] = "bottom-right") {
  const notes: string[] = [];
  const copies: string[] = [];
  // What the next clipboard read returns.
  const clipboard: { next: Awaited<ReturnType<Shared["clipboard"]["read"]>> } =
    {
      next: {},
    };
  let quits = 0;
  const shared: Shared = {
    register: undefined,
    notify: (message) => notes.push(message),
    clipboard: {
      write: (register) => copies.push(register.text),
      read: async () => clipboard.next,
    },
    quit: () => {
      quits++;
    },
    position,
    paint: (_insert, text) => `<${text.trim()}>`,
  };
  const keybindings = createKeybindings();
  const editor = new CustomEditor(tui as never, theme as never, keybindings);
  attach(editor, keybindings, shared);
  const type = (...keys: string[]) => {
    for (const key of keys) editor.handleInput(key);
  };
  const quitted = () => quits;
  return {
    editor,
    keybindings,
    shared,
    notes,
    copies,
    clipboard,
    quitted,
    type,
  };
}

test("edits in NORMAL mode, undoes, and labels the border", () => {
  const { editor, type } = setup();
  type(..."foo bar baz", "\x1b", "b", "d", "w");
  expect(editor.getText()).toBe("foo bar ");
  expect(editor.render(40).some((line) => line.includes("<NORMAL>"))).toBe(
    true,
  );
  type("u");
  expect(editor.getText()).toBe("foo bar baz");
});

test("undoes and repeats whole changes, and copies yanks", () => {
  const { editor, copies, type } = setup();
  type(..."foo foo", "\x1b", "0", "i", "z", "\x1b", "u");
  expect(editor.getText()).toBe("foo foo");
  type("c", "w", ..."bar", "\x1b", "w", ".");
  expect(editor.getText()).toBe("bar bar");
  type("u");
  expect(editor.getText()).toBe("bar foo");
  type("u");
  expect(editor.getText()).toBe("foo foo");
  type("y", "y");
  expect(copies).toEqual(["foo foo"]);
});

test("highlights the Visual selection", () => {
  const { editor, type } = setup();
  type(..."foo bar", "\x1b", "0", "v", "e");
  const lines = editor.render(40);
  expect(lines[1]).toStartWith("\x1b[7mfo");
  expect(lines[1]).toContain("\x1b[27m bar");
  expect(lines.some((line) => line.includes("<VISUAL>"))).toBe(true);
});

test("inserts and appends on every line of a block", () => {
  const { editor, type } = setup();
  editor.setText("ab\ncd");
  type("\x1b", "g", "g", "0", "\x16", "j", "I", "-", " ", "\x1b");
  expect(editor.getText()).toBe("- ab\n- cd");
  type("$", "\x16", "j", "A", "!", "\x1b");
  expect(editor.getText()).toBe("- ab!\n- cd!");
  type("u");
  expect(editor.getText()).toBe("- ab\n- cd");
});

test("quits with :q only when the prompt is empty, or with :q!", () => {
  const { quitted, notes, type } = setup();
  type("a", "\x1b", ":", "q", "\r");
  expect([quitted(), notes.length]).toEqual([0, 1]);
  type(":", "q", "!", "\r");
  expect(quitted()).toBe(1);
});

test("puts the mode label where the setting says", () => {
  const { editor } = setup("top-left");
  expect(editor.render(40)[0]).toStartWith("─<INSERT>─");
});

test("ends Visual mode when something else changes the text", () => {
  const { editor, type } = setup();
  editor.setText("a\nb\nc");
  type("\x1b", "V");
  editor.setText("x");
  expect(editor.render(40).some((line) => line.includes("<NORMAL>"))).toBe(
    true,
  );
});

test("doesn't copy pasted blocks to the other lines of a block", () => {
  const { editor, notes, type } = setup();
  editor.setText("ab\ncd");
  const paste = `\x1b[200~${"x\n".repeat(12)}\x1b[201~`;
  type("\x1b", "g", "g", "0", "\x16", "j", "I", paste, "\x1b");
  expect(editor.getText()).toBe("[paste #1 +13 lines]ab\ncd");
  expect(notes).toHaveLength(1);
});

test("overwrites in Replace mode, with Backspace, ., and one undo", () => {
  const { editor, type } = setup();
  editor.setText("abcd efgh");
  type("\x1b", "0", "R", "x", "y", "z", "\x7f", "\x1b");
  expect(editor.getText()).toBe("xycd efgh");
  type("w", ".");
  expect(editor.getText()).toBe("xycd xygh");
  type("u");
  expect(editor.getText()).toBe("xycd efgh");
  type("u");
  expect(editor.getText()).toBe("abcd efgh");
});

test("doesn't restore in Replace mode after a paste moved things", () => {
  const { editor, type } = setup();
  editor.setText("abcd efgh");
  type("\x1b", "0", "R", "x", "\x1b[200~QQ\x1b[201~", "\x7f");
  expect(editor.getText()).toBe("xQQbcd efgh");
});

test("redoes with Ctrl-R until another edit", () => {
  const { editor, notes, type } = setup();
  editor.setText("one two");
  type("\x1b", "0", "d", "w", "x", "u", "u");
  expect(editor.getText()).toBe("one two");
  type("w", "\x12");
  expect(editor.getText()).toBe("two");
  type("\x12");
  expect(editor.getText()).toBe("wo");
  type("u", "x", "\x12");
  expect([editor.getText(), notes]).toEqual(["wo", ["Nothing to redo."]]);
});

test("puts the cursor at the redone change, and forgets it after typing", () => {
  const { editor, type } = setup();
  editor.setText("abcdef");
  type("\x1b", "0", "x", "$", "u", "\x12");
  expect([editor.getText(), editor.getCursor().col]).toEqual(["bcdef", 0]);
  type("u", "i", "Z", "\x7f", "\x1b", "\x12");
  expect(editor.getText()).toBe("abcdef");
});

test('puts the system clipboard with "+p unless the prompt changed', async () => {
  const { editor, copies, clipboard, notes, type } = setup();
  editor.focused = true;
  editor.setText("one");
  type("\x1b", '"', "+", "d", "d");
  expect(copies).toEqual(["one"]);
  clipboard.next = { register: { text: "two", linewise: true } };
  type('"', "+", "2", "p");
  await Bun.sleep(0);
  expect(editor.getText()).toBe("\ntwo\ntwo");
  editor.setText("abc");
  type("0", '"', "+", "p", "x");
  await Bun.sleep(0);
  expect([editor.getText(), notes.at(-1)]).toEqual([
    "bc",
    "The prompt changed; not putting the clipboard.",
  ]);
});

test("runs queued clipboard puts in order, and drops stale ones", async () => {
  const { editor, shared, type } = setup();
  editor.focused = true;
  editor.setText("abc");
  // Reads answer one after another, each when its key is released.
  const reads: ((text: string) => void)[] = [];
  shared.clipboard.read = () =>
    new Promise((resolve) =>
      reads.push((text) => resolve({ register: { text, linewise: false } })),
    );
  const answer = async (text: string) => {
    await Bun.sleep(0);
    reads.shift()?.(text);
    await Bun.sleep(0);
  };
  type("\x1b", "0", '"', "+", "p", '"', "+", "p");
  await answer("1");
  await answer("2");
  expect(editor.getText()).toBe("a12bc");
  // Moving away and back still makes a pending put stale.
  type('"', "+", "p", "l", "h");
  await answer("3");
  expect(editor.getText()).toBe("a12bc");
});

test("hands Esc and Enter in NORMAL mode to Pi", () => {
  const { editor, type } = setup();
  let interrupted = false;
  editor.onEscape = () => {
    interrupted = true;
  };
  editor.onSubmit = () => {};
  type("a", "\x1b", "\x1b");
  expect(interrupted).toBe(true);
  type("\r", "x");
  expect(editor.getText()).toBe("x");
});

test("fails closed on editors without the expected internals", () => {
  const { keybindings, shared, notes } = setup();
  const editor = { handleInput() {}, renderBottomBorder: () => "" };
  expect(attach(editor, keybindings, shared)).toBe(false);
  expect(notes).toHaveLength(1);
});
