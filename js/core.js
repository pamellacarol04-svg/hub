// Shared state, helpers, dates, money, palettes, toasts, modal and the action registry.
import { CONFIG } from './config.js';
import { I } from './icons.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
export const APP = CONFIG.appName || 'HUB';
export const PRODUCT = CONFIG.product || 'hub';
export const plural = (n, one, many = one + 's') => `${Number(n).toLocaleString()} ${Number(n) === 1 ? one : many}`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
export const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

// ---------------------------------------------------------------------
// Dates: plain local days (YYYY-MM-DD), never UTC
// ---------------------------------------------------------------------
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDate(new Date());
export const parseDay = (d) => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, dd); };
export const addDays = (d, n) => { const x = parseDay(d); x.setDate(x.getDate() + n); return isoDate(x); };
export const addMonths = (d, n) => { const x = parseDay(d); const day = x.getDate(); const t = new Date(x.getFullYear(), x.getMonth() + n, 1); t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return isoDate(t); };
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const fmtDay = (d) => { const x = parseDay(d); return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
export const fmtShort = (d) => { const x = parseDay(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}`; };
export const fmtLong = (d) => { const x = parseDay(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
export const fmtMonth = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MONTHS_LONG[m - 1]} ${y}`; };
export const relDay = (d) => { const n = daysBetween(today(), d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n < 0 ? `${-n} days ago` : n < 7 ? DAYS_LONG[parseDay(d).getDay()] : fmtShort(d); };
export const relLow = (d) => { const r = relDay(d); return /^(Today|Tomorrow|Yesterday)$/.test(r) ? r.toLowerCase() : r; };
export const monthKey = (d = today()) => d.slice(0, 7);
export const monthStart = (d = today()) => d.slice(0, 8) + '01';
export const monthEnd = (d = today()) => { const x = parseDay(d); return isoDate(new Date(x.getFullYear(), x.getMonth() + 1, 0)); };
export const inMonth = (d, ym) => String(d || '').startsWith(ym);
export const weekStart = (d = today()) => { const x = parseDay(d); const ws = Number(S.settings.week_start ?? 1); return addDays(d, -((x.getDay() - ws + 7) % 7)); };
/** The local day of a timestamp. */
export const dayOf = (ts) => (ts ? isoDate(new Date(ts)) : '');
/** 9:05 am, in the person's own clock style. */
export const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const hhmm = (t) => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return clock(d); };
/** "3 h 20 min", "12 min", "45 s". */
export const dur = (min) => { const m = Number(min) || 0; if (m <= 0) return '0 min'; if (m < 1) return `${Math.max(1, Math.round(m * 60))} s`; if (m < 60) return `${Math.round(m)} min`; const h = Math.floor(m / 60), r = Math.round(m % 60); return r ? `${h} h ${r} min` : `${h} h`; };
export const ago = (ts) => { const m = (Date.now() - new Date(ts).getTime()) / 6e4; if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)} min ago`; if (m < 60 * 24) return `${Math.floor(m / 60)} h ago`; const d = Math.floor(m / 1440); return d === 1 ? 'yesterday' : `${d} days ago`; };
export const hoursSince = (ts) => (ts ? (Date.now() - new Date(ts).getTime()) / 36e5 : Infinity);

// ---------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------
export const CURRENCIES = [
  ['USD', 'Dólar americano'], ['EUR', 'Euro'], ['GBP', 'Libra esterlina'], ['CAD', 'Dólar canadense'], ['AUD', 'Dólar australiano'], ['NZD', 'Dólar neozelandês'],
  ['SGD', 'Dólar de Singapura'], ['PHP', 'Peso filipino'], ['MYR', 'Ringgit malaio'], ['IDR', 'Rúpia indonésia'], ['THB', 'Baht tailandês'], ['VND', 'Dong vietnamita'],
  ['JPY', 'Iene japonês'], ['KRW', 'Won sul-coreano'], ['CNY', 'Yuan chinês'], ['HKD', 'Dólar de Hong Kong'], ['INR', 'Rúpia indiana'], ['AED', 'Dirham dos Emirados'],
  ['SAR', 'Riyal saudita'], ['ZAR', 'Rand sul-africano'], ['BRL', 'Real brasileiro'], ['MXN', 'Peso mexicano'], ['CHF', 'Franco suíço'], ['SEK', 'Coroa sueca'],
  ['NOK', 'Coroa norueguesa'], ['DKK', 'Coroa dinamarquesa'],
];
const fmtCache = new Map();
const nf = (cur, whole) => { const k = cur + whole; if (!fmtCache.has(k)) { try { fmtCache.set(k, new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, ...(whole ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}) })); } catch { fmtCache.set(k, new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })); } } return fmtCache.get(k); };
/** The currency symbol on its own, e.g. "$", "S$", "₱". */
export const curSym = () => { try { return (nf(S.settings.currency || 'USD').formatToParts(0).find(p => p.type === 'currency') || {}).value || ''; } catch { return '$'; } };
/** A number with grouping but no currency, for tight cells ("1,250"). */
export const plainNum = (n, dp = 0) => new Intl.NumberFormat(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp }).format(Number(n) || 0);
export const money = (n, opts = {}) => nf(opts.cur || S.settings.currency || 'USD', opts.whole).format(Number(n) || 0);
export const moneyWhole = (n, cur) => money(Math.round(Number(n) || 0), { whole: true, cur });
export const moneyShort = (n) => { const v = Number(n) || 0; const a = Math.abs(v); if (a < 10000) return moneyWhole(v); const parts = nf(S.settings.currency || 'USD', true).formatToParts(0); const sym = parts.find(p => p.type === 'currency')?.value || ''; const pre = parts[0]?.type === 'currency'; const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'm' : (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k'; return `${v < 0 ? '−' : ''}${pre ? sym : ''}${s}${pre ? '' : ' ' + sym}`; };
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const sum = (list, f = x => (x && typeof x === 'object' ? x.amount : x)) => round2(list.reduce((a, x) => a + (Number(f(x)) || 0), 0));

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------
export const S = {
  session: null, unlocked: false, authView: 'login', authMsg: '', authErr: '', authEmail: '',
  me: null,
  settings: { theme: 'powder', low_stim: false, calm: false, decor: true, sound: true, currency: 'USD', monthly_budget: null, board_year: null, week_start: 1, display_name: '', alter_ego: '', intention: '', intention_day: null, data: {} },
  items: [], photos: [],
  ui: {},
};
export const firstName = () => (S.settings.display_name || '').split(' ')[0];

// ---------------------------------------------------------------------
// Looks: ten palettes, five soft and five neutral (two of them dark). Text size, reduce motion and
// "hide exact balances" live in settings too.
// ---------------------------------------------------------------------
export const THEMES = [
  { id: 'powder', group: 'soft', name: 'Pó e Peônia', note: 'Azul bebê e rosa peônia', sw: ['#FCF8F3', '#BFDCF5', '#F9C9DF', '#F6E3A1', '#1F1C2C'] },
  { id: 'lilac', group: 'soft', name: 'Carta Lilás', note: 'Lavanda, manteiga e hortelã', sw: ['#FBF8FC', '#D9CCF4', '#F8E7A6', '#C7EBDA', '#26213A'] },
  { id: 'matcha', group: 'soft', name: 'Matcha e Leite', note: 'Sálvia, aveia e damasco', sw: ['#F8F6EE', '#C9DDBF', '#F6D2B8', '#EFE4C7', '#22301F'] },
  { id: 'apricot', group: 'soft', name: 'Sol de Damasco', note: 'Damasco, coral e céu', sw: ['#FFF8F1', '#FFD3B0', '#F9B8B0', '#C9E2F5', '#2C211B'] },
  { id: 'velvet', group: 'soft', name: 'Noite aveludada', note: 'Ameixa escura com luzes pastéis', dark: true, sw: ['#1D1824', '#2A2333', '#F3A9CC', '#A9CDF2', '#F4EEF6'] },
  { id: 'oxford', group: 'neutral', name: 'Oxford', note: 'Azul-marinho, pedra e latão', sw: ['#F5F3EE', '#D6DCE6', '#E5DCCB', '#C9B37E', '#18233A'] },
  { id: 'olive', group: 'neutral', name: 'Campo de Oliveiras', note: 'Oliva, areia e linho', sw: ['#F3F1E8', '#D5D9BC', '#E6D7B8', '#C9C3AE', '#262A1C'] },
  { id: 'slate', group: 'neutral', name: 'Ardósia', note: 'Cinzas frios com toque de azul aço', sw: ['#F2F3F4', '#D3DAE1', '#DDDBD6', '#B9C4CC', '#1D2328'] },
  { id: 'espresso', group: 'neutral', name: 'Expresso', note: 'Café, creme e caramelo', sw: ['#F6F1EA', '#E3D2BF', '#D9CBB8', '#C7A98A', '#2A1F18'] },
  { id: 'graphite', group: 'neutral', name: 'Grafite', note: 'Grafite com aço e latão', dark: true, sw: ['#18191B', '#25272A', '#B8C6D3', '#D7C08E', '#ECEAE6'] },
];
export function themeId() { const t = S.settings.theme; return THEMES.some(x => x.id === t) ? t : 'powder'; }
export const isDark = () => Boolean(THEMES.find(x => x.id === themeId())?.dark);
export function applyTheme() {
  const root = document.documentElement; const id = themeId(); const dark = isDark();
  root.dataset.theme = id; root.style.colorScheme = dark ? 'dark' : 'light';
  const D = S.settings.data || {};
  root.classList.toggle('calm', Boolean(S.settings.calm));
  root.classList.toggle('plain', S.settings.decor === false);
  root.classList.toggle('hide-bal', Boolean(D.hideBal));
  root.dataset.text = String(D.textSize ?? 1);
  $('meta[name="theme-color"]')?.setAttribute('content', THEMES.find(x => x.id === id).sw[0]);
}

/** Minutes since midnight for a timestamp, and the instant for a day + "HH:MM". */
export const minOfDay = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
export const atTime = (day, hhmmStr) => { const [y, m, d] = day.split('-').map(Number); const [h, mi] = String(hhmmStr || '00:00').split(':').map(Number); return new Date(y, m - 1, d, h, mi).toISOString(); };
export const hm24 = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** "2 d 4 h", "3 h 20 min", "12 min". */
export const until = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60; return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`; };
export const calm = () => Boolean(S.settings.calm) || matchMedia('(prefers-reduced-motion: reduce)').matches;

export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${I[n] || ''}</svg>`;

// ---------------------------------------------------------------------
// Feedback: toasts, confetti, a buzz
// ---------------------------------------------------------------------
export function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.error ? ' err' : '');
  el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
  if (opts.action) el.querySelector('button').onclick = () => { opts.onAction(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), opts.ms || 3800);
}
export const fail = (e) => { console.error(e); toast(e?.message || 'Something went wrong. Try again.', { error: true, ms: 6000 }); };
export function buzz(pattern = 18) { if (S.settings.haptics !== false && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) try { navigator.vibrate(pattern); } catch { /* not supported */ } }
/** Paper confetti from a point on screen. Skipped in calm mode. */
export function pop(el, n = 16) {
  if (calm() || !el) return;
  const r = el.getBoundingClientRect(); const box = document.createElement('div'); box.className = 'pop'; box.setAttribute('aria-hidden', 'true');
  box.style.left = (r.left + r.width / 2) + 'px'; box.style.top = (r.top + r.height / 2) + 'px';
  const colors = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)', 'var(--accent)'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); const a = (Math.PI * 2 * i) / n + Math.random() * 0.4; const d = 30 + Math.random() * 40;
    p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d - 12 + 'px'); p.style.background = colors[i % colors.length];
    p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg'); box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 950);
}

// ---------------------------------------------------------------------
// Modal (native <dialog>)
// ---------------------------------------------------------------------
export const modal = () => $('#modal');
export function openModal(html, opts = {}) {
  const m = modal(); m.innerHTML = html; m._onClose = opts.onClose; m.className = opts.size || '';
  if (!m.open) m.showModal();
  const first = m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]), select, textarea');
  first?.focus();
}
export function closeModal() { const m = modal(); if (m.open) m.close(); }
export function modalShell(title, body, foot = '', opts = {}) {
  return `<${opts.form ? `form data-form="${opts.form}" ${opts.attrs || ''}` : 'div'} class="modal-inner" novalidate>
    <header class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
    <div class="modal-body">${body}</div>
    ${foot ? `<footer class="modal-foot">${foot}</footer>` : ''}
  </${opts.form ? 'form' : 'div'}>`;
}

// ---------------------------------------------------------------------
// Actions, forms and rendering hooks (filled in by modules)
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Preview mode (the demo). Nothing is kept: everything lives in memory and
// is gone on a refresh or a new visit. Uploads, downloads and the vault are for owners.
// ---------------------------------------------------------------------
export const DEMO = !(CONFIG.supabaseUrl && CONFIG.supabaseKey) || new URLSearchParams(location.search).has('demo');
export const SHOP = /^https:\/\//i.test(CONFIG.shopUrl || '') ? CONFIG.shopUrl : '';
const GATES = {
  photos: ['Your own photos', 'Adding your own photos and files is part of the full version.'],
  export: ['Downloads', 'Backups, spreadsheets and photo downloads are part of the full version.'],
  vault: ['The password vault', 'The encrypted password vault is part of the full version.'],
  restore: ['Restoring a backup', 'Restoring a backup is part of the full version.'],
};
export const buyLink = (cls = 'btn solid') => SHOP ? `<a class="${cls}" href="${esc(SHOP)}" target="_blank" rel="noopener">Get your own ${esc(APP)}</a>` : (CONFIG.supabaseUrl && CONFIG.supabaseKey ? `<a class="${cls}" href="${esc(location.pathname)}">Log in or sign up</a>` : '');
/** In preview mode, explain that this is a full-version feature and return true (the caller stops). */
export function demoGate(what = 'photos') {
  if (!DEMO || window.__testHarness) return false;
  const [title, line] = GATES[what] || GATES.photos;
  if (modal().open) { toast(`${line} This preview doesn’t keep anything.`, SHOP ? { action: `Get ${APP}`, onAction: () => window.open(SHOP, '_blank', 'noopener'), ms: 7000 } : { ms: 6000 }); return true; }
  openModal(modalShell(title, `<p style="margin-top:0"><b>${esc(line)}</b></p><p class="small muted">You’re in the ${esc(APP)} preview. Try everything else as much as you like, but nothing is kept: it starts over when you refresh or leave the page. With your own ${esc(APP)}, everything is saved to your private account and works on all your devices.</p>`,
    `<span></span><div class="right"><button type="button" class="btn ghost" data-action="close-modal">Keep exploring</button>${buyLink()}</div>`), { size: 'narrow' });
  return true;
}

export const ACTIONS = {};
export const FORMS = {};
export const BINDS = {};
export const hooks = { rerender: () => {}, render: () => {}, after: [] };
export const rerender = () => hooks.rerender();
export const go = (h) => { if (location.hash === h) rerender(); else location.hash = h; };
export function confirmButton(btn, label, fn) {
  if (btn.dataset.armed) return fn();
  btn.dataset.armed = '1'; const old = btn.innerHTML; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = old; } }, 4000);
}
export function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'welcome', parts, params: new URLSearchParams(query), tab: new URLSearchParams(query).get('tab') };
}
/** Tones, used where colour means something. Each theme defines them. */
export const TONES = ['t1', 't2', 't3', 't4', 't5', 't6'];
export const TONE_NAMES = { t1: 'Tone 1', t2: 'Tone 2', t3: 'Tone 3', t4: 'Tone 4', t5: 'Tone 5', t6: 'Tone 6' };
export const toneOf = (s) => TONES[hash(s) % TONES.length];
/** A sparkle: a four-point star. */
export const sparkle = (cls = '') => `<svg class="spk ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2c1.5 9 4.6 13.4 18 18-13.4 4.6-16.5 9-18 18-1.5-9-4.6-13.4-18-18 13.4-4.6 16.5-9 18-18z"/></svg>`;
