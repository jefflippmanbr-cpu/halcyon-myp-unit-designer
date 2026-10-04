import { marked } from "marked";
import DOMPurify from "dompurify";
import { H } from "../theme.js";

// ─── Markdown → safe HTML ──────────────────────────────────────────────────────
// Plans are shared publicly by link, so everything rendered from model output is
// sanitised. Links open in a new tab and can't reach back into the opener.
marked.setOptions({ gfm: true, breaks: false });
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer"); }
});
export const safeHtml = (html) => DOMPurify.sanitize(html);
export const mdToSafeHtml = (md) => safeHtml(marked.parse(md || ""));

const renderTokens = (tokens, links) => {
  const list = [...tokens]; list.links = links || {};
  return safeHtml(marked.parser(list));
};

export const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = (s) => (s || "").replace(/\*\*|__|\*|`/g, "").trim();

// A paragraph made only of "**Label:** value" lines becomes a field grid rather than a
// run-on paragraph. Returns null if any line doesn't fit the pattern.
const FIELD_RE = /^\*\*([^*]{1,40}?):?\*\*:?\s*(.*)$/;
function asFields(tok) {
  if (tok.type !== "paragraph") return null;
  const lines = tok.raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const fields = lines.map(l => FIELD_RE.exec(l));
  if (!fields.length || fields.some(f => !f)) return null;
  return fields.map(f => ({ label: f[1].replace(/:$/, "").trim(), html: safeHtml(marked.parseInline(f[2])) }));
}

// Split a run of tokens into an intro (rendered as blocks / field grids) and ### cards.
function splitCards(tokens, links) {
  const intro = []; const cards = []; let cur = null;
  for (const t of tokens) {
    if (t.type === "heading" && t.depth === 3) { cur = { title: plain(t.text), tokens: [] }; cards.push(cur); continue; }
    (cur ? cur.tokens : intro).push(t);
  }
  const blocks = (toks) => {
    const out = []; let run = [];
    const flush = () => { if (run.length) { out.push({ kind: "html", html: renderTokens(run, links) }); run = []; } };
    for (const t of toks) {
      const f = asFields(t);
      if (f) { flush(); out.push({ kind: "fields", fields: f }); } else run.push(t);
    }
    flush();
    return out;
  };
  return {
    intro: blocks(intro),
    cards: cards.map(c => {
      // Pull a "**Week:** N" bullet up into the card header as a chip.
      let week = null;
      const toks = c.tokens.map(t => {
        if (t.type !== "list") return t;
        const items = t.items.filter(it => {
          const m = /^\*\*Week:?\*\*:?\s*(.+)$/i.exec(it.text.trim());
          if (m && !week) { week = plain(m[1]); return false; }
          return true;
        });
        return items.length === t.items.length ? t : { ...t, items };
      });
      return { title: c.title, week, blocks: blocks(toks) };
    }),
  };
}

// ─── Plan model ────────────────────────────────────────────────────────────────
// {title, meta: [..], sections: [{title, slug, intro, cards}]}
export function parsePlan(md) {
  const tokens = marked.lexer(md || "");
  const links = tokens.links;
  let title = "Unit Plan"; const meta = []; const sections = [];
  let cur = null; let pre = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "heading" && t.depth === 1 && !cur && title === "Unit Plan") {
      title = plain(t.text);
      const next = tokens[i + 1];
      if (next?.type === "paragraph" && next.text.includes("·") && next.text.length < 200) {
        meta.push(...plain(next.text).split("·").map(s => s.trim()).filter(Boolean)); i++;
      }
      continue;
    }
    if (t.type === "heading" && t.depth <= 2) { cur = { title: plain(t.text), tokens: [] }; sections.push(cur); continue; }
    if (t.type === "space") continue;
    (cur ? cur.tokens : pre).push(t);
  }
  const out = sections.map(s => ({ title: s.title, slug: slugify(s.title), tokens: s.tokens, ...splitCards(s.tokens, links) }));
  if (pre.length) out.unshift({ title: "", slug: "preamble", tokens: pre, ...splitCards(pre, links) });
  return { title, meta, sections: out };
}

// ─── Word export ───────────────────────────────────────────────────────────────
// Word opens HTML saved with a .doc extension, so the plan stays editable there.
export function downloadWord(md, title) {
  const body = mdToSafeHtml(md);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:${H.navyDark};max-width:820px;margin:40px auto;padding:20px}
.hdr{background:${H.navy};color:white;padding:16px 26px;margin-bottom:22px}
.hdr p{color:white;margin:0;font-size:10pt}
h1{color:${H.navy};font-size:22pt;font-family:Georgia,serif;border-bottom:2px solid ${H.gold};padding-bottom:6px}
h2{color:${H.navyDark};font-size:14pt;margin-top:22px;border-bottom:1px solid ${H.greyLight};padding-bottom:3px;font-family:Georgia,serif}
h3{color:${H.teal};font-size:11.5pt;margin-top:14px}
table{border-collapse:collapse;width:100%;margin:8px 0}
th,td{border:1px solid ${H.greyLight};padding:5px 8px;text-align:left;vertical-align:top;font-size:10pt}
th{background:${H.cream}}
li{margin:3px 0}p{margin:6px 0}
</style></head><body>
<div class="hdr"><p>IB Middle Years Programme · Unit Plan · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p></div>
${body}</body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${fileSafe(title)}.doc`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fileSafe = (s) => (s || "Unit Plan").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "Unit_Plan";

export const planTitle = (md) => parsePlan(md).title;

// The headings the compile prompt asks for, in order — used to show real build progress.
export const PLAN_SECTIONS = [
  "Unit at a Glance", "Project Invitation", "MYP Framework", "ATL Skills", "Summative Assessment", "Assessment Rubric",
  "Week-by-Week Sequence", "Formative Assessments", "Explorer Moments", "Resources",
  "Expert & Community Connections", "Place-Based Learning", "Differentiation",
  "Framework Alignment", "Teacher Preparation Checklist",
];


// ─── Coverage check ────────────────────────────────────────────────────────────
// The whole point of compiling from the record is that specifics survive. After a build,
// check the named items (formatives, Explorer Moments, places, resources, experts) actually
// appear in the plan, and tell the teacher about any that don't instead of trusting it.
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const NAMED_RE = /^(formative|explorer moment|place|site|resource|expert|partner|service)\b[^—–:-]*[—–-]\s*(.+)$/i;
export function missingFromPlan(record, md) {
  const words = new Set(norm(md).split(" "));
  return record.filter(e => {
    const m = NAMED_RE.exec(e.label);
    if (!m) return false;
    // Most of the name's distinctive words must appear somewhere. Order and small words are
    // ignored on purpose: the plan may write "Hyde Park, Oxford Street & Marble Arch" for
    // "Marble Arch, Oxford Street, Hyde Park", or "the Met Office visit" for "Met Office
    // talk" — rewording, not loss. Only a name that is mostly absent is flagged.
    const key = norm(m[2]).split(" ").filter(w => w.length > 3);
    const found = key.filter(w => words.has(w)).length;
    return key.length > 0 && found < Math.ceil(key.length / 2);
  });
}

// ─── Legacy (v1 drafts) ────────────────────────────────────────────────────────
// Before the record existed, the coach wrote the plan into the chat. Used only to lift a
// plan out of an old saved draft so it isn't lost on upgrade.
export function legacyPlanFromMessages(msgs) {
  const assistant = (msgs || []).filter(m => m.role === "assistant" && typeof m.content === "string").map(m => m.content);
  const opensDoc = (c) => /^\s*#\s+\S/.test(c);
  const isDoc = (c) => opensDoc(c) && (c.match(/^\s*##\s+\S/gm) || []).length >= 4;
  const endIdx = assistant.map(c => /unit plan is complete/i.test(c)).lastIndexOf(true);
  if (endIdx !== -1) {
    if (opensDoc(assistant[endIdx])) return assistant[endIdx];
    for (let i = endIdx - 1; i >= 0 && endIdx - i <= 4; i--) {
      if (opensDoc(assistant[i])) return assistant.slice(i, endIdx + 1).join("\n\n");
    }
    return isDoc(assistant[endIdx]) ? assistant[endIdx] : null;
  }
  const docIdx = assistant.map(isDoc).lastIndexOf(true);
  return docIdx === -1 ? null : assistant[docIdx];
}
