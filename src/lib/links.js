import { checkLinks } from "./api.js";

// ─── Verified resource links ───────────────────────────────────────────────────
// The model is asked for clickable links, but can produce a convincing URL that 404s.
// Every link in a coach reply or a plan goes through /api/check-links first:
//   ok              → kept as written
//   dead / unclear  → replaced by the site's home page, if that answers, marked "(home page)"
//   site gone       → the link is removed and its text kept
// so a teacher never clicks through to a dead page.

const MD_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE = /(?<![(<\w/])(https?:\/\/[^\s)<>\]]+[^\s)<>\].,;:!?'"])/g;

export function findUrls(md) {
  const urls = new Set();
  for (const m of (md || "").matchAll(MD_LINK)) urls.add(m[2]);
  for (const m of (md || "").replace(MD_LINK, "").matchAll(BARE)) urls.add(m[1]);
  return [...urls];
}

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export async function verifyLinks(md) {
  const urls = findUrls(md);
  if (!urls.length) return { md, changed: 0, checked: 0 };
  const results = {};
  for (let i = 0; i < urls.length; i += 10) Object.assign(results, await checkLinks(urls.slice(i, i + 10)));
  const fix = (u) => {
    const r = results[u];
    if (!r || r.status === "ok") return u;   // unchecked (shouldn't happen) or fine
    return r.fallback || null;
  };
  let changed = 0;
  let out = md.replace(MD_LINK, (all, text, u) => {
    const f = fix(u);
    if (f === u) return all;
    changed++;
    // Say so when a link now goes to the site's front page rather than the resource itself.
    return f ? `[${text}](${f}) (home page)` : text;
  });
  out = out.replace(BARE, (u) => {
    const f = fix(u);
    if (f === u) return u;
    changed++;
    return f ? `[${host(f)}](${f})` : host(u);
  });
  return { md: out, changed, checked: urls.length };
}
