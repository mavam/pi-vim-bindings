import { expect, test } from "bun:test";
import { CustomEditor } from "@earendil-works/pi-coding-agent";
import extension from "../src/index.ts";
import { keybindings, theme, tui } from "./fixtures.ts";

type Factory = (tui: never, theme: never, kb: never) => CustomEditor;

/** Start a session and return the editor factory the extension installed. */
function start(mode: string, previous?: Factory): Factory | undefined {
  let installed: Factory | undefined;
  let handler: ((event: unknown, ctx: unknown) => void) | undefined;
  extension({
    on: (_event: string, h: typeof handler) => {
      handler = h;
    },
  } as never);
  handler?.(
    {},
    {
      mode,
      ui: {
        notify() {},
        theme: { fg: (_color: string, text: string) => text },
        getEditorComponent: () => previous,
        setEditorComponent: (factory: Factory) => {
          installed = factory;
        },
      },
    },
  );
  return installed;
}

const create = (factory: Factory) =>
  factory(tui as never, theme as never, keybindings() as never);
const decorated = (editor: object) => Symbol.for("pi-vim-editor") in editor;

test("leaves the editor alone outside the TUI", () => {
  expect(start("print")).toBeUndefined();
});

test("decorates Pi's default editor with the inline working status", () => {
  const editor = create(start("tui") as Factory);
  expect(decorated(editor)).toBe(true);
  expect(editor.embedWorkingStatus).toBe(true);
});

test("decorates the editor of a previously installed factory", () => {
  let inner: CustomEditor | undefined;
  const previous: Factory = (t, th, kb) => {
    inner = new CustomEditor(t, th, kb);
    return inner;
  };
  const editor = create(start("tui", previous) as Factory);
  expect(editor).toBe(inner as CustomEditor);
  expect(decorated(editor)).toBe(true);
});
