import { useEffect, useRef, useState } from "react";

// In-app confirmation, replacing window.confirm(). Native dialogs are blocked in some
// embedded browsers (where confirm() silently returns false, so "New unit" appeared to do
// nothing) and look out of place on iPad. Usage:
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm({ title, body, action }))) return;
//   …render {confirmDialog} somewhere in the tree.
export function useConfirm() {
  const [req, setReq] = useState(null);
  const confirm = (opts) => new Promise((resolve) => setReq({ ...opts, resolve }));
  const close = (answer) => { req?.resolve(answer); setReq(null); };
  return [confirm, req ? <ConfirmDialog {...req} onClose={close} /> : null];
}

function ConfirmDialog({ title, body, action = "Continue", danger, onClose }) {
  const okRef = useRef(null);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="modal-scrim" onClick={() => onClose(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">{title}</h2>
        {body && <p>{body}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button ref={okRef} className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={() => onClose(true)}>{action}</button>
        </div>
      </div>
    </div>
  );
}
