import { expect, test } from "bun:test";
import { CustomEditor } from "@earendil-works/pi-coding-agent";
import { CURSOR_MARKER, visibleWidth } from "@earendil-works/pi-tui";
import { attach } from "../src/attach.ts";
import { cursorFor } from "../src/cursor.ts";
import { keybindings, theme, tui } from "./fixtures.ts";

function setup() {
  const writes: string[] = [];
  let hardware = true;
  const host = {
    ...tui,
    terminal: {
      ...tui.terminal,
      write: (text: string) => writes.push(text),
      start: () => {
        writes.push("start");
      },
      stop: () => {
        writes.push("stop");
      },
    },
    getShowHardwareCursor: () => hardware,
  };
  const kb = keybindings();
  const editor = new CustomEditor(host as never, theme as never, kb);
  editor.focused = true;
  const cursor = cursorFor(editor, host as never);
  if (!cursor) throw new Error("Expected cursor support for CustomEditor");
  attach(
    editor,
    kb,
    {
      register: undefined,
      notify() {},
      copy() {},
      quit() {},
      position: "bottom-right",
      paint: (_insert, text) => text,
    },
    cursor.render,
  );
  const render = () => editor.render(40);
  const type = (...keys: string[]) => {
    for (const key of keys) editor.handleInput(key);
    return render();
  };
  return {
    editor,
    cursor,
    host,
    writes,
    render,
    type,
    hardware: (enabled: boolean) => {
      hardware = enabled;
    },
  };
}

test("uses a bar for INSERT, underline for REPLACE, and block for NORMAL and Visual", () => {
  const { editor, type, writes, render, cursor } = setup();
  editor.setText("abc\ndef");
  render();
  type("\x1b");
  type("v");
  type("V");
  type("\x16");
  type("\x1b", "R");
  type("\x1b", "i");
  render();
  expect(writes).toEqual(["\x1b[6 q", "\x1b[2 q", "\x1b[4 q", "\x1b[6 q"]);
  editor.onSubmit = () => {};
  type("\x1b");
  type("\r");
  expect(writes.at(-1)).toBe("\x1b[6 q");
  expect(editor.getText()).toBe("");
  cursor.dispose();
});

test("removes only Pi's fake cursor, preserving the marker, Unicode, layout, and Visual selection", () => {
  const { editor, type, render, cursor } = setup();
  editor.setText("a👩‍💻界é");
  type("\x1b", "0", "l", "i");
  const lines = render();
  expect(lines[1]).toContain(`a${CURSOR_MARKER}👩‍💻\x1b[0m界é`);
  expect(lines[1]).not.toContain("\x1b[7m");
  expect(visibleWidth(lines[1])).toBe(40);
  const visual = type("\x1b", "0", "v", "l");
  expect(visual[1]).toContain("\x1b[7ma");
  expect(visual[1]).toContain(CURSOR_MARKER);
  expect(visibleWidth(visual[1])).toBe(40);
  cursor.dispose();
});

test("leaves Pi's software cursor intact when the hardware cursor is hidden", () => {
  const { hardware, writes, render, cursor } = setup();
  hardware(false);
  expect(render()[1]).toContain(`${CURSOR_MARKER}\x1b[7m`);
  expect(writes).toEqual([]);
  hardware(true);
  render();
  hardware(false);
  expect(render()[1]).toContain(`${CURSOR_MARKER}\x1b[7m`);
  expect(writes).toEqual(["\x1b[6 q", "\x1b[0 q"]);
  cursor.dispose();
});

test("restores the terminal default on focus loss, even if the editor isn't rendered", () => {
  const { editor, writes, render, type, cursor } = setup();
  type("\x1b", "R");
  editor.focused = false;
  expect(writes).toEqual(["\x1b[4 q", "\x1b[0 q"]);
  render();
  expect(writes).toHaveLength(2);
  editor.focused = true;
  render();
  expect(writes.at(-1)).toBe("\x1b[4 q");
  cursor.dispose();
});

test("restores before yielding the terminal and reapplies after resume", () => {
  const { host, writes, render, cursor } = setup();
  render();
  host.terminal.stop();
  expect(writes).toEqual(["\x1b[6 q", "\x1b[0 q", "stop"]);
  // Fullscreen renders once more after stopping to print the transcript.
  expect(render()[1]).toContain(`${CURSOR_MARKER}\x1b[7m`);
  expect(writes).toHaveLength(3);
  host.terminal.start();
  render();
  expect(writes.at(-1)).toBe("\x1b[6 q");
  cursor.dispose();
  cursor.dispose();
  render();
  expect(writes).toEqual([
    "\x1b[6 q",
    "\x1b[0 q",
    "stop",
    "start",
    "\x1b[6 q",
    "\x1b[0 q",
  ]);
});

test("leaves Vim editing available when cursor decoration isn't supported", () => {
  const { editor, host, cursor, type, writes } = setup();
  cursor.dispose();
  Object.defineProperty(editor, "focused", { configurable: false });
  expect(cursorFor(editor, host as never)).toBeUndefined();
  type("abc", "\x1b", "0", "x");
  expect(editor.getText()).toBe("bc");
  expect(writes).toEqual([]);
});

test.each(["get", "set"] as const)(
  "preserves earlier accessors and a later %s wrapper",
  (accessor) => {
    const { editor, host, cursor, render, writes } = setup();
    cursor.dispose();
    let focused = true;
    let changes = 0;
    Object.defineProperty(editor, "focused", {
      configurable: true,
      get: () => focused,
      set: (value: boolean) => {
        changes++;
        focused = value;
      },
    });
    const next = cursorFor(editor, host as never);
    if (!next) throw new Error("Expected cursor support for accessors");
    next.render("insert", render());
    const stop = host.terminal.stop;
    const laterStop = () => stop();
    host.terminal.stop = laterStop;
    const focus = Object.getOwnPropertyDescriptor(editor, "focused");
    if (!focus) throw new Error("Expected a focus accessor");
    const laterFocus =
      accessor === "get"
        ? () => focus.get?.()
        : (value: boolean) => focus.set?.(value);
    Object.defineProperty(editor, "focused", {
      ...focus,
      [accessor]: laterFocus,
    });
    next.dispose();
    expect(host.terminal.stop).toBe(laterStop);
    expect(Object.getOwnPropertyDescriptor(editor, "focused")?.[accessor]).toBe(
      laterFocus,
    );
    editor.focused = false;
    expect(changes).toBe(1);
    host.terminal.stop();
    expect(writes).toEqual(["\x1b[6 q", "\x1b[0 q", "stop"]);
  },
);
