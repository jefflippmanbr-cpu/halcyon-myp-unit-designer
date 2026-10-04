// Copying a link has to work everywhere a teacher might be — Safari, Chrome, an iPad, an
// embedded browser. navigator.clipboard is the modern route but is refused in some of
// those (permissions, focus, or the page being embedded). The old execCommand("copy")
// route still works in many of them. Returns true only if one of them succeeded; the
// caller then shows the link selected in a box so it can still be copied by hand.
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
