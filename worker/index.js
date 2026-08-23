// Cloudflare Worker — same API surface as server/index.js, ported to the edge runtime.
//
// Differences from the Node/Express version, and why:
//  · No Express. Workers get a single fetch() handler, so routing is done by hand.
//  · No node:crypto. HMAC uses the Web Crypto API, and constant-time comparison uses
//    crypto.subtle.timingSafeEqual (a Cloudflare extension) instead of Node's.
//  · No process.env. Config arrives per-request as the `env` binding.
//  · Static files are served by the platform via the assets binding, so there is no
//    express.static equivalent here — see wrangler.jsonc.
//
// server/index.js is kept for local `npm run dev`; this file is what runs in production.

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

const sessionHours = (env) => Number(env.SESSION_HOURS || 12);

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

async function handleMessages(request, env) {
  // Auth first — this endpoint spends money, so it is the thing actually being protected.
  if (env.APP_PASSWORD) {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!(await tokenValid(env, token))) {
      return errorJson("Session expired or not signed in. Please reload and enter the password.", 401);
    }
  }
  if (!env.ANTHROPIC_API_KEY) {
    return errorJson("Server is missing ANTHROPIC_API_KEY. Set it with: wrangler secret put ANTHROPIC_API_KEY", 500);
  }

  let body;
  try { body = await request.json(); } catch { return errorJson("Invalid request body.", 400); }
  const { messages, system, max_tokens, output_config } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorJson("Request body must include a non-empty messages array.", 400);
  }

  const payload = {
    model: env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: max_tokens || 6144,
    // Adaptive thinking for structured-output calls: with a constrained JSON schema and no
    // scratch space the model can narrate its formatting deliberation into the visible
    // message. Plain calls don't have that failure mode, so they stay cheaper.
    thinking: output_config ? { type: "adaptive" } : { type: "disabled" },
    system,
    messages,
  };
  if (output_config) payload.output_config = output_config;

  // 429/5xx (notably 529 "overloaded") are transient. Absorb them here so a teacher
  // doesn't lose their turn mid-conversation. Waiting on fetch costs no CPU time.
  let upstream, data;
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
    data = await upstream.json();
    const retryable = upstream.status === 429 || upstream.status >= 500;
    if (!retryable || attempt === 3) break;
    const retryAfter = Number(upstream.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250;
    console.warn(`Upstream ${upstream.status}; retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  return json(data, upstream.status);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    try {
      if (pathname === "/api/auth/config" && request.method === "GET") return handleAuthConfig(env);
      if (pathname === "/api/auth/login"  && request.method === "POST") return handleLogin(request, env);
      if (pathname === "/api/messages"    && request.method === "POST") return handleMessages(request, env);
      if (pathname.startsWith("/api/")) return errorJson("Not found.", 404);
    } catch (err) {
      return errorJson(`Server error: ${err.message}`, 502);
    }

    // Anything non-/api reaches here only if run_worker_first matched; hand it to assets.
    return env.ASSETS.fetch(request);
  },
};
