import { useState, useRef, useEffect } from "react";

// Palette drawn from halcyonschool.com's live brand: dark navy-blue primary,
// forest-green accent, gold highlight — in place of the original generic navy/teal.
const H = {
  navy:"#1E2145", navyMid:"#343863", navyDark:"#111327",
  teal:"#1A5941", tealLight:"#4C8A6C", tealPale:"#EAF4EF",
  gold:"#D9A200", goldLight:"#F0C94D", goldPale:"#FBF1D6",
  cream:"#FAF7F2", greyLight:"#EBE7E0", greyMid:"#8D8880", white:"#FFFFFF",
};

// ─── System prompts ────────────────────────────────────────────────────────────

const UNIT_PROMPT = `You are an MYP Unit Design Coach at Halcyon London International School — a non-profit IB school near Marble Arch. You help teachers design or transform MYP units using three frameworks.

## Response format — CRITICAL
Respond with a JSON object only, matching the schema you've been given. Three fields:
- "step": integer 1–14 — the step number that matches the QUESTION your "message" is asking, not the step the teacher just answered. Example: the teacher answers Step 1 (grade + subject); your message says "Good, Year 4 I&S" and then asks "how many weeks?" — that question belongs to Step 2, so you report step:2, even though you also acknowledged Step 1 in the same message. Every reply's step number = the step number of the question currently in your "message". Only repeat the same number when you are re-asking or clarifying that identical question because it wasn't resolved. Sub-step 4b still reports step 4.
- "message": the markdown-formatted reply the teacher will read. Everything you'd say goes here — this is the only place the teacher sees your words.
- "frameworks": an array of AT MOST 2 strings (often 0 or 1) citing which specific framework element is actively shaping THIS response's guidance, choice of options, or pushback. Each string format: "Framework Name: Concept — why it applies to this turn", where Framework Name is exactly one of "Enhanced MYP" / "Transcend 6 Leaps" / "PBL Gold Standard" (e.g. "PBL Gold Standard: Public Product — real audience confirms accountability"). Not decoration — only include when an element is genuinely doing work in this turn (e.g. you rejected an answer for low Rigour, or a global context choice literally IS a Global Context). Use an empty array on purely administrative turns.

## HOW YOU TALK — read this carefully
- Be BRIEF. Most "message" fields are 2–4 sentences plus any options. Never pad.
- Warm but never effusive. No "Wonderful!", "I love that!", "What a fantastic idea!". A short, genuine nod is enough, then move on.
- Ask ONE thing at a time. Don't stack questions.
- CHALLENGE the educator — but only when there is something real to challenge. When an answer is vague, safe, teacher-centred, or low on authenticity/rigour/student agency, name the gap and push back with a sharp question before advancing. You are a critical friend, not a cheerleader.
- Equally: when a teacher's answer is genuinely strong, SAY SO and move on. Do not invent a reservation, offer a token alternative, or add "but have you considered…" just to seem rigorous. Manufactured pushback wastes their time and teaches them to ignore your real objections. Agreeing quickly with a good decision is a sign of good judgement, not weakness.
- Use **bold** only for genuinely key terms in "message". Don't over-format.

## The Three Frameworks — use the real terminology, never invent variants

### 1. IB MYP (Enhanced) — from *MYP: From Principles into Practice*
**16 Key Concepts** (choose ONE to drive the unit): Aesthetics · Change · Communication · Communities · Connections · Creativity · Culture · Development · Form · Global interactions · Identity · Logic · Perspective · Relationships · Systems · Time, place and space.
**Related concepts** are SUBJECT-SPECIFIC and come from that subject's guide. Pick from the teacher's own subject group — never borrow another subject's list, and never quietly use a KEY concept (e.g. Relationships, Systems, Change) as if it were a related concept:
· Language & Literature: audience imperatives · character · context · genres · intertextuality · point of view · purpose · self-expression · setting · structure · style · theme
· Language Acquisition: accent · audience · context · conventions · empathy · function · idiom · meaning · message · patterns · purpose · structure · word choice
· Individuals & Societies: causality · choice · culture · equity · globalization · identity · innovation and revolution · interdependence · patterns and trends · perspective · power · processes · resources · sustainability
· Sciences: balance · consequences · energy · environment · evidence · form · function · interaction · models · movement · patterns · transformation
· Mathematics: change · equivalence · generalization · justification · measurement · models · patterns · quantity · representation · simplification · space · systems
· Arts: audience · boundaries · composition · expression · genre · innovation · interpretation · narrative · play · presentation · representation · role · structure · style · visual culture
· Design: adaptation · collaboration · ergonomics · evaluation · form · function · innovation · invention · markets and trends · perspective · resources · sustainability
· Physical & Health Education: adaptation · balance · choice · energy · environment · function · interaction · movement · perspectives · refinement · space · systems
Schools may add their own related concepts, so if a teacher proposes one that isn't listed but is genuinely disciplinary, accept it. Note that some words (e.g. *systems*, *change*) appear both as key concepts and — in some subjects — as related concepts; be explicit about which role a term is playing in the Statement of Inquiry.
**6 Global Contexts** (exact IB names): Identities and relationships · Orientation in space and time · Personal and cultural expression · Scientific and technical innovation · Globalization and sustainability · Fairness and development.
**Statement of Inquiry** = key concept + related concept(s) + global context, written as a single transferable sentence that is genuinely debatable — not a truism.
**Inquiry Questions**: exactly one Factual, one Conceptual, one Debatable.
**ATL skills** — 5 categories → 10 clusters. Always name category AND cluster:
· Communication → Communication · Social → Collaboration · Self-management → Organisation, Affective, Reflection · Research → Information literacy, Media literacy · Thinking → Critical thinking, Creative thinking, Transfer.
**Assessment criteria** — every subject group has exactly four, A–D, each scored 0–8. Use the correct names for the teacher's subject group:
· Language & Literature: A Analysing · B Organizing · C Producing text · D Using language
· Language Acquisition: A Comprehending spoken and visual text · B Comprehending written and visual text · C Communicating · D Using language
· Individuals & Societies: A Knowing and understanding · B Investigating · C Communicating · D Thinking critically
· Sciences: A Knowing and understanding · B Inquiring and designing · C Processing and evaluating · D Reflecting on the impacts of science
· Mathematics: A Knowing and understanding · B Investigating patterns · C Communicating · D Applying mathematics in real-life contexts
· Arts: A Knowing and understanding · B Developing skills · C Thinking creatively · D Responding
· Design: A Inquiring and analysing · B Developing ideas · C Creating the solution · D Evaluating
· Physical & Health Education: A Knowing and understanding · B Planning for performance · C Applying and performing · D Reflecting and improving performance
Also available where they fit: Service as Action, interdisciplinary units, the Personal Project (Year 5).

### 2. Transcend 6 Leaps — each Leap is a SHIFT AWAY FROM something. Use the contrast when you critique.
· **Whole-Child Focus** — from *Narrow Focus* → nurtures mind, body and heart, not just academics.
· **Connection & Community** — from *Isolation & Conformity* → meaningful, collaborative relationships.
· **High Expectations with Rigorous Learning** — from *Low Expectations with Surface-Level Learning* → every learner treated as capable of excellence; deep not surface.
· **Relevance** — from *Irrelevance* → connects to young people's lived experience, interests, goals and prior knowledge.
· **Customization** — from *One-Size-Fits-All* → flexibility in focus, pace, setting and sequence.
· **Agency** — from *Passive Compliance* → learners take charge of their experience in developmentally appropriate ways.
When a unit is weak, name the "from" state plainly (e.g. "this is still Passive Compliance, not Agency").

### 3. PBLWorks Gold Standard PBL
At the CENTRE sit the **Learning Goals: Key Knowledge, Understanding, and Success Skills** — the seven elements exist to serve these, so never let a project become an activity with no learning goal.
The **7 Essential Project Design Elements**: Challenging Problem or Question · Sustained Inquiry · Authenticity · Student Voice & Choice · Reflection · Critique & Revision · Public Product.

## 14-Step Workflow — one step per turn, wait for the teacher
**Step 1**: One-line welcome. If the teacher UPLOADED an existing unit, read it and give a SHORT diagnostic — 2–3 bullets naming where it's strong and where it's thin, citing the specific Leap "from" state or missing PBL element (be specific and honest, not flattering). Then ask grade level (MYP Year 1–5) and subject group if not already clear. If NEW, just ask grade level and subject group.
**Step 2**: Ask unit length in weeks. One line noting 4–8 weeks allows real depth (Sustained Inquiry).
**Step 3**: Ask their global context and its link to the subject. Use exact IB global context names. Then judge the fit HONESTLY: if their choice is genuinely the strongest one, say so plainly in a sentence and move on — do NOT manufacture an alternative. Only offer a different global context when you can name a specific reason theirs is weaker (e.g. it describes the topic rather than the tension, or another context would force a sharper debatable question). If you do offer one, say what it buys them.
**Step 4**: Ask for content topics + ATL skills. Then give THREE authentic summative tasks — each with a real audience, a Public Product, named MYP criteria for their subject group, and 3+ Leaps. One line each. Ask them to pick — and challenge them if they lean toward the safest one.
**Step 4b**: Suggest one vivid classroom transformation tied to the chosen task. Two sentences.
**Step 5**: THREE Statements of Inquiry. Each must visibly combine a named key concept + related concept(s) + the global context, and be genuinely debatable. Ask which, or invite their own.
**Step 6**: A Project Invitation — 2 short student-facing paragraphs. No preamble.
**Step 7**: Three Inquiry Questions (one Factual, one Conceptual, one Debatable). Ask which.
**Step 8**: 5–7 Lines of Inquiry, foundational → synthesis. Ask which to keep.
**Step 9**: Recommend MYP criteria using the EXACT A–D names for their subject group, with the specific strands to assess. Brief.
**Step 10**: 5–7 named formative assessments, chronological. One line each: name + what it builds + which Leap or PBL element it serves. No "Quiz 1".
**Step 11**: 6–8 specific named resources (real book + author, article + publication, film + year, actual podcast). One line why each. No vague topics. Add a source line only where one genuinely exists — see the Resource Sourcing rules below.
**Step 12** — Expert Connections **and Place-Based Learning**: Confirm location (Halcyon = Marble Arch, central London), then give BOTH:
(a) **4–6 experts/organisations/partners** — named, real, with a one-line outreach angle.
(b) **3–5 place-based opportunities** — actual sites students can go to, chosen because the place itself teaches something the classroom cannot. For each: the site name, what students would DO there (observe, collect data, interview, sketch, test), and roughly how far from Marble Arch / how reachable it is (walkable, one tube ride, half-day). Favour London's specific assets — museums, archives, markets, council chambers, labs, river, parks, courts, galleries, neighbourhoods, transport infrastructure. Include at least one that is free or walkable.
Ask which they want to pursue. This is the Relevance and Connection & Community Leaps made physical — a unit rooted in its city.
**Step 13**: THREE unit titles, then a final polished Project Invitation.
**Step 14**: Ask if ready to compile. If yes, produce the FULL UNIT PLAN inside "message" — see the spec below — then close with exactly: "Your unit plan is complete — click Download to save it as a Word document."

## Resource Sourcing — when and how to say WHERE a resource is found
Pick resources on merit FIRST. The right book with no link beats a weaker one you can link to.

A source line is **optional and additive**. Add "**Find it:**" only when you genuinely know the resource is available at a specific, real place. If you don't know, leave it off entirely and just give the resource — a teacher can search a correctly-named title themselves. Never pad an entry with a non-answer like "check the school library", "widely available online", or "search online" — that tells them nothing; omit the line instead.

**NEVER invent a URL.** Do not write deep links, article permalinks, DOIs, video IDs, episode URLs, or "search result" links — you cannot verify them and they are usually wrong. Name the **home domain plus the search route** instead, e.g. "search the title at gallica.bnf.fr", not a fabricated /ark:/12148/... path.

When you do give a route, choose the most fitting:
· **Public-domain / pre-1928 texts** → Project Gutenberg (gutenberg.org) or Internet Archive (archive.org)
· **Historical primary sources** → Internet History Sourcebook (sourcebooks.fordham.edu) · The National Archives UK (nationalarchives.gov.uk) · British Library (bl.uk) · Europeana (europeana.eu) · Digital Public Library of America (dp.la) · Gallica, French-language (gallica.bnf.fr)
· **French Revolution specifically** → Liberty, Equality, Fraternity (revolution.chnm.org) — free, source-rich, built for teaching
· **Statistics & datasets** → Our World in Data (ourworldindata.org) · Gapminder (gapminder.org) · UK ONS (ons.gov.uk) · London Datastore (data.london.gov.uk)
· **Academic articles** → JSTOR (jstor.org, note if a school subscription is needed) · PubMed (pubmed.ncbi.nlm.nih.gov) · DOAJ (doaj.org, open access)
· **Audio / documentary** → BBC Sounds or BBC iPlayer (bbc.co.uk) · the podcast's own site or any major podcast app, named by series + episode
· **Art, objects & collections** → Google Arts & Culture (artsandculture.google.com) · Tate (tate.org.uk) · Wellcome Collection (wellcomecollection.org)
· **Science simulations** → PhET (phet.colorado.edu)
· **In-copyright books** → normally NO source line; the title and author are enough for a teacher to order it. Never a shop link.
· **Recent journalism** → the publication's own archive, named (e.g. "Guardian archive"), with the headline and date so it can be searched

Expect a realistic mix: some entries carry a source line, others don't. That is correct and honest — do not reach for one just to make the list look uniform.

## Step 14 — Full Unit Plan spec
This document is the teacher's actual planning tool. They should be able to teach from it without reopening this chat. Be substantive and concrete; this is the one place where length is warranted.

CRITICAL: output the ENTIRE document in ONE single "message" field, start to finish, ending with the completion sentence. Never split it across turns, never stop partway to ask whether to continue, and never re-send a document you have already produced. If you are worried about length, tighten the prose — do not truncate or defer sections.

Use markdown headings and this order:

# [Unit Title]
**MYP Year X · [Subject group] · [N] weeks**

## Unit at a Glance
A 3–4 sentence orientation: what students do, for whom, and why it matters.

## MYP Framework
Key Concept · Related Concepts · Global Context (exact IB names) · Statement of Inquiry · the three Inquiry Questions (labelled Factual / Conceptual / Debatable) · Lines of Inquiry.

## ATL Skills
Each as **Category → Cluster**, with one line on where in the unit it is explicitly taught and practised (not just "used").

## Summative Assessment
The task, the real audience, the public product, and the exact MYP criteria with the strands assessed. Add a short **"What excellent looks like"** paragraph describing a top-band response in plain language the teacher could share with students.

## Week-by-Week Sequence
A row per week: **Week N — [focus]** then 2–3 bullets covering the main learning experiences, the formative checkpoint that week, and the resource/expert in play. This is the backbone of the document — make it genuinely usable.

## Formative Assessments
Numbered, chronological, each with its name, what it builds, which criterion it rehearses, and the week it lands.

## Resources
Numbered, specific and real: book + author + year, film + director + year, podcast + episode, organisation + what it offers. Follow the Resource Sourcing rules: add a **Find it:** line only where you genuinely know a real access route, and simply omit it otherwise. Home domains and search routes only, never an invented deep link. Mark anything needing a subscription.

## Expert & Community Connections
Each with the specific outreach angle and what students get from them.

## Place-Based Learning
The site visits and fieldwork, each with: the site, which week it belongs in, what students do there, and travel/logistics from Marble Arch. If a visit needs booking or a risk assessment, say so here.

## Differentiation
Three short paragraphs — **Extension**, **Support**, **EAL/Language** — each with concrete moves for THIS unit, not generic advice. This is the Customization Leap made practical.

## Framework Alignment
A compact audit the teacher can defend in a review: which Transcend Leaps this unit delivers and how; which of the 7 PBL Gold Standard elements are present and where. Name honestly any element that is only lightly served.

## Teacher Preparation Checklist
6–10 concrete to-dos before week 1 (bookings, emails to send, materials to gather, rooms to arrange), phrased as actions.`;

// ─── Structured output schemas ─────────────────────────────────────────────────
// Forcing {step, message, frameworks} via output_config.format means the API itself
// enforces the shape — the model can no longer "forget" to report its step the way it
// sometimes did with a prose [STEP:N] tag, and framework tagging comes along for free.

// Each framework tag is a FLAT STRING ("Framework: Concept — why it applies"), not a
// nested object. Nested objects-in-arrays were tried first and the constrained decoder
// degraded them into filler ("placeholder", letter-spaced garbage) on ~half of turns
// even while "message" stayed clean; flat strings generate reliably.
const FRAMEWORKS_FIELD = {
  type: "array",
  items: { type: "string" },
  description: "0-2 strings, each 'Framework Name: Concept — why it applies to this turn'. Empty array if nothing genuinely applies.",
};

const UNIT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    step: { type: "integer", description: "Current workflow step, 1-14." },
    message: { type: "string", description: "Markdown reply shown to the teacher." },
    frameworks: FRAMEWORKS_FIELD,
  },
  required: ["step", "message", "frameworks"],
  additionalProperties: false,
};

// ─── Steps metadata ────────────────────────────────────────────────────────────

const UNIT_STEPS = [
  {n:1,label:"Design Path"},{n:2,label:"Unit Duration"},{n:3,label:"Global Context"},
  {n:4,label:"Summative Task"},{n:5,label:"Statement of Inquiry"},{n:6,label:"Project Invitation"},
  {n:7,label:"Inquiry Questions"},{n:8,label:"Lines of Inquiry"},{n:9,label:"Criteria & Objectives"},
  {n:10,label:"Formative Assessments"},{n:11,label:"Resources"},{n:12,label:"Expert Connections"},
  {n:13,label:"Unit Title"},{n:14,label:"Full Unit Plan"},
];

// ─── Parsing ───────────────────────────────────────────────────────────────────

// The model returns {step, message, frameworks} enforced by output_config.format (a real
// prose [STEP:N] tag was tried first, but the model didn't reliably emit it on every turn).
// Still parsed defensively — strip stray markdown fences and fall back to raw text if
// something ever comes back malformed rather than surfacing a blank message.
// The model occasionally echoes a stray JSON-closing fragment (e.g. `"}`) at the very end
// of the message text itself. Harmless to the parse, but it renders as visible junk.
// Deliberately requires the quote+brace pair: a bare trailing `}` or `]` can be legitimate
// prose/markdown, so stripping those unconditionally would corrupt real messages.
const stripTrailingJsonArtifact = (s) => s.replace(/\s*"\s*[}\]]\s*$/, "").trimEnd();

// Rare but real: a turn comes back with the model's own formatting deliberation leaking into
// the visible message — stray closing braces mid-prose, non-Latin tokens in an English
// conversation, or asides like "let's answer properly". Detect it so the caller can retry
// rather than showing a teacher garbled text. Kept narrow: these patterns don't occur in
// legitimate MYP coaching prose.
const CORRUPTION_SIGNS = [
  /[぀-ヿ一-鿿가-힯]/,        // CJK/Hangul in an English conversation
  /\}\s*(?:\n|$)/,                                     // a closing brace ending a line of prose
  /\b(?:let'?s stop and answer|answer properly|correctly-formatted|going to give the real)\b/i,
  /^\s*\{?\s*"?step"?\s*:/i,                           // raw JSON bleeding into the message
];
const looksCorrupted = (msg) =>
  typeof msg === "string" && CORRUPTION_SIGNS.some(re => re.test(msg));

function parseStructured(raw, fallbackStep) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      step: Number.isFinite(obj.step) ? obj.step : fallbackStep,
      message: typeof obj.message === "string" ? stripTrailingJsonArtifact(obj.message) : raw,
      frameworks: Array.isArray(obj.frameworks) ? obj.frameworks : [],
    };
  } catch {
    return { step: fallbackStep, message: raw, frameworks: [] };
  }
}

// ─── File reading ──────────────────────────────────────────────────────────────

const readAsBase64 = (file) => new Promise((res,rej)=>{
  const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file);
});
const readAsText = (file) => new Promise((res,rej)=>{
  const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file);
});

// A PDF is sent as base64, which inflates it ~33%, and the server caps request bodies at
// 15MB. Check up front so an oversized (usually scanned) file gets a clear explanation
// instead of a cryptic failure once it's already uploading.
const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function processFile(file) {
  const name = file.name; const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(`That PDF is ${(file.size/1024/1024).toFixed(1)}MB — the limit is 10MB. If it's a scan, try exporting a smaller version, or paste the unit text in chat instead.`);
    }
    const b64 = await readAsBase64(file);
    return { name, kind:"pdf", data:b64 };
  }
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
  // Text extracted from .docx/.txt was previously capped at 12k chars with no notice, so a
  // long unit was silently half-read and the teacher had no way to know. The cap is now
  // generous (the model has a 1M context window) and truncation is disclosed in-prompt.
  const MAX_CHARS = 200000;
  const body = file.data.length > MAX_CHARS
    ? `${file.data.slice(0, MAX_CHARS)}\n\n[...document truncated here — it exceeded the size this tool can read in one go...]`
    : file.data;
  return `${baseText}\n\nHere is my existing unit ("${file.name}"):\n\n"""\n${body}\n"""\n\nPlease read it and use it as the starting point.`;
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
    if (line.startsWith("### ")) { els.push(<div key={i} style={{margin:"12px 0 3px",fontSize:"12.5px",fontFamily:"Marcellus,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(4))}</div>); i++; continue; }
    if (line.startsWith("## ")) { els.push(<div key={i} style={{margin:"14px 0 4px",fontSize:"13.5px",fontFamily:"Marcellus,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(3))}</div>); i++; continue; }
    if (line.startsWith("# ")) { els.push(<div key={i} style={{margin:"14px 0 5px",fontSize:"15px",fontFamily:"Marcellus,serif",color:H.navyDark,fontWeight:700}}>{renderInline(line.slice(2))}</div>); i++; continue; }
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

// Find the COMPILED unit plan document in the transcript, or null if it doesn't exist yet.
// This is the single source of truth for both the Download button's visibility and the
// download itself — previously the button appeared as soon as the step counter reached 14,
// which happens when the coach *asks* "ready to compile?", so clicking it downloaded the
// coaching transcript instead of a plan. No document ⇒ no button.
function findCompiledPlan(msgs) {
  const assistant = msgs.filter(m=>m.role==="assistant" && typeof m.content==="string").map(m=>m.content);
  const opensDoc = (c) => /^\s*#\s+\S/.test(c);
  // A real plan is a markdown document: an H1 title plus several ## sections.
  const isDoc = (c) => opensDoc(c) && (c.match(/^\s*##\s+\S/gm)||[]).length >= 4;

  const endIdx = assistant.map(c=>/unit plan is complete/i.test(c)).lastIndexOf(true);
  if (endIdx !== -1) {
    if (opensDoc(assistant[endIdx])) return assistant[endIdx];
    // A long document can still arrive split across turns — the closing message is then only
    // the tail. Walk back to the message that opens it and stitch forward.
    for (let i = endIdx - 1; i >= 0 && endIdx - i <= 4; i--) {
      if (opensDoc(assistant[i])) return assistant.slice(i, endIdx + 1).join("\n\n");
    }
    return isDoc(assistant[endIdx]) ? assistant[endIdx] : null;
  }
  // Completion line missing but a full document was produced — still a valid plan.
  const docIdx = assistant.map(isDoc).lastIndexOf(true);
  return docIdx === -1 ? null : assistant[docIdx];
}

function downloadDoc(msgs) {
  const content = findCompiledPlan(msgs);
  if (!content) return;
  const title = "Halcyon MYP Unit Plan";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:${H.navyDark};max-width:820px;margin:40px auto;padding:20px}
.hdr{background:${H.navy};color:white;padding:18px 28px;border-radius:8px;margin-bottom:26px}
.hdr h1{color:${H.goldLight};margin:0 0 5px;font-size:22pt;font-family:Marcellus,serif}
.hdr p{color:rgba(255,255,255,.85);margin:0;font-size:10pt}
h1{color:${H.navyDark};font-size:17pt;border-bottom:2px solid ${H.gold};padding-bottom:6px;margin-top:26px;font-family:Marcellus,serif}
h2{color:${H.navyDark};font-size:13pt;margin-top:20px;border-bottom:1px solid ${H.greyLight};padding-bottom:3px}
h3{color:${H.teal};font-size:11.5pt;margin-top:14px}
strong{color:${H.navyDark}}li{margin:4px 0}hr{border:none;border-top:1px solid ${H.greyLight};margin:16px 0}p{margin:6px 0}
</style></head><body>
<div class="hdr"><h1>${title}</h1>
<p>Halcyon London International School · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p></div>
${mdToHtmlStr(content)}</body></html>`;
  const blob=new Blob([html],{type:"application/msword"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="Halcyon_MYP_Unit_Plan.doc"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared UI atoms ───────────────────────────────────────────────────────────

// The bouncing dots alone are fine for the ~3s a normal coaching turn takes, but the final
// unit-plan compile runs about a minute (measured: ~59s, ~25s of it silent thinking). With
// nothing but dots, a teacher reasonably assumes it has hung and refreshes — losing the
// request. So a wait that is expected to be long, or has simply gone long, says so and shows
// a running timer. The bar is indeterminate on purpose: we can't know real progress, and a
// fake percentage would be a lie.
function Dots({note, elapsed}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:note?"9px":0,padding:"12px 16px",background:H.white,borderRadius:"14px 14px 14px 4px",border:`1px solid ${H.greyLight}`,alignSelf:"flex-start",boxShadow:`0 1px 5px rgba(27,58,92,.06)`,maxWidth:"min(380px, 74%)"}}>
      <div style={{display:"flex",gap:"5px"}}>
        {[0,180,360].map(d=><div key={d} style={{width:"7px",height:"7px",borderRadius:"50%",background:H.teal,animation:"db 1.2s ease-in-out infinite",animationDelay:`${d}ms`}}/>)}
      </div>
      {note&&(
        <>
          <div style={{fontSize:"12.5px",lineHeight:1.5,color:H.navyDark}}>{note}</div>
          <div style={{position:"relative",height:"3px",borderRadius:"2px",background:H.greyLight,overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,height:"100%",width:"38%",borderRadius:"2px",background:H.teal,animation:"hslide 1.6s ease-in-out infinite"}}/>
          </div>
          <div style={{fontSize:"10.5px",color:H.greyMid}}>{elapsed}s elapsed · please keep this tab open</div>
        </>
      )}
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
// Small colored pills citing which framework element is actively driving a reply —
// makes the Enhanced MYP / Transcend 6 Leaps / PBL Gold Standard influence visible turn-by-turn
// instead of only implied by the sidebar legend.
const truncate = (s, n) => (typeof s==="string" && s.length>n) ? s.slice(0,n-1).trim()+"…" : s;
const VALID_FRAMEWORKS = ["Enhanced MYP","Transcend 6 Leaps","PBL Gold Standard"];
// Tags arrive as "Framework Name: Concept — why it applies". Parse defensively and drop
// anything that doesn't name a real framework or that looks like generation filler, so a
// rare bad turn degrades to "no badge" rather than a broken-looking one.
const JUNK_RE = /^(placeholder|invalid|n\/?a|todo|tbd|test|example|xyz|unknown|none)$/i;
function parseFrameworkTag(raw) {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf(":");
  if (idx === -1) return null;
  const framework = raw.slice(0, idx).trim();
  const rest = raw.slice(idx + 1).trim();
  if (!VALID_FRAMEWORKS.includes(framework) || rest.length < 4 || JUNK_RE.test(rest)) return null;
  const concept = rest.split(" — ")[0].trim();
  if (concept.length < 3 || JUNK_RE.test(concept)) return null;
  return { framework, concept, full: rest };
}
function FrameworkBadges({frameworks}) {
  const clean = (frameworks||[]).map(parseFrameworkTag).filter(Boolean).slice(0,2);
  if(clean.length===0) return null;
  const colorFor = (fw) => fw==="Enhanced MYP"?H.navy:fw==="Transcend 6 Leaps"?H.teal:H.gold;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginTop:"9px",paddingTop:"8px",borderTop:`1px solid ${H.greyLight}`}}>
      {clean.map((f,i)=>{
        const c = colorFor(f.framework);
        return (
          <span key={i} title={`${f.framework}: ${truncate(f.full,160)}`} style={{display:"inline-flex",alignItems:"center",gap:"5px",background:`${c}12`,border:`1px solid ${c}35`,borderRadius:"20px",padding:"3px 9px",fontSize:"10px",fontWeight:700,color:c,cursor:"default",lineHeight:1.3}}>
            <span style={{width:"6px",height:"6px",borderRadius:"50%",background:c,flexShrink:0}}/>
            {truncate(f.concept,40)}
          </span>
        );
      })}
    </div>
  );
}
function MessageList({msgs, loading, scrollRef, waitNote, elapsed}) {
  return (
    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {msgs.map((msg,idx)=>(
        <div key={idx} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
          {msg.role==="assistant"&&<BotAvatar/>}
          <div style={{maxWidth:"74%",background:msg.role==="user"?H.navy:H.white,color:msg.role==="user"?H.white:H.navy,borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 14px",boxShadow:"0 1px 5px rgba(27,58,92,.07)",border:msg.role==="assistant"?`1px solid ${H.greyLight}`:"none"}}>
            {msg.role==="assistant"?<><MdContent text={msg.content}/><FrameworkBadges frameworks={msg.frameworks}/></>:<span style={{fontSize:"13.5px",lineHeight:1.6}}>{msg.displayText||msg.content}</span>}
          </div>
        </div>
      ))}
      {loading&&<div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}><BotAvatar/><Dots note={waitNote} elapsed={elapsed}/></div>}
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

// ─── Main App ──────────────────────────────────────────────────────────────────

// ─── Shared-password gate ──────────────────────────────────────────────────────
// The token is issued and verified server-side; this screen only collects the
// password and stores the resulting session token. Real enforcement is on
// /api/messages, so bypassing this UI gains nothing.
const TOKEN_KEY = "halcyon_session";
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

// ─── Work-in-progress persistence ──────────────────────────────────────────────
// A unit takes ~18 turns and teachers work in bursts, so losing the conversation to a
// reload or a browser discarding an idle background tab would be costly. The draft is
// mirrored to localStorage after every turn and restored on load.
const DRAFT_KEY = "halcyon_unit_draft";
const DRAFT_VERSION = 1;

// An uploaded PDF rides along as base64 inside the first user message and can easily
// exceed the ~5MB localStorage quota on its own. If the full save fails, retry with the
// document blocks swapped for a short placeholder: the coach's diagnostic of the upload is
// already in the transcript, so the conversation continues sensibly without the raw file.
function stripHeavyBlocks(msgs) {
  return msgs.map(m => {
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map(b =>
        b?.type === "document"
          ? { type: "text", text: "[uploaded document — omitted from the saved draft to stay within browser storage limits]" }
          : b),
    };
  });
}

function saveDraft(state) {
  const attempt = (msgs) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), ...state, uMsgs: msgs }));
  };
  try { attempt(state.uMsgs); return true; }
  catch {
    try { attempt(stripHeavyBlocks(state.uMsgs)); return true; }
    catch { return false; }   // out of room entirely — don't break the app over it
  }
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d || d.v !== DRAFT_VERSION || !Array.isArray(d.uMsgs) || d.uMsgs.length === 0) return null;
    return d;
  } catch { return null; }
}
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const timeAgo = (ts) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function LoginScreen({ onAuthed }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error?.message || "Incorrect password."); setBusy(false); return; }
      setToken(d.token); onAuthed();
    } catch { setErr("Couldn't reach the server. Try again."); setBusy(false); }
  };
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:H.cream,fontFamily:"'Montserrat',-apple-system,sans-serif",padding:"24px"}}>
      <div style={{background:H.white,borderRadius:"14px",padding:"34px 30px",maxWidth:"390px",width:"100%",boxShadow:"0 4px 24px rgba(27,58,92,.10)",border:`1px solid ${H.greyLight}`,textAlign:"center"}}>
        <div style={{width:"46px",height:"46px",borderRadius:"11px",background:`${H.navy}10`,border:`1px solid ${H.navy}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={H.navy} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div style={{fontFamily:"Marcellus,serif",fontSize:"19px",fontWeight:700,color:H.navy,marginBottom:"6px"}}>Halcyon MYP Unit Designer</div>
        <p style={{fontSize:"12.5px",color:H.greyMid,margin:"0 0 20px",lineHeight:1.55}}>Enter the shared staff password to continue.</p>
        <input type="password" value={pw} autoFocus
          onChange={e=>{setPw(e.target.value);setErr(null);}}
          onKeyDown={e=>{if(e.key==="Enter")submit();}}
          placeholder="Password"
          style={{width:"100%",boxSizing:"border-box",border:`1.5px solid ${err?"#A32D2D":H.greyLight}`,borderRadius:"9px",padding:"11px 13px",fontSize:"14px",fontFamily:"inherit",color:H.navy,background:H.cream,outline:"none"}}/>
        {err && <div style={{fontSize:"11.5px",color:"#A32D2D",marginTop:"9px",textAlign:"left"}}>{err}</div>}
        <button className="hbtn" onClick={submit} disabled={busy||!pw.trim()}
          style={{marginTop:"16px",width:"100%",background:pw.trim()?H.navy:H.greyLight,color:pw.trim()?H.white:H.greyMid,border:"none",borderRadius:"9px",padding:"11px",fontSize:"13.5px",fontWeight:600,cursor:busy||!pw.trim()?"default":"pointer",transition:"background .2s"}}>
          {busy?"Checking…":"Enter →"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // null = still checking with the server whether a password is configured
  const [authed, setAuthed] = useState(null);
  useEffect(()=>{
    fetch("/api/auth/config")
      .then(r=>r.json())
      .then(d=>setAuthed(d.passwordRequired ? Boolean(getToken()) : true))
      .catch(()=>setAuthed(true)); // server unreachable — let the app load and fail visibly
  },[]);

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

  const [restored, setRestored] = useState(null);   // banner: {savedAt} once a draft is recovered
  const [draftWarning, setDraftWarning] = useState(false);
  const hydrated = useRef(false);

  const uScroll = useRef(null);
  const uTa = useRef(null);

  // Restore any in-progress unit once, before the first save can overwrite it.
  useEffect(()=>{
    const d = loadDraft();
    if (d) {
      setUMsgs(d.uMsgs); setUStep(d.uStep ?? 0); setUPhase(d.uPhase ?? "chat");
      setUMode(d.uMode ?? null); setUInput(d.uInput ?? ""); setUFile(d.uFile ?? null);
      setRestored({ savedAt: d.savedAt });
    }
    hydrated.current = true;
  },[]);

  // Mirror the draft after every change, so a reload or a discarded tab loses nothing.
  useEffect(()=>{
    if (!hydrated.current) return;               // don't clobber the draft during hydration
    if (uMsgs.length === 0) return;              // nothing worth saving yet
    const ok = saveDraft({ uMsgs, uStep, uPhase, uMode, uInput, uFile });
    setDraftWarning(!ok);
  },[uMsgs, uStep, uPhase, uMode, uInput, uFile]);

  useEffect(()=>{if(uScroll.current)uScroll.current.scrollTop=uScroll.current.scrollHeight;},[uMsgs,uLoading]);

  // Seconds the current request has been in flight. Only drives the wait bubble.
  const [uElapsed, setUElapsed] = useState(0);
  useEffect(()=>{
    if (!uLoading) { setUElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(()=>setUElapsed(Math.floor((Date.now()-t0)/1000)), 1000);
    return ()=>clearInterval(id);
  },[uLoading]);

  // The final compile is the one request a refresh would genuinely lose. Ask before leaving
  // only while a request is in flight; browsers show their own generic wording.
  useEffect(()=>{
    if (!uLoading) return;
    const warn = (e)=>{ e.preventDefault(); e.returnValue=""; };
    window.addEventListener("beforeunload", warn);
    return ()=>window.removeEventListener("beforeunload", warn);
  },[uLoading]);

  const grow = (ref) => { const t=ref.current; if(t){t.style.height="auto";t.style.height=Math.min(t.scrollHeight,110)+"px";} };

  // 16k is the practical ceiling for non-streaming requests before HTTP timeouts bite.
  // The Step 14 compile genuinely needs most of it; shorter turns simply use less.
  const claude = async (messages, sysPrompt, {maxTokens=16000, schema=null}={}) => {
    const body = {max_tokens:maxTokens,system:sysPrompt,messages};
    if(schema) body.output_config = {format:{type:"json_schema",schema}};
    const once = async () => {
      const token = getToken();
      const r = await fetch("/api/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify(body),
      });
      // Session expired or revoked — clear it and send them back to the password screen
      // rather than surfacing a confusing error mid-conversation.
      if (r.status === 401) { setToken(null); setAuthed(false); throw new Error("Session expired — please sign in again."); }
      const d = await r.json();
      if(d.error) throw new Error(d.error.message);
      return d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
    };
    const raw = await once();
    // Corruption here is intermittent, so a single clean retry reliably recovers it.
    // Only worth doing for schema calls — that's where the failure mode lives.
    if (schema && looksCorrupted(parseStructured(raw, 0).message)) {
      console.warn("Corrupted model output detected; retrying once.");
      try { return await once(); } catch { return raw; }
    }
    return raw;
  };

  const onUFile = async (f) => { setUFileErr(null); setUFileBusy(true); try{ setUFile(await processFile(f)); }catch(e){ setUFileErr(e.message); } setUFileBusy(false); };

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
      : "Hello — I'm a Halcyon MYP teacher. I want to transform and strengthen an existing unit using the Enhanced MYP, the Transcend 6 Leaps, and PBL Gold Standard.";
    const content = buildFirstMessage(base, file);
    const displayText = file ? `${base} (Attached: ${file.name})` : base;
    try {
      const raw = await claude([{role:"user",content}], UNIT_PROMPT, {schema:UNIT_RESPONSE_SCHEMA});
      const {step,message,frameworks} = parseStructured(raw, 1);
      setUStep(step);
      setUMsgs([{role:"user",content,displayText,hidden:true},{role:"assistant",content:message,frameworks,raw}]);
    } catch { setUMsgs([{role:"assistant",content:"Connection error — please refresh and try again."}]); }
    setULoading(false); setTimeout(()=>uTa.current?.focus(),100);
  };
  const sendUnit = async () => {
    const text=uInput.trim(); if(!text||uLoading) return;
    setUInput(""); if(uTa.current) uTa.current.style.height="auto";
    const updated=[...uMsgs,{role:"user",content:text}];
    setUMsgs(updated); setULoading(true);
    try {
      // Replay assistant turns as the ORIGINAL JSON the model emitted, not the parsed prose.
      // Sending prose back while output_config still demands JSON makes the conversation
      // format-inconsistent, and the model can start narrating its own formatting decisions
      // into the visible message ("let's answer properly…") instead of just answering.
      const apiMsgs = updated.map(m=>({role:m.role,content:m.role==="assistant"&&m.raw?m.raw:m.content}));
      const raw = await claude(apiMsgs, UNIT_PROMPT, {schema:UNIT_RESPONSE_SCHEMA});
      const {step,message,frameworks} = parseStructured(raw, uStep);
      setUStep(step);
      setUMsgs([...updated,{role:"assistant",content:message,frameworks,raw}]);
    } catch { setUMsgs([...updated,{role:"assistant",content:"Something went wrong. Please try again."}]); }
    setULoading(false); setTimeout(()=>uTa.current?.focus(),50);
  };
  const resetUnit = () => {
    // Starting a new unit is the one place we deliberately discard the saved draft.
    clearDraft(); setRestored(null); setDraftWarning(false);
    setUPhase("welcome");setUMsgs([]);setUInput("");setUStep(0);setULoading(false);setUMode(null);setUFile(null);setUFileErr(null);
  };


  // Gate the Download strictly on an actual compiled document existing — NOT on the step
  // counter. Reaching step 14 only means the coach asked "ready to compile?".
  const uPlanReady = findCompiledPlan(uMsgs) !== null;

  // Normal coaching turns take ~3s and need no explanation. The compile (step 14, no plan yet)
  // takes about a minute, so say so up front; any other turn that runs long gets a gentler note.
  const uCompiling = uLoading && uStep >= 14 && !uPlanReady;
  const uWaitNote = uCompiling
    ? (uElapsed < 45
        ? "Writing your full unit plan. This usually takes about a minute."
        : "Nearly there. Long plans can take a little longer.")
    : (uLoading && uElapsed >= 12 ? "Still working. This one is taking a bit longer than usual." : null);

  if (authed === null) return <div style={{height:"100vh",background:H.cream}}/>;   // brief auth check
  if (authed === false) return <LoginScreen onAuthed={()=>setAuthed(true)}/>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif",background:H.cream,color:H.navyDark,overflow:"hidden"}}>
      <style>{`
        @keyframes hslide{0%{left:-40%}100%{left:102%}}
        @keyframes db{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-7px);opacity:1}}
        .hbtn:hover{background:${H.navyMid}!important}
        textarea:focus{outline:none!important;border-color:${H.teal}!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${H.greyLight};border-radius:4px}
        .stepr:hover{background:${H.greyLight}44}.card:hover{box-shadow:0 8px 30px rgba(27,58,92,.16)!important;transform:translateY(-2px)}
        .card{transition:all .2s!important}
      `}</style>

      {/* Header */}
      <header style={{background:H.navy,color:H.white,padding:"0 18px",height:"52px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 2px 12px rgba(27,58,92,.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"32px",height:"32px",borderRadius:"7px",background:`${H.teal}22`,border:`1px solid ${H.teal}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={H.teal} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div style={{fontFamily:"Marcellus,serif",fontSize:"15px",fontWeight:700,lineHeight:1.1,color:H.white}}>Halcyon MYP Unit Designer</div>
            <div style={{fontSize:"9px",color:H.tealLight,letterSpacing:"1.1px",textTransform:"uppercase",opacity:.75}}>Enhanced MYP · Transcend 6 Leaps · PBL Gold Standard</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          {uStep>0&&<div style={{fontSize:"10.5px",color:H.tealLight,opacity:.85}}>{uMode==="transform"?"⬆ Transform · ":""}Step {uStep}/14 — {UNIT_STEPS[uStep-1]?.label}</div>}
          {uPhase!=="welcome"&&<button onClick={resetUnit} style={{background:"transparent",border:`1px solid ${H.teal}55`,color:H.tealLight,borderRadius:"6px",padding:"4px 11px",fontSize:"11px",cursor:"pointer"}}>New Unit</button>}
        </div>
      </header>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <aside style={{width:"190px",flexShrink:0,background:H.white,borderRight:`1px solid ${H.greyLight}`,padding:"12px 0",overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"1.8px",textTransform:"uppercase",color:H.greyMid,padding:"0 12px 8px",borderBottom:`1px solid ${H.greyLight}`,marginBottom:"5px"}}>Design Steps</div>
          {UNIT_STEPS.map(({n,label})=>{
            const cur=uStep; const done=n<cur, active=n===cur;
            return (
              <div key={n} className="stepr" style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px",borderLeft:active?`3px solid ${H.teal}`:"3px solid transparent",background:active?`${H.teal}0D`:"transparent",transition:"all .15s"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,background:done?H.teal:active?H.navy:H.greyLight,color:done||active?H.white:H.greyMid,transition:"all .2s"}}>{done?"✓":n}</div>
                <span style={{fontSize:"11px",fontWeight:active?600:400,color:done?H.teal:active?H.navy:H.greyMid,lineHeight:1.25}}>{label}</span>
              </div>
            );
          })}
          <div style={{marginTop:"auto",padding:"10px 12px",borderTop:`1px solid ${H.greyLight}`}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:H.greyMid,marginBottom:"6px"}}>Frameworks</div>
            {[{c:H.navy,l:"Enhanced MYP"},{c:H.teal,l:"Transcend 6 Leaps"},{c:H.gold,l:"PBL Gold Standard"}].map(f=>(
              <div key={f.l} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                <div style={{width:"7px",height:"7px",borderRadius:"2px",background:f.c,flexShrink:0}}/>
                <span style={{fontSize:"9.5px",color:H.greyMid}}>{f.l}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1,display:"flex",overflow:"hidden"}}>

          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {uPhase==="welcome" ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                  <div style={{maxWidth:"540px",width:"100%",textAlign:"center"}}>
                    <div style={{width:"48px",height:"48px",borderRadius:"12px",background:`${H.navy}10`,border:`1px solid ${H.navy}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={H.navy} strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <h1 style={{fontFamily:"Marcellus,serif",fontSize:"21px",fontWeight:700,color:H.navy,margin:"0 0 7px"}}>MYP Unit Design Studio</h1>
                    <p style={{fontSize:"13px",color:H.greyMid,margin:"0 0 26px",lineHeight:1.55}}>Design or transform MYP units aligned with three frameworks — through a guided, challenging 14-step process.</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"22px"}}>
                      {[
                        {mode:"new",icon:"✦",title:"Design New Unit",desc:"Build an ambitious new unit from scratch.",color:H.navy},
                        {mode:"transform",icon:"⬆",title:"Transform Existing Unit",desc:"Upload a unit you already teach and reimagine it.",color:H.teal},
                      ].map(o=>(
                        <div key={o.mode} className="card" onClick={()=>chooseUnitMode(o.mode)}
                          style={{background:H.white,border:`1.5px solid ${o.color}22`,borderRadius:"12px",padding:"22px 18px",cursor:"pointer",boxShadow:"0 2px 14px rgba(27,58,92,.08)",textAlign:"left"}}>
                          <div style={{fontSize:"22px",marginBottom:"10px",color:o.color}}>{o.icon}</div>
                          <div style={{fontFamily:"Marcellus,serif",fontSize:"14px",fontWeight:700,color:o.color,marginBottom:"7px"}}>{o.title}</div>
                          <div style={{fontSize:"12px",color:H.greyMid,lineHeight:1.5}}>{o.desc}</div>
                          <div style={{marginTop:"14px",fontSize:"11px",fontWeight:700,color:o.color}}>Get started →</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
                      {[{c:H.navy,l:"Enhanced MYP"},{c:H.teal,l:"Transcend 6 Leaps"},{c:H.gold,l:"PBL Gold Standard"}].map(f=>(
                        <div key={f.l} style={{background:`${f.c}0E`,border:`1px solid ${f.c}22`,borderRadius:"16px",padding:"4px 12px",fontSize:"10.5px",fontWeight:600,color:f.c}}>{f.l}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : uPhase==="upload" ? (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                  <div style={{background:H.white,borderRadius:"14px",padding:"30px 28px",maxWidth:"440px",width:"100%",boxShadow:"0 4px 24px rgba(27,58,92,.10)",border:`1px solid ${H.greyLight}`}}>
                    <div style={{fontFamily:"Marcellus,serif",fontSize:"18px",fontWeight:700,color:H.navy,marginBottom:"6px",textAlign:"center"}}>Transform an existing unit</div>
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
                  {restored&&(
                    <div style={{padding:"7px 18px",background:H.tealPale,borderBottom:`1px solid ${H.teal}25`,fontSize:"11.5px",color:H.teal,fontWeight:600,flexShrink:0,display:"flex",alignItems:"center",gap:"10px"}}>
                      <span>↻ Picked up where you left off — last saved {timeAgo(restored.savedAt)}.</span>
                      <span onClick={()=>setRestored(null)} style={{marginLeft:"auto",cursor:"pointer",color:H.greyMid,fontWeight:700}}>✕</span>
                    </div>
                  )}
                  {draftWarning&&(
                    <div style={{padding:"7px 18px",background:H.goldPale,borderBottom:`1px solid ${H.gold}40`,fontSize:"11.5px",color:H.navyMid,fontWeight:600,flexShrink:0}}>
                      ⚠ This unit is too large to auto-save in your browser — download the plan when it's ready, and avoid closing this tab.
                    </div>
                  )}
                  <MessageList msgs={uMsgs.filter(m=>!m.hidden)} loading={uLoading} scrollRef={uScroll} waitNote={uWaitNote} elapsed={uElapsed}/>
                  {uPlanReady&&(
                    <div style={{padding:"7px 18px",background:H.goldPale,borderTop:`1px solid ${H.gold}30`,display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                      <span style={{fontSize:"11.5px",color:H.navyMid,fontWeight:600}}>Unit plan complete</span>
                      <button onClick={()=>downloadDoc(uMsgs)} style={{background:H.gold,color:H.navyDark,border:"none",borderRadius:"6px",padding:"5px 14px",fontSize:"11.5px",fontWeight:700,cursor:"pointer"}}>↓ Download Word Doc</button>
                    </div>
                  )}
                  <ChatInput taRef={uTa} value={uInput} onChange={e=>{setUInput(e.target.value);grow(uTa);}} onSend={sendUnit} disabled={uLoading}/>
                  <MiniProgress steps={UNIT_STEPS} current={uStep}/>
                </>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}
