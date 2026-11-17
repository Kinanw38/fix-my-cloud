// Small DOM helpers. Everything is built with DOM methods and textContent: no innerHTML, no inline styles (CSP).
const NS = 'http://www.w3.org/2000/svg';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const svg = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
// <use> must live inside an <svg>. `icon` is for use inside an existing svg, `htmlIcon` makes its own wrapper.
export const icon = (id, attrs = {}) => svg('use', { href: '#' + id, class: 'icon', ...attrs });
export function htmlIcon(id, cls = '') {
  const s = svg('svg', { class: 'icon ' + cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  s.appendChild(svg('use', { href: '#' + id }));
  return s;
}
export const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
