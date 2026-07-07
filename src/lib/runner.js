// useRunner — the one place every prompt execution flows through.
// Streams from /api/chat, records the run on the Agents board, and reports
// deltas back to whichever UI initiated it.

import { useCallback } from "react";
import { streamChat } from "./api.js";
import { useStore } from "../store.jsx";

export function useRunner() {
  const { overrides, addRun, updateRun } = useStore();

  const execute = useCallback(
    async ({
      provider,
      model,
      system,
      messages,
      temperature,
      maxTokens,
      label,
      kind = "console",
      project = "General",
      onDelta,
      signal,
    }) => {
      const start = performance.now();
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const runId = addRun({
        provider,
        model,
        kind,
        label: label || (lastUser ? lastUser.content.slice(0, 80) : "run"),
        project,
        promptPreview: lastUser ? lastUser.content.slice(0, 240) : "",
      });

      let output = "";
      let sawDone = false;
      try {
        const payload = {
          provider,
          model,
          system,
          messages,
          temperature,
          maxTokens,
          overrides: overrides[provider],
        };
        for await (const evt of streamChat(payload, signal)) {
          if (evt.type === "delta") {
            output += evt.text;
            onDelta?.(evt.text, output);
          } else if (evt.type === "done") {
            sawDone = true;
            updateRun(runId, {
              status: "done",
              durationMs: Math.round(performance.now() - start),
              usage: evt.usage || null,
              servedModel: evt.model,
              assets: evt.assets || null,
              output: output.slice(0, 4000),
            });
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        }
        if (!sawDone) {
          updateRun(runId, {
            status: "done",
            durationMs: Math.round(performance.now() - start),
            output: output.slice(0, 4000),
          });
        }
        return { ok: true, output, runId };
      } catch (err) {
        const aborted = err?.name === "AbortError";
        updateRun(runId, {
          status: aborted ? "cancelled" : "error",
          durationMs: Math.round(performance.now() - start),
          error: aborted ? "Cancelled" : err.message || String(err),
          output: output.slice(0, 4000),
        });
        return { ok: false, output, error: aborted ? "Cancelled" : err.message, runId };
      }
    },
    [overrides, addRun, updateRun]
  );

  return execute;
}

// Extract {{variables}} from a skill template, preserving order.
export function templateVars(template) {
  const vars = [];
  const re = /\{\{\s*([\w][\w ]*?)\s*\}\}/g;
  let m;
  while ((m = re.exec(template))) {
    if (!vars.includes(m[1])) vars.push(m[1]);
  }
  return vars;
}

export function fillTemplate(template, values) {
  return template.replace(/\{\{\s*([\w][\w ]*?)\s*\}\}/g, (_, name) => values[name] ?? "");
}
