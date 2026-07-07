import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store.jsx";
import { useRunner } from "../lib/runner.js";
import { PROVIDERS, PROVIDER_LIST, FALLBACK_MODELS } from "../lib/providers.js";

export default function Console({ seed }) {
  const { modelCache, isConnected } = useStore();
  const execute = useRunner();

  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDERS.anthropic.defaultModel);
  const [system, setSystem] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [project, setProject] = useState("General");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState(false);
  const [compareResults, setCompareResults] = useState(null);
  const abortRef = useRef(null);
  const threadRef = useRef(null);

  const models = modelCache[provider]?.length
    ? modelCache[provider]
    : FALLBACK_MODELS[provider];

  // Accept a prompt handed over from the Skills page.
  useEffect(() => {
    if (!seed) return;
    if (seed.provider && PROVIDERS[seed.provider]) {
      setProvider(seed.provider);
      setModel(
        seed.model ||
          modelCache[seed.provider]?.[0]?.id ||
          PROVIDERS[seed.provider].defaultModel
      );
    }
    if (seed.system !== undefined) setSystem(seed.system);
    if (seed.prompt) setInput(seed.prompt);
    if (seed.project) setProject(seed.project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?._ts]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, compareResults]);

  const switchProvider = (key) => {
    setProvider(key);
    setModel(modelCache[key]?.[0]?.id || PROVIDERS[key].defaultModel);
  };

  const connectedProviders = useMemo(
    () => PROVIDER_LIST.filter((p) => isConnected(p.key)),
    [isConnected]
  );

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    abortRef.current = new AbortController();

    if (compare) {
      await runCompare(prompt);
    } else {
      await runSingle(prompt);
    }
    setBusy(false);
    abortRef.current = null;
  };

  const runSingle = async (prompt) => {
    const history = [...messages, { role: "user", content: prompt }];
    setMessages([...history, { role: "assistant", content: "", provider, model, streaming: true }]);

    const result = await execute({
      provider,
      model,
      system: system || undefined,
      messages: history.map(({ role, content }) => ({ role, content })),
      temperature: PROVIDERS[provider].supportsTemperature ? temperature : undefined,
      maxTokens,
      kind: "console",
      project,
      signal: abortRef.current.signal,
      onDelta: (_, full) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: full };
          return next;
        });
      },
    });

    setMessages((prev) => {
      const next = [...prev];
      const last = { ...next[next.length - 1], streaming: false };
      if (!result.ok) last.error = result.error;
      if (!last.content && result.ok) last.content = "(empty response)";
      next[next.length - 1] = last;
      return next;
    });
  };

  const runCompare = async (prompt) => {
    const targets = connectedProviders.length ? connectedProviders : PROVIDER_LIST;
    const initial = {};
    for (const p of targets) {
      initial[p.key] = { text: "", status: "running", model: modelForCompare(p.key) };
    }
    setCompareResults({ prompt, results: initial });

    await Promise.all(
      targets.map(async (p) => {
        const usedModel = modelForCompare(p.key);
        const result = await execute({
          provider: p.key,
          model: usedModel,
          system: system || undefined,
          messages: [{ role: "user", content: prompt }],
          temperature: p.supportsTemperature ? temperature : undefined,
          maxTokens,
          kind: "compare",
          project,
          label: `compare: ${prompt.slice(0, 60)}`,
          signal: abortRef.current.signal,
          onDelta: (_, full) => {
            setCompareResults((prev) =>
              prev
                ? {
                    ...prev,
                    results: {
                      ...prev.results,
                      [p.key]: { ...prev.results[p.key], text: full },
                    },
                  }
                : prev
            );
          },
        });
        setCompareResults((prev) =>
          prev
            ? {
                ...prev,
                results: {
                  ...prev.results,
                  [p.key]: {
                    ...prev.results[p.key],
                    text: result.output || prev.results[p.key].text,
                    status: result.ok ? "done" : "error",
                    error: result.error,
                  },
                },
              }
            : prev
        );
      })
    );
  };

  const modelForCompare = (key) =>
    key === provider ? model : modelCache[key]?.[0]?.id || PROVIDERS[key].defaultModel;

  const stop = () => abortRef.current?.abort();

  return (
    <div className="page console-page">
      <header className="page-header">
        <div>
          <h1>Console</h1>
          <p className="page-sub">Prompt any connected model — or all of them at once.</p>
        </div>
        <div className="header-controls">
          <label className="field">
            <span>Project</span>
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="General"
            />
          </label>
        </div>
      </header>

      <div className="console-toolbar">
        <div className="provider-tabs">
          {PROVIDER_LIST.map((p) => (
            <button
              key={p.key}
              className={`provider-tab ${provider === p.key ? "active" : ""} ${!isConnected(p.key) ? "dim" : ""}`}
              style={provider === p.key ? { borderColor: p.color, color: p.color } : undefined}
              onClick={() => switchProvider(p.key)}
            >
              <span className="dot" style={{ background: isConnected(p.key) ? p.color : "var(--line)" }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className="toolbar-fields">
          <label className="field">
            <span>Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label || m.id}
                </option>
              ))}
              {!models.some((m) => m.id === model) && <option value={model}>{model}</option>}
            </select>
          </label>
          {PROVIDERS[provider].supportsTemperature && (
            <label className="field field-narrow">
              <span>Temp {temperature.toFixed(1)}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </label>
          )}
          <label className="field field-narrow">
            <span>Max tokens</span>
            <input
              type="number"
              min="256"
              max="64000"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value) || 4096)}
            />
          </label>
          <button className={`ghost-btn ${showSystem ? "active" : ""}`} onClick={() => setShowSystem(!showSystem)}>
            System prompt {system ? "●" : ""}
          </button>
          <label className="toggle">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            <span>Compare all</span>
          </label>
        </div>
      </div>

      {showSystem && (
        <textarea
          className="system-editor"
          placeholder="System prompt (applies to every run from this console)…"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          rows={3}
        />
      )}

      <div className="thread" ref={threadRef}>
        {messages.length === 0 && !compareResults && (
          <div className="empty-state">
            <div className="empty-glyph">▸</div>
            <p>
              Pick a provider, type below, and hit <kbd>⌘/Ctrl + Enter</kbd>.
              <br />
              Toggle <b>Compare all</b> to fan one prompt out to every connected model.
            </p>
          </div>
        )}

        {!compare &&
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="msg msg-user">
                <div className="msg-body">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="msg msg-assistant">
                <div className="msg-meta">
                  <span className="chip" style={{ color: PROVIDERS[m.provider]?.color }}>
                    {PROVIDERS[m.provider]?.name || m.provider}
                  </span>
                  <span className="msg-model">{m.model}</span>
                  {m.streaming && <span className="pulse">streaming…</span>}
                </div>
                {m.error ? (
                  <div className="msg-error">{m.error}</div>
                ) : (
                  <div className="msg-body pre">{m.content}{m.streaming ? "▌" : ""}</div>
                )}
              </div>
            )
          )}

        {compare && compareResults && (
          <div className="compare-block">
            <div className="msg msg-user">
              <div className="msg-body">{compareResults.prompt}</div>
            </div>
            <div className="compare-grid">
              {Object.entries(compareResults.results).map(([key, r]) => (
                <div key={key} className="compare-card">
                  <div className="compare-head" style={{ borderColor: PROVIDERS[key].color }}>
                    <span style={{ color: PROVIDERS[key].color }}>{PROVIDERS[key].name}</span>
                    <span className="msg-model">{r.model}</span>
                    {r.status === "running" && <span className="pulse">…</span>}
                    {r.status === "error" && <span className="status-pill error">error</span>}
                  </div>
                  <div className="compare-body pre">
                    {r.error || r.text || (r.status === "running" ? "waiting…" : "")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
          }}
          placeholder={
            compare
              ? "Prompt every connected provider…"
              : `Prompt ${PROVIDERS[provider].name} (${model})…`
          }
          rows={3}
        />
        <div className="composer-actions">
          {busy ? (
            <button className="danger-btn" onClick={stop}>
              ■ Stop
            </button>
          ) : (
            <button className="primary-btn" onClick={send} disabled={!input.trim()}>
              Run ⏎
            </button>
          )}
          {!compare && messages.length > 0 && (
            <button className="ghost-btn" onClick={() => setMessages([])} disabled={busy}>
              Clear thread
            </button>
          )}
          {compare && compareResults && (
            <button className="ghost-btn" onClick={() => setCompareResults(null)} disabled={busy}>
              Clear results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
