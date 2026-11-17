// The map: an illustration, not a diagram. A night sky, an actor on the left (the internet, a repo, a
// pull request...), a cloud with the thing you protect inside it, and a door that is open or locked.
// The static parts are built once. The actor and the target are rebuilt for every level.
import { svg, icon } from './dom.js';
import { t, tx } from './i18n.js';

let root; let actorG; let targetG; let gapG; let cfg; let onPick = () => {};
const labels = {};
const grp = (cls, attrs = {}) => svg('g', { class: cls, ...attrs });
const label = (cls, x, y) => svg('text', { class: cls, x, y, 'text-anchor': 'middle' });
const line = (d) => svg('path', { class: 'glyph-line', d });
// A label that wraps to two lines when it is long, so it never runs off the edge of the picture.
function setLabel(node, str, wrap = true) {
  node.replaceChildren();
  const words = str.split(' ');
  if (!wrap || str.length <= 11 || words.length < 2) { node.textContent = str; return; }
  let best = 1; let diff = Infinity;
  for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < diff) { diff = d; best = i; } }
  [words.slice(0, best).join(' '), words.slice(best).join(' ')].forEach((part, i) => {
    const ts = svg('tspan', { x: node.getAttribute('x'), dy: i === 0 ? '-0.55em' : '1.15em' }); ts.textContent = part; node.appendChild(ts);
  });
}

// Actor glyphs are drawn around (52, 175).
function actorShape(kind) {
  const body = (tag, a) => svg(tag, { class: 'glyph-body', ...a });
  switch (kind) {
    case 'repo': return [body('path', { d: 'M28 160 H46 L52 166 H76 V191 H28 Z' }), svg('circle', { class: 'glyph-line', cx: 40, cy: 179, r: 4 }), line('M44 179 H62 M58 179 V184 M53 179 V183')];
    case 'comment': return [body('rect', { x: 28, y: 158, width: 48, height: 28, rx: 7 }), body('path', { d: 'M38 186 L36 196 L48 186' }), ...[40, 52, 64].map((cx) => svg('circle', { class: 'glyph-dot', cx, cy: 172, r: 2.4 }))];
    case 'gear': {
      const teeth = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `M${52 + 14 * Math.cos(a)} ${175 + 14 * Math.sin(a)} L${52 + 21 * Math.cos(a)} ${175 + 21 * Math.sin(a)}`; }).join(' ');
      return [body('circle', { cx: 52, cy: 175, r: 14 }), svg('circle', { class: 'glyph-line', cx: 52, cy: 175, r: 5 }), svg('path', { class: 'glyph-line glyph-teeth', d: teeth })];
    }
    case 'package': return [body('rect', { x: 30, y: 160, width: 44, height: 30, rx: 4 }), line('M30 170 H74'), line('M52 186 V175 M46 181 L52 175 L58 181')];
    default: return [ // globe
      svg('circle', { class: 'glyph-body', cx: 52, cy: 175, r: 24 }),
      svg('ellipse', { class: 'glyph-line globe-meridian', cx: 52, cy: 175, rx: 11, ry: 24 }),
      line('M28 175 H76 M32 162 Q52 169 72 162 M32 188 Q52 181 72 188'),
    ];
  }
}

// The target: a rack of three servers, or three stacked disks for data.
function targetShape(kind) {
  const out = [svg('rect', { class: 'pick-ring', x: 294, y: 122, width: 96, height: 86, rx: 9 })];
  if (kind === 'db') {
    [134, 158, 182].forEach((y) => out.push(
      svg('path', { class: 'rack-unit', d: `M302 ${y} v14 a40 8 0 0 0 80 0 v-14` }),
      svg('ellipse', { class: 'rack-unit', cx: 342, cy: y, rx: 40, ry: 8 }),
      svg('circle', { class: 'led', cx: 322, cy: y + 11, r: 2.6 }),
    ));
  } else {
    [128, 152, 176].forEach((y) => out.push(
      svg('rect', { class: 'rack-unit', x: 300, y, width: 84, height: 20, rx: 4 }),
      svg('circle', { class: 'led', cx: 312, cy: y + 10, r: 3 }),
      svg('path', { class: 'rack-slot', d: `M324 ${y + 10} H372` }),
    ));
  }
  return out;
}

const STARS = [[30, 40, 1.6], [120, 52, 1.2], [190, 34, 1.8], [260, 50, 1.2], [330, 38, 1.6], [400, 56, 1.2], [452, 36, 1.8], [60, 104, 1.2], [214, 80, 1.4], [150, 116, 1.2], [20, 146, 1.4]];
const CLOUD_D = 'M250 210 H430 A38 38 0 0 0 430 140 A48 48 0 0 0 350 100 A40 40 0 0 0 278 126 A46 46 0 0 0 250 210 Z';
// The thing that is wrong, in two states. Both are always drawn and CSS shows one (data-state on the svg).
// Every level picks its own: a door, a key, a loose version, a terminal, a delete lever, a missing label.
function gap(kind = 'door') {
  const open = grp('door-open'); const shut = grp('door-closed');
  const path = (cls, d) => svg('path', { class: cls, d });
  const lock = (x, y) => icon('i-lock', { x, y, width: 14, height: 14 });
  const doorShut = () => [svg('rect', { class: 'door-shut', x: 222, y: 153, width: 20, height: 44, rx: 3 }), lock(225, 168)];
  switch (kind) {
    case 'pin': // a version that wobbles, then a pin that holds it
      open.append(path('gap-bad', 'M206 175 l8 -16 l10 32 l10 -32 l10 32 l8 -16'));
      shut.append(path('gap-good', 'M206 175 H258'), svg('circle', { class: 'gap-good-fill', cx: 232, cy: 160, r: 6 }), path('gap-good', 'M232 166 V175'));
      break;
    case 'key': // a key lying on the road, then a lock
      open.append(svg('circle', { class: 'gap-bad', cx: 219, cy: 175, r: 6 }), path('gap-bad', 'M225 175 H250 M243 175 V182 M249 175 V180'));
      shut.append(...doorShut());
      break;
    case 'terminal': // text that runs as commands, then plain text
      open.append(svg('rect', { class: 'door-void', x: 214, y: 157, width: 36, height: 36, rx: 6 }), path('gap-bad', 'M221 169 l7 6 -7 6 M232 183 h10'));
      shut.append(svg('rect', { class: 'door-shut', x: 214, y: 157, width: 36, height: 36, rx: 6 }), icon('i-check', { x: 224, y: 167, width: 16, height: 16 }));
      break;
    case 'lever': // a delete lever that is armed, then guarded
      open.append(svg('rect', { class: 'door-void', x: 216, y: 186, width: 32, height: 10, rx: 3 }), path('gap-bad', 'M232 188 L248 160'), svg('circle', { class: 'gap-bad-fill', cx: 249, cy: 157, r: 7 }));
      shut.append(svg('rect', { class: 'door-shut', x: 216, y: 186, width: 32, height: 10, rx: 3 }), path('gap-good', 'M232 188 V160'), svg('circle', { class: 'gap-good-fill', cx: 232, cy: 156, r: 7 }), lock(240, 166));
      break;
    case 'tag': // a label that is missing, then found
      open.append(svg('path', { class: 'gap-dash', d: 'M214 162 H238 L250 175 L238 188 H214 Z' }), icon('i-help', { x: 217, y: 168, width: 14, height: 14 }));
      shut.append(path('gap-good', 'M206 175 H262'), svg('path', { class: 'door-shut', d: 'M214 162 H238 L250 175 L238 188 H214 Z' }), icon('i-check', { x: 218, y: 168, width: 14, height: 14 }));
      break;
    default: // a door with light spilling out, then locked
      open.append(svg('polygon', { class: 'spill', points: '222,153 204,146 204,204 222,197' }), svg('rect', { class: 'door-void', x: 222, y: 153, width: 20, height: 44, rx: 3 }), svg('polygon', { class: 'door-leaf', points: '242,153 258,160 258,190 242,197' }));
      shut.append(...doorShut());
  }
  return [open, shut];
}

// A small still of a level for the board: an open door at night, a locked one once it is solved.
export function miniScene(sc, solved, withSky = false) {
  const s = svg('svg', { class: 'graph mini', viewBox: withSky ? '0 28 480 224' : '0 96 480 118', 'aria-hidden': 'true', focusable: 'false' });
  s.dataset.state = solved ? 'contained' : 'breached';
  s.append(svg('rect', { class: 'sky', y: 0, width: 480, height: 260 }));
  if (withSky) { // stars, moon and sun, so the example can show night turning into dawn
    const stars = grp('stars'); STARS.forEach(([cx, cy, r]) => stars.appendChild(svg('circle', { class: 'star', cx, cy, r })));
    const moon = grp('moon'); moon.append(svg('circle', { class: 'moon-disc', cx: 90, cy: 62, r: 16 }), svg('circle', { class: 'moon-cut', cx: 98, cy: 57, r: 14 }));
    const sun = grp('sun'); sun.appendChild(svg('circle', { class: 'sun-disc', cx: 90, cy: 76, r: 20 }));
    s.append(stars, moon, sun);
  }
  s.append(svg('path', { class: 'cloud', d: CLOUD_D }),
    svg('path', { class: 'edge edge--breached edge-full', d: 'M82 175 H222' }), svg('path', { class: 'edge edge--contained edge-short', d: 'M82 175 H206' }),
    ...gap(sc.gap), ...actorShape(sc.actor.icon), ...targetShape(sc.target.icon));
  return s;
}

export const scene = {
  init(svgEl, pickHandler) {
    root = svgEl; onPick = pickHandler;
    root.appendChild(svg('rect', { class: 'sky', width: 480, height: 260 }));
    const stars = grp('stars');
    STARS.forEach(([cx, cy, r]) => stars.appendChild(svg('circle', { class: 'star', cx, cy, r })));
    const moon = grp('moon'); moon.append(svg('circle', { class: 'moon-disc', cx: 90, cy: 62, r: 16 }), svg('circle', { class: 'moon-cut', cx: 98, cy: 57, r: 14 }));
    const sun = grp('sun'); sun.appendChild(svg('circle', { class: 'sun-disc', cx: 90, cy: 76, r: 20 }));
    root.append(stars, moon, sun, svg('path', { class: 'cloud', d: CLOUD_D }));
    root.append(svg('path', { class: 'edge edge--breached edge-full', d: 'M82 175 H222' }), svg('path', { class: 'edge edge--contained edge-short', d: 'M82 175 H206' }));
    gapG = grp('gap');
    actorG = grp('actor'); targetG = grp('pick');
    labels.actor = label('lbl', 52, 222); labels.target = label('lbl', 340, 229); labels.cloud = label('lbl-muted', 340, 246);
    root.append(gapG, actorG, targetG, labels.actor, labels.target, labels.cloud);
    targetG.setAttribute('role', 'button'); targetG.setAttribute('tabindex', '0');
    targetG.addEventListener('click', () => onPick());
    targetG.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } });
  },
  configure(sceneCfg) {
    cfg = sceneCfg;
    gapG.replaceChildren(...gap(cfg.gap));
    actorG.replaceChildren(...actorShape(cfg.actor.icon));
    targetG.replaceChildren(...targetShape(cfg.target.icon));
  },
  paint(solved) {
    const state = solved ? 'contained' : 'breached';
    root.dataset.state = state;
    setLabel(labels.actor, tx(cfg.actor.label)); setLabel(labels.target, tx(cfg.target.label), false); labels.cloud.textContent = t('scene.cloud');
    targetG.setAttribute('aria-label', t('scene.inspect', { name: tx(cfg.target.label) }) + '. ' + tx(solved ? cfg.capClosed : cfg.capOpen));
    root.setAttribute('aria-label', t('scene.aria', { actor: tx(cfg.actor.label), target: tx(cfg.target.label) }));
  },
};
