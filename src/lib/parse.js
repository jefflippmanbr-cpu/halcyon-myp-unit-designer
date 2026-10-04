import { FRAMEWORK_NAMES } from "../theme.js";

// ─── Coach-turn parsing ────────────────────────────────────────────────────────
// The model returns {step, message, frameworks, captured} enforced by output_config.format.
// Still parsed defensively — strip stray markdown fences and fall back to raw text if
// something ever comes back malformed rather than surfacing a blank message.

// The model occasionally echoes a stray JSON-closing fragment (e.g. `"}`) at the very end
// of the message text itself. Harmless to the parse, but it renders as visible junk.
// Deliberately requires the quote+brace pair: a bare trailing `}` or `]` can be legitimate
// prose/markdown, so stripping those unconditionally would corrupt real messages.
const stripTrailingJsonArtifact = (s) => s.replace(/\s*"\s*[}\]]\s*$/, "").trimEnd();

// Rare but real: a turn comes back with the model's own formatting deliberation leaking into
// the visible message — stray closing braces mid-prose, non-Latin tokens in an English
// conversation, or asides like "let's answer properly". Detect it so the caller can retry
// rather than showing a teacher garbled text. Kept narrow: these patterns don't occur in
// legitimate MYP coaching prose.
const CORRUPTION_SIGNS = [
  /[぀-ヿ一-鿿가-힯]/,        // CJK/Hangul in an English conversation
  /\}\s*(?:\n|$)/,                                     // a closing brace ending a line of prose
  /\b(?:let'?s stop and answer|answer properly|correctly-formatted|going to give the real)\b/i,
  /^\s*\{?\s*"?step"?\s*:/i,                           // raw JSON bleeding into the message
];
export const looksCorrupted = (msg) =>
  typeof msg === "string" && CORRUPTION_SIGNS.some(re => re.test(msg));

export function parseStructured(raw, fallbackStep) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      step: Number.isFinite(obj.step) ? obj.step : fallbackStep,
      message: typeof obj.message === "string" ? stripTrailingJsonArtifact(obj.message) : raw,
      question: typeof obj.question === "string" ? stripTrailingJsonArtifact(obj.question).trim() : "",
      frameworks: Array.isArray(obj.frameworks) ? obj.frameworks : [],
      captured: Array.isArray(obj.captured) ? obj.captured : [],
    };
  } catch {
    return { step: fallbackStep, message: raw, question: "", frameworks: [], captured: [] };
  }
}

// While a coach turn streams, the text so far is an incomplete JSON object. Pull out
// whatever of a string field ("message", then "question") has arrived, decoding JSON escapes, so the
// teacher sees the reply forming instead of waiting for the whole object. Returns null
// until the message field has started. An escape split across chunks is simply held back
// until the next chunk completes it.
export function partialMessage(text, field = "message") {
  const m = new RegExp(`"${field}"\\s*:\\s*"`).exec(text);
  if (!m) return null;
  let out = "";
  for (let i = m.index + m[0].length; i < text.length; i++) {
    const c = text[i];
    if (c === '"') return out;
    if (c !== "\\") { out += c; continue; }
    const n = text[i + 1];
    if (n === undefined) return out;
    if (n === "u") {
      const hex = text.slice(i + 2, i + 6);
      if (hex.length < 4) return out;
      out += String.fromCharCode(parseInt(hex, 16)); i += 5; continue;
    }
    out += ({ n: "\n", t: "\t", r: "", b: "", f: "" })[n] ?? n; i++;
  }
  return out;
}

// ─── Framework tags ────────────────────────────────────────────────────────────
// Tags arrive as "Framework Name: Concept — why it applies". Parse defensively and drop
// anything that doesn't name a real framework or that looks like generation filler, so a
// rare bad turn degrades to "no badge" rather than a broken-looking one.
const JUNK_RE = /^(placeholder|invalid|n\/?a|todo|tbd|test|example|xyz|unknown|none)$/i;
export function parseFrameworkTag(raw) {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf(":");
  if (idx === -1) return null;
  const framework = raw.slice(0, idx).trim();
  const rest = raw.slice(idx + 1).trim();
  if (!FRAMEWORK_NAMES.includes(framework) || rest.length < 4 || JUNK_RE.test(rest)) return null;
  const [concept, ...why] = rest.split(" — ");
  if (concept.trim().length < 3 || JUNK_RE.test(concept.trim())) return null;
  return { framework, concept: concept.trim(), why: why.join(" — ").trim(), full: rest };
}

// ─── Unit record entries ───────────────────────────────────────────────────────
// "N | Label: content". Anything that doesn't parse is dropped — a malformed entry is far
// less harmful than a garbled card in the record.
const ENTRY_RE = /^\s*(\d{1,2})\s*\|\s*([^:\n]{2,80}?)\s*:\s*([\s\S]+?)\s*$/;
export function parseEntry(raw) {
  if (typeof raw !== "string") return null;
  const m = ENTRY_RE.exec(raw);
  if (!m) return null;
  const step = Number(m[1]);
  const label = m[2].trim();
  const text = m[3].trim();
  if (step < 1 || step > 14 || JUNK_RE.test(label) || JUNK_RE.test(text)) return null;
  return { step, label, text };
}
