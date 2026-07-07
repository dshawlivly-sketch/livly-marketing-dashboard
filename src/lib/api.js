// Frontend client for the /api proxy routes.

export async function fetchStatus() {
  const resp = await fetch("/api/status");
  if (!resp.ok) throw new Error(`status ${resp.status}`);
  return resp.json();
}

export async function fetchModels(provider, overrides) {
  const resp = await fetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, overrides }),
  });
  if (!resp.ok) throw new Error(`models ${resp.status}`);
  return resp.json();
}

// Async generator yielding {type:"delta"|"done"|"error", ...} events.
export async function* streamChat(payload, signal) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      msg = (await resp.json()).error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop();
    for (const evt of events) {
      const line = evt.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      yield JSON.parse(line.slice(6));
    }
  }
}
