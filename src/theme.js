// Palette drawn from halcyonschool.com's live brand: dark navy-blue primary,
// forest-green accent, gold highlight. Terracotta is added as the fourth framework
// colour (Explorer Mode) — warm, distinct from the gold, and readable on cream.
// The same values live as CSS variables in styles.css; this copy exists for the few
// places JS needs a colour (the Word export, which can't read CSS variables).
export const H = {
  navy: "#1E2145", navyMid: "#343863", navyDark: "#111327",
  teal: "#1A5941", tealLight: "#4C8A6C", tealPale: "#EAF4EF",
  gold: "#D9A200", goldLight: "#F0C94D", goldPale: "#FBF1D6",
  clay: "#B4532A", clayPale: "#F7E9E2",
  cream: "#FAF7F2", greyLight: "#EBE7E0", greyMid: "#8D8880", white: "#FFFFFF",
};

// The four frameworks, in the order they're presented everywhere. `key` is the CSS
// modifier used for colour (fw-myp, fw-leaps, …); `name` is the exact string the model
// must use in framework tags.
export const FRAMEWORKS = [
  { key: "myp", name: "Enhanced MYP", source: "IB · MYP: From Principles into Practice",
    blurb: "Concepts, global contexts and the A–D criteria that make a unit genuinely MYP." },
  { key: "leaps", name: "Transcend 6 Leaps", source: "Transcend Education",
    blurb: "Six shifts — from passive compliance to agency, from irrelevance to relevance, and more." },
  { key: "pbl", name: "PBL Gold Standard", source: "PBLWorks",
    blurb: "Seven design elements that turn a topic into a project with a real audience." },
  { key: "explorer", name: "Explorer Mode", source: "The Disengaged Teen · Winthrop & Anderson",
    blurb: "Designing moments where students follow their own questions, set goals and adapt." },
];
export const FRAMEWORK_NAMES = FRAMEWORKS.map(f => f.name);
export const frameworkKey = (name) => FRAMEWORKS.find(f => f.name === name)?.key || "myp";
