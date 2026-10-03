import { legacyPlanFromMessages } from "./plan.js";

// ─── Work-in-progress draft ────────────────────────────────────────────────────
// A unit takes ~20 turns and teachers work in bursts, so losing the conversation to a
// reload or a browser discarding an idle tab would be costly. The draft is mirrored to
// localStorage after every turn and restored on load.
const DRAFT_KEY = "halcyon_unit_draft";
const DRAFT_VERSION = 2;

// An uploaded PDF rides along as base64 inside the first user message and can easily
// exceed the ~5MB localStorage quota on its own. If the full save fails, retry with the
// document blocks swapped for a short placeholder: the coach's diagnostic of the upload is
// already in the transcript, so the conversation continues sensibly without the raw file.
function stripHeavyBlocks(msgs) {
  return msgs.map(m => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map(b =>
        b?.type === "document"
          ? { type: "text", text: "[uploaded document — omitted from the saved draft to stay within browser storage limits]" }
          : b),
    };
  });
}

export function saveDraft(state) {
  const attempt = (msgs) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), ...state, msgs }));
  };
  try { attempt(state.msgs); return true; }
  catch {
    try { attempt(stripHeavyBlocks(state.msgs)); return true; }
    catch { return false; }   // out of room entirely — don't break the app over it
  }
}

export function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d) return null;
    if (d.v === 1 && Array.isArray(d.uMsgs) && d.uMsgs.length) {
      // v1 kept the plan inside the chat and had no record. Lift the plan out so an
      // in-progress teacher keeps it, and start an empty record.
      const md = legacyPlanFromMessages(d.uMsgs);
      return {
        savedAt: d.savedAt, msgs: d.uMsgs, step: d.uStep ?? 0, maxStep: d.uStep ?? 0, phase: d.uPhase ?? "chat",
        mode: d.uMode ?? null, input: d.uInput ?? "", file: d.uFile ?? null, record: [],
        plan: md ? { markdown: md, builtAt: d.savedAt } : null,
      };
    }
    if (d.v !== DRAFT_VERSION || !Array.isArray(d.msgs) || d.msgs.length === 0) return null;
    return d;
  } catch { return null; }
}
export const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

// ─── Saved plans library ───────────────────────────────────────────────────────
// The private links a teacher has created, remembered in this browser so they can find
// them again. The plans themselves live server-side; this is only the list of links and
// the edit keys that let this browser update or delete them.
const LIB_KEY = "halcyon_saved_plans";
export function loadLibrary() {
  try { const l = JSON.parse(localStorage.getItem(LIB_KEY) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; }
}
export function rememberPlan(entry) {
  const lib = loadLibrary().filter(p => p.id !== entry.id);
  lib.unshift({ ...entry, savedAt: Date.now() });
  try { localStorage.setItem(LIB_KEY, JSON.stringify(lib.slice(0, 100))); } catch {}
  return lib;
}
export function forgetPlan(id) {
  const lib = loadLibrary().filter(p => p.id !== id);
  try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); } catch {}
  return lib;
}

export const timeAgo = (ts) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
