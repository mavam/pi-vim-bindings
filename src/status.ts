/**
 * The read-only status that a decorated editor publishes for other
 * extensions. See docs/integration.md.
 */

import { label, type Mode, type State } from "./engine.js";

/** Where a decorated editor publishes its status: `editor[VIM_EDITOR]`. */
export const VIM_EDITOR = Symbol.for("pi-vim-editor");

export type VimEditorMode =
  | "insert"
  | "normal"
  | "visual"
  | "visual-line"
  | "visual-block"
  | "replace";

export type VimEditorStatus = Readonly<{
  mode: VimEditorMode;
  /** Keys of an unfinished command, such as `2d`, `ci`, or `:q`; or "". */
  pending: string;
  /** The text of the mode label: `pending` if any, else the mode name. */
  label: string;
}>;

export type VimEditorCapability = Readonly<{
  version: 1;
  /** The current status, computed on every call. */
  status(): VimEditorStatus;
}>;

const MODES: Record<Mode, VimEditorMode> = {
  insert: "insert",
  normal: "normal",
  visual: "visual",
  vline: "visual-line",
  vblock: "visual-block",
  replace: "replace",
};

export function statusOf(state: State): VimEditorStatus {
  return Object.freeze({
    mode: MODES[state.mode],
    pending: state.keys.join(""),
    label: label(state),
  });
}

/** Publish `status` on `editor`, which marks it as decorated, too. */
export function publish(editor: object, status: () => VimEditorStatus): void {
  const capability: VimEditorCapability = Object.freeze({
    version: 1,
    status,
  });
  // Not writable, enumerable, or configurable.
  Object.defineProperty(editor, VIM_EDITOR, { value: capability });
}
