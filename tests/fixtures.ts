import { KeybindingsManager, TUI_KEYBINDINGS } from "@earendil-works/pi-tui";

/** Minimal stand-ins for what an editor factory receives from Pi. */
export const tui = { terminal: { rows: 24, columns: 80 }, requestRender() {} };
export const theme = { borderColor: (s: string) => s, selectList: {} };
export const keybindings = () =>
  new KeybindingsManager({
    ...TUI_KEYBINDINGS,
    "app.interrupt": { defaultKeys: "escape", description: "Interrupt" },
  });
