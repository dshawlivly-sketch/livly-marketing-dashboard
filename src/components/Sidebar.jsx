import React from "react";
import { useStore } from "../store.jsx";
import { PROVIDER_LIST } from "../lib/providers.js";

const NAV = [
  { key: "console", label: "Console", icon: "▸" },
  { key: "skills", label: "Skills", icon: "✦" },
  { key: "agents", label: "Agents", icon: "◉" },
  { key: "connections", label: "Connections", icon: "⇄" },
];

export default function Sidebar({ page, onNavigate }) {
  const { isConnected, runs, testResults } = useStore();
  const running = runs.filter((r) => r.status === "running").length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-bolt">⚡</span>
        <div>
          <div className="brand-name">Harness</div>
          <div className="brand-sub">visual AI console</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${page === item.key ? "active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.key === "agents" && running > 0 && (
              <span className="nav-badge">{running}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-title">Providers</div>
        {PROVIDER_LIST.map((p) => {
          const connected = isConnected(p.key);
          const test = testResults[p.key];
          const state = !connected
            ? "off"
            : test && !test.ok
              ? "warn"
              : "on";
          return (
            <div key={p.key} className="provider-row" title={p.vendor}>
              <span className={`dot dot-${state}`} style={connected && state === "on" ? { background: p.color } : undefined} />
              <span className="provider-row-name">{p.name}</span>
              <span className="provider-row-state">
                {state === "on" ? "ready" : state === "warn" ? "check" : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
