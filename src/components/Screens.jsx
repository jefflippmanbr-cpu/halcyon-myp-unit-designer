import { useRef, useState } from "react";
import { FRAMEWORKS } from "../theme.js";
import { timeAgo } from "../lib/storage.js";
import { planUrl } from "../lib/api.js";
import { Layers, Sparkle, Upload, File, Link, Trash, Compass } from "./Icons.jsx";

export function Welcome({ onStart, library, onCopy, onDelete }) {
  return (
    <div className="scroll">
      <div className="welcome">
        <div className="hero">
          <div>
            <div className="eyebrow">Halcyon MYP Unit Designer</div>
            <h1>Design units students <em>want</em> to explore.</h1>
            <p>A critical-friend coach that walks you through fourteen steps — in whatever order your thinking goes —
              and keeps every decision you make. At the end it builds a full unit plan you can teach from and share.</p>
          </div>
          <div className="fw-stack">
            {FRAMEWORKS.map(f => (
              <div key={f.key} className={`fw-card fw-${f.key}`}>
                <div><h3>{f.name}</h3><p>{f.blurb}</p><small>{f.source}</small></div>
              </div>
            ))}
          </div>
        </div>

        <div className="starts">
          <button className="start" onClick={() => onStart("new")}>
            <div className="ico" style={{ background: "var(--navy)", color: "#fff" }}><Sparkle size={18} /></div>
            <h2>Design a new unit</h2>
            <p>Start from a topic, a question or just a hunch, and build an ambitious unit from scratch.</p>
            <span className="go">Get started →</span>
          </button>
          <button className="start" onClick={() => onStart("transform")}>
            <div className="ico" style={{ background: "var(--green)", color: "#fff" }}><Upload size={18} /></div>
            <h2>Transform an existing unit</h2>
            <p>Upload a unit you already teach. The coach diagnoses it against all four frameworks and rebuilds it with you.</p>
            <span className="go">Upload a unit →</span>
          </button>
        </div>

        {library.length > 0 && (
          <div className="library">
            <h2>Your saved plans</h2>
            <p>Private links you've created in this browser. Anyone you send a link to can view that plan — no password needed.</p>
            {library.map(p => (
              <div key={p.id} className="lib-row">
                <Compass size={18} style={{ color: "var(--green)" }} />
                <div className="t">
                  <a href={planUrl(p.id)} target="_blank" rel="noopener noreferrer">{p.title || "Unit plan"}</a>
                  <small>Saved {timeAgo(p.savedAt)}</small>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => onCopy(p)}><Link size={13} />Copy link</button>
                <button className="btn btn-sm btn-quiet" onClick={() => onDelete(p)} aria-label={`Delete ${p.title}`} title="Delete this link"><Trash size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function UploadScreen({ file, busy, error, onFile, onClear, onGo, onSkip }) {
  const ref = useRef(null); const [drag, setDrag] = useState(false);
  return (
    <div className="center">
      <div className="panel">
        <h1>Transform an existing unit</h1>
        <p>Upload the unit you currently teach. The coach reads it, diagnoses it against the frameworks, and rebuilds it with you.</p>
        <div className={`drop${drag ? " on" : ""}`} onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
          role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") ref.current?.click(); }}>
          <input ref={ref} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
          {busy ? <b>Reading file…</b> : file ? (
            <span className="chip"><File size={13} /><span>{file.name}</span>
              <button onClick={(e) => { e.stopPropagation(); onClear(); }} aria-label="Remove file">✕</button></span>
          ) : <>
            <Upload size={22} style={{ color: "var(--faint)" }} />
            <b>Upload your existing unit</b>
            <small>PDF, .docx or .txt · or drag &amp; drop</small>
            <small style={{ marginTop: 4, opacity: .8 }}>Google Doc? File → Download → PDF, then upload</small>
          </>}
        </div>
        {error && <div className="err">{error}</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} onClick={onGo} disabled={busy}>
          {file ? "Analyse & transform →" : "Continue →"}
        </button>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="link-btn" onClick={onSkip}>Skip — I'll describe it in chat</button>
        </div>
      </div>
    </div>
  );
}

export function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw.trim() || busy) return;
    setBusy(true); setErr(null);
    const e = await onLogin(pw);
    if (e) { setErr(e); setBusy(false); }
  };
  return (
    <div className="center" style={{ height: "100dvh" }}>
      <div className="panel" style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--navy)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 16px" }}><Layers size={21} /></div>
        <h1>Halcyon MYP Unit Designer</h1>
        <p>Enter the shared staff password to continue.</p>
        <input className="input" type="password" value={pw} autoFocus placeholder="Password" aria-label="Password"
          onChange={(e) => { setPw(e.target.value); setErr(null); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={err ? { borderColor: "var(--danger)" } : undefined} />
        {err && <div className="err" style={{ textAlign: "left" }}>{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={submit} disabled={busy || !pw.trim()}>
          {busy ? "Checking…" : "Enter →"}
        </button>
      </div>
    </div>
  );
}
