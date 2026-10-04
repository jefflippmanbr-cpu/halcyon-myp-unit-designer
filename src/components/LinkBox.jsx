import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard.js";

// Shown when automatic copying is refused: the link, pre-selected, with a Copy button to
// try again and a hint for copying by hand. Selecting the text means ⌘C / Ctrl+C (or a
// long-press on iPad) is all that's left to do.
export function LinkBox({ url, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    ref.current?.focus(); ref.current?.select();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const retry = async () => { if (await copyText(url)) { setCopied(true); setTimeout(onClose, 900); } else ref.current?.select(); };
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="linkbox-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="linkbox-title">Your private link</h2>
        <p>Anyone with this link can view the plan — no password needed. Your browser didn't allow automatic copying, so it's selected below: press <b>⌘C</b> (Mac) or <b>Ctrl+C</b> (Windows) to copy it.</p>
        <input ref={ref} className="input" readOnly value={url} onFocus={(e) => e.target.select()} onClick={(e) => e.target.select()} aria-label="Plan link" />
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
          <button className="btn btn-green" onClick={retry}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}
