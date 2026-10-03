// ─── Server calls ──────────────────────────────────────────────────────────────

// The session token is issued and verified server-side; the browser only stores it.
const TOKEN_KEY = "halcyon_session";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

export class AuthError extends Error {}
const OFFLINE = "Couldn't reach the server — check your connection, then try again.";

const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Streams a Messages API call through /api/messages and resolves with the full text.
// onText(textSoFar) fires as text arrives; thinking deltas are skipped (they aren't shown).
// Streaming matters most for the plan compile (~1 minute), but it also means no request is
// ever at risk of an idle-connection timeout, so the token ceiling can be generous.
export async function streamMessage({ system, messages, maxTokens = 16000, schema = null, think = false, onText }) {
  const body = { system, messages, max_tokens: maxTokens, stream: true };
  if (schema) body.output_config = { format: { type: "json_schema", schema } };
  if (think) body.think = true;

  let r;
  try {
    r = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch { throw new Error(OFFLINE); }
  if (r.status === 401) { setToken(null); throw new AuthError("Session expired — please sign in again."); }
  if (!r.ok || !(r.headers.get("content-type") || "").includes("text/event-stream")) {
    let msg = `Request failed (${r.status}).`;
    try { const d = await r.json(); msg = d?.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", text = "", stopReason = null;
  for (;;) {
    let chunk;
    try { chunk = await reader.read(); } catch { throw new Error("The connection dropped partway through the reply. Try again."); }
    const { done, value } = chunk;
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, cut); buf = buf.slice(cut + 2);
      const data = block.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
      if (!data) continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
        text += ev.delta.text; onText?.(text);
      } else if (ev.type === "message_delta") {
        stopReason = ev.delta?.stop_reason ?? stopReason;
      } else if (ev.type === "error") {
        throw new Error(ev.error?.message || "The model stream failed.");
      }
    }
  }
  if (!text) throw new Error("The model returned an empty response.");
  return { text, stopReason };
}

// Asks the server to check links (≤10 per call). Returns {url: {status, fallback}}, or {}
// if the check itself fails — in which case the caller treats the links as unverified.
export async function checkLinks(urls) {
  try {
    const r = await fetch("/api/check-links", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ urls }),
    });
    if (!r.ok) return {};
    return (await r.json()).results || {};
  } catch { return {}; }
}

// ─── Saved plans (private links) ───────────────────────────────────────────────
export async function savePlan({ id, editKey, title, markdown }) {
  const r = await fetch(id ? `/api/plans/${id}` : "/api/plans", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(editKey ? { "X-Edit-Key": editKey } : {}) },
    body: JSON.stringify({ title, markdown }),
  });
  if (r.status === 401) { setToken(null); throw new AuthError("Session expired — please sign in again."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(d?.error?.message || `Couldn't save the plan (${r.status}).`);
    err.status = r.status; throw err;
  }
  return d; // {id, editKey?}
}

export async function fetchPlan(id) {
  const r = await fetch(`/api/plans/${encodeURIComponent(id)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 404 ? "This plan link doesn't exist, or it has been deleted." : (d?.error?.message || "Couldn't load this plan."));
  return d; // {title, markdown, createdAt, updatedAt}
}

export async function deletePlan({ id, editKey }) {
  const r = await fetch(`/api/plans/${id}`, { method: "DELETE", headers: { "X-Edit-Key": editKey } });
  if (!r.ok && r.status !== 404) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d?.error?.message || "Couldn't delete the plan.");
  }
}

export const planUrl = (id) => `${location.origin}/p/${id}`;
