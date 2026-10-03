import { useMemo } from "react";
import { recordByStep } from "../lib/record.js";
import { mdToSafeHtml } from "../lib/plan.js";
import { X, Sparkle } from "./Icons.jsx";

const inline = (s) => mdToSafeHtml(s).replace(/^<p>|<\/p>\s*$/g, "");

// The live unit record: every decision the teacher has settled, filed by step, filling
// in beside the chat as they work. The plan is compiled from exactly this.
export function RecordPanel({ record, latestTurn, onClose, onBuild, canBuild, building }) {
  const groups = useMemo(() => recordByStep(record), [record]);
  return (
    <aside className="record" aria-label="Your unit so far">
      <div className="record-head">
        <div style={{ flex: 1 }}>
          <h2>Your unit so far</h2>
          <p>Every decision you settle is kept here. Your full plan is built from this.</p>
        </div>
        <button className="btn btn-quiet" onClick={onClose} aria-label="Close panel"><X /></button>
      </div>
      <div className="record-body">
        {!groups.length ? (
          <div className="record-empty">
            <div className="ghost-cards"><div /><div /><div /></div>
            As you and the coach settle each part of the unit — the global context, the summative task,
            each formative — it will appear here. Ideas you mention early, for later steps, are kept too.
          </div>
        ) : groups.map(g => (
          <div key={g.n} className="rgroup">
            <div className="rgroup-title"><span className="n">{g.n}</span>{g.label}</div>
            {g.entries.map(e => (
              <div key={e.label} className={`rcard${e.turn === latestTurn ? " fresh" : ""}`}>
                <b>{e.label}</b>
                <span dangerouslySetInnerHTML={{ __html: inline(e.text) }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {canBuild && (
        <div className="record-foot">
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={onBuild} disabled={building}>
            <Sparkle />{building ? "Building your plan…" : "Build my unit plan"}
          </button>
        </div>
      )}
    </aside>
  );
}
