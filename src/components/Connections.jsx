import React, { useState } from "react";
import { useStore } from "../store.jsx";
import { PROVIDER_LIST } from "../lib/providers.js";
import { fetchModels } from "../lib/api.js";

export default function Connections() {
  const {
    overrides,
    setOverrides,
    serverStatus,
    refreshStatus,
    testResults,
    setTestResults,
    setModelCache,
    isConnected,
  } = useStore();
  const [testing, setTesting] = useState({});

  const setOverride = (provider, patch) => {
    setOverrides((prev) => {
      const next = { ...prev, [provider]: { ...prev[provider], ...patch } };
      // Drop empty override objects so "connected" state stays honest.
      Object.keys(next[provider]).forEach((k) => {
        if (!next[provider][k]) delete next[provider][k];
      });
      if (Object.keys(next[provider]).length === 0) delete next[provider];
      return next;
    });
  };

  const test = async (provider) => {
    setTesting((t) => ({ ...t, [provider]: true }));
    try {
      const res = await fetchModels(provider, overrides[provider]);
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          ok: res.ok,
          at: Date.now(),
          count: res.models?.length || 0,
          error: res.ok ? null : res.error,
        },
      }));
      if (res.ok && res.models?.length) {
        setModelCache((prev) => ({ ...prev, [provider]: res.models }));
      }
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, at: Date.now(), error: err.message },
      }));
    }
    setTesting((t) => ({ ...t, [provider]: false }));
    refreshStatus();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Connections</h1>
          <p className="page-sub">
            Wire up providers once — keys live in server env vars (recommended) or in this
            browser as a local override.
          </p>
        </div>
      </header>

      <div className="connection-grid">
        {PROVIDER_LIST.map((p) => {
          const env = serverStatus?.[p.key];
          const local = overrides[p.key] || {};
          const result = testResults[p.key];
          const connected = isConnected(p.key);

          return (
            <div key={p.key} className="connection-card" style={{ "--pcolor": p.color }}>
              <div className="connection-head">
                <div className="connection-title">
                  <span className="dot big" style={{ background: connected ? p.color : "var(--line)" }} />
                  <div>
                    <div className="connection-name">{p.name}</div>
                    <div className="connection-vendor">{p.vendor}</div>
                  </div>
                </div>
                <span className={`status-pill ${connected ? "done" : "off"}`}>
                  {connected ? "connected" : "not configured"}
                </span>
              </div>

              <div className="connection-body">
                <div className="connection-row">
                  <span className="connection-key">Server env key</span>
                  <span className={env?.configured ? "ok-text" : "muted-text"}>
                    {env?.configured ? "✓ set" : "not set"}
                  </span>
                </div>

                {p.key === "opendesign" && (
                  <>
                    <label className="field field-block">
                      <span>Base URL (your deployed open-design instance)</span>
                      <input
                        placeholder="https://open-design.yourdomain.com"
                        value={local.baseUrl || ""}
                        onChange={(e) => setOverride(p.key, { baseUrl: e.target.value })}
                      />
                    </label>
                    <label className="field field-block">
                      <span>Generate endpoint path (default /api/generate)</span>
                      <input
                        placeholder="/api/generate"
                        value={local.generatePath || ""}
                        onChange={(e) => setOverride(p.key, { generatePath: e.target.value })}
                      />
                    </label>
                  </>
                )}

                <label className="field field-block">
                  <span>
                    {p.key === "opendesign" ? "API key (optional)" : "Local key override"}
                  </span>
                  <input
                    type="password"
                    placeholder={p.keyHint}
                    value={local.apiKey || ""}
                    onChange={(e) => setOverride(p.key, { apiKey: e.target.value })}
                  />
                </label>

                <div className="connection-actions">
                  <button
                    className="primary-btn"
                    onClick={() => test(p.key)}
                    disabled={testing[p.key]}
                  >
                    {testing[p.key] ? "Testing…" : "Test connection"}
                  </button>
                  <a className="ghost-btn" href={p.docs} target="_blank" rel="noreferrer">
                    Docs ↗
                  </a>
                </div>

                {result && (
                  <div className={`test-result ${result.ok ? "ok" : "fail"}`}>
                    {result.ok
                      ? `✓ Connected — ${result.count} models available`
                      : `✕ ${result.error || "Connection failed"}`}
                    <span className="test-time">
                      {new Date(result.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="note-card">
        <b>Where keys live.</b> The recommended setup is server-side env vars (
        <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code>,{" "}
        <code>OPENDESIGN_BASE_URL</code>) — set them in Vercel or a local <code>.env</code>.
        Local overrides are stored only in this browser's localStorage and are sent only to
        your own <code>/api</code> proxy, never to third parties directly. For OpenDesign,
        deploy{" "}
        <a href="https://github.com/nexu-io/open-design" target="_blank" rel="noreferrer">
          nexu-io/open-design
        </a>{" "}
        and point the base URL at it.
      </div>
    </div>
  );
}
