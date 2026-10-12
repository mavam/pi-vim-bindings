/**
 * The system clipboard for the `"+` and `"*` registers: writes through Pi's
 * `copyToClipboard`, reads through pi-tui's native clipboard or a platform
 * command, and a mirror of the last copy that keeps its register metadata.
 */

import { spawn } from "node:child_process";
import type { NativeClipboard } from "@earendil-works/pi-tui";
import type { Register } from "./engine.js";

export type Clipboard = {
  /** Copy a register to the system clipboard, best effort. */
  write(register: Register): void;
  /** Read the system clipboard as a register, or explain why not. */
  read(): Promise<{ register?: Register; warning?: string }>;
};

export type ClipboardOptions = {
  copy(text: string): Promise<void>;
  native(): NativeClipboard | undefined;
  /** Platform commands that print the clipboard, tried before `native`. */
  commands(): [string, string[]][];
  timeoutMs?: number;
  maxBytes?: number;
};

/** Commands for platforms pi-tui's native clipboard doesn't read. */
export function readCommands(
  env = process.env,
  platform = process.platform,
): [string, string[]][] {
  const commands: [string, string[]][] = [];
  if (env.TERMUX_VERSION) commands.push(["termux-clipboard-get", []]);
  if (platform === "linux" && env.WAYLAND_DISPLAY)
    commands.push(["wl-paste", ["--no-newline", "--type", "text"]]);
  return commands;
}

export function createClipboard(options: ClipboardOptions): Clipboard {
  const timeoutMs = options.timeoutMs ?? 2000;
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  // The last copy, as the register and as the text the clipboard got.
  let mirror: { register: Register; text: string } | undefined;
  let written = true;
  let pending: Promise<void> = Promise.resolve();

  const text = async (): Promise<string | null | undefined> => {
    for (const [command, args] of options.commands()) {
      const out = await run(command, args, timeoutMs, maxBytes);
      if (out !== undefined) return out;
    }
    const native = options.native();
    if (!native) return undefined;
    const out = await within(native.getText(), timeoutMs);
    if (typeof out === "string" && Buffer.byteLength(out, "utf8") > maxBytes)
      return undefined;
    return out;
  };

  const fallback = (warning: string) =>
    mirror
      ? { register: mirror.register, warning }
      : { warning: "Couldn't read the system clipboard." };

  return {
    write(register) {
      // Vim puts a line break after linewise text on the system clipboard.
      const copied = register.linewise ? `${register.text}\n` : register.text;
      mirror = { register: { ...register }, text: copied };
      // Each copy is bounded, so one that never finishes can't hold up later
      // copies or reads; it counts as failed.
      pending = pending
        .then(() =>
          within(
            options.copy(copied).then(() => true),
            timeoutMs,
          ),
        )
        .then(
          (done) => {
            written = done === true;
          },
          () => {
            written = false;
          },
        );
    },
    async read() {
      // A copy still in flight must land first, or we'd read older text.
      // Waiting is bounded too; if it runs out, our copy is the newest.
      const landed = await within(
        pending.then(() => true),
        timeoutMs,
      );
      if (landed === undefined)
        return fallback("Couldn't copy to the clipboard; using the last copy.");
      // If our last copy didn't reach the clipboard, it's still the newest
      // for this read; later reads see whatever the clipboard has by then.
      if (!written && mirror) {
        written = true;
        return fallback("Couldn't copy to the clipboard; using the last copy.");
      }
      let out: string | null | undefined;
      try {
        out = await text();
      } catch {
        out = undefined;
      }
      if (out === undefined)
        return fallback("Couldn't read the clipboard; using the last copy.");
      if (!out) return { warning: "The system clipboard is empty." };
      const normalized = out.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
      // Compare and answer with the same copy, even if a newer one arrived.
      const known = mirror;
      if (known && normalized === known.text)
        return { register: known.register };
      // Text from elsewhere: a trailing line break makes it linewise, as in Vim.
      if (normalized.endsWith("\n"))
        return {
          register: { text: normalized.slice(0, -1), linewise: true },
        };
      return { register: { text: normalized, linewise: false } };
    },
  };
}

/** Resolve to `undefined` if `promise` takes longer than `ms`. */
async function within<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Run a command without a shell; its output, or undefined if it failed. */
function run(
  command: string,
  args: string[],
  timeoutMs: number,
  maxBytes: number,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let child: ReturnType<typeof spawn> | undefined;
    const stop = () => {
      if (!child || child.exitCode !== null || child.signalCode !== null)
        return;
      child.kill("SIGTERM");
      // A command that ignores SIGTERM gets SIGKILL shortly after.
      setTimeout(() => child?.kill("SIGKILL"), 500).unref();
    };
    const finish = (value: string | undefined) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child?.stdout?.removeAllListeners("data");
      resolve(value);
    };
    try {
      child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return finish(undefined);
    }
    timer = setTimeout(() => {
      stop();
      finish(undefined);
    }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        stop();
        return finish(undefined);
      }
      chunks.push(chunk);
    });
    child.on("error", () => finish(undefined));
    child.on("close", (code) =>
      finish(code === 0 ? Buffer.concat(chunks).toString("utf8") : undefined),
    );
  });
}
