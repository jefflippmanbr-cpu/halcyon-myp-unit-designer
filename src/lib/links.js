import { checkLinks } from "./api.js";

// ─── Verified resource links ───────────────────────────────────────────────────
// The model can produce a convincing URL that 404s, and a broken link costs a teacher's
// trust far more than no link at all. So every link in a coach reply or a plan goes
// through /api/check-links first:
//   ok           → kept as written
//   anything else → the link is removed, the resource kept, and a plain direction added
//                   ("search for it on gutenberg.org"). Never a home-page stand-in.
// The resource itself is never dropped.

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
  // Only a link the server actually confirmed survives. If the check itself failed, the
  // link is unverified — and an unverified link is treated like a broken one.
  const ok = (u) => results[u]?.status === "ok";
  // Where to tell the teacher to look: the site, unless we know it doesn't answer.
  const direction = (u) => results[u] && !results[u].fallback ? "search for it by name" : `search for it on ${host(u)}`;
  let changed = 0;
  let out = md.replace(MD_LINK, (all, text, u) => {
    if (ok(u)) return all;
    changed++;
    return `${text} (${direction(u)})`;
  });
  out = out.replace(BARE, (u) => {
    if (ok(u)) return u;
    changed++;
    return `${host(u)} (${direction(u)})`;
  });
  return { md: out, changed, checked: urls.length };
}
