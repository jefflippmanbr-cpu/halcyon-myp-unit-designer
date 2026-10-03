// Cloudflare Worker — the app's whole API, and (via the assets binding) its static files.
//
// Routes:
//  · /api/auth/*      shared-password login → HMAC-signed session token
//  · /api/messages    proxy to the Anthropic Messages API (streamed), session required
//  · /api/plans/*     saved plans behind private links, stored in the PLANS KV namespace
// Everything else falls through to the built React app; unknown paths (e.g. /p/<id>)
// get index.html so the client can route them — see wrangler.jsonc.
//
// Local `npm run dev` runs this same file under `wrangler dev`, so there is one API codebase.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorJson = (message, status) => json({ error: { message } }, status);

// ─── Session tokens ────────────────────────────────────────────────────────────
// Same scheme as the Node server: "<expiryMs>.<hex hmac>", signed with SESSION_SECRET.
const enc = new TextEncoder();

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time compare. Equal-length inputs go to timingSafeEqual; unequal lengths
// return false but still run a comparison so the mismatch isn't measurably faster.
function safeEqual(a, b) {
  const ab = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (ab.byteLength !== bb.byteLength) {
    crypto.subtle.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.subtle.timingSafeEqual(ab, bb);
}

const sessionHours = (env) => Number(env.SESSION_HOURS || 168);

async function issueToken(env) {
  const expiry = Date.now() + sessionHours(env) * 3600_000;
  return `${expiry}.${await hmacHex(env.SESSION_SECRET, String(expiry))}`;
}

async function tokenValid(env, token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [expiry, mac] = token.split(".");
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  return safeEqual(mac, await hmacHex(env.SESSION_SECRET, expiry));
}

// ─── Route handlers ────────────────────────────────────────────────────────────

function handleAuthConfig(env) {
  return json({ passwordRequired: Boolean(env.APP_PASSWORD) });
}

async function handleLogin(request, env) {
  if (!env.APP_PASSWORD) return json({ token: null, passwordRequired: false });
  if (!env.SESSION_SECRET) {
    return errorJson("Server is missing SESSION_SECRET. Set it with: wrangler secret put SESSION_SECRET", 500);
  }
  let body;
  try { body = await request.json(); } catch { return errorJson("Invalid request body.", 400); }
  const { password } = body || {};
  if (!password || !safeEqual(password, env.APP_PASSWORD)) {
    return errorJson("Incorrect password.", 401);
  }
  return json({ token: await issueToken(env), expiresInHours: sessionHours(env) });
}

async function requireSession(request, env) {
  if (!env.APP_PASSWORD) return null; // no password configured (e.g. local dev) → open
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (await tokenValid(env, token)) return null;
  return errorJson("Session expired or not signed in. Please reload and enter the password.", 401);
}

async function handleMessages(request, env) {
  // Auth first — this endpoint spends money, so it is the thing actually being protected.
  const denied = await requireSession(request, env);
  if (denied) return denied;
  if (!env.ANTHROPIC_API_KEY) {
    return errorJson("Server is missing ANTHROPIC_API_KEY. Set it with: wrangler secret put ANTHROPIC_API_KEY", 500);
  }

  let body;
  try { body = await request.json(); } catch { return errorJson("Invalid request body.", 400); }
  const { messages, system, max_tokens, output_config, stream, think } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorJson("Request body must include a non-empty messages array.", 400);
  }

  const payload = {
    model: env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: Math.min(Number(max_tokens) || 6144, 32000),
    // Adaptive thinking for structured-output calls: with a constrained JSON schema and no
    // scratch space the model can narrate its formatting deliberation into the visible
    // message. The plan compile asks for it explicitly (`think`) because it has to hold the
    // whole unit together. Other plain calls stay cheaper without it.
    thinking: output_config || think ? { type: "adaptive" } : { type: "disabled" },
    system,
    messages,
  };
  if (output_config) payload.output_config = output_config;
  if (stream) payload.stream = true;

  // 429/5xx (notably 529 "overloaded") are transient. Absorb them here so a teacher
  // doesn't lose their turn mid-conversation. Waiting on fetch costs no CPU time.
  // Retries only happen before any output is sent: once a stream starts it is passed
  // through untouched, and a mid-stream failure surfaces to the client as an error event.
  let upstream;
  for (let attempt = 0; attempt < 4; attempt++) {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const retryable = upstream.status === 429 || upstream.status >= 500;
    if (!retryable || attempt === 3) break;
    await upstream.body?.cancel();
    const retryAfter = Number(upstream.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250;
    console.warn(`Upstream ${upstream.status}; retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  if (stream && upstream.ok) {
    // Piped straight through — the Worker doesn't parse the stream, so it costs ~no CPU.
    return new Response(upstream.body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
  return json(await upstream.json(), upstream.status);
}

// ─── Saved plans (private links) ───────────────────────────────────────────────
// A finished plan can be saved under an unguessable id and opened by anyone with the link
// — including people outside Halcyon, which is the point. Creating one needs a session
// (it uses storage on our account); reading one doesn't. Updating or deleting needs the
// edit key returned at creation, which only the creating browser holds. Only its SHA-256
// hash is stored, so the KV contents alone can't be used to edit a plan.
const MAX_PLAN_CHARS = 300_000;
const ID_RE = /^[A-Za-z0-9_-]{16,40}$/;

function randomId(bytes) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function readPlanBody(request) {
  let body;
  try { body = await request.json(); } catch { return [null, errorJson("Invalid request body.", 400)]; }
  const markdown = typeof body?.markdown === "string" ? body.markdown : "";
  const title = typeof body?.title === "string" ? body.title.slice(0, 200) : "Unit Plan";
  if (!markdown.trim()) return [null, errorJson("A plan needs some content.", 400)];
  if (markdown.length > MAX_PLAN_CHARS) return [null, errorJson("That plan is too large to save.", 413)];
  return [{ title, markdown }, null];
}
const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

async function handleCreatePlan(request, env) {
  const denied = await requireSession(request, env);
  if (denied) return denied;
  const [plan, bad] = await readPlanBody(request);
  if (bad) return bad;
  const id = randomId(16);          // 128 bits — not guessable, not enumerable
  const editKey = randomId(24);
  const now = Date.now();
  await env.PLANS.put(`plan:${id}`, JSON.stringify({
    v: 1, ...plan, createdAt: now, updatedAt: now, editKeyHash: await sha256Hex(editKey),
  }));
  return json({ id, editKey }, 201);
}

async function loadOwned(request, env, id) {
  if (!ID_RE.test(id)) return [null, errorJson("Not found.", 404)];
  const stored = await env.PLANS.get(`plan:${id}`, "json");
  if (!stored) return [null, errorJson("Not found.", 404)];
  const key = request.headers.get("x-edit-key") || "";
  if (!key || !safeEqual(await sha256Hex(key), stored.editKeyHash)) {
    return [null, errorJson("This browser doesn't have permission to change that plan.", 403)];
  }
  return [stored, null];
}

async function handleGetPlan(env, id) {
  if (!ID_RE.test(id)) return errorJson("Not found.", 404);
  const stored = await env.PLANS.get(`plan:${id}`, "json");
  if (!stored) return errorJson("Not found.", 404);
  const { editKeyHash, ...pub } = stored;
  return new Response(JSON.stringify(pub), { headers: { "Content-Type": "application/json", ...noStore } });
}

async function handleUpdatePlan(request, env, id) {
  const denied = await requireSession(request, env);
  if (denied) return denied;
  const [stored, err] = await loadOwned(request, env, id);
  if (err) return err;
  const [plan, bad] = await readPlanBody(request);
  if (bad) return bad;
  await env.PLANS.put(`plan:${id}`, JSON.stringify({ ...stored, ...plan, updatedAt: Date.now() }));
  return json({ id });
}

async function handleDeletePlan(request, env, id) {
  const [, err] = await loadOwned(request, env, id);
  if (err) return err;
  await env.PLANS.delete(`plan:${id}`);
  return json({ deleted: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    try {
      if (pathname === "/api/auth/config" && request.method === "GET") return handleAuthConfig(env);
      if (pathname === "/api/auth/login"  && request.method === "POST") return handleLogin(request, env);
      if (pathname === "/api/messages"    && request.method === "POST") return handleMessages(request, env);
      if (pathname === "/api/plans"       && request.method === "POST") return handleCreatePlan(request, env);
      const planMatch = pathname.match(/^\/api\/plans\/([^/]+)$/);
      if (planMatch) {
        const id = decodeURIComponent(planMatch[1]);
        if (request.method === "GET")    return handleGetPlan(env, id);
        if (request.method === "PUT")    return handleUpdatePlan(request, env, id);
        if (request.method === "DELETE") return handleDeletePlan(request, env, id);
      }
      if (pathname.startsWith("/api/")) return errorJson("Not found.", 404);
    } catch (err) {
      return errorJson(`Server error: ${err.message}`, 502);
    }

    // Anything non-/api reaches here only if run_worker_first matched; hand it to assets.
    return env.ASSETS.fetch(request);
  },
};
