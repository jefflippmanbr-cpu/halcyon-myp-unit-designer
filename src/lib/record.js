import { parseEntry } from "./parse.js";
import { STEPS } from "../prompts.js";

// ─── The unit record ───────────────────────────────────────────────────────────
// The teacher's settled decisions, filed by the step they belong to. The coach adds to it
// every turn ("captured"), the live panel shows it, and the final plan is compiled from it.
// An entry is {step, label, text, turn}; (step, label) is the identity, so the coach can
// refine an entry by re-capturing it with the same label.

const keyOf = (e) => `${e.step}|${e.label.toLowerCase()}`;
const REMOVED_RE = /^\(?removed\)?\.?$/i;

export function mergeCaptured(record, captured, turn) {
  const next = [...record];
  for (const raw of captured || []) {
    const e = parseEntry(raw);
    if (!e) continue;
    const i = next.findIndex(x => keyOf(x) === keyOf(e));
    if (REMOVED_RE.test(e.text)) { if (i !== -1) next.splice(i, 1); continue; }
    const entry = { ...e, turn };
    if (i === -1) next.push(entry); else next[i] = entry;
  }
  return next;
}

// Grouped for display and for the compile prompt, in step order.
export const recordByStep = (record) =>
  STEPS.map(s => ({ ...s, entries: record.filter(e => e.step === s.n) })).filter(g => g.entries.length);

export function recordAsText(record) {
  const groups = recordByStep(record);
  if (!groups.length) return "(The record is empty — rely on the conversation.)";
  return groups.map(g =>
    `### Step ${g.n} — ${g.label}\n` + g.entries.map(e => `- **${e.label}:** ${e.text}`).join("\n")
  ).join("\n\n");
}
