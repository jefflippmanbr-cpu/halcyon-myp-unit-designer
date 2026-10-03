import { useMemo } from "react";
import { marked } from "marked";
import { parsePlan, safeHtml } from "../lib/plan.js";
import { FRAMEWORKS, frameworkKey } from "../theme.js";

// Renders a compiled plan (markdown) as a designed page. The compile prompt fixes the
// section headings and the "### card" / "**Field:**" conventions; this maps each known
// section to a layout. Anything unrecognised still renders as clean prose, so a plan that
// drifts from the spec degrades to plain-but-readable, never to broken.

const Html = ({ html, className = "md" }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;

function Blocks({ blocks }) {
  return blocks.map((b, i) => b.kind === "fields" ? (
    <div key={i} className="fields">
      {b.fields.map((f, j) => {
        const soi = /statement of inquiry/i.test(f.label);
        const wide = soi || f.html.length > 160;
        return (
          <div key={j} className={`field${soi ? " soi" : ""}${wide ? " wide" : ""}`}>
            <div className="k">{f.label}</div>
            <div className="v" dangerouslySetInnerHTML={{ __html: f.html }} />
          </div>
        );
      })}
    </div>
  ) : <Html key={i} html={b.html} />);
}

// In a rubric band, each strand — "(i) … ; (ii) …" — goes on its own line.
const splitStrands = (blocks) => blocks.map(b => b.kind === "html"
  ? { ...b, html: b.html.replace(/;\s*(\((?:i|ii|iii|iv|v|vi)\))/g, "<br>$1") } : b);

function Cards({ cards, variant }) {
  return (
    <div className={`cards${variant ? " cards-" + variant : ""}`}>
      {cards.map((c, i) => (
        <div key={i} className={`card${variant ? " " + variant : ""}`}>
          <h3><span>{c.title}</span>{c.week && <span className="wk">{/^\d/.test(c.week) ? `Week ${c.week}` : c.week}</span>}</h3>
          <Blocks blocks={variant === "rubric" ? splitStrands(c.blocks) : c.blocks} />
        </div>
      ))}
    </div>
  );
}

function Timeline({ cards }) {
  return (
    <div className="timeline">
      {cards.map((c, i) => {
        const m = /^week\s*(\d+[\s–-]*\d*)\s*[—–:-]?\s*(.*)$/i.exec(c.title);
        return (
          <div key={i} className="tl-item">
            <div className="tl-num"><div><small>Week</small><b>{m ? m[1].trim() : i + 1}</b></div></div>
            <div className="tl-body">
              <h3>{m ? m[2] || c.title : c.title}</h3>
              <Blocks blocks={c.blocks} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The alignment audit is a markdown table; rebuild it with framework colours and
// strength chips, plus a per-framework summary of how well each is served.
function Alignment({ sec }) {
  const table = sec.tokens.find(t => t.type === "table");
  if (!table) return <><Blocks blocks={sec.intro} /><Cards cards={sec.cards} /></>;
  const cell = (c) => safeHtml(marked.parseInline(c.text || ""));
  const headers = table.header.map(h => h.text.toLowerCase());
  const fwCol = Math.max(0, headers.findIndex(h => h.includes("framework")));
  const stCol = headers.findIndex(h => h.includes("strength"));
  const rows = table.rows.map(r => ({
    fw: (r[fwCol]?.text || "").replace(/\*/g, "").trim(),
    strength: stCol >= 0 ? (r[stCol]?.text || "").replace(/\*/g, "").trim() : "",
    cells: r,
  }));
  const summary = FRAMEWORKS.map(f => {
    const mine = rows.filter(r => r.fw.toLowerCase() === f.name.toLowerCase());
    const s = mine.filter(r => /^strong/i.test(r.strength)).length;
    const p = mine.filter(r => /^partial/i.test(r.strength)).length;
    return { ...f, total: mine.length, s, p };
  }).filter(f => f.total);
  const intro = sec.intro.filter(b => !(b.kind === "html" && b.html.includes("<table")));
  return (
    <>
      {summary.length > 0 && (
        <div className="align-summary">
          {summary.map(f => (
            <div key={f.key} className={`align-tile fw-${f.key}`}>
              <div className="k">{f.name}</div>
              <div className="meter">{Array.from({ length: f.total }, (_, i) => <span key={i} className={i < f.s ? "s" : i < f.s + f.p ? "p" : ""} />)}</div>
              <small>{f.s} strong · {f.p} partial · {f.total - f.s - f.p} light</small>
            </div>
          ))}
        </div>
      )}
      <Blocks blocks={intro} />
      <div className="align-wrap">
        <table>
          <thead><tr>{table.header.map((h, i) => <th key={i}>{h.text}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.cells.map((c, j) => {
                  if (j === fwCol) return <td key={j}><span className={`fw-cell fw-${frameworkKey(r.fw)}`}><i />{r.fw}</span></td>;
                  if (j === stCol) {
                    const k = /^strong/i.test(r.strength) ? "strong" : /^partial/i.test(r.strength) ? "partial" : "light";
                    return <td key={j}><span className={`strength ${k}`}>{r.strength || "—"}</span></td>;
                  }
                  return <td key={j} dangerouslySetInnerHTML={{ __html: cell(c) }} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Section({ sec }) {
  const s = sec.slug;
  let body, cls = "";
  if (s.includes("glance")) { cls = "lead"; body = <Blocks blocks={sec.intro} />; }
  else if (s.includes("invitation")) body = <div className="invitation"><Blocks blocks={sec.intro} /></div>;
  else if (s.includes("week")) body = <><Blocks blocks={sec.intro} /><Timeline cards={sec.cards} /></>;
  else if (s.includes("explorer")) body = <><Blocks blocks={sec.intro} /><Cards cards={sec.cards} variant="explorer" /></>;
  else if (s.includes("rubric")) body = <><Blocks blocks={sec.intro} /><Cards cards={sec.cards} variant="rubric" /></>;
  else if (s.includes("alignment")) body = <Alignment sec={sec} />;
  else {
    if (s.includes("checklist")) cls = "checklist";
    if (s === "resources") cls = "resources";
    body = <><Blocks blocks={sec.intro} />{sec.cards.length > 0 && <Cards cards={sec.cards} />}</>;
  }
  return (
    <section className={`sec ${cls}`} id={`sec-${s}`}>
      {sec.title && <h2>{sec.title}</h2>}
      {body}
    </section>
  );
}

export function PlanDocument({ markdown }) {
  const plan = useMemo(() => parsePlan(markdown), [markdown]);
  const jump = (slug) => {
    const el = document.getElementById(`sec-${slug}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="doc">
      <nav className="doc-toc" aria-label="Plan sections">
        <div className="eyebrow" style={{ padding: "0 10px 8px" }}>In this plan</div>
        {plan.sections.filter(x => x.title).map(x => (
          <a key={x.slug} href={`#sec-${x.slug}`} onClick={(e) => { e.preventDefault(); jump(x.slug); }}>{x.title}</a>
        ))}
      </nav>
      <div className="doc-main">
        <header className="doc-hero">
          <div className="school">Halcyon London International School · MYP Unit Plan</div>
          <h1>{plan.title}</h1>
          {plan.meta.length > 0 && <div className="meta">{plan.meta.map((m, i) => <span key={i}>{m}</span>)}</div>}
          <div className="fwline">{FRAMEWORKS.map(f => <span key={f.key} className={`fw-${f.key}`} title={f.name} />)}</div>
        </header>
        {plan.sections.map((sec, i) => <Section key={sec.slug + i} sec={sec} />)}
        <div className="doc-foot">Designed with the Halcyon MYP Unit Designer · Enhanced MYP · Transcend 6 Leaps · PBL Gold Standard · Explorer Mode</div>
      </div>
    </div>
  );
}
