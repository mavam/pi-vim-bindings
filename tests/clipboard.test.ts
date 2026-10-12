import { expect, test } from "bun:test";
import { type ClipboardOptions, createClipboard } from "../src/clipboard.ts";

/** A clipboard whose OS side is `text`; `undefined` means unavailable. */
function setup(text?: string | null, copy?: ClipboardOptions["copy"]) {
  const os = { text };
  const clipboard = createClipboard({
    copy:
      copy ??
      (async (t) => {
        os.text = t;
      }),
    native: () =>
      os.text === undefined
        ? undefined
        : { getText: async () => os.text, getImage: async () => null },
    commands: () => [],
    timeoutMs: 50,
  });
  return { clipboard, os };
}

test("keeps metadata for its own copies and reads other text by Vim's rules", async () => {
  const { clipboard, os } = setup(null);
  clipboard.write({ text: "a\nb", linewise: false, block: true, width: 1 });
  expect((await clipboard.read()).register?.block).toBe(true);
  os.text = "line\r\n";
  expect((await clipboard.read()).register).toEqual({
    text: "line",
    linewise: true,
  });
  os.text = "word";
  expect((await clipboard.read()).register).toEqual({
    text: "word",
    linewise: false,
  });
  os.text = "";
  expect((await clipboard.read()).warning).toBe(
    "The system clipboard is empty.",
  );
});

test("waits for a pending copy and falls back to it when reading fails", async () => {
  let land = () => {};
  const { clipboard, os } = setup(
    "old",
    (t) =>
      new Promise((resolve) => {
        land = () => {
          os.text = t;
          resolve();
        };
      }),
  );
  clipboard.write({ text: "new", linewise: false });
  const read = clipboard.read();
  await Bun.sleep(0);
  land();
  expect((await read).register?.text).toBe("new");
  os.text = undefined;
  expect(await clipboard.read()).toEqual({
    register: { text: "new", linewise: false },
    warning: "Couldn't read the clipboard; using the last copy.",
  });
  expect(await setup().clipboard.read()).toEqual({
    warning: "Couldn't read the system clipboard.",
  });
});

test("gives up on a clipboard that doesn't answer", async () => {
  const clipboard = createClipboard({
    copy: async () => {},
    native: () => ({
      getText: () => new Promise(() => {}),
      getImage: async () => null,
    }),
    commands: () => [],
    timeoutMs: 20,
  });
  expect((await clipboard.read()).warning).toBe(
    "Couldn't read the system clipboard.",
  );
  // A copy that never finishes doesn't hold up reads either.
  const stuck = createClipboard({
    copy: () => new Promise(() => {}),
    native: () => undefined,
    commands: () => [],
    timeoutMs: 20,
  });
  stuck.write({ text: "mine", linewise: false });
  expect((await stuck.read()).register?.text).toBe("mine");
});
