// ESC (ponytail W8, 2026-10-05): the one HTML escape every HUD, pane, plate and spoken-line vector uses.
// esc: text and attribute values (& < > " ' → entities; null/undefined → '').
// escJs: a value inside a single-quoted JS string inside an on*="…" attribute: backslash-escapes \ and ', then esc.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
export const escJs = (t) => esc(String(t ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
