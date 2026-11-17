// The share card: a 1200x627 post-incident report drawn with canvas and downloaded as a PNG. No libraries.
// Colors are read from the CSS tokens, so the card always matches the current look.
import { t, tx, getLang } from './i18n.js';
import { S, app } from './state.js';
import { mmss } from './dom.js';
import { rankFor } from '../lib/score.js';
import { bestScores } from './store.js';
import { toast } from './toast.js';

const W = 1200; const H = 627;

export function downloadShareCard() {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext?.('2d');
  if (!ctx || !canvas.toBlob) { toast(t('err.canvas')); return; }
  const css = getComputedStyle(document.documentElement); const c = (n) => css.getPropertyValue(n).trim();
  const he = getLang() === 'he'; const L = app.level;
  const x0 = he ? W - 72 : 72; ctx.direction = he ? 'rtl' : 'ltr'; ctx.textAlign = he ? 'right' : 'left';
  const font = (w, px, mono) => `${w} ${px}px ${mono ? 'ui-monospace, Menlo, Consolas, monospace' : '"Rubik Variable", system-ui, "Segoe UI", sans-serif'}`;
  const text = (s, y, f, color) => { ctx.font = f; ctx.fillStyle = c(color); ctx.fillText(s, x0, y, W - 340); };

  ctx.fillStyle = c('--bg'); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c('--panel'); ctx.fillRect(0, 0, W, 96);
  text('Fix My Cloud', 62, font(700, 34, true), '--text');
  text(t('share.report'), 160, font(500, 28), '--muted');
  text(L.incidentId ? `${L.incidentId}` : t('tag.practice'), 232, font(600, 34, true), '--accent');
  text(tx(L.title), 300, font(700, 60), '--text');
  text(`${t('result.resolvedIn')} ${mmss(S.solvedAt ?? 0)}`, 380, font(600, 42, true), '--safe');
  if (S.score != null) {
    const total = Object.values(bestScores()).reduce((a, b) => a + b, 0);
    text(`${t('share.score', { score: S.score })} · ${t('rank.' + rankFor(total))}`, 440, font(500, 32), '--text');
  }
  text(tx(L.lesson.bestPractice), 520, font(500, 30), '--muted');

  // A locked door, drawn with plain shapes on the right.
  const dx = he ? 150 : W - 330; const dy = 150;
  ctx.fillStyle = c('--safe-bg'); ctx.strokeStyle = c('--safe'); ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(dx, dy, 180, 300, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c('--safe'); ctx.beginPath(); ctx.roundRect(dx + 55, dy + 150, 70, 56, 8); ctx.fill();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(dx + 90, dy + 150, 24, Math.PI, 0); ctx.stroke();

  canvas.toBlob((blob) => {
    if (!blob) { toast(t('err.canvas')); return; }
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `fix-my-cloud-${L.id}.png`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
