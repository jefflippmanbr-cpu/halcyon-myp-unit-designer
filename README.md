# Halcyon MYP Unit Designer

A 14-step MYP unit design coach for teachers at Halcyon London International School, built on
three frameworks: the **IB Enhanced MYP**, the **Transcend 6 Leaps**, and the **PBLWorks Gold
Standard**.

Teachers either design a new unit from scratch or upload an existing one for diagnosis and
rebuild, and finish with a downloadable Word-format unit plan.

---

## Deploying to Cloudflare Workers

The app deploys as a single Worker that serves both the API and the built React app.
Waiting on the Anthropic API costs no CPU time on Workers, so even the long final
compile is fine.

### 1. Push to GitHub (already done)

```bash
git push
```

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

Opens a browser to authorise. Free Cloudflare account is enough to start.

### 3. Set the three secrets

These are stored encrypted by Cloudflare and never appear in the repo:

```bash
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Anthropic key
npx wrangler secret put APP_PASSWORD        # the shared staff password
npx wrangler secret put SESSION_SECRET      # any long random string
```

For the last one, generate a value with:

```bash
openssl rand -hex 32
```

### 4. Deploy

```bash
npm run cf:deploy
```

This builds the frontend and deploys. You get a URL like
`https://halcyon-myp-unit-designer.<your-subdomain>.workers.dev`.

Share that URL plus the password.

### Updating later

```bash
npm run cf:deploy
```

### Testing the Worker locally

```bash
npm run cf:dev
```

Runs the real Workers runtime on `http://localhost:8787`, reading secrets from
`.dev.vars` (gitignored). This is closer to production than `npm run dev`.

### Plan note

The Cloudflare **free** plan allows 100k requests/day with no cold starts, which is
generous for a staff tool. Its limit is **10ms CPU per request** — fine for normal
conversation, but a large PDF upload has to be parsed and re-serialised and may exceed
it. The **$5/month Workers Paid** plan raises this to 30s and removes the concern.

---

## Running locally

```bash
npm install
cp .env.example .env     # then add your ANTHROPIC_API_KEY
npm run dev              # http://localhost:5173
```

Leave `APP_PASSWORD` empty in `.env` to skip the login screen during development.

---

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **Required.** Stays server-side; never sent to the browser. |
| `APP_PASSWORD` | Shared staff password. Unset = no login required. |
| `SESSION_SECRET` | Signs session tokens. Set in production, or restarts log everyone out. |
| `SESSION_HOURS` | Login validity, default 12. |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-5`. |
| `API_PORT` | Local Node dev only. Not used by the Cloudflare Worker. |

---

## How access control works

The password protects the **API key**, not the interface. The frontend holds no secrets, but
`/api/messages` spends real money, so that is what's gated:

- The password is verified server-side using a timing-safe comparison.
- On success the server issues an HMAC-SHA256 session token with an expiry.
- Every `/api/messages` call must carry that token, or it returns 401.

A UI-only password would be bypassed by POSTing to the endpoint directly. This isn't.

---

## Cost, and what is *not* yet protected

Each completed unit costs roughly **£0.35–0.45** in Anthropic API usage. Uploading an existing
unit costs more, since the document is resent with each turn.

**There is currently no rate limit and no spend cap.** Anyone who has the password can generate
unlimited units on your account, and shared passwords do get forwarded. Before wider rollout,
consider adding per-user rate limiting and a monthly ceiling, and set a billing alert in the
Anthropic Console.

---

## Notes

- **Draft auto-save** — a unit in progress is saved to the teacher's browser after every turn
  and restored on return, so a reload or a discarded tab doesn't lose the work. It is
  per-browser: a draft started on a laptop won't appear on an iPad.
- **Uploads** — PDF, .docx, .txt and .md, up to 10MB. Scanned PDFs without a text layer are read
  as images and extraction can be patchier.
- `HalcyonMYPStudio.jsx` in the project root is the original single-file prototype, kept as the
  reference for the lesson-planner and slide-deck features that were removed from this tool.
