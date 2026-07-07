import React, { useMemo, useState } from "react";
import { useStore } from "../store.jsx";
import { PROVIDERS, PROVIDER_LIST } from "../lib/providers.js";

function fmtDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Agents() {
  const { runs, clearRuns } = useStore();
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const projects = useMemo(
    () => [...new Set(runs.map((r) => r.project || "General"))],
    [runs]
  );

  const filtered = runs.filter(
    (r) =>
      (providerFilter === "all" || r.provider === providerFilter) &&
      (statusFilter === "all" || r.status === statusFilter) &&
      (projectFilter === "all" || (r.project || "General") === projectFilter)
  );

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 86400e3;
    const recent = runs.filter((r) => r.ts > dayAgo);
    const finished = recent.filter((r) => r.status === "done" || r.status === "error");
    const ok = recent.filter((r) => r.status === "done");
    const avg =
      ok.length > 0
        ? Math.round(ok.reduce((sum, r) => sum + (r.durationMs || 0), 0) / ok.length)
        : null;
    const tokens = recent.reduce(
      (sum, r) => sum + (r.usage ? (r.usage.input || 0) + (r.usage.output || 0) : 0),
      0
    );
    return {
      active: runs.filter((r) => r.status === "running").length,
      today: recent.length,
      successRate: finished.length ? Math.round((ok.length / finished.length) * 100) : null,
      avgLatency: avg,
      tokens,
    };
  }, [runs]);

  // Group by day for the feed
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const day = fmtDay(r.ts);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(r);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Agents</h1>
          <p className="page-sub">Live status and history for every run across the harness.</p>
        </div>
        <div className="header-controls">
          {runs.length > 0 && (
            <button className="ghost-btn" onClick={clearRuns}>
              Clear history
            </button>
          )}
        </div>
      </header>

      <div className="stat-tiles">
        <StatTile label="Active now" value={stats.active} accent={stats.active > 0} />
        <StatTile label="Runs (24h)" value={stats.today} />
        <StatTile
          label="Success rate"
          value={stats.successRate == null ? "—" : `${stats.successRate}%`}
        />
        <StatTile label="Avg latency" value={fmtDuration(stats.avgLatency)} />
        <StatTile
          label="Tokens (24h)"
          value={stats.tokens ? stats.tokens.toLocaleString() : "—"}
        />
      </div>

      <div className="filter-row">
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
          <option value="all">All providers</option>
          {PROVIDER_LIST.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="done">Done</option>
          <option value="error">Error</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-glyph">◉</div>
          <p>
            Nothing here yet. Every Console prompt, Skill run, and Compare fan-out
            <br />
            shows up on this board with live status.
          </p>
        </div>
      ) : (
        groups.map(([day, dayRuns]) => (
          <div key={day} className="run-group">
            <div className="run-group-title">{day}</div>
            {dayRuns.map((r) => (
              <div
                key={r.id}
                className={`run-row ${expanded === r.id ? "open" : ""}`}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="run-row-main">
                  <span className={`status-pill ${r.status}`}>
                    {r.status === "running" && <span className="spinner" />}
                    {r.status}
                  </span>
                  <span className="chip" style={{ color: PROVIDERS[r.provider]?.color }}>
                    {PROVIDERS[r.provider]?.name || r.provider}
                  </span>
                  <span className="run-label" title={r.label}>
                    {r.label}
                  </span>
                  <span className="run-kind">{r.kind}</span>
                  <span className="run-meta">
                    {r.project && r.project !== "General" ? `${r.project} · ` : ""}
                    {r.model} · {fmtTime(r.ts)} · {fmtDuration(r.durationMs)}
                    {r.usage
                      ? ` · ${((r.usage.input || 0) + (r.usage.output || 0)).toLocaleString()} tok`
                      : ""}
                  </span>
                </div>
                {expanded === r.id && (
                  <div className="run-detail" onClick={(e) => e.stopPropagation()}>
                    {r.promptPreview && (
                      <div className="run-detail-section">
                        <span className="run-detail-label">prompt</span>
                        <div className="pre small">{r.promptPreview}</div>
                      </div>
                    )}
                    {r.error && (
                      <div className="run-detail-section">
                        <span className="run-detail-label">error</span>
                        <div className="pre small error-text">{r.error}</div>
                      </div>
                    )}
                    {r.output && (
                      <div className="run-detail-section">
                        <span className="run-detail-label">output</span>
                        <div className="pre small">{r.output}</div>
                      </div>
                    )}
                    {r.assets?.length > 0 && (
                      <div className="run-detail-section">
                        <span className="run-detail-label">assets</span>
                        <div className="asset-strip">
                          {r.assets.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="generated asset" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className={`stat-tile ${accent ? "accent" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
