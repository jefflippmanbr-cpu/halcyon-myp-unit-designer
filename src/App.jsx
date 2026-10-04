import { useEffect, useRef, useState } from "react";
import { COACH_PROMPT, COMPILE_PROMPT, COACH_SCHEMA, stepLabel, recordContext } from "./prompts.js";
import { FRAMEWORKS } from "./theme.js";
import { streamMessage, getToken, setToken, AuthError, savePlan, deletePlan, planUrl } from "./lib/api.js";
import { parseStructured, partialMessage, looksCorrupted } from "./lib/parse.js";
import { mergeCaptured, recordAsText, recordGaps } from "./lib/record.js";
import { processFile, buildFirstMessage } from "./lib/files.js";
import { planTitle } from "./lib/plan.js";
import { findUrls, verifyLinks } from "./lib/links.js";
import { saveDraft, loadDraft, clearDraft, loadLibrary, rememberPlan, forgetPlan, timeAgo } from "./lib/storage.js";
import { MessageList, Composer } from "./components/Chat.jsx";
import { Rail } from "./components/Rail.jsx";
import { RecordPanel } from "./components/RecordPanel.jsx";
import { PlanView } from "./components/PlanView.jsx";
import { Welcome, UploadScreen, LoginScreen } from "./components/Screens.jsx";
import { Layers, Notes, Menu, Sparkle, File } from "./components/Icons.jsx";
import { useConfirm } from "./components/Confirm.jsx";
import { LinkBox } from "./components/LinkBox.jsx";
import { copyText } from "./lib/clipboard.js";

const textOf = (content) =>
  typeof content === "string" ? content : (content || []).filter(b => b.type === "text").map(b => b.text).join("\n");

// The compile is asked for bare markdown, but strip a stray code fence or preamble if one
// slips through so the document always starts at its title.
const cleanPlan = (t) => {
  const s = t.replace(/^\s*```(?:markdown|md)?\s*\n/i, "").replace(/\n```\s*$/, "");
  const i = s.search(/^#\s/m);
  return (i > 0 ? s.slice(i) : s).trim();
};

// Seconds since `active` last became true; 0 while inactive. Drives the wait messaging.
function useElapsed(active) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) { setS(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

export default function App() {
  // null = still checking with the server whether a password is configured
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    fetch("/api/auth/config").then(r => r.json())
      .then(d => setAuthed(d.passwordRequired ? Boolean(getToken()) : true))
      .catch(() => setAuthed(true)); // server unreachable — let the app load and fail visibly
  }, []);

  const [phase, setPhase] = useState("welcome");   // welcome | upload | chat
  const [view, setView] = useState("coach");       // coach | plan
  const [msgs, setMsgs] = useState([]);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [record, setRecord] = useState([]);
  const [plan, setPlan] = useState(null);          // {markdown, builtAt, id?, editKey?, title?}
  const [mode, setMode] = useState(null);
  const [file, setFile] = useState(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileErr, setFileErr] = useState(null);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildText, setBuildText] = useState("");
  const [buildError, setBuildError] = useState(null);
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  const [restored, setRestored] = useState(null);
  const [draftWarning, setDraftWarning] = useState(false);
  const [library, setLibrary] = useState(loadLibrary);
  const [recordOpen, setRecordOpen] = useState(() => window.innerWidth > 1200);
  const [railOpen, setRailOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [linkBox, setLinkBox] = useState(null);   // a URL to show for manual copying

  const hydrated = useRef(false);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const elapsed = useElapsed(loading || building);
  const [confirm, confirmDialog] = useConfirm();

  const notify = (m) => { setToast(m); clearTimeout(notify.t); notify.t = setTimeout(() => setToast(null), 3200); };

  // Links in a reply are shown disabled until checked, then swapped for verified ones.
  const verifyMessageLinks = (msg) => {
    verifyLinks(msg.content).then(({ md }) => {
      setMsgs(ms => ms.map(m => m === msg ? { ...m, content: md, linksPending: false } : m));
    });
  };

  // ── Draft persistence ──
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setMsgs(d.msgs); setStep(d.step ?? 0); setMaxStep(d.maxStep ?? d.step ?? 0); setPhase(d.phase ?? "chat");
      setMode(d.mode ?? null); setInput(d.input ?? ""); setFile(d.file ?? null);
      setRecord(d.record ?? []); setPlan(d.plan ?? null);
      setRestored({ savedAt: d.savedAt });
      // A reload mid-check would otherwise leave those links disabled for good.
      d.msgs.filter(m => m.linksPending).forEach(verifyMessageLinks);
    }
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current || msgs.length === 0) return;
    // The uploaded file's contents already live in the first message; keep only its name.
    const fileMeta = file ? { name: file.name, kind: file.kind } : null;
    setDraftWarning(!saveDraft({ msgs, step, maxStep, phase, mode, input, file: fileMeta, record, plan }));
  }, [msgs, step, maxStep, phase, mode, input, file, record, plan]);

  // Follow the conversation down — but only if the teacher is already near the bottom,
  // so scrolling up to reread something isn't yanked away mid-stream.
  const stick = useRef(true);
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const onScroll = () => { stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; };
    el.addEventListener("scroll", onScroll); return () => el.removeEventListener("scroll", onScroll);
  }, [phase, view]);
  useEffect(() => {
    const el = scrollRef.current;
    // After layout, so a freshly restored conversation opens at its latest message.
    if (el && stick.current) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [msgs, streamText, loading, error, view]);

  // A refresh mid-request loses that request; ask first, only while one is in flight.
  useEffect(() => {
    if (!loading && !building) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [loading, building]);

  // ── Coach turns ──
  const runCoachTurn = async (history) => {
    setLoading(true); setError(null); setStreamText(""); stick.current = true;
    // Replay assistant turns as the ORIGINAL JSON the model emitted, not the parsed prose.
    // Sending prose back while output_config still demands JSON makes the conversation
    // format-inconsistent, and the model can start narrating its own formatting decisions
    // into the visible message ("let's answer properly…") instead of just answering.
    const apiMsgs = history.map(m => ({ role: m.role, content: m.role === "assistant" && m.raw ? m.raw : m.content }));
    // A gap reminder at the end of the system prompt was ignored in testing; attached to
    // the teacher's latest message (never shown or saved) it gets acted on.
    const gaps = recordGaps(record, step);
    const last = apiMsgs[apiMsgs.length - 1];
    if (gaps.length && last?.role === "user" && typeof last.content === "string") {
      apiMsgs[apiMsgs.length - 1] = { ...last, content: `${last.content}\n\n[Note from the app, not the teacher: the unit record has nothing for ${gaps.join(" · ")}. Capture whatever the teacher settled for those steps, in full, in this turn's "captured" — then reply to the teacher as normal.]` };
    }
    const call = () => streamMessage({
      system: COACH_PROMPT + recordContext(recordAsText(record)), messages: apiMsgs, schema: COACH_SCHEMA,
      onText: (t) => {
        const pm = partialMessage(t);
        if (pm) setStreamText({ message: pm, question: partialMessage(t, "question") || "" });
      },
    });
    try {
      let { text } = await call();
      let parsed = parseStructured(text, step || 1);
      // Corruption is intermittent, so one clean retry reliably recovers it.
      if (looksCorrupted(parsed.message)) {
        console.warn("Corrupted model output detected; retrying once.");
        setStreamText("");
        try {
          const again = await call();
          const p2 = parseStructured(again.text, step || 1);
          if (!looksCorrupted(p2.message)) { text = again.text; parsed = p2; }
        } catch { /* keep the first answer */ }
      }
      const turn = history.filter(m => m.role === "assistant").length + 1;
      const reply = { role: "assistant", content: parsed.message, question: parsed.question, frameworks: parsed.frameworks, captured: parsed.captured, raw: text };
      if (findUrls(reply.content).length) reply.linksPending = true;
      setMsgs([...history, reply]);
      if (reply.linksPending) verifyMessageLinks(reply);
      setRecord(r => mergeCaptured(r, parsed.captured, turn));
      setStep(parsed.step); setMaxStep(m => Math.max(m, parsed.step));
    } catch (e) {
      if (e instanceof AuthError) setAuthed(false);
      // Nothing goes into the history on failure: the teacher's message stays, unanswered,
      // with a Try again button. (An error bubble used to be saved and re-sent to the model.)
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false); setStreamText("");
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const startUnit = (m, f) => {
    setPhase("chat"); setView("coach"); setMode(m);
    const base = m === "new"
      ? "Hello — I'm an MYP teacher designing a brand-new unit from scratch."
      : "Hello — I'm an MYP teacher. I want to transform and strengthen an existing unit using the Enhanced MYP, the Transcend 6 Leaps, PBL Gold Standard and Explorer Mode.";
    const first = { role: "user", content: buildFirstMessage(base, f), displayText: f ? `${base} (Attached: ${f.name})` : base, hidden: true };
    setFile(f ? { name: f.name, kind: f.kind } : null);
    setMsgs([first]);
    runCoachTurn([first]);
  };
  const chooseMode = (m) => { setMode(m); if (m === "transform") setPhase("upload"); else startUnit("new", null); };
  const onFile = async (f) => {
    setFileErr(null); setFileBusy(true);
    try { setFile(await processFile(f)); } catch (e) { setFileErr(e.message); }
    setFileBusy(false);
  };

  const send = () => {
    const text = input.trim(); if (!text || loading || building) return;
    setInput(""); if (taRef.current) taRef.current.style.height = "auto";
    const history = [...msgs, { role: "user", content: text }];
    setMsgs(history); runCoachTurn(history);
  };

  const revisit = (n, label) => {
    setRailOpen(false); setView("coach");
    setInput(`Let's revisit Step ${n} — ${label}: `);
    setTimeout(() => { const t = taRef.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 30);
  };

  // ── The plan ──
  const savePlanLink = async (p) => {
    setSaveState("saving");
    const title = planTitle(p.markdown);
    try {
      const res = await savePlan({ id: p.id, editKey: p.editKey, title, markdown: p.markdown });
      const saved = { ...p, id: res.id || p.id, editKey: res.editKey || p.editKey, title };
      setPlan(saved);
      setLibrary(rememberPlan({ id: saved.id, editKey: saved.editKey, title }));
      setSaveState("saved");
    } catch (e) {
      if (e instanceof AuthError) { setAuthed(false); setSaveState("error"); return; }
      // The link was deleted (or this browser lost its edit key): save as a fresh link.
      if (p.id && (e.status === 403 || e.status === 404)) return savePlanLink({ ...p, id: null, editKey: null });
      setSaveState("error");
    }
  };

  const buildPlan = async () => {
    if (building || loading) return;
    setBuilding(true); setBuildError(null); setBuildText(""); setView("plan");
    if (window.innerWidth <= 1200) setRecordOpen(false);
    const transcript = msgs.map(m => m.role === "user"
      ? `TEACHER: ${textOf(m.content)}`
      : `COACH: ${m.content}${m.question ? `\n${m.question}` : ""}`).join("\n\n");
    const doc = Array.isArray(msgs[0]?.content) ? msgs[0].content.find(b => b.type === "document") : null;
    const prompt = `UNIT RECORD — authoritative; every entry must appear in the plan:\n\n${recordAsText(record)}\n\n---\n\nCOACHING CONVERSATION — for context:\n\n${transcript}\n\n---\n\nWrite the full unit plan now, following the structure exactly.`;
    let last = 0;
    try {
      const { text, stopReason } = await streamMessage({
        system: COMPILE_PROMPT, messages: [{ role: "user", content: doc ? [doc, { type: "text", text: prompt }] : prompt }],
        // No extended thinking here, by measurement: on a full 46-entry unit, thinking
        // first meant 66s of blank screen and 152s in all; without it the plan starts
        // streaming in ~3s and finishes in ~85s, with the same sections, every record entry
        // present and comparable depth. The record has already done the hard thinking.
        maxTokens: 32000,
        // Re-rendering the whole document on every token is wasteful; ~8 frames a second reads as live.
        onText: (t) => { const now = Date.now(); if (now - last > 120) { last = now; setBuildText(t); } },
      });
      let md = cleanPlan(text);
      if (!/^#\s/m.test(md)) throw new Error("The plan came back in an unexpected format.");
      setBuildText(md); setCheckingLinks(true);
      md = (await verifyLinks(md)).md;
      setCheckingLinks(false);
      const next = { ...(plan || {}), markdown: md, builtAt: Date.now() };
      setPlan(next);
      if (stopReason === "max_tokens") setBuildError("It ran out of room before the end, so the last sections may be missing. Try Rebuild.");
      savePlanLink(next);
    } catch (e) {
      if (e instanceof AuthError) setAuthed(false);
      setBuildError(e.message || "Something went wrong while writing the plan.");
    } finally {
      setBuilding(false); setBuildText(""); setCheckingLinks(false);
    }
  };

  // Used by both the plan view and the saved-plans list.
  const copyLink = async (url) => {
    if (await copyText(url)) notify("Link copied — anyone with it can view this plan.");
    else setLinkBox(url);
  };
  const removeLink = async (p) => {
    if (!(await confirm({
      title: "Delete this link?",
      body: `"${p.title || "This plan"}" will no longer open for anyone you've shared it with. This can't be undone.`,
      action: "Delete link", danger: true,
    }))) return;
    try { await deletePlan(p); } catch (e) { notify(e.message); return; }
    setLibrary(forgetPlan(p.id));
    if (plan?.id === p.id) setPlan(pl => ({ ...pl, id: null, editKey: null }));
    notify("Link deleted.");
  };

  const resetUnit = async () => {
    if (msgs.length > 2 && !(await confirm({
      title: "Start a new unit?",
      body: plan?.id
        ? "This clears the current conversation. Your built plan stays available at its private link, under “Your saved plans”."
        : "This clears the current conversation and everything in “Unit so far”. You haven't built a plan from it yet.",
      action: "Start a new unit",
    }))) return;
    // Starting a new unit is the one place we deliberately discard the saved draft.
    clearDraft(); setRestored(null); setDraftWarning(false); setError(null); setBuildError(null);
    setPhase("welcome"); setView("coach"); setMsgs([]); setInput(""); setStep(0); setMaxStep(0);
    setRecord([]); setPlan(null); setMode(null); setFile(null); setFileErr(null); setSaveState("idle");
  };

  const login = async (pw) => {
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (!r.ok) return d?.error?.message || "Incorrect password.";
      setToken(d.token); setAuthed(true); return null;
    } catch { return "Couldn't reach the server. Try again."; }
  };

  if (authed === null) return <div style={{ height: "100dvh", background: "var(--cream)" }} />;
  if (authed === false) return <LoginScreen onLogin={login} />;

  const inChat = phase === "chat";
  const needsReply = inChat && !loading && msgs.length > 0 && msgs[msgs.length - 1].role === "user";
  const waitNote = loading && elapsed >= 12 ? "Still working — this one is taking a little longer than usual." : null;
  const canBuild = maxStep >= 14 || !!plan;
  const showRecord = inChat && view === "coach" && recordOpen;
  const latestTurn = msgs.filter(m => m.role === "assistant").length;

  return (
    <div className="app">
      <header className="topbar">
        {inChat && <button className="btn-top btn only-narrow" onClick={() => setRailOpen(o => !o)} aria-label="Show steps"><Menu size={16} /></button>}
        <div className="brand">
          <div className="brand-mark"><Layers size={16} style={{ color: "#8FC4A8" }} /></div>
          <div>
            <div className="brand-name">Halcyon MYP Unit Designer</div>
            <div className="brand-sub" aria-label={FRAMEWORKS.map(f => f.name).join(", ")}>
              {FRAMEWORKS.map(f => <span key={f.key} className={`fw-${f.key}`} title={f.name} />)}
            </div>
          </div>
        </div>
        <div className="topbar-spacer" />
        {inChat && step > 0 && view === "coach" && (
          <div className="step-pill hide-narrow">{mode === "transform" ? "Transform · " : ""}Step <b>{step}</b> of 14 · {stepLabel(step)}</div>
        )}
        {inChat && (plan || building) && (
          <div className="seg" role="tablist">
            <button className={view === "coach" ? "on" : ""} onClick={() => setView("coach")} role="tab" aria-selected={view === "coach"}>Coach</button>
            <button className={view === "plan" ? "on" : ""} onClick={() => setView("plan")} role="tab" aria-selected={view === "plan"}>Unit plan</button>
          </div>
        )}
        {inChat && view === "coach" && (
          <button className={`btn btn-top${recordOpen ? " on" : ""}`} onClick={() => setRecordOpen(o => !o)} aria-pressed={recordOpen}>
            <Notes size={14} /><span className="hide-narrow">Unit so far</span>{record.length > 0 && <span className="count-dot">{record.length}</span>}
          </button>
        )}
        {phase !== "welcome" && <button className="btn btn-top" onClick={resetUnit}>New unit</button>}
      </header>

      <div className={`body${showRecord ? " with-record" : ""}`}>
        <Rail step={step} maxStep={maxStep} record={record} onRevisit={revisit} open={railOpen}
          canRevisit={inChat && !loading && !building} planBuilt={!!plan} />

        <main className="main">
          {phase === "welcome" ? (
            <Welcome onStart={chooseMode} library={library} onCopy={(p) => copyLink(planUrl(p.id))} onDelete={removeLink} />
          ) : phase === "upload" ? (
            <UploadScreen file={file} busy={fileBusy} error={fileErr} onFile={onFile} onClear={() => setFile(null)}
              onGo={() => startUnit("transform", file)} onSkip={() => startUnit("transform", null)} />
          ) : view === "plan" ? (
            <PlanView plan={plan} record={record} building={building} buildText={buildText} buildError={buildError} checkingLinks={checkingLinks}
              elapsed={elapsed} saveState={saveState} onBack={() => setView("coach")} onRebuild={buildPlan}
              onSave={() => plan && savePlanLink(plan)} onCopyLink={copyLink} />
          ) : (
            <>
              {mode === "transform" && file && (
                <div className="banner banner-green"><File size={13} />Transforming: {file.name}</div>
              )}
              {restored && (
                <div className="banner banner-green">
                  <span>↻ Picked up where you left off — last saved {timeAgo(restored.savedAt)}.</span>
                  <button className="x" onClick={() => setRestored(null)} aria-label="Dismiss">✕</button>
                </div>
              )}
              {draftWarning && (
                <div className="banner banner-gold">⚠ This unit is too large to auto-save in your browser — build and save the plan when it's ready, and avoid closing this tab.</div>
              )}
              <MessageList msgs={msgs.filter(m => !m.hidden)} streamText={streamText} loading={loading} waitNote={waitNote}
                elapsed={elapsed} error={error} needsReply={needsReply} onRetry={() => runCoachTurn(msgs)}
                onOpenRecord={() => setRecordOpen(true)} scrollRef={scrollRef} />
              {canBuild && (
                <div className="build-cta">
                  <div className="txt">
                    {plan ? <><b>Your unit plan is built.</b><span className="sub">Made changes since? Rebuild it from your latest decisions — the same link updates.</span></>
                      : <><b>Ready to build your unit plan?</b><span className="sub">It's written from everything in your unit record ({record.length} item{record.length === 1 ? "" : "s"}) and takes a minute or so — you'll see it appear as it's written.</span></>}
                  </div>
                  {plan && <button className="btn btn-ghost" onClick={() => setView("plan")}>View plan</button>}
                  <button className="btn btn-gold" onClick={buildPlan} disabled={loading || building}>
                    <Sparkle />{plan ? "Rebuild plan" : "Build my unit plan"}
                  </button>
                </div>
              )}
              <Composer taRef={taRef} value={input} onChange={setInput} onSend={send} disabled={loading || building}
                hint={step ? `Step ${step} of 14 · ${stepLabel(step)}` : ""} />
            </>
          )}
        </main>

        {showRecord && (
          <RecordPanel record={record} latestTurn={latestTurn} onClose={() => setRecordOpen(false)}
            onBuild={buildPlan} canBuild={canBuild} building={building} />
        )}
        <div className={`scrim${railOpen || showRecord ? " on" : ""}`} onClick={() => { setRailOpen(false); setRecordOpen(false); }} />
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {confirmDialog}
      {linkBox && <LinkBox url={linkBox} onClose={() => setLinkBox(null)} />}
    </div>
  );
}
