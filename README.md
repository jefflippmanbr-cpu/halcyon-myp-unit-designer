# Halcyon MYP Unit Designer

A 14-step MYP unit design coach for teachers at Halcyon London International School, built on
three frameworks: the **IB Enhanced MYP**, the **Transcend 6 Leaps**, and the **PBLWorks Gold
Standard**.

Teachers either design a new unit from scratch or upload an existing one for diagnosis and
rebuild, and finish with a downloadable Word-format unit plan.

---

## Deploying (public link, always on)

The whole app is one Node process — the Express server serves both the API and the built
frontend — so it deploys as a single service. These steps take about 10 minutes.

### 1. Put the code on GitHub

The repo is already initialised and committed locally. Create an **empty private** repo at
[github.com/new](https://github.com/new) (no README, no .gitignore), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/halcyon-myp-unit-designer.git
git push -u origin main
```

`.env` is gitignored, so your API key and password are not uploaded.

### 2. Deploy on Render

1. Sign up at [render.com](https://render.com) and connect your GitHub account.
2. **New → Blueprint**, pick the repo. Render reads `render.yaml` and configures everything.
3. It will prompt for two secrets:
   - `ANTHROPIC_API_KEY` — your key from [console.anthropic.com](https://console.anthropic.com)
   - `APP_PASSWORD` — the shared password you give staff
   
   `SESSION_SECRET` is generated automatically.
4. Deploy. You get a URL like `https://halcyon-myp-unit-designer.onrender.com`.

Share that URL plus the password. Nothing runs on your machine.

### Plan choice

`render.yaml` specifies the **starter** plan (~$7/month), which stays awake. The **free** plan
works but sleeps after ~15 minutes idle, so the first visit takes ~50 seconds to load — poor
for teachers. To try free first, change `plan: starter` to `plan: free`.

### Updating after changes

```bash
git add -A && git commit -m "your message" && git push
```

Render redeploys automatically.

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
| `API_PORT` | Local dev only — leave unset when deploying. |

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
