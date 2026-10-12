/**
 * A scripted model provider for the README demo. It registers the provider
 * `demo` with the model `sol` and answers every prompt from a script, so the
 * recording is free, offline, and the same every time.
 *
 * Load it next to pi-vim-editor: `pi -e ./src/index.ts -e
 * ./demo/provider.ts --model demo/sol`. See demo/record.sh.
 */

import {
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
} from "@earendil-works/pi-ai/providers/faux";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ANSWER = `Three risks stand out:

1. **parser.ts** swallows errors from \`parseExpression\` and returns \`null\`, so callers can't tell an empty input from a failure.
2. **lexer.ts** throws on an unterminated string without a position, which leaves the parser nothing to report.
3. **tests.ts** never feeds invalid input, so neither path is covered.`;

export default function demoProvider(pi: ExtensionAPI): void {
  const faux = fauxProvider({
    provider: "demo",
    models: [{ id: "sol", name: "Sol", reasoning: true }],
    // Slow enough that the working indicator shows in the editor border.
    tokensPerSecond: 30,
  });
  faux.setResponses(
    Array.from({ length: 100 }, () =>
      fauxAssistantMessage([
        fauxThinking("**Reading the parser changes**"),
        fauxText(ANSWER),
      ]),
    ),
  );
  pi.registerProvider(faux.provider);
}
