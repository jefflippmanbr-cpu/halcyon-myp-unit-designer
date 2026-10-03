import { STEPS } from "../prompts.js";
import { FRAMEWORKS } from "../theme.js";

function Ring({ value, total }) {
  const r = 19, c = 2 * Math.PI * r, pct = Math.min(1, value / total);
  return (
    <div className="ring" aria-label={`${value} of ${total} steps`}>
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--green)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .5s" }} />
      </svg>
      <div className="ring-label">{value}/{total}</div>
    </div>
  );
}

// The 14 steps as a map, not a corridor: any step already reached can be clicked to
// revisit it, and steps with ideas already captured (often from earlier in the
// conversation, out of order) show a count.
export function Rail({ step, maxStep, record, onRevisit, open, canRevisit, planBuilt }) {
  const doneCount = planBuilt ? 14 : Math.max(0, Math.min(13, maxStep - 1));
  const counts = {};
  for (const e of record) counts[e.step] = (counts[e.step] || 0) + 1;
  return (
    <aside className={`rail${open ? " open" : ""}`}>
      <div className="rail-head">
        <Ring value={doneCount} total={14} />
        <div>
          <div className="rail-title">Design journey</div>
          <div className="rail-caption">{step ? "Tap any step you've reached to revisit it." : "Fourteen steps, in any order you think."}</div>
        </div>
      </div>
      <nav className="rail-steps" aria-label="Design steps">
        {STEPS.map(({ n, label }) => {
          const done = n < maxStep && n !== step, active = n === step;
          const reachable = canRevisit && n <= maxStep && n !== step;
          return (
            <button key={n} className={`rail-step${done ? " done" : ""}${active ? " active" : ""}`} disabled={!reachable}
              onClick={() => onRevisit(n, label)} aria-current={active ? "step" : undefined}
              title={reachable ? `Revisit ${label}` : undefined}>
              <span className="num">{done ? "✓" : n}</span>
              <span className="lbl">{label}</span>
              {counts[n] ? <span className="notes" title={`${counts[n]} item${counts[n] > 1 ? "s" : ""} in your unit record`}>{counts[n]}</span>
                : reachable ? <span className="revisit">revisit</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="rail-legend">
        <div className="eyebrow">Frameworks</div>
        {FRAMEWORKS.map(f => (
          <div key={f.key} className={`legend-row fw-${f.key}`} title={f.blurb}><i />{f.name}</div>
        ))}
      </div>
    </aside>
  );
}
