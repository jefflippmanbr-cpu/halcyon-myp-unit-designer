// Small stroke icons, drawn to sit at text size. `currentColor` so they inherit.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const I = (paths) => function Icon({ size = 15, className = "icon", ...p }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" {...base} {...p}>{paths}</svg>;
};

export const Layers = I(<><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></>);
export const Send = I(<><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></>);
export const Sparkle = I(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>);
export const Upload = I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></>);
export const File = I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>);
export const Link = I(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></>);
export const Download = I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>);
export const Printer = I(<><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></>);
export const Refresh = I(<><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></>);
export const ArrowLeft = I(<><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>);
export const Check = I(<path d="M20 6 9 17l-5-5"/>);
export const Notes = I(<><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M8 12h8M8 16h5"/></>);
export const Menu = I(<path d="M3 6h18M3 12h18M3 18h18"/>);
export const X = I(<path d="M18 6 6 18M6 6l12 12"/>);
export const Trash = I(<><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></>);
export const External = I(<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>);
export const Compass = I(<><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/></>);
