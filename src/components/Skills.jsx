import React, { useMemo, useRef, useState } from "react";
import { useStore, newId } from "../store.jsx";
import { useRunner, templateVars, fillTemplate } from "../lib/runner.js";
import { PROVIDERS, PROVIDER_LIST, FALLBACK_MODELS } from "../lib/providers.js";

const EMPTY_SKILL = {
  name: "",
  description: "",
  tags: [],
  provider: "anthropic",
  template: "",
};

export default function Skills({ openInConsole }) {
  const { skills, setSkills, modelCache } = useStore();
  const execute = useRunner();

  const [active, setActive] = useState(null); // skill being run
  const [editing, setEditing] = useState(null); // skill being edited (or "new")
  const [values, setValues] = useState({});
  const [runProvider, setRunProvider] = useState("anthropic");
  const [runModel, setRunModel] = useState(PROVIDERS.anthropic.defaultModel);
  const [output, setOutput] = useState("");
  const [runState, setRunState] = useState("idle"); // idle | running | done | error
  const [filter, setFilter] = useState("");
  const abortRef = useRef(null);

  const tags = useMemo(() => {
    const t = new Set();
    skills.forEach((s) => (s.tags || []).forEach((x) => t.add(x)));
    return [...t].sort();
  }, [skills]);

  const visible = skills.filter(
    (s) =>
      !filter ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      (s.tags || []).includes(filter)
  );

  const openRun = (skill) => {
    setActive(skill);
    setEditing(null);
    setValues({});
    setOutput("");
    setRunState("idle");
    const p = skill.provider && PROVIDERS[skill.provider] ? skill.provider : "anthropic";
    setRunProvider(p);
    setRunModel(modelCache[p]?.[0]?.id || PROVIDERS[p].defaultModel);
  };

  const vars = active ? templateVars(active.template) : [];
  const prompt = active ? fillTemplate(active.template, values) : "";

  const run = async () => {
    if (!active || runState === "running") return;
    setRunState("running");
    setOutput("");
    abortRef.current = new AbortController();
    const result = await execute({
      provider: runProvider,
      model: runModel,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4096,
      kind: "skill",
      label: `skill: ${active.name}`,
      project: "Skills",
      signal: abortRef.current.signal,
      onDelta: (_, full) => setOutput(full),
    });
    if (result.ok) {
      setOutput(result.output || "(empty response)");
      setRunState("done");
    } else {
      setOutput(result.error);
      setRunState("error");
    }
  };

  const saveSkill = (skill) => {
    if (skill.id) {
      setSkills((prev) => prev.map((s) => (s.id === skill.id ? skill : s)));
    } else {
      setSkills((prev) => [{ ...skill, id: newId("skill") }, ...prev]);
    }
    setEditing(null);
  };

  const deleteSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    if (active?.id === id) setActive(null);
    setEditing(null);
  };

  const runModels = modelCache[runProvider]?.length
    ? modelCache[runProvider]
    : FALLBACK_MODELS[runProvider];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Skills</h1>
          <p className="page-sub">Reusable prompt templates — fill the blanks, pick a model, run.</p>
        </div>
        <div className="header-controls">
          <input
            className="search"
            placeholder="Filter skills…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="primary-btn" onClick={() => setEditing({ ...EMPTY_SKILL })}>
            + New skill
          </button>
        </div>
      </header>

      {tags.length > 0 && (
        <div className="tag-row">
          {tags.map((t) => (
            <button
              key={t}
              className={`tag ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(filter === t ? "" : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="skills-layout">
        <div className="skills-grid">
          {visible.map((s) => (
            <div
              key={s.id}
              className={`skill-card ${active?.id === s.id ? "active" : ""}`}
              onClick={() => openRun(s)}
            >
              <div className="skill-card-top">
                <span className="skill-name">{s.name}</span>
                <span
                  className="chip"
                  style={{ color: PROVIDERS[s.provider]?.color || "var(--muted)" }}
                >
                  {PROVIDERS[s.provider]?.name || "any"}
                </span>
              </div>
              <p className="skill-desc">{s.description}</p>
              <div className="skill-card-bottom">
                <span className="skill-vars">
                  {templateVars(s.template).map((v) => `{{${v}}}`).join(" ") || "no variables"}
                </span>
                <button
                  className="mini-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing({ ...s });
                  }}
                >
                  edit
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="empty-note">No skills match.</p>}
        </div>

        {active && (
          <div className="run-panel">
            <div className="run-panel-head">
              <h2>{active.name}</h2>
              <button className="mini-btn" onClick={() => setActive(null)}>
                close
              </button>
            </div>

            {vars.map((v) => (
              <label key={v} className="field field-block">
                <span>{v}</span>
                <textarea
                  rows={v.toLowerCase().includes("note") ? 4 : 2}
                  value={values[v] || ""}
                  onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                />
              </label>
            ))}

            <div className="run-panel-controls">
              <label className="field">
                <span>Provider</span>
                <select
                  value={runProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setRunProvider(p);
                    setRunModel(modelCache[p]?.[0]?.id || PROVIDERS[p].defaultModel);
                  }}
                >
                  {PROVIDER_LIST.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Model</span>
                <select value={runModel} onChange={(e) => setRunModel(e.target.value)}>
                  {runModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label || m.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="run-panel-actions">
              {runState === "running" ? (
                <button className="danger-btn" onClick={() => abortRef.current?.abort()}>
                  ■ Stop
                </button>
              ) : (
                <button className="primary-btn" onClick={run}>
                  Run skill
                </button>
              )}
              <button
                className="ghost-btn"
                onClick={() =>
                  openInConsole({
                    prompt,
                    provider: runProvider,
                    model: runModel,
                    project: "Skills",
                  })
                }
              >
                Open in Console →
              </button>
            </div>

            {(output || runState === "running") && (
              <div className={`run-output ${runState === "error" ? "error" : ""}`}>
                <div className="run-output-head">
                  {runState === "running" ? (
                    <span className="pulse">streaming…</span>
                  ) : runState === "error" ? (
                    "error"
                  ) : (
                    "output"
                  )}
                  {output && runState !== "running" && (
                    <button className="mini-btn" onClick={() => navigator.clipboard?.writeText(output)}>
                      copy
                    </button>
                  )}
                </div>
                <div className="pre">{output}{runState === "running" ? "▌" : ""}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <SkillEditor
          skill={editing}
          onSave={saveSkill}
          onDelete={editing.id ? () => deleteSkill(editing.id) : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SkillEditor({ skill, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState({ ...skill, tags: (skill.tags || []).join(", ") });
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{skill.id ? "Edit skill" : "New skill"}</h2>
        <label className="field field-block">
          <span>Name</span>
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="field field-block">
          <span>Description</span>
          <input value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <div className="modal-row">
          <label className="field">
            <span>Preferred provider</span>
            <select value={draft.provider} onChange={(e) => set("provider", e.target.value)}>
              {PROVIDER_LIST.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tags (comma separated)</span>
            <input value={draft.tags} onChange={(e) => set("tags", e.target.value)} />
          </label>
        </div>
        <label className="field field-block">
          <span>
            Template — use <code>{"{{variable}}"}</code> for fill-ins
          </span>
          <textarea
            rows={8}
            value={draft.template}
            onChange={(e) => set("template", e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button
            className="primary-btn"
            disabled={!draft.name.trim() || !draft.template.trim()}
            onClick={() =>
              onSave({
                ...draft,
                tags: draft.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          >
            Save
          </button>
          <button className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          {onDelete && (
            <button className="danger-btn right" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
