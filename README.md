# Halcyon MYP Unit Designer

A 14-step MYP unit design coach for teachers at Halcyon London International School, built on
four frameworks: the **IB Enhanced MYP**, the **Transcend 6 Leaps**, the **PBLWorks Gold
Standard**, and **Explorer Mode** from *The Disengaged Teen* (Winthrop & Anderson, 2025).

Teachers either design a new unit from scratch or upload an existing one for diagnosis and
rebuild. As they work, every decision is kept in a live **unit record**. At the end the app
builds a full, designed unit plan from that record, saved to a **private link** they can share
with anyone, plus Word and PDF exports.

---

## How it works

- **Coach turns** use structured output (`step`, `message`, `frameworks`, `captured`) and stream
  in as they're written. `captured` holds record entries such as `"10 | Formative — Gallery walk: …"`.
  The number is the step the item *belongs to*, so an idea mentioned early is filed in the right
  place and picked up when that step comes.
- **The unit record** is shown beside the chat and sent back to the coach every turn, so it works
  from what is actually settled.
- **The plan** is compiled in a separate streamed call from the record (authoritative) plus the
  conversation (for context). The app then checks that named items, such as formatives, Explorer
  Moments and sites, made it in.
- **Assessment.** The coach asks which criteria the summative assesses (recommending a set if the
  teacher is unsure) and previews a rubric. The plan includes a task-specific rubric for each
  chosen criterion. Criterion names and strands for all eight subject groups, plus
  interdisciplinary units and the Personal Project, are in `src/prompts.js`. They were checked in
  October 2026 against the IB's subject briefs and schools' published criteria, and include the
  current Language Acquisition (2020) and Arts guides. The strands are brief paraphrases; the
  official descriptors stay in the subject guides.
- **Resource links.** The model links a resource only when it's sure of the exact page; otherwise
  it gives a direction ("search the title on BBC Sounds"). Every link is checked before a teacher
  sees it (`/api/check-links`). Only confirmed links survive; any other link becomes plain text
  with a direction to search for it. A resource is never dropped for lack of a link.
- **Any school, anywhere.** The coach asks where the school is in Step 1, and roots relevance,
  resources, experts and site visits in that place.
- **Private links** (`/p/<id>`) are stored in Cloudflare KV. Creating one needs the staff
  password; viewing one needs only the link. The creating browser holds an edit key that lets it
  update the link on rebuild, or delete it.

Code map: `src/prompts.js` (coach and compile prompts, schema), `src/lib/` (streaming, parsing,
record, plan rendering, storage), `src/components/`, `worker/index.js` (the whole API).

---

## Running locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then add your ANTHROPIC_API_KEY
npm run dev                      # http://localhost:5173
```

This runs Vite and the real Worker (`wrangler dev` on port 8787), with a simulated KV store. Leave
`APP_PASSWORD` empty in `.dev.vars` to skip the login screen.

---

## Deploying to Cloudflare Workers

One Worker serves the API and the built React app. Waiting on the Anthropic API costs no CPU
time, and the streams are piped through untouched, so the long plan compile is fine.

First time only:

```bash
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # your Anthropic key
npx wrangler secret put APP_PASSWORD        # the shared staff password
npx wrangler secret put SESSION_SECRET      # e.g. openssl rand -hex 32
```

Then, and for every update:

```bash
npm run cf:deploy
```

The KV namespace for saved plans (`PLANS`) is created automatically on the first deploy.

### Plan note

The Cloudflare **free** plan allows 100k requests/day, and KV's free tier is 1,000 writes per day
and 1GB of storage: thousands of saved plans. Its limit is **10ms CPU per request**. That's fine
for normal use, but a large PDF upload has to be parsed and may exceed it. The **$5/month
Workers Paid** plan raises this to 30s.

---

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **Required.** Stays server-side; never sent to the browser. |
| `APP_PASSWORD` | Shared staff password. Unset = no login required. |
| `SESSION_SECRET` | Signs session tokens. Rotate it to log everyone out. |
| `SESSION_HOURS` | Login validity in hours, default 168 (7 days). In `wrangler.jsonc`. |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-5`. In `wrangler.jsonc`. |

---

## How access control works

The password protects the **API key** and storage, not the interface:

- The password is verified server-side using a timing-safe comparison.
- On success the server issues an HMAC-SHA256 session token with an expiry.
- `/api/messages` and creating or updating a saved plan require that token, or they return 401.
- A saved plan is readable by anyone with its link. Links are 128-bit random ids, not guessable
  or listable, and every page is marked `noindex`. Only the creating browser's edit key (stored
  server-side as a hash) can change or delete one.

---

## Cost, and what is *not* yet protected

Each completed unit was measured at roughly £0.35–0.45 in Anthropic API usage before the
redesign. The separate, richer plan compile and the record sent each turn add to that. Expect
somewhat more, perhaps around **£0.50** (an estimate, not yet measured). Uploads cost more,
since the document is resent with each turn.

**There is currently no rate limit and no spend cap.** Anyone with the password can generate
unlimited units on your account. Set a monthly spend limit and a billing alert in the Anthropic
Console. Before sharing widely, consider per-teacher logins (e.g. Cloudflare Access with Google
sign-in) in place of the shared password.

---

## Notes

- **Draft auto-save.** The conversation, record and plan are saved in the teacher's browser after
  every turn and restored on return. A draft is per-browser; a saved plan link works anywhere.
- **Uploads.** PDF, .docx, .txt and .md, up to 10MB. Scanned PDFs without a text layer are read
  as images, and extraction can be patchier.
- `HalcyonMYPStudio.jsx` in the project root is the original single-file prototype, kept as the
  reference for the lesson-planner and slide-deck features that were removed from this tool.
