import { useState, useRef, useEffect } from "react";

const H = {
  navy:"#1B3A5C", navyMid:"#2C527A", navyDark:"#132B45",
  teal:"#2AABB8", tealLight:"#7DD4DB", tealPale:"#EBF8FA",
  gold:"#D4A843", goldLight:"#EDD08A", goldPale:"#FBF3E0",
  cream:"#F7F5F0", greyLight:"#E8EDF2", greyMid:"#8A9BB0", white:"#FFFFFF",
};

// ─── System prompts ────────────────────────────────────────────────────────────

const UNIT_PROMPT = `You are an MYP Unit Design Coach at Halcyon London International School — a non-profit IB school near Marble Arch. You help teachers design or transform MYP units using three frameworks.

CRITICAL: Begin EVERY response with exactly [STEP:N] (N = 1–14) on its own line, then your response.

## HOW YOU TALK — read this carefully
- Be BRIEF. Most responses are 2–4 sentences plus any options. Never pad.
- Warm but never effusive. No "Wonderful!", "I love that!", "What a fantastic idea!". A short, genuine nod is enough, then move on.
- Ask ONE thing at a time. Don't stack questions.
- CHALLENGE the educator. When an answer is vague, safe, teacher-centred, or low on authenticity/rigour/student agency, name the gap and push back with a sharp question before advancing. You are a critical friend, not a cheerleader.
- Use **bold** only for genuinely key terms. Don't over-format.

## Three Frameworks
### Enhanced MYP
Key + Related Concepts; Global Contexts (Identities & Relationships; Personal & Cultural Expression; Orientation in Space & Time; Scientific & Technical Innovation; Globalization & Sustainability; Fairness & Development); Statement of Inquiry = key concept + related concept(s) + global context; Inquiry Questions (Factual/Conceptual/Debatable); ATL clusters; Subject groups; MYP criteria A–D.
### Transcend 6 Leaps
Whole-Child Focus · Connection & Community · High Expectations with Rigorous Learning · Relevance · Customization · Agency.
### PBL Gold Standard
Challenging Problem/Question · Sustained Inquiry · Authenticity · Student Voice & Choice · Reflection · Critique & Revision · Public Product.

## 14-Step Workflow — one step per turn, wait for the teacher
**Step 1**: One-line welcome. If the teacher UPLOADED an existing unit, read it and give a SHORT diagnostic — 2–3 bullet points naming where it's strong and where it's thin against the Leaps and PBL (be specific and honest, not flattering). Then ask for grade level (MYP Year 1–5) and subject group if not already clear. If NEW, just ask grade level and subject group.
**Step 2**: Ask unit length in weeks. One line noting 4–8 weeks allows real depth.
**Step 3**: Ask their global context and its link to the subject. Briefly affirm or challenge the fit, then offer 1 sharper alternative.
**Step 4**: Ask for content topics + ATL skills. Then give THREE authentic summative tasks (real audience, public product, MYP criteria, 3+ Leaps). One line each. Ask them to pick — and challenge them if they lean toward the safest one.
**Step 4b**: Suggest one vivid classroom transformation tied to the chosen task. Two sentences.
**Step 5**: THREE Statements of Inquiry (key + related concept + global context, debatable). Ask which, or invite their own.
**Step 6**: A Project Invitation — 2 short student-facing paragraphs. No preamble.
**Step 7**: Three Inquiry Questions (Factual / Conceptual / Debatable). Ask which.
**Step 8**: 5–7 Lines of Inquiry, foundational → synthesis. Ask which to keep.
**Step 9**: Recommend MYP criteria (correct A–D labels for the subject) with the specific strands to assess. Brief.
**Step 10**: 5–7 named formative assessments, chronological. One line each: name + what it builds + which Leap. No "Quiz 1".
**Step 11**: 6–8 specific named resources (real book/author, article + publication, film + year, actual podcast). One line why each. No vague topics.
**Step 12**: Confirm location (Halcyon = Marble Arch, central London), then 5–8 specific London/UK experts, orgs, or partners with a one-line outreach angle.
**Step 13**: THREE unit titles, then a final polished Project Invitation.
**Step 14**: Ask if ready to compile. If yes, produce the full structured unit plan under clear headings, then say: "Your unit plan is complete — click Download to save it as a Word document."`;

const LESSON_PROMPT = `You are a lesson design coach at Halcyon London International School, an IB MYP school near Marble Arch, central London.

CRITICAL: Begin EVERY response with exactly [LSTEP:N] (N = 1–5) on its own line, then your response.

## HOW YOU TALK
- Brief and direct. 2–4 sentences plus any structure. No padding.
- Warm but not effusive — skip the exclamation marks and lavish praise.
- Ask ONE thing at a time.
- Challenge weak or generic thinking. If an activity is passive or teacher-centred, say so and push for something more active and student-driven.

## Lesson Plan must include
Learning Intention ("I can…"); Success Criteria (3–4 observable); Essential Question; Phases with timing (Hook 5–8 · Building Knowledge 10–15 · Application 15–20 · Synthesis 5–8 · Reflection/Exit 5); Differentiation (Extension / Support / EAL — specific); ATL skills (cluster + skill); Resources; Key teacher questions per phase.

## Workflow
**Step 1**: If the teacher UPLOADED a unit or lesson, read it and note in 1–2 lines how this lesson fits. Then ask: topic, subject + grade, and lesson length. (Skip what the upload already answers.)
**Step 2**: Ask the specific learning intention — what students should be able to do by the end.
**Step 3**: Ask class profile briefly: prior knowledge, differentiation needs, class size.
**Step 4**: Produce the full structured lesson plan. Specific timing and teacher moves. Genuinely active. End with: "Ready to present this? Click **Generate Slides** below."
**Step 5**: Refine whatever the teacher wants. Keep pushing toward active, inquiry-driven design.`;

const SLIDES_PROMPT = `You generate JSON slide decks for IB MYP teachers at Halcyon London International School.
Return ONLY valid JSON — no markdown fences, no explanation. Start with { and end with }.
Generate 9–12 slides from the lesson plan using this structure:
{
  "title":"Lesson title","subtitle":"Subject | MYP Year X | Duration",
  "slides":[
    {"type":"title","heading":"Lesson title","body":"Essential question"},
    {"type":"objectives","heading":"Learning Intentions","items":["I can…","I can…"]},
    {"type":"hook","heading":"Warm-Up (X min)","body":"Activity","items":["Step 1","Step 2"]},
    {"type":"content","heading":"Section","body":"Optional","items":["Point 1","Point 2"]},
    {"type":"activity","heading":"Activity (X min)","body":"Description","items":["Step 1","Step 2"],"time":"15 min"},
    {"type":"discussion","heading":"Discussion","question":"The question","body":"Think–Pair–Share"},
    {"type":"exit","heading":"Exit Ticket","items":["Question 1?","Question 2?"]}
  ]
}
Rules: "title" first, "objectives" second, "exit" last, at least one "discussion". Max 6 bullets/slide. Concise projected text, student-facing. Timing on activity slides.`;

// ─── Steps metadata ────────────────────────────────────────────────────────────

const UNIT_STEPS = [
  {n:1,label:"Design Path"},{n:2,label:"Unit Duration"},{n:3,label:"Global Context"},
  {n:4,label:"Summative Task"},{n:5,label:"Statement of Inquiry"},{n:6,label:"Project Invitation"},
  {n:7,label:"Inquiry Questions"},{n:8,label:"Lines of Inquiry"},{n:9,label:"Criteria & Objectives"},
  {n:10,label:"Formative Assessments"},{n:11,label:"Resources"},{n:12,label:"Expert Connections"},
  {n:13,label:"Unit Title"},{n:14,label:"Full Unit Plan"},
];
const LESSON_STEPS = [
  {n:1,label:"Topic & Context"},{n:2,label:"Learning Intention"},
  {n:3,label:"Class Profile"},{n:4,label:"Lesson Plan"},{n:5,label:"Refinement"},
];

// ─── Parsing ───────────────────────────────────────────────────────────────────

const parseUnit = (t) => {
  const m = t.match(/^\[STEP:(\d+)\]\s*/);
  return m ? {step:parseInt(m[1]),clean:t.replace(/^\[STEP:\d+\]\s*/,"").trim()} : {step:null,clean:t.trim()};
};
const parseLesson = (t) => {
  const m = t.match(/^\[LSTEP:(\d+)\]\s*/);
  return m ? {step:parseInt(m[1]),clean:t.replace(/^\[LSTEP:\d+\]\s*/,"").trim()} : {step:null,clean:t.trim()};
};

// ─── File reading ──────────────────────────────────────────────────────────────

const readAsBase64 = (file) => new Promise((res,rej)=>{
  const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file);
});
const readAsText = (file) => new Promise((res,rej)=>{
  const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file);
});

async function processFile(file) {
  const name = file.name; const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) { const b64 = await readAsBase64(file); return { name, kind:"pdf", data:b64 }; }
  if (lower.endsWith(".docx")) {
    try {
      const mammoth = await import("https://esm.sh/mammoth@1.8.0");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { name, kind:"text", data:result.value };
    } catch(e) { throw new Error("Couldn't read that .docx. Try exporting it as PDF instead."); }
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) { const txt = await readAsText(file); return { name, kind:"text", data:txt }; }
  throw new Error("Please upload a PDF, .docx, or .txt file. (Export a Google Doc as PDF: File → Download → PDF.)");
}

function buildFirstMessage(baseText, file) {
  if (!file) return baseText;
  if (file.kind === "pdf") {
    return [
      { type:"document", source:{ type:"base64", media_type:"application/pdf", data:file.data } },
      { type:"text", text:`${baseText}\n\nI've attached my existing unit as a PDF ("${file.name}"). Please read it and use it as the starting point.` },
    ];
  }
  return `${baseText}\n\nHere is my existing unit ("${file.name}"):\n\n"""\n${file.data.slice(0,12000)}\n"""\n\nPlease read it and use it as the starting point.`;
}

// ─── Inline markdown ───────────────────────────────────────────────────────────

function renderInline(text) {
  if (typeof text !== "string") return text;
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length>4)
      return <strong key={i} style={{fontWeight:700,color:H.navyDark}}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length>2 && !p.startsWith("**"))
      return <em key={i}>{p.slice(1,-1)}</em>;
    return p;
  });
}

function MdContent({text}) {
  if (!text) return null;
  const lines = text.split("\n"); const els = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) { els.push(<div key={i} style={{margin:"12px 0 3px",fontSize:"12.5px",fontFamily:"Georgia,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(4))}</div>); i++; continue; }
    if (line.startsWith("## ")) { els.push(<div key={i} style={{margin:"14px 0 4px",fontSize:"13.5px",fontFamily:"Georgia,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(3))}</div>); i++; continue; }
    if (line.startsWith("# ")) { els.push(<div key={i} style={{margin:"14px 0 5px",fontSize:"15px",fontFamily:"Georgia,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(2))}</div>); i++; continue; }
    if (/^[-*] /.test(line)) {
      const items=[]; while(i<lines.length && /^[-*] /.test(lines[i])){items.push(lines[i].slice(2));i++;}
      els.push(<div key={`ul${i}`} style={{margin:"5px 0"}}>{items.map((c,j)=>(
        <div key={j} style={{display:"flex",gap:"7px",marginBottom:"4px",lineHeight:"1.55"}}>
          <span style={{color:H.teal,flexShrink:0,fontWeight:700}}>›</span>
          <span style={{fontSize:"13.5px"}}>{renderInline(c)}</span>
        </div>))}</div>); continue;
    }
    if (/^\d+\. /.test(line)) {
      const items=[]; while(i<lines.length && /^\d+\. /.test(lines[i])){items.push(lines[i].replace(/^\d+\. /,""));i++;}
      els.push(<div key={`ol${i}`} style={{margin:"5px 0"}}>{items.map((c,j)=>(
        <div key={j} style={{display:"flex",gap:"8px",marginBottom:"5px",lineHeight:"1.55"}}>
          <span style={{color:H.teal,fontWeight:700,flexShrink:0,minWidth:"20px",fontSize:"13px"}}>{j+1}.</span>
          <span style={{fontSize:"13.5px"}}>{renderInline(c)}</span>
        </div>))}</div>); continue;
    }
    if (line.startsWith("---")) { els.push(<div key={i} style={{borderTop:`1px solid ${H.greyLight}`,margin:"9px 0"}}/>); i++; continue; }
    els.push(<p key={i} style={{margin:"4px 0",lineHeight:"1.62",fontSize:"13.5px"}}>{renderInline(line)}</p>); i++;
  }
  return <>{els}</>;
}

// ─── Download helpers ──────────────────────────────────────────────────────────

function mdToHtmlStr(md) {
  if (!md) return "";
  const inline = t => t.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>");
  const lines = md.split("\n"); let html=""; let inUl=false;
  for (const line of lines) {
    if (!line.trim()) { if(inUl){html+="</ul>\n";inUl=false;} html+="<br>\n"; continue; }
    if (/^[-*] /.test(line)) { if(!inUl){html+="<ul>\n";inUl=true;} html+=`<li>${inline(line.slice(2))}</li>\n`; continue; }
    if (inUl) { html+="</ul>\n"; inUl=false; }
    if (line.startsWith("# ")) { html+=`<h1>${inline(line.slice(2))}</h1>\n`; continue; }
    if (line.startsWith("## ")) { html+=`<h2>${inline(line.slice(3))}</h2>\n`; continue; }
    if (line.startsWith("### ")) { html+=`<h3>${inline(line.slice(4))}</h3>\n`; continue; }
    if (line.startsWith("---")) { html+="<hr>\n"; continue; }
    html+=`<p>${inline(line)}</p>\n`;
  }
  if (inUl) html+="</ul>\n";
  return html;
}

function downloadDoc(msgs, kind) {
  const content = msgs.filter(m=>m.role==="assistant").map(m=>typeof m.content==="string"?m.content:"").join("\n\n---\n\n");
  const isUnit = kind==="unit"; const accent = isUnit?H.navy:H.teal;
  const title = isUnit?"Halcyon MYP Unit Plan":"Halcyon Lesson Plan";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#132B45;max-width:820px;margin:40px auto;padding:20px}
.hdr{background:${accent};color:white;padding:18px 28px;border-radius:8px;margin-bottom:26px}
.hdr h1{color:${isUnit?"#7DD4DB":"white"};margin:0 0 5px;font-size:${isUnit?"22pt":"20pt"};font-family:Georgia,serif}
.hdr p{color:rgba(255,255,255,.85);margin:0;font-size:10pt}
h1{color:#1B3A5C;font-size:17pt;border-bottom:2px solid #2AABB8;padding-bottom:6px;margin-top:26px;font-family:Georgia,serif}
h2{color:#1B3A5C;font-size:13pt;margin-top:20px;border-bottom:1px solid #E8EDF2;padding-bottom:3px}
h3{color:#2AABB8;font-size:11.5pt;margin-top:14px}
strong{color:#132B45}li{margin:4px 0}hr{border:none;border-top:1px solid #E8EDF2;margin:16px 0}p{margin:6px 0}
</style></head><body>
<div class="hdr"><h1>${title}</h1>
<p>Halcyon London International School · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p></div>
${mdToHtmlStr(content)}</body></html>`;
  const blob=new Blob([html],{type:"application/msword"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=isUnit?"Halcyon_MYP_Unit_Plan.doc":"Halcyon_Lesson_Plan.doc"; a.click();
  URL.revokeObjectURL(url);
}

function downloadSlidesDeck(slides) {
  if (!slides) return;
  const bgMap={title:H.navy,objectives:H.teal,hook:H.goldPale,content:H.white,activity:H.tealPale,discussion:H.goldPale,exit:H.navyDark};
  const tcMap={title:H.white,objectives:H.white,hook:H.navyDark,content:H.navy,activity:H.navy,discussion:H.navy,exit:H.white};
  const renderS=(s)=>{
    const bg=bgMap[s.type]||H.white, tc=tcMap[s.type]||H.navy;
    const accent=s.type==="discussion"?H.gold:H.teal; let inner="";
    if(s.type==="title"){
      inner=`<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${H.tealLight};margin-bottom:14px">${slides.subtitle||""}</div>
        <h1 style="font-family:Georgia,serif;font-size:40px;color:${H.tealLight};margin:0 0 16px;line-height:1.15">${s.heading}</h1>
        ${s.body?`<p style="font-size:18px;color:rgba(255,255,255,.7);font-style:italic">${s.body}</p>`:""}`;
    } else if(s.type==="discussion"){
      inner=`<div style="font-size:12px;font-weight:700;color:${H.gold};letter-spacing:1px;text-transform:uppercase;margin-bottom:16px">${s.heading}</div>
        <div style="background:white;border-radius:10px;padding:22px 28px;border-left:6px solid ${H.gold};margin-bottom:14px">
        <p style="font-family:Georgia,serif;font-size:20px;color:${H.navy};font-style:italic;line-height:1.5">"${s.question}"</p></div>
        ${s.body?`<p style="font-size:13px;color:${H.greyMid}">${s.body}</p>`:""}`;
    } else {
      inner=`<h2 style="font-family:Georgia,serif;font-size:24px;color:${tc};margin:0 0 16px;border-bottom:2px solid ${accent}30;padding-bottom:10px">${s.heading}</h2>
        ${s.body?`<p style="font-size:14px;color:${tc};opacity:.9;margin:0 0 12px;line-height:1.5">${s.body}</p>`:""}
        ${(s.items||[]).map(it=>`<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start">
          <span style="color:${accent};font-weight:700;flex-shrink:0">›</span>
          <span style="font-size:14px;color:${tc};line-height:1.45">${it}</span></div>`).join("")}
        ${s.time?`<div style="margin-top:14px;display:inline-block;background:${H.navy};color:white;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700">${s.time}</div>`:""}`;
    }
    return `<div class="slide" style="background:${bg}"><div class="inner">${inner}</div></div>`;
  };
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${slides.title||"Lesson Slides"}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0d2137}
.slide{width:100%;max-width:1024px;min-height:576px;margin:20px auto;border-radius:10px;overflow:hidden;display:none;flex-direction:column;justify-content:center;page-break-after:always}
.slide.active{display:flex}.inner{padding:52px 68px;flex:1;display:flex;flex-direction:column;justify-content:center}
.bar{position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,.7);padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.btn{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;padding:7px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
.btn:hover{background:rgba(255,255,255,.25)}.btn:disabled{opacity:.4;cursor:default}.num{color:rgba(255,255,255,.7);font-size:13px}
.dots{display:flex;gap:5px}.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer}.dot.on{background:#2AABB8;transform:scale(1.2)}
@media print{body{background:white}.slide{display:flex!important;margin:0;border-radius:0;min-height:100vh;break-after:page}.bar{display:none}}</style></head><body>
${(slides.slides||[]).map(renderS).join("")}
<div class="bar"><button class="btn" id="prev" onclick="go(-1)">← Prev</button>
<div style="display:flex;align-items:center;gap:16px"><div class="dots" id="dots"></div><span class="num" id="num"></span></div>
<div style="display:flex;gap:8px"><button class="btn" onclick="window.print()">Print</button><button class="btn" id="next" onclick="go(1)">Next →</button></div></div>
<script>
var all=document.querySelectorAll('.slide'),cur=0,tot=all.length,dotsEl=document.getElementById('dots');
for(var i=0;i<tot;i++){var d=document.createElement('div');d.className='dot';d.onclick=(function(n){return function(){show(n)}})(i);dotsEl.appendChild(d);}
function show(n){all.forEach((s,i)=>s.classList.toggle('active',i===n));dotsEl.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('on',i===n));document.getElementById('num').textContent=(n+1)+' / '+tot;document.getElementById('prev').disabled=n===0;document.getElementById('next').disabled=n===tot-1;cur=n;}
function go(d){show(Math.max(0,Math.min(tot-1,cur+d)))}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')go(1);if(e.key==='ArrowLeft')go(-1)});show(0);
</script></body></html>`;
  const blob=new Blob([html],{type:"text/html"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`${(slides.title||"lesson").replace(/[^a-z0-9]/gi,"_")}_slides.html`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared UI atoms ───────────────────────────────────────────────────────────

function Dots() {
  return (
    <div style={{display:"flex",gap:"5px",padding:"12px 16px",background:H.white,borderRadius:"14px 14px 14px 4px",border:`1px solid ${H.greyLight}`,alignSelf:"flex-start",boxShadow:`0 1px 5px rgba(27,58,92,.06)`}}>
      {[0,180,360].map(d=><div key={d} style={{width:"7px",height:"7px",borderRadius:"50%",background:H.teal,animation:"db 1.2s ease-in-out infinite",animationDelay:`${d}ms`}}/>)}
    </div>
  );
}
function BotAvatar() {
  return (
    <div style={{width:"26px",height:"26px",borderRadius:"50%",background:`${H.teal}18`,border:`1.5px solid ${H.teal}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginRight:"8px",marginTop:"2px"}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={H.teal} strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
  );
}
function FileChip({file, onRemove}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:H.tealPale,border:`1px solid ${H.teal}40`,borderRadius:"7px",padding:"5px 10px",fontSize:"11.5px",color:H.navy}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={H.teal} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span style={{maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
      {onRemove&&<span onClick={onRemove} style={{cursor:"pointer",color:H.greyMid,fontWeight:700,marginLeft:"2px"}}>✕</span>}
    </div>
  );
}
function ChatInput({taRef, value, onChange, onSend, disabled}) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <div style={{padding:"10px 16px",background:H.white,borderTop:`1px solid ${H.greyLight}`,display:"flex",gap:"8px",alignItems:"flex-end"}}>
      <textarea ref={taRef} value={value} onChange={onChange}
        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onSend();}}}
        placeholder="Respond to the coach…" rows={1}
        style={{flex:1,border:`1.5px solid ${H.greyLight}`,borderRadius:"9px",padding:"8px 12px",fontSize:"13.5px",fontFamily:"inherit",resize:"none",color:H.navy,background:H.cream,lineHeight:1.5,maxHeight:"100px",overflow:"auto",transition:"border-color .2s"}}
      />
      <button onClick={onSend} disabled={!canSend} className={canSend?"hbtn":""}
        style={{background:canSend?H.navy:H.greyLight,color:canSend?H.white:H.greyMid,border:"none",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:canSend?"pointer":"default",transition:"all .2s",flexShrink:0}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  );
}
function MiniProgress({steps, current}) {
  return (
    <div style={{padding:"4px 16px 6px",background:H.white,borderTop:`1px solid ${H.greyLight}44`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:"9.5px",color:H.greyMid,opacity:.6}}>Enter to send · Shift+Enter new line</span>
      <div style={{display:"flex",gap:"3px"}}>
        {steps.map(s=><div key={s.n} style={{width:s.n===current?"16px":"5px",height:"3px",borderRadius:"2px",background:s.n<current?H.teal:s.n===current?H.gold:H.greyLight,transition:"all .3s"}}/>)}
      </div>
    </div>
  );
}
function MessageList({msgs, loading, scrollRef}) {
  return (
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {msgs.map((msg,idx)=>(
        <div key={idx} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
          {msg.role==="assistant"&&<BotAvatar/>}
          <div style={{maxWidth:"74%",background:msg.role==="user"?H.navy:H.white,color:msg.role==="user"?H.white:H.navy,borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 14px",boxShadow:"0 1px 5px rgba(27,58,92,.07)",border:msg.role==="assistant"?`1px solid ${H.greyLight}`:"none"}}>
            {msg.role==="assistant"?<MdContent text={msg.content}/>:<span style={{fontSize:"13.5px",lineHeight:1.6}}>{msg.displayText||msg.content}</span>}
          </div>
        </div>
      ))}
      {loading&&<div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}><BotAvatar/><Dots/></div>}
    </div>
  );
}

function UploadZone({file, onFile, onClear, error, busy, compact}) {
  const inputRef = useRef(null); const [drag, setDrag] = useState(false);
  const handle = async (f) => { if(f) await onFile(f); };
  return (
    <div>
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
        onClick={()=>inputRef.current?.click()}
        style={{border:`1.5px dashed ${drag?H.teal:H.greyMid}66`,background:drag?H.tealPale:H.cream,borderRadius:"10px",padding:compact?"14px":"22px 18px",textAlign:"center",cursor:"pointer",transition:"all .15s"}}>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
        {busy ? (
          <div style={{fontSize:"12.5px",color:H.teal,fontWeight:600}}>Reading file…</div>
        ) : file ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
            <FileChip file={file} onRemove={(e)=>{e?.stopPropagation?.();onClear();}}/>
          </div>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={H.greyMid} strokeWidth="1.8" style={{marginBottom:"6px"}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div style={{fontSize:"12.5px",color:H.navy,fontWeight:600,marginBottom:"3px"}}>Upload your existing unit</div>
            <div style={{fontSize:"11px",color:H.greyMid}}>PDF, .docx, or .txt · or drag &amp; drop</div>
            <div style={{fontSize:"10px",color:H.greyMid,marginTop:"4px",opacity:.8}}>Google Doc? File → Download → PDF, then upload</div>
          </>
        )}
      </div>
      {error&&<div style={{fontSize:"11px",color:"#A32D2D",marginTop:"7px"}}>{error}</div>}
    </div>
  );
}

// ─── Slide viewer ──────────────────────────────────────────────────────────────

function SlideViewer({slides, onClose}) {
  const [cur, setCur] = useState(0);
  const total = slides?.slides?.length || 0;
  const slide = slides?.slides?.[cur];
  useEffect(()=>{
    const h=e=>{ if(e.key==="ArrowRight"||e.key===" ")setCur(c=>Math.min(c+1,total-1)); if(e.key==="ArrowLeft")setCur(c=>Math.max(c-1,0)); };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[total]);
  if (!slide) return null;
  const bgMap={title:H.navy,objectives:H.teal,hook:H.goldPale,content:H.white,activity:H.tealPale,discussion:H.goldPale,exit:H.navyDark};
  const tcMap={title:H.white,objectives:H.white,hook:H.navyDark,content:H.navy,activity:H.navy,discussion:H.navy,exit:H.white};
  const bg=bgMap[slide.type]||H.white, tc=tcMap[slide.type]||H.navy;
  const accent=["title","exit"].includes(slide.type)?H.teal:slide.type==="objectives"?`${H.white}BB`:slide.type==="discussion"?H.gold:H.teal;
  const renderContent=()=>{
    if(slide.type==="title") return (<>
      <div style={{fontSize:"10px",fontWeight:700,letterSpacing:"1.8px",textTransform:"uppercase",color:H.tealLight,marginBottom:"12px"}}>{slides.subtitle||"Halcyon MYP Lesson"}</div>
      <div style={{fontFamily:"Georgia,serif",fontSize:"clamp(18px,3vw,28px)",fontWeight:700,color:H.tealLight,marginBottom:"14px",lineHeight:1.2}}>{slide.heading}</div>
      {slide.body&&<div style={{fontSize:"clamp(12px,1.5vw,15px)",color:`${H.white}BB`,lineHeight:1.5,fontStyle:"italic"}}>{slide.body}</div>}
      <div style={{marginTop:"20px",fontSize:"10px",color:`${H.tealLight}80`,letterSpacing:"1px",textTransform:"uppercase"}}>Halcyon London International School</div>
    </>);
    if(slide.type==="discussion") return (<>
      <div style={{fontSize:"10px",fontWeight:700,color:H.gold,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"14px"}}>{slide.heading}</div>
      <div style={{background:H.white,borderRadius:"10px",padding:"18px 22px",borderLeft:`5px solid ${H.gold}`,marginBottom:"12px"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:"clamp(14px,2.2vw,19px)",color:H.navy,fontStyle:"italic",lineHeight:1.5}}>"{slide.question}"</div>
      </div>
      {slide.body&&<div style={{fontSize:"12px",color:H.greyMid,marginTop:"8px"}}>{slide.body}</div>}
    </>);
    return (<>
      <div style={{fontFamily:"Georgia,serif",fontSize:"clamp(14px,2.5vw,20px)",fontWeight:700,color:tc,marginBottom:"14px",lineHeight:1.2,borderBottom:`2px solid ${accent}33`,paddingBottom:"9px"}}>{slide.heading}</div>
      {slide.body&&<div style={{fontSize:"clamp(11px,1.4vw,13.5px)",color:tc,opacity:.9,marginBottom:"10px",lineHeight:1.5}}>{slide.body}</div>}
      {slide.items?.map((item,j)=>(
        <div key={j} style={{display:"flex",gap:"8px",marginBottom:"7px",alignItems:"flex-start"}}>
          <span style={{color:accent,fontWeight:700,flexShrink:0,fontSize:"14px"}}>›</span>
          <span style={{fontSize:"clamp(11px,1.4vw,13px)",color:tc,lineHeight:1.45}}>{item}</span>
        </div>))}
      {slide.time&&<div style={{marginTop:"12px",display:"inline-block",background:H.navy,color:H.white,padding:"3px 12px",borderRadius:"14px",fontSize:"11px",fontWeight:700}}>{slide.time}</div>}
    </>);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:H.navyDark}}>
      <div style={{padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",background:H.navyDark,borderBottom:`1px solid ${H.white}12`,flexShrink:0}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:"12px",color:H.tealLight,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{slides.title||"Lesson Slides"}</div>
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <span style={{fontSize:"10.5px",color:H.greyMid}}>{cur+1} / {total}</span>
          <button onClick={()=>downloadSlidesDeck(slides)} style={{background:H.gold,color:H.navyDark,border:"none",borderRadius:"5px",padding:"4px 11px",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>↓ Download</button>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${H.greyMid}44`,color:H.greyMid,borderRadius:"5px",padding:"4px 9px",fontSize:"11px",cursor:"pointer"}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,padding:"14px 16px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{flex:1,background:bg,borderRadius:"10px",padding:"28px 36px",display:"flex",flexDirection:"column",justifyContent:"center",overflow:"hidden"}}>{renderContent()}</div>
      </div>
      <div style={{padding:"8px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap",maxWidth:"60%"}}>
          {slides.slides?.map((_,j)=>(<div key={j} onClick={()=>setCur(j)} style={{width:j===cur?"18px":"5px",height:"4px",borderRadius:"3px",background:j===cur?H.teal:`${H.greyMid}44`,cursor:"pointer",transition:"all .3s"}}/>))}
        </div>
        <div style={{display:"flex",gap:"6px"}}>
          <button onClick={()=>setCur(c=>Math.max(c-1,0))} disabled={cur===0} style={{background:cur===0?`${H.greyMid}22`:`${H.white}15`,border:"none",borderRadius:"6px",padding:"6px 12px",color:cur===0?H.greyMid:H.white,fontSize:"11px",cursor:cur===0?"default":"pointer"}}>← Prev</button>
          <button onClick={()=>setCur(c=>Math.min(c+1,total-1))} disabled={cur===total-1} style={{background:cur===total-1?`${H.greyMid}22`:H.teal,border:"none",borderRadius:"6px",padding:"6px 12px",color:cur===total-1?H.greyMid:H.white,fontSize:"11px",cursor:cur===total-1?"default":"pointer"}}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("unit");

  // Unit state
  const [uPhase, setUPhase] = useState("welcome"); // welcome | upload | chat
  const [uMsgs, setUMsgs] = useState([]);
  const [uLoading, setULoading] = useState(false);
  const [uStep, setUStep] = useState(0);
  const [uInput, setUInput] = useState("");
  const [uMode, setUMode] = useState(null);
  const [uFile, setUFile] = useState(null);
  const [uFileBusy, setUFileBusy] = useState(false);
  const [uFileErr, setUFileErr] = useState(null);

  // Lesson state
  const [lPhase, setLPhase] = useState("welcome");
  const [lMsgs, setLMsgs] = useState([]);
  const [lLoading, setLLoading] = useState(false);
  const [lStep, setLStep] = useState(0);
  const [lInput, setLInput] = useState("");
  const [lSlides, setLSlides] = useState(null);
  const [lSlideLoading, setLSlideLoading] = useState(false);
  const [lShowSlides, setLShowSlides] = useState(false);
  const [lFile, setLFile] = useState(null);
  const [lFileBusy, setLFileBusy] = useState(false);
  const [lFileErr, setLFileErr] = useState(null);

  const uScroll = useRef(null); const lScroll = useRef(null);
  const uTa = useRef(null); const lTa = useRef(null);

  useEffect(()=>{if(uScroll.current)uScroll.current.scrollTop=uScroll.current.scrollHeight;},[uMsgs,uLoading]);
  useEffect(()=>{if(lScroll.current)lScroll.current.scrollTop=lScroll.current.scrollHeight;},[lMsgs,lLoading]);

  const grow = (ref) => { const t=ref.current; if(t){t.style.height="auto";t.style.height=Math.min(t.scrollHeight,110)+"px";} };

  const claude = async (messages, sysPrompt) => {
    const r = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1400,system:sysPrompt,messages}),
    });
    const d = await r.json();
    if(d.error) throw new Error(d.error.message);
    return d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  };

  const onUFile = async (f) => { setUFileErr(null); setUFileBusy(true); try{ setUFile(await processFile(f)); }catch(e){ setUFileErr(e.message); } setUFileBusy(false); };
  const onLFile = async (f) => { setLFileErr(null); setLFileBusy(true); try{ setLFile(await processFile(f)); }catch(e){ setLFileErr(e.message); } setLFileBusy(false); };

  // ── Unit actions ──
  const chooseUnitMode = (mode) => {
    setUMode(mode);
    if (mode==="transform") setUPhase("upload");
    else startUnit("new", null);
  };
  const startUnit = async (mode, file) => {
    setUPhase("chat"); setULoading(true);
    const base = mode==="new"
      ? "Hello — I'm a Halcyon MYP teacher designing a brand-new unit from scratch."
      : "Hello — I'm a Halcyon MYP teacher. I want to transform and strengthen an existing unit using the Enhanced MYP, the 6 Leaps, and PBL Gold Standard.";
    const content = buildFirstMessage(base, file);
    const displayText = file ? `${base} (Attached: ${file.name})` : base;
    try {
      const raw = await claude([{role:"user",content}], UNIT_PROMPT);
      const {step,clean} = parseUnit(raw);
      if(step) setUStep(step);
      setUMsgs([{role:"user",content,displayText,hidden:true},{role:"assistant",content:clean}]);
    } catch { setUMsgs([{role:"assistant",content:"Connection error — please refresh and try again."}]); }
    setULoading(false); setTimeout(()=>uTa.current?.focus(),100);
  };
  const sendUnit = async () => {
    const text=uInput.trim(); if(!text||uLoading) return;
    setUInput(""); if(uTa.current) uTa.current.style.height="auto";
    const updated=[...uMsgs,{role:"user",content:text}];
    setUMsgs(updated); setULoading(true);
    try {
      const apiMsgs = updated.map(m=>({role:m.role,content:m.content}));
      const raw = await claude(apiMsgs, UNIT_PROMPT);
      const {step,clean} = parseUnit(raw);
      if(step) setUStep(step);
      setUMsgs([...updated,{role:"assistant",content:clean}]);
    } catch { setUMsgs([...updated,{role:"assistant",content:"Something went wrong. Please try again."}]); }
    setULoading(false); setTimeout(()=>uTa.current?.focus(),50);
  };
  const resetUnit = () => { setUPhase("welcome");setUMsgs([]);setUInput("");setUStep(0);setULoading(false);setUMode(null);setUFile(null);setUFileErr(null); };

  // ── Lesson actions ──
  const startLesson = async (file) => {
    setLPhase("chat"); setLLoading(true);
    const base = "Hello — I'm a Halcyon MYP teacher. I'd like help designing an engaging, structured lesson.";
    const content = buildFirstMessage(base, file);
    const displayText = file ? `${base} (Attached: ${file.name})` : base;
    try {
      const raw = await claude([{role:"user",content}], LESSON_PROMPT);
      const {step,clean} = parseLesson(raw);
      if(step) setLStep(step);
      setLMsgs([{role:"user",content,displayText,hidden:true},{role:"assistant",content:clean}]);
    } catch { setLMsgs([{role:"assistant",content:"Connection error — please refresh and try again."}]); }
    setLLoading(false); setTimeout(()=>lTa.current?.focus(),100);
  };
  const sendLesson = async () => {
    const text=lInput.trim(); if(!text||lLoading) return;
    setLInput(""); if(lTa.current) lTa.current.style.height="auto";
    const updated=[...lMsgs,{role:"user",content:text}];
    setLMsgs(updated); setLLoading(true);
    try {
      const apiMsgs = updated.map(m=>({role:m.role,content:m.content}));
      const raw = await claude(apiMsgs, LESSON_PROMPT);
      const {step,clean} = parseLesson(raw);
      if(step) setLStep(step);
      setLMsgs([...updated,{role:"assistant",content:clean}]);
    } catch { setLMsgs([...updated,{role:"assistant",content:"Something went wrong. Please try again."}]); }
    setLLoading(false); setTimeout(()=>lTa.current?.focus(),50);
  };
  const generateSlides = async () => {
    setLSlideLoading(true);
    const planContent = lMsgs.filter(m=>m.role==="assistant").map(m=>m.content).join("\n\n---\n\n");
    try {
      const raw = await claude([{role:"user",content:`Generate slides for this lesson:\n\n${planContent}`}], SLIDES_PROMPT);
      const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      setLSlides(JSON.parse(clean)); setLShowSlides(true);
    } catch(e) { alert("Couldn't generate slides. Try again in a moment."); console.error(e); }
    setLSlideLoading(false);
  };
  const resetLesson = () => { setLPhase("welcome");setLMsgs([]);setLInput("");setLStep(0);setLLoading(false);setLSlides(null);setLShowSlides(false);setLSlideLoading(false);setLFile(null);setLFileErr(null); };

  const uPlanReady = uStep >= 14 && uMsgs.some(m=>m.role==="assistant");
  const lPlanReady = lStep >= 4 && lMsgs.some(m=>m.role==="assistant");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'system-ui',-apple-system,BlinkMacSystemFont,sans-serif",background:H.cream,color:H.navy,overflow:"hidden"}}>
      <style>{`
        @keyframes db{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-7px);opacity:1}}
        .hbtn:hover{background:${H.navyMid}!important}
        textarea:focus{outline:none!important;border-color:${H.teal}!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${H.greyLight};border-radius:4px}
        .stepr:hover{background:${H.greyLight}44}.card:hover{box-shadow:0 8px 30px rgba(27,58,92,.16)!important;transform:translateY(-2px)}
        .card{transition:all .2s!important}.tabbtn:hover{background:rgba(255,255,255,.12)!important}
      `}</style>

      {/* Header */}
      <header style={{background:H.navy,color:H.white,padding:"0 18px",height:"52px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 2px 12px rgba(27,58,92,.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"32px",height:"32px",borderRadius:"7px",background:`${H.teal}22`,border:`1px solid ${H.teal}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={H.teal} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:"15px",fontWeight:700,lineHeight:1.1}}>Halcyon <span style={{color:H.teal}}>MYP</span> Design Studio</div>
            <div style={{fontSize:"9px",color:H.tealLight,letterSpacing:"1.1px",textTransform:"uppercase",opacity:.75}}>Enhanced MYP · 6 Leaps · PBL Gold Standard</div>
          </div>
          <div style={{marginLeft:"20px",display:"flex",background:"rgba(255,255,255,.1)",borderRadius:"8px",padding:"3px",gap:"2px"}}>
            {[{id:"unit",label:"Unit Designer"},{id:"lesson",label:"Lesson Planner"}].map(t=>(
              <button key={t.id} className="tabbtn" onClick={()=>setTab(t.id)}
                style={{background:tab===t.id?H.teal:"transparent",color:tab===t.id?H.white:H.tealLight,border:"none",borderRadius:"6px",padding:"5px 14px",fontSize:"11.5px",fontWeight:tab===t.id?700:400,cursor:"pointer",transition:"all .2s"}}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          {tab==="unit"&&uStep>0&&<div style={{fontSize:"10.5px",color:H.tealLight,opacity:.85}}>{uMode==="transform"?"⬆ Transform · ":""}Step {uStep}/14 — {UNIT_STEPS[uStep-1]?.label}</div>}
          {tab==="lesson"&&lStep>0&&<div style={{fontSize:"10.5px",color:H.tealLight,opacity:.85}}>Step {lStep}/5 — {LESSON_STEPS[lStep-1]?.label}</div>}
          {tab==="unit"&&uPhase!=="welcome"&&<button onClick={resetUnit} style={{background:"transparent",border:`1px solid ${H.teal}55`,color:H.tealLight,borderRadius:"6px",padding:"4px 11px",fontSize:"11px",cursor:"pointer"}}>New Unit</button>}
          {tab==="lesson"&&lPhase==="chat"&&<button onClick={resetLesson} style={{background:"transparent",border:`1px solid ${H.teal}55`,color:H.tealLight,borderRadius:"6px",padding:"4px 11px",fontSize:"11px",cursor:"pointer"}}>New Lesson</button>}
        </div>
      </header>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <aside style={{width:"190px",flexShrink:0,background:H.white,borderRight:`1px solid ${H.greyLight}`,padding:"12px 0",overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"1.8px",textTransform:"uppercase",color:H.greyMid,padding:"0 12px 8px",borderBottom:`1px solid ${H.greyLight}`,marginBottom:"5px"}}>{tab==="unit"?"Design Steps":"Lesson Steps"}</div>
          {(tab==="unit"?UNIT_STEPS:LESSON_STEPS).map(({n,label})=>{
            const cur=tab==="unit"?uStep:lStep; const done=n<cur, active=n===cur;
            return (
              <div key={n} className="stepr" style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px",borderLeft:active?`3px solid ${H.teal}`:"3px solid transparent",background:active?`${H.teal}0D`:"transparent",transition:"all .15s"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,background:done?H.teal:active?H.navy:H.greyLight,color:done||active?H.white:H.greyMid,transition:"all .2s"}}>{done?"✓":n}</div>
                <span style={{fontSize:"11px",fontWeight:active?600:400,color:done?H.teal:active?H.navy:H.greyMid,lineHeight:1.25}}>{label}</span>
              </div>
            );
          })}
          <div style={{marginTop:"auto",padding:"10px 12px",borderTop:`1px solid ${H.greyLight}`}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:H.greyMid,marginBottom:"6px"}}>Frameworks</div>
            {[{c:H.navy,l:"Enhanced MYP"},{c:H.teal,l:"6 Leaps"},{c:H.gold,l:"PBL Gold Standard"}].map(f=>(
              <div key={f.l} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                <div style={{width:"7px",height:"7px",borderRadius:"2px",background:f.c,flexShrink:0}}/>
                <span style={{fontSize:"9.5px",color:H.greyMid}}>{f.l}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* UNIT DESIGNER */}
          {tab==="unit"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {uPhase==="welcome" ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                  <div style={{maxWidth:"540px",width:"100%",textAlign:"center"}}>
                    <div style={{width:"48px",height:"48px",borderRadius:"12px",background:`${H.navy}10`,border:`1px solid ${H.navy}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={H.navy} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <h1 style={{fontFamily:"Georgia,serif",fontSize:"21px",fontWeight:700,color:H.navy,margin:"0 0 7px"}}>MYP Unit Design Studio</h1>
                    <p style={{fontSize:"13px",color:H.greyMid,margin:"0 0 26px",lineHeight:1.55}}>Design or transform MYP units aligned with three frameworks — through a guided, challenging 14-step process.</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"22px"}}>
                      {[
                        {mode:"new",icon:"✦",title:"Design New Unit",desc:"Build an ambitious new unit from scratch.",color:H.navy},
                        {mode:"transform",icon:"⬆",title:"Transform Existing Unit",desc:"Upload a unit you already teach and reimagine it.",color:H.teal},
                      ].map(o=>(
                        <div key={o.mode} className="card" onClick={()=>chooseUnitMode(o.mode)}
                          style={{background:H.white,border:`1.5px solid ${o.color}22`,borderRadius:"12px",padding:"22px 18px",cursor:"pointer",boxShadow:"0 2px 14px rgba(27,58,92,.08)",textAlign:"left"}}>
                          <div style={{fontSize:"22px",marginBottom:"10px",color:o.color}}>{o.icon}</div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:"14px",fontWeight:700,color:o.color,marginBottom:"7px"}}>{o.title}</div>
                          <div style={{fontSize:"12px",color:H.greyMid,lineHeight:1.5}}>{o.desc}</div>
                          <div style={{marginTop:"14px",fontSize:"11px",fontWeight:700,color:o.color}}>Get started →</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
                      {[{c:H.navy,l:"Enhanced MYP"},{c:H.teal,l:"6 Leaps"},{c:H.gold,l:"PBL Gold Standard"}].map(f=>(
                        <div key={f.l} style={{background:`${f.c}0E`,border:`1px solid ${f.c}22`,borderRadius:"16px",padding:"4px 12px",fontSize:"10.5px",fontWeight:600,color:f.c}}>{f.l}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : uPhase==="upload" ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                  <div style={{background:H.white,borderRadius:"14px",padding:"30px 28px",maxWidth:"440px",width:"100%",boxShadow:"0 4px 24px rgba(27,58,92,.10)",border:`1px solid ${H.greyLight}`}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"18px",fontWeight:700,color:H.navy,marginBottom:"6px",textAlign:"center"}}>Transform an existing unit</div>
                    <p style={{fontSize:"12.5px",color:H.greyMid,margin:"0 0 18px",lineHeight:1.55,textAlign:"center"}}>Upload the unit you currently teach. The coach reads it, diagnoses it against the frameworks, and rebuilds it with you.</p>
                    <UploadZone file={uFile} onFile={onUFile} onClear={()=>setUFile(null)} error={uFileErr} busy={uFileBusy}/>
                    <button onClick={()=>startUnit("transform", uFile)} disabled={uFileBusy}
                      className="hbtn" style={{marginTop:"18px",width:"100%",background:H.navy,color:H.white,border:"none",borderRadius:"9px",padding:"11px",fontSize:"13.5px",fontWeight:600,cursor:uFileBusy?"default":"pointer",transition:"background .2s",opacity:uFileBusy?.6:1}}>
                      {uFile?"Analyze & Transform →":"Continue →"}
                    </button>
                    <div style={{textAlign:"center",marginTop:"11px"}}>
                      <span onClick={()=>startUnit("transform", null)} style={{fontSize:"11.5px",color:H.greyMid,cursor:"pointer",textDecoration:"underline"}}>Skip — I'll describe it in chat</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {uMode==="transform"&&(
                    <div style={{padding:"7px 18px",background:`${H.teal}0E`,borderBottom:`1px solid ${H.teal}25`,fontSize:"11.5px",color:H.teal,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:"8px"}}>
                      ⬆ Transform Mode {uFile&&<FileChip file={uFile}/>}
                    </div>
                  )}
                  <MessageList msgs={uMsgs.filter(m=>!m.hidden)} loading={uLoading} scrollRef={uScroll}/>
                  {uPlanReady&&(
                    <div style={{padding:"7px 18px",background:H.goldPale,borderTop:`1px solid ${H.gold}30`,display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                      <span style={{fontSize:"11.5px",color:H.navyMid,fontWeight:600}}>Unit plan complete</span>
                      <button onClick={()=>downloadDoc(uMsgs,"unit")} style={{background:H.gold,color:H.navyDark,border:"none",borderRadius:"6px",padding:"5px 14px",fontSize:"11.5px",fontWeight:700,cursor:"pointer"}}>↓ Download Word Doc</button>
                    </div>
                  )}
                  <ChatInput taRef={uTa} value={uInput} onChange={e=>{setUInput(e.target.value);grow(uTa);}} onSend={sendUnit} disabled={uLoading}/>
                  <MiniProgress steps={UNIT_STEPS} current={uStep}/>
                </>
              )}
            </div>
          )}

          {/* LESSON PLANNER */}
          {tab==="lesson"&&(
            <div style={{flex:1,display:"flex",overflow:"hidden"}}>
              {lPhase==="welcome" ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                  <div style={{background:H.white,borderRadius:"14px",padding:"30px 28px",maxWidth:"440px",width:"100%",boxShadow:"0 4px 24px rgba(27,58,92,.10)",border:`1px solid ${H.greyLight}`,textAlign:"center"}}>
                    <div style={{fontFamily:"Georgia,serif",fontSize:"19px",fontWeight:700,color:H.navy,margin:"0 0 7px"}}>Lesson Planner</div>
                    <p style={{fontSize:"12.5px",color:H.greyMid,margin:"0 0 18px",lineHeight:1.55}}>Design a structured, inquiry-driven MYP lesson, then generate a ready-to-present slide deck. Upload a unit or existing lesson to build from — optional.</p>
                    <UploadZone file={lFile} onFile={onLFile} onClear={()=>setLFile(null)} error={lFileErr} busy={lFileBusy} compact/>
                    <button className="hbtn" onClick={()=>startLesson(lFile)} disabled={lFileBusy}
                      style={{marginTop:"18px",background:H.navy,color:H.white,border:"none",borderRadius:"9px",padding:"11px 28px",fontSize:"14px",fontWeight:600,cursor:lFileBusy?"default":"pointer",transition:"background .2s",width:"100%",opacity:lFileBusy?.6:1}}>
                      {lFile?"Plan From This →":"Plan a Lesson →"}
                    </button>
                    {!lFile&&<div style={{fontSize:"10.5px",color:H.greyMid,marginTop:"9px",opacity:.75}}>No upload needed — you can start from scratch</div>}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{flex:lShowSlides?"0 0 42%":1,display:"flex",flexDirection:"column",overflow:"hidden",borderRight:lShowSlides?`1px solid ${H.greyLight}`:"none",minWidth:0}}>
                    {lFile&&<div style={{padding:"6px 16px",background:`${H.teal}0C`,borderBottom:`1px solid ${H.teal}22`,display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}><FileChip file={lFile}/></div>}
                    <MessageList msgs={lMsgs.filter(m=>!m.hidden)} loading={lLoading} scrollRef={lScroll}/>
                    {lPlanReady&&(
                      <div style={{padding:"7px 16px",background:H.tealPale,borderTop:`1px solid ${H.teal}25`,display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",flexShrink:0}}>
                        <span style={{fontSize:"11px",color:H.navyMid,fontWeight:600}}>Lesson ready</span>
                        <button onClick={()=>downloadDoc(lMsgs,"lesson")} style={{background:"transparent",border:`1px solid ${H.teal}`,borderRadius:"5px",padding:"4px 11px",fontSize:"11px",color:H.teal,cursor:"pointer",fontWeight:600}}>↓ Word Doc</button>
                        <button onClick={generateSlides} disabled={lSlideLoading} style={{background:lSlideLoading?H.greyLight:H.teal,color:lSlideLoading?H.greyMid:H.white,border:"none",borderRadius:"5px",padding:"4px 11px",fontSize:"11px",fontWeight:700,cursor:lSlideLoading?"default":"pointer"}}>{lSlideLoading?"Generating…":"✦ Generate Slides"}</button>
                        {lSlides&&!lShowSlides&&<button onClick={()=>setLShowSlides(true)} style={{background:"transparent",border:`1px solid ${H.gold}`,borderRadius:"5px",padding:"4px 11px",fontSize:"11px",color:H.gold,cursor:"pointer",fontWeight:600}}>View Slides</button>}
                      </div>
                    )}
                    <ChatInput taRef={lTa} value={lInput} onChange={e=>{setLInput(e.target.value);grow(lTa);}} onSend={sendLesson} disabled={lLoading}/>
                    <MiniProgress steps={LESSON_STEPS} current={lStep}/>
                  </div>
                  {lShowSlides&&lSlides&&(
                    <div style={{flex:"1 1 58%",overflow:"hidden",minWidth:0}}>
                      <SlideViewer slides={lSlides} onClose={()=>setLShowSlides(false)}/>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
