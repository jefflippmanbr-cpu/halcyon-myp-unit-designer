import { useMemo, useState } from "react";
import { mdToSafeHtml } from "../lib/plan.js";
import { parseFrameworkTag, parseEntry } from "../lib/parse.js";
import { frameworkKey } from "../theme.js";
import { Layers, Send, Refresh } from "./Icons.jsx";

const Avatar = () => <div className="avatar"><Layers size={13} style={{ color: "var(--green)" }} /></div>;

function Md({ text, streaming }) {
  const html = useMemo(() => mdToSafeHtml(text), [text]);
  return <div className={`md${streaming ? " caret" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Pills naming the framework element doing real work in a reply. Tap one to see why —
// the reason used to live only in a hover tooltip, which touch screens never show.
function Badges({ frameworks }) {
  const [open, setOpen] = useState(null);
  const tags = (frameworks || []).map(parseFrameworkTag).filter(Boolean).slice(0, 2);
  if (!tags.length) return null;
  const sel = open !== null ? tags[open] : null;
  return (
    <div className="badges">
      {tags.map((t, i) => (
        <button key={i} className={`badge fw-${frameworkKey(t.framework)}`} onClick={() => setOpen(open === i ? null : i)}
          aria-expanded={open === i} title={t.why ? `${t.framework}: ${t.why}` : t.framework}>
          <i />{t.concept.length > 44 ? t.concept.slice(0, 43) + "…" : t.concept}
          <small>· {t.framework}</small>
        </button>
      ))}
      {sel && sel.why && (
        <div className={`badge-why fw-${frameworkKey(sel.framework)}`}><b>Why it matters here:</b> {sel.why}</div>
      )}
    </div>
  );
}

// "Added to your unit: …" under a reply, so the teacher can see their decisions being kept.
function Captured({ captured, onOpen }) {
  const entries = (captured || []).map(parseEntry).filter(Boolean).filter(e => !/^\(?removed\)?\.?$/i.test(e.text));
  if (!entries.length) return null;
  return (
    <div className="captured">
      <span>Added to your unit:</span>
      {entries.slice(0, 5).map((e, i) => <button key={i} onClick={onOpen} title={e.text}>{e.label}</button>)}
      {entries.length > 5 && <span>+{entries.length - 5} more</span>}
    </div>
  );
}

export function Wait({ note, elapsed }) {
  return (
    <div className="msg coach">
      <Avatar />
      <div className="bubble" style={{ minWidth: note ? 260 : 0 }}>
        <div className="wait">
          <div className="dots"><span /><span /><span /></div>
          {note && <>
            <div className="wait-note">{note}</div>
            <div className="bar" />
            <div className="wait-meta">{elapsed}s · please keep this tab open</div>
          </>}
        </div>
      </div>
    </div>
  );
}

export function MessageList({ msgs, streamText, loading, waitNote, elapsed, error, needsReply, onRetry, onOpenRecord, scrollRef }) {
  return (
    <div className="chat" ref={scrollRef}>
      <div className="chat-inner">
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="msg user"><div className="bubble">{m.displayText || m.content}</div></div>
        ) : (
          <div key={i}>
            <div className="msg coach">
              <Avatar />
              <div className="bubble"><Md text={m.content} /><Badges frameworks={m.frameworks} /></div>
            </div>
            <Captured captured={m.captured} onOpen={onOpenRecord} />
          </div>
        ))}
        {loading && (streamText
          ? <div className="msg coach"><Avatar /><div className="bubble"><Md text={streamText} streaming /></div></div>
          : <Wait note={waitNote} elapsed={elapsed} />)}
        {!loading && needsReply && (
          <div className="retry" role="alert">
            <span>{error || "The coach hasn't replied to this yet — the connection may have dropped."}</span>
            <button className="btn btn-sm btn-ghost" onClick={onRetry}><Refresh size={13} />Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Composer({ taRef, value, onChange, onSend, disabled, hint }) {
  const can = value.trim().length > 0 && !disabled;
  const grow = (e) => { const t = e.target; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; };
  return (
    <div className="composer">
      <div className="composer-row">
        <textarea ref={taRef} value={value} rows={1} placeholder="Respond to the coach — or share any idea, even if it belongs to a later step…"
          onChange={(e) => { onChange(e.target.value); grow(e); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (can) onSend(); } }} aria-label="Message to the coach" />
        <button className="send" onClick={onSend} disabled={!can} aria-label="Send"><Send size={16} /></button>
      </div>
      <div className="composer-hint"><span>Enter to send · Shift+Enter for a new line</span><span>{hint}</span></div>
    </div>
  );
}
