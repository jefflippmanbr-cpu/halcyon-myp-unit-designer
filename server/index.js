import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// ─── Shared-password gate ──────────────────────────────────────────────────────
// The point of this is to protect the ANTHROPIC_API_KEY, not the UI: the frontend
// holds no secrets, but /api/messages spends real money, so THAT is what's gated.
// A UI-only password would be bypassed by POSTing to the endpoint directly.
const APP_PASSWORD = process.env.APP_PASSWORD;
// Signing secret for session tokens. Generated per-boot if unset, which is fine but
// means a restart logs everyone out — set it in the environment to avoid that.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 168);

// Compare without leaking length/content through timing.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Still burn a comparison so a wrong length isn't measurably faster.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

const sign = (payload) => crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
const issueToken = () => {
  const expiry = Date.now() + SESSION_HOURS * 3600_000;
  return `${expiry}.${sign(String(expiry))}`;
};
function tokenValid(token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [expiry, mac] = token.split(".");
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  return safeEqual(mac, sign(expiry));
}

// Tells the frontend whether to show a login screen at all.
app.get("/api/auth/config", (_req, res) => res.json({ passwordRequired: Boolean(APP_PASSWORD) }));

app.post("/api/auth/login", (req, res) => {
  if (!APP_PASSWORD) return res.json({ token: null, passwordRequired: false });
  const { password } = req.body || {};
  if (!password || !safeEqual(password, APP_PASSWORD)) {
    return res.status(401).json({ error: { message: "Incorrect password." } });
  }
  res.json({ token: issueToken(), expiresInHours: SESSION_HOURS });
});

function requireAuth(req, res, next) {
  if (!APP_PASSWORD) return next(); // no password configured (e.g. local dev) → open
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!tokenValid(token)) {
    return res.status(401).json({ error: { message: "Session expired or not signed in. Please reload and enter the password." } });
  }
  next();
}

app.post("/api/messages", requireAuth, async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: { message: "Server is missing ANTHROPIC_API_KEY. Add it to .env and restart." } });
  }
  const { messages, system, max_tokens, output_config } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: "Request body must include a non-empty messages array." } });
  }
  try {
    const payload = {
      model: MODEL,
      max_tokens: max_tokens || 6144,
      // Adaptive thinking ON for structured-output calls. Disabling it is cheaper, but with
      // a constrained JSON schema the model has no scratch space and can narrate its own
      // formatting deliberation into the visible message (stray braces, non-English tokens,
      // "let's answer properly…"). A teacher saw exactly that. Correctness beats the tokens.
      // Plain calls (no schema) keep thinking off — they don't have the same failure mode.
      thinking: output_config ? { type: "adaptive" } : { type: "disabled" },
      system,
      messages,
    };
    if (output_config) payload.output_config = output_config;

    // 429/5xx (notably 529 "overloaded") are transient. Without a retry the teacher loses
    // their turn mid-conversation and has to retype it, so absorb them here with backoff.
    let upstream, data;
    for (let attempt = 0; attempt < 4; attempt++) {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
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
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Could not reach Anthropic API: ${err.message}` } });
  }
});

// Serve the built frontend in production
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => { if (err) next(); });
});

// API_PORT first so local `npm run dev` keeps its own port (the dev harness sets PORT for
// Vite, which would otherwise collide). In production API_PORT is unset and hosts like
// Render/Railway inject PORT, which is what we bind to. 0.0.0.0 is required on those hosts.
const PORT = process.env.API_PORT || process.env.PORT || 8787;
app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on port ${PORT}`));
