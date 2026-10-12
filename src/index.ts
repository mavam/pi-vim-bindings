import {
  CustomEditor,
  copyToClipboard,
  type ExtensionAPI,
  type ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";
import { getNativeClipboard } from "@earendil-works/pi-tui";
import { attach, type Position, type Shared } from "./attach.js";
import { createClipboard, readCommands } from "./clipboard.js";

type Factory = NonNullable<
  ReturnType<ExtensionUIContext["getEditorComponent"]>
>;

const OURS = Symbol.for("pi-vim-editor.factory");
const POSITIONS: readonly Position[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
];

/** `vimEditor.indicator` from Pi's settings, or the default. */
function position(settings: unknown): Position {
  const value = (settings as { vimEditor?: { indicator?: unknown } })?.vimEditor
    ?.indicator;
  return POSITIONS.find((p) => p === value) ?? "bottom-right";
}

/**
 * Vim-style modal editing for Pi's prompt editor.
 *
 * Decorates the editor produced by the active factory instead of replacing
 * it. See docs/design.md.
 */
export default function (pi: ExtensionAPI): void {
  const shared: Shared = {
    register: undefined,
    notify: () => {},
    clipboard: createClipboard({
      copy: copyToClipboard,
      native: getNativeClipboard,
      commands: () => readCommands(),
    }),
    paint: (_insert, text) => text,
    quit: () => {},
    position: "bottom-right",
  };
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    const { ui } = ctx;
    shared.notify = (message, type) => ui.notify(message, type);
    shared.quit = () => ctx.shutdown();
    shared.position = position(pi.getSettings?.());
    shared.paint = (insert, text) =>
      ui.theme.fg(insert ? "muted" : "accent", text);
    const previous = ui.getEditorComponent();
    if (previous && OURS in previous) return;
    const factory: Factory = (tui, theme, keybindings) => {
      const editor =
        previous?.(tui, theme, keybindings) ??
        new CustomEditor(tui, theme, keybindings, { embedWorkingStatus: true });
      attach(editor, keybindings, shared, () => tui.requestRender());
      return editor;
    };
    ui.setEditorComponent(Object.assign(factory, { [OURS]: true }));
  });
}
