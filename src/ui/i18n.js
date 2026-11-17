// UI language. Hebrew and English, remembered in the store. Level text comes as { en, he } pairs (use tx).
import en from '../i18n/en.js';
import he from '../i18n/he.js';
import { get, set } from './store.js';

const dict = { en, he };
let lang = 'en';
const fmt = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const getLang = () => lang;
export const t = (key, vars) => fmt(dict[lang][key] ?? dict.en[key] ?? key, vars);
export const tx = (o) => (o ? o[lang] ?? o.en ?? '' : '');

function apply() {
  const r = document.documentElement;
  r.lang = lang;
  r.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t(n.dataset.t); });
  document.querySelectorAll('[data-t-label]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.tLabel)));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.querySelector('.seg')?.setAttribute('data-active', lang);
}

export function initLang() {
  lang = get('lang', null) ?? (navigator.language?.startsWith('he') ? 'he' : 'en');
  apply();
}

export function setLang(l) {
  if (l === lang) return;
  lang = l;
  set('lang', l);
  apply();
  document.dispatchEvent(new CustomEvent('langchange'));
}
