import { useEffect, useState } from "react";
import { fetchPlan } from "./lib/api.js";
import { downloadWord } from "./lib/plan.js";
import { PlanDocument } from "./components/PlanDocument.jsx";
import { Layers, Download, Printer } from "./components/Icons.jsx";

// The public view behind a private link (/p/<id>). No password: the unguessable link is
// the permission, so a teacher can share a plan with anyone, inside Halcyon or not.
export default function SharedPlan({ id }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchPlan(id).then(p => { setPlan(p); document.title = `${p.title} · Halcyon MYP Unit Plan`; }).catch(e => setError(e.message));
  }, [id]);

  return (
    <div className="shared">
      <div className="shared-top">
        <div className="brand-mark"><Layers size={15} style={{ color: "#8FC4A8" }} /></div>
        <div className="brand-name">Halcyon MYP Unit Plan</div>
        <div className="grow" />
        {plan && <>
          <button className="btn btn-sm btn-top" onClick={() => downloadWord(plan.markdown, plan.title)}><Download size={13} />Word</button>
          <button className="btn btn-sm btn-top" onClick={() => window.print()}><Printer size={13} />PDF</button>
        </>}
      </div>
      {error && <div className="center" style={{ minHeight: "60vh" }}><div className="panel"><h1>Plan not found</h1><p>{error}</p></div></div>}
      {!plan && !error && <div className="center" style={{ minHeight: "60vh" }}><div className="dots"><span /><span /><span /></div></div>}
      {plan && <PlanDocument markdown={plan.markdown} />}
    </div>
  );
}
