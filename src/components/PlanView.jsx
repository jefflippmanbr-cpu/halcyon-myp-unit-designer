import { useMemo, useState } from "react";
import { PlanDocument } from "./PlanDocument.jsx";
import { downloadWord, planTitle, missingFromPlan, PLAN_SECTIONS } from "../lib/plan.js";
import { planUrl } from "../lib/api.js";
import { ArrowLeft, Link, Download, Printer, Refresh, Check, External } from "./Icons.jsx";

// Which of the expected sections have started arriving in the stream — real progress,
// not a guess, because the compile writes them in a fixed order.
function BuildProgress({ text, elapsed, checkingLinks }) {
  const seen = PLAN_SECTIONS.map(s => text.toLowerCase().includes(`## ${s.toLowerCase()}`));
  const nowIdx = seen.lastIndexOf(true);
  const thinking = !text;
  return (
    <div className="build-progress no-print" aria-live="polite">
      <h2>{checkingLinks ? "Checking resource links…" : thinking ? "Planning your unit…" : "Writing your unit plan…"}</h2>
      <p>
        {checkingLinks
          ? "Opening every link in the plan to make sure it works. Any dead ones are swapped for the site's home page."
          : thinking
          ? "Reading everything you settled. The plan will start appearing in a few seconds."
          : "Sections appear below as they're written. Please keep this tab open."} <span style={{ color: "var(--faint)" }}>· {elapsed}s</span>
      </p>
      <div className="bar" />
      <div className="sec-checks">
        {PLAN_SECTIONS.map((s, i) => (
          <div key={s} className={`sec-check${seen[i] && i < nowIdx ? " done" : ""}${i === nowIdx ? " now" : ""}`}>
            <i>{seen[i] && i < nowIdx ? "✓" : ""}</i>{s}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanView({ plan, record, building, buildText, buildError, checkingLinks, elapsed, saveState, onBack, onRebuild, onSave, onCopyLink }) {
  const markdown = building ? buildText : plan?.markdown || "";
  const title = useMemo(() => planTitle(markdown), [markdown]);
  const missing = useMemo(() => (!building && plan ? missingFromPlan(record, plan.markdown) : []), [building, plan, record]);
  const [hideMissing, setHideMissing] = useState(false);
  const link = plan?.id ? planUrl(plan.id) : null;

  return (
    <div className="plan-shell">
      <div className="plan-toolbar">
        <button className="btn btn-sm btn-ghost" onClick={onBack}><ArrowLeft size={13} />Back to coach</button>
        <div className="grow" />
        {!building && plan && <>
          {saveState === "saving" && <span className="save-state">Saving private link…</span>}
          {saveState === "error" && <button className="btn btn-sm btn-ghost btn-danger-text" onClick={onSave}>Couldn't save link — retry</button>}
          {link && saveState !== "saving" && <>
            <span className="save-state ok hide-narrow"><Check size={13} />Saved to a private link</span>
            <button className="btn btn-sm btn-green" onClick={() => onCopyLink(link)}><Link size={13} />Copy link</button>
            <a className="btn btn-sm btn-ghost hide-narrow" href={link} target="_blank" rel="noopener noreferrer"><External size={13} />Open</a>
          </>}
          <button className="btn btn-sm btn-ghost" onClick={() => downloadWord(plan.markdown, title)}><Download size={13} />Word</button>
          <button className="btn btn-sm btn-ghost" onClick={() => window.print()}><Printer size={13} />PDF</button>
          <button className="btn btn-sm btn-ghost" onClick={onRebuild} title="Rebuild from your latest decisions"><Refresh size={13} />Rebuild</button>
        </>}
      </div>

      {building && <BuildProgress text={buildText} elapsed={elapsed} checkingLinks={checkingLinks} />}
      {buildError && !building && (
        <div className="notice notice-red"><div className="t"><b>The plan didn't finish.</b> {buildError}</div>
          <button className="btn btn-sm btn-ghost" onClick={onRebuild}><Refresh size={13} />Try again</button></div>
      )}
      {missing.length > 0 && !hideMissing && (
        <div className="notice notice-gold no-print">
          <div className="t">
            <b>Check these made it in.</b> Your unit record includes {missing.length === 1 ? "an item" : "items"} I can't find by name in the plan:{" "}
            {missing.map(m => m.label).join(" · ")}. They may just be worded differently — or press Rebuild.
          </div>
          <button className="btn btn-sm btn-quiet" onClick={() => setHideMissing(true)}>Dismiss</button>
        </div>
      )}
      {markdown ? <PlanDocument markdown={markdown} /> : null}
    </div>
  );
}
