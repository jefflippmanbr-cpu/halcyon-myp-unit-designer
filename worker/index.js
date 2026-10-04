// Cloudflare Worker — the app's whole API, and (via the assets binding) its static files.
//
// Routes:
//  · /api/auth/*      shared-password login → HMAC-signed session token
//  · /api/messages    proxy to the Anthropic Messages API (streamed), session required
//  · /api/plans/*     saved plans behind private links, stored in the PLANS KV namespace
//  · /api/check-links verifies resource links before teachers see them, session required
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
  const { messages, system, max_tokens, output_config, stream, think, web } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorJson("Request body must include a non-empty messages array.", 400);
  }

  const payload = {
    model: env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: Math.min(Number(max_tokens) || 6144, 32000),
    // Adaptive thinking for structured-output calls: with a constrained JSON schema and no
    // scratch space the model can narrate its formatting deliberation into the visible
    // message. Plain calls (including the plan compile) run without it: for the compile it
    // added a minute of blank screen for no measurable gain. `think` remains available.
    thinking: output_config || think ? { type: "adaptive" } : { type: "disabled" },
    system: cachedSystem(system),
    messages: cachedMessages(messages),
  };
  if (output_config) payload.output_config = output_config;
  if (stream) payload.stream = true;
  // Web access is configured here, not by the client, so a request can only switch on
  // these two tools with these limits — never arbitrary tools or unlimited searches.
  if (web) payload.tools = webTools(web);

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
        ...(payload.tools?.some(t => t.name === "web_fetch") ? { "anthropic-beta": "web-fetch-2025-09-10" } : {}),
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

// ─── Prompt caching ────────────────────────────────────────────────────────────
// The coach's instructions (~15k tokens) are identical on every turn, and the conversation
// only grows at the end. Marking cache breakpoints lets Anthropic re-read that prefix from
// cache at ~10% of the normal input price — on every turn, and on every step within a
// turn that uses web search (where the whole context is otherwise re-billed per search).
// `system` may be a string, or an array of strings: [stable part, per-turn part]. Only the
// first part is cached, so the per-turn unit record can change without breaking the cache.
const EPHEMERAL = { type: "ephemeral" };
function cachedSystem(system) {
  const parts = Array.isArray(system) ? system.filter(x => typeof x === "string" && x) : [system];
  return parts.map((text, i) => (i === 0 ? { type: "text", text, cache_control: EPHEMERAL } : { type: "text", text }));
}
function cachedMessages(messages) {
  const out = messages.map(m => ({ ...m }));
  const last = out[out.length - 1];
  if (!last) return out;
  const blocks = typeof last.content === "string" ? [{ type: "text", text: last.content }] : [...last.content];
  const i = blocks.length - 1;
  if (blocks[i] && typeof blocks[i] === "object") blocks[i] = { ...blocks[i], cache_control: EPHEMERAL };
  last.content = blocks;
  return out;
}

// ─── Web access for the coach ──────────────────────────────────────────────────
// Server-side tools run by Anthropic: the model searches or reads a page mid-reply.
// Configured here, not by the client, so a request can only switch on these tools with
// these caps. Every search result and fetched page is re-read on each further step of
// the reply, so input grows fast: an uncapped test turn used ~250k input tokens. Hence:
//   mode "research" — up to 2 searches, no page reading (resources, experts, places)
//   mode "read"     — read up to 2 pages the teacher pasted, plus 1 search
const WEB_MODES = {
  research: { searches: 2, fetches: 0 },
  read: { searches: 1, fetches: 2 },
};
function webTools(web) {
  const mode = WEB_MODES[web?.mode] || WEB_MODES.research;
  const tools = [];
  if (mode.searches) {
    const search = { type: "web_search_20250305", name: "web_search", max_uses: mode.searches };
    const loc = web?.location;
    if (loc && (loc.city || loc.country)) {
      search.user_location = {
        type: "approximate",
        ...(loc.city ? { city: String(loc.city).slice(0, 80) } : {}),
        ...(/^[A-Za-z]{2}$/.test(loc.country || "") ? { country: loc.country.toUpperCase() } : {}),
      };
    }
    tools.push(search);
  }
  if (mode.fetches) tools.push({ type: "web_fetch_20250910", name: "web_fetch", max_uses: mode.fetches, max_content_tokens: 6000 });
  return tools;
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

// ─── Link checking ─────────────────────────────────────────────────────────────
// Resources come with clickable links, but a model can produce a plausible URL that 404s.
// Every link is checked here before a teacher sees it. The client keeps only confirmed
// links; any other link becomes plain text with a direction to search for it. `fallback`
// tells the client whether the site itself answers (so it can say "search on <site>").
// Only public http(s) hosts are fetched (no IPs, localhost or internal names), so this
// can't be pointed at anything private.
const MAX_LINKS = 10;               // Workers allow 50 subrequests; a link may take up to 4
const LINK_TIMEOUT_MS = 7000;
const BLOCKED = new Set([401, 403, 405, 406, 429, 999]);   // bot walls: the site exists
const SOFT_404 = /<title[^>]*>[^<]*(404|not found|page not found|doesn.t exist|no longer available)[^<]*<\/title>/i;
// Bot-check interstitials also arrive as 200s; they say nothing about whether the page exists.
const CHALLENGE = /<title[^>]*>[^<]*(client challenge|just a moment|attention required|access denied|are you a robot|security check|captcha|verify you are human)[^<]*<\/title>/i;

function publicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || h === "localhost" ||
      /\.(local|internal|localhost|test|example|invalid)$/.test(h)) return null;
  return u;
}

// The runtime reports a DNS failure and an unparseable response the same way, so when a
// fetch errors, ask DNS-over-HTTPS whether the host exists at all.
async function hostExists(hostname) {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(4000),
    });
    const d = await r.json();
    return d.Status === 0 && Array.isArray(d.Answer) && d.Answer.length > 0;
  } catch { return true; }   // can't tell — don't condemn the link on a failed lookup
}

async function probe(url) {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HalcyonLinkCheck/1.0; +https://halcyonschool.com)",
        "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
      },
    });
    if (BLOCKED.has(r.status)) { r.body?.cancel(); return "blocked"; }
    if (!r.ok) { r.body?.cancel(); return "dead"; }
    if ((r.headers.get("content-type") || "").includes("text/html")) {
      // Some sites answer 200 with a "page not found" page. The <title> gives it away.
      const reader = r.body.getReader(); let head = ""; const dec = new TextDecoder();
      while (head.length < 40000) { const { done, value } = await reader.read(); if (done) break; head += dec.decode(value, { stream: true }); if (/<\/title>/i.test(head)) break; }
      reader.cancel();
      if (SOFT_404.test(head)) return "dead";
      if (CHALLENGE.test(head)) return "blocked";
    } else r.body?.cancel();
    return "ok";
  } catch (e) {
    // The runtime itself occasionally can't handle a site's response ("internal error")
    // though the site is fine in a browser — that's "can't tell", not "dead". DNS
    // failures, refused connections and timeouts are dead.
    if (/internal error/i.test(e.message)) return (await hostExists(new URL(url).hostname)) ? "blocked" : "dead";
    return "dead";
  }
}

async function handleCheckLinks(request, env) {
  const denied = await requireSession(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return errorJson("Invalid request body.", 400); }
  const urls = [...new Set((body?.urls || []).filter(u => typeof u === "string"))].slice(0, MAX_LINKS);
  const results = {};
  const originCache = new Map();
  await Promise.all(urls.map(async (raw) => {
    const u = publicUrl(raw);
    if (!u) { results[raw] = { status: "dead", fallback: null }; return; }
    const isHome = u.pathname === "/" && !u.search;
    let status = await probe(u.href);
    // Slow sites time out when many links are checked at once; one retry avoids
    // condemning a working link for being slow.
    if (status === "dead") status = await probe(u.href);
    // A bot wall on the home page still proves the site exists; on a deep link it proves
    // nothing about the page, so fall back to the home page rather than trust a guess.
    if (status === "ok" || (status === "blocked" && isHome)) { results[raw] = { status: "ok" }; return; }
    if (!originCache.has(u.origin)) originCache.set(u.origin, probe(u.origin + "/"));
    const o = await originCache.get(u.origin);
    results[raw] = { status, fallback: o === "dead" ? null : u.origin + "/" };
  }));
  return json({ results });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    try {
      if (pathname === "/api/auth/config" && request.method === "GET") return handleAuthConfig(env);
      if (pathname === "/api/auth/login"  && request.method === "POST") return handleLogin(request, env);
      if (pathname === "/api/messages"    && request.method === "POST") return handleMessages(request, env);
      if (pathname === "/api/plans"       && request.method === "POST") return handleCreatePlan(request, env);
      if (pathname === "/api/check-links" && request.method === "POST") return handleCheckLinks(request, env);
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
