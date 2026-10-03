// ─── Reading an uploaded unit ──────────────────────────────────────────────────

const readAsBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file);
});
const readAsText = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file);
});

// A PDF is sent as base64, which inflates it ~33%, and request bodies are capped. Check up
// front so an oversized (usually scanned) file gets a clear explanation instead of a cryptic
// failure once it's already uploading.
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function processFile(file) {
  const name = file.name; const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error(`That PDF is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 10MB. If it's a scan, try exporting a smaller version, or paste the unit text in chat instead.`);
    }
    return { name, kind: "pdf", data: await readAsBase64(file) };
  }
  if (lower.endsWith(".docx")) {
    try {
      // Bundled and lazy-loaded: it's only needed for .docx uploads, and loading it from a
      // third-party CDN at runtime made uploads depend on that CDN being up.
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { name, kind: "text", data: result.value };
    } catch { throw new Error("Couldn't read that .docx. Try exporting it as PDF instead."); }
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return { name, kind: "text", data: await readAsText(file) };
  throw new Error("Please upload a PDF, .docx, or .txt file. (Export a Google Doc as PDF: File → Download → PDF.)");
}

export function buildFirstMessage(baseText, file) {
  if (!file) return baseText;
  if (file.kind === "pdf") {
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } },
      { type: "text", text: `${baseText}\n\nI've attached my existing unit as a PDF ("${file.name}"). Please read it and use it as the starting point.` },
    ];
  }
  // Generous cap (the model has a large context window), and truncation is disclosed
  // in-prompt so a long unit is never silently half-read.
  const MAX_CHARS = 200000;
  const body = file.data.length > MAX_CHARS
    ? `${file.data.slice(0, MAX_CHARS)}\n\n[...document truncated here — it exceeded the size this tool can read in one go...]`
    : file.data;
  return `${baseText}\n\nHere is my existing unit ("${file.name}"):\n\n"""\n${body}\n"""\n\nPlease read it and use it as the starting point.`;
}
