// src/vendors/ui/util.js
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat();
export const fmt = (n) => nf.format(Math.round(n));
export const fmtHours = (h) => (h >= 100 ? nf.format(Math.round(h)) : (Math.round(h * 10) / 10).toString());
