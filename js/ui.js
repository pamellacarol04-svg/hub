// Shared page furniture: headers, tabs, windows, folders, bubbles, progress, charts and the quick brain dump.
import { S, $, esc, icon, sparkle, ACTIONS, FORMS, rerender, today, toast, fail, pop, buzz, openModal, closeModal, modalShell, plural, clamp, calm, demoGate } from './core.js';
import { db } from './data.js';
import { save, items } from './kinds.js';

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
export async function saveSettings(patch) { S.settings = { ...S.settings, ...patch }; try { S.settings = { ...S.settings, ...(await db.saveSettings(patch)) }; } catch (e) { fail(e); } }

// ---------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------
/** A page header: a handwritten word over a big condensed title, with an optional tilted sticker. */
export const pageHead = (script, title, actions = '', lede = '', sticker = '') => `<header class="page-head">
  <div><span class="script-kicker">${esc(script)}</span><h1>${title}${sticker ? `<span class="sticker" aria-hidden="true">${esc(sticker)}</span>` : ''}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div>
  ${actions ? `<div class="head-actions">${actions}</div>` : ''}</header>`;
/** Tabs inside a pillar: progressive disclosure, one view at a time. */
export const tabs = (route, list, cur) => `<nav class="tabs" aria-label="Sections">${list.map(([id, label, ic]) => `<a href="#/${route}?tab=${id}" ${cur === id ? 'aria-current="page"' : ''}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></a>`).join('')}</nav>`;
export const pickTab = (list, want) => (list.some(t => t[0] === want) ? want : list[0][0]);
/** A card with a heading. tone tints it; flat drops the offset shadow. */
export const card = (title, body, opts = {}) => `<section class="card ${opts.tone ? 'tone ' + opts.tone : ''} ${opts.cls || ''}" ${opts.id ? `id="${opts.id}"` : ''} ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}>
  ${title ? `<div class="card-head"><div>${opts.kicker ? `<span class="label">${esc(opts.kicker)}</span>` : ''}<h2>${title}</h2></div>${opts.actions ? `<div class="card-actions">${opts.actions}</div>` : ''}</div>` : ''}${body}</section>`;
/** A folder: a tabbed card that can hold photos peeking out of the top. */
export const folder = (body, opts = {}) => `<article class="folder ${opts.tone || 't1'} ${opts.cls || ''}">${opts.peek ? `<div class="peek" aria-hidden="true">${opts.peek}</div>` : ''}<div class="folder-body">${body}</div></article>`;
/** A cloud badge: the scalloped label. */
export const cloud = (text, tone = 't1') => `<span class="cloud ${tone}"><span>${esc(text)}</span></span>`;
export const chip = (text, tone = '') => `<span class="tag ${tone}">${esc(text)}</span>`;
export const empty = (text, action = '') => `<div class="empty">${sparkle('sm')}<p>${text}</p>${action}</div>`;

// ---------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------
export const pctOf = (a, b) => (b > 0 ? clamp(a / b, 0, 1) : 0);
export const bar = (p, opts = {}) => `<div class="bar ${opts.tone || ''} ${opts.cls || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}" ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}><i style="width:${(p * 100).toFixed(1)}%"></i></div>`;
export function ring(p, opts = {}) {
  const r = opts.radius ?? 26, C = 2 * Math.PI * r;
  return `<span class="ring ${opts.tone || ''}" role="img" aria-label="${esc(opts.label || Math.round(p * 100) + ' percent')}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="r-bg"/><circle cx="32" cy="32" r="${r}" class="r-fg" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p)).toFixed(2)}" transform="rotate(-90 32 32)"/></svg><b>${opts.text ?? Math.round(p * 100) + '%'}</b></span>`;
}
export const stat = (value, label, opts = {}) => `<div class="stat ${opts.tone || ''}"><b class="num">${value}</b><span>${esc(label)}</span>${opts.sub ? `<small>${opts.sub}</small>` : ''}</div>`;

// ---------------------------------------------------------------------
// Charts (SVG). Thin marks, rounded data-ends, a tooltip on every mark.
// ---------------------------------------------------------------------
const W0 = 640;
const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
/** Columns. data: [{ label, value, tip, tone }]. */
export function barChart(data, opts = {}) { const W = opts.w || W0;
  const H = opts.h || 200, pad = { l: 44, r: 8, t: 12, b: 26 }; const max = opts.max || niceMax(Math.max(...data.map(d => d.value), 0));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const slot = iw / Math.max(1, data.length); const bw = Math.min(opts.bw || 36, slot - 4);
  const y = (v) => pad.t + ih - (v / max) * ih; const fmt = opts.fmt || (v => Math.round(v));
  const ticks = [0, 0.5, 1].map(k => max * k);
  return `<figure class="chart" ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">
    ${ticks.map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    ${data.map((d, i) => { const x = pad.l + slot * i + (slot - bw) / 2; const h = Math.max(d.value > 0 ? 2 : 0, (d.value / max) * ih); const r = Math.min(4, bw / 2, h);
      const path = h ? `M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + bw - r} Q${x + bw},${y(0) - h} ${x + bw},${y(0) - h + r} V${y(0)} Z` : '';
      return `<g class="mark" tabindex="0" data-tip="${esc(d.tip || `${d.label}: ${fmt(d.value)}`)}"><rect class="hit" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${ih}"/>${path ? `<path class="bar-mark ${d.tone || 'c1'}" d="${path}"/>` : ''}</g>
        ${data.length <= 16 || i % Math.ceil(data.length / 12) === 0 ? `<text class="axis" x="${pad.l + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : ''}`; }).join('')}
    <line class="base" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>
  </svg>${opts.caption ? `<figcaption class="small muted">${opts.caption}</figcaption>` : ''}</figure>`;
}
/** Lines over shared x labels. series: [{ name, tone, values: [number|null] }]. */
export function lineChart(labels, series, opts = {}) { const W = opts.w || W0;
  const H = opts.h || 200, pad = { l: 44, r: 12, t: 12, b: 26 }; const all = series.flatMap(s => s.values).filter(v => v != null);
  const min = opts.min != null && opts.min < 0 ? -niceMax(-opts.min) : (opts.min ?? 0), max = opts.max ?? niceMax(Math.max(...all, 0));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const step = iw / Math.max(1, labels.length - 1);
  const x = (i) => pad.l + step * i, y = (v) => pad.t + ih - ((v - min) / (max - min || 1)) * ih; const fmt = opts.fmt || (v => Math.round(v * 10) / 10);
  const ticks = opts.ticks || (min < 0 && max > 0 ? [min, 0, max] : [min, (min + max) / 2, max]);
  const path = (vals) => { let d = '', pen = false; vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `; pen = true; }); return d; };
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">
    ${ticks.map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    ${labels.map((l, i) => (labels.length <= 14 || i % Math.ceil(labels.length / 10) === 0 ? `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '')).join('')}
    ${series.map(s => `<path class="line-mark ${s.tone}" d="${path(s.values)}"/>`).join('')}
    ${series.map(s => s.values.map((v, i) => (v == null ? '' : `<g class="mark" tabindex="0" data-tip="${esc(`${labels[i]} · ${s.name}: ${fmt(v)}`)}"><circle class="hit" cx="${x(i)}" cy="${y(v)}" r="12"/><circle class="dot-mark ${s.tone}" cx="${x(i)}" cy="${y(v)}" r="${labels.length > 40 ? 0 : 4}"/></g>`)).join('')).join('')}
  </svg>${series.length > 1 ? legend(series) : ''}${opts.caption ? `<figcaption class="small muted">${opts.caption}</figcaption>` : ''}</figure>`;
}
/** Dots. points: [{ x, y, tip }]. */
export function scatter(points, opts = {}) { const W = opts.w || W0;
  const H = opts.h || 220, pad = { l: 40, r: 12, t: 12, b: 34 };
  const [x0, x1] = opts.x || [0, Math.max(1, ...points.map(p => p.x))], [y0, y1] = opts.y || [0, Math.max(1, ...points.map(p => p.y))];
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const X = (v) => pad.l + ((v - x0) / (x1 - x0 || 1)) * iw, Y = (v) => pad.t + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
  const xt = opts.xt || [x0, (x0 + x1) / 2, x1], yt = opts.yt || [y0, (y0 + y1) / 2, y1];
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">
    ${yt.map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${pad.l - 6}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
    ${xt.map(t => `<text class="axis" x="${X(t)}" y="${H - 16}" text-anchor="middle">${t}</text>`).join('')}
    <text class="axis" x="${pad.l + iw / 2}" y="${H - 2}" text-anchor="middle">${esc(opts.xLabel || '')}</text>
    ${points.map(p => `<g class="mark" tabindex="0" data-tip="${esc(p.tip)}"><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="12"/><circle class="dot-mark ${p.tone || 'c1'}" cx="${X(p.x)}" cy="${Y(p.y)}" r="5"/></g>`).join('')}
  </svg>${opts.caption ? `<figcaption class="small muted">${opts.caption}</figcaption>` : ''}</figure>`;
}
/** Stacked columns. series: [{ name, tone, values }]. */
export function stackChart(labels, series, opts = {}) { const W = opts.w || W0;
  const H = opts.h || 220, pad = { l: 52, r: 8, t: 12, b: 26 }; const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = niceMax(Math.max(...totals, 0)); const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const slot = iw / Math.max(1, labels.length); const bw = Math.min(40, slot - 6);
  const y = (v) => pad.t + ih - (v / max) * ih; const fmt = opts.fmt || (v => Math.round(v));
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">
    ${[0, max / 2, max].map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    ${labels.map((l, i) => { const x = pad.l + slot * i + (slot - bw) / 2; let acc = 0; const segs = series.map((s, si) => { const v = s.values[i] || 0; if (!v) return ''; const top = acc + v; const y0 = y(acc), y1 = y(top); acc = top; const last = series.slice(si + 1).every(z => !(z.values[i] || 0)); const h = Math.max(1, y0 - y1 - 2);
        return `<g class="mark" tabindex="0" data-tip="${esc(`${l} · ${s.name}: ${fmt(v)}`)}"><rect class="bar-mark ${s.tone}" x="${x}" y="${y1}" width="${bw}" height="${h}" rx="${last ? 4 : 0}"/></g>`; }).join('');
      return `${segs}<text class="axis" x="${pad.l + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; }).join('')}
    <line class="base" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>
  </svg>${legend(series)}</figure>`;
}
/** A donut. data: [{ label, value, tone }]. The middle shows the total (or opts.center). */
export function donut(data, opts = {}) {
  const tot = data.reduce((a, d) => a + Math.max(0, d.value), 0); const R = 90, r = 66, C = 100; let a0 = -Math.PI / 2; const fmt = opts.fmt || (v => Math.round(v));
  const arc = (a, b) => { const big = b - a > Math.PI ? 1 : 0; const p = (ang, rr) => `${(C + rr * Math.cos(ang)).toFixed(2)},${(C + rr * Math.sin(ang)).toFixed(2)}`; return `M${p(a, R)} A${R},${R} 0 ${big} 1 ${p(b, R)} L${p(b, r)} A${r},${r} 0 ${big} 0 ${p(a, r)} Z`; };
  const segs = tot ? data.filter(d => d.value > 0).map(d => { const span = (d.value / tot) * Math.PI * 2; const b = a0 + span - (data.length > 1 ? 0.025 : 0.0001); const path = span >= Math.PI * 2 - 0.001 ? `M${C},${C - R} A${R},${R} 0 1 1 ${C - 0.01},${C - R} L${C - 0.01},${C - r} A${r},${r} 0 1 0 ${C},${C - r} Z` : arc(a0, Math.max(a0 + 0.001, b)); a0 += span; return `<g class="mark" tabindex="0" data-tip="${esc(`${d.label}: ${fmt(d.value)} (${Math.round(d.value / tot * 100)}%)`)}"><path class="donut-seg ${d.tone || 'c1'}" d="${path}"/></g>`; }).join('') : `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" class="donut-empty" stroke-width="${R - r}"/>`;
  return `<figure class="chart donut"><div class="donut-wrap"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(opts.label || 'Breakdown')}">${segs}</svg><div class="donut-mid"><b class="num">${opts.center ?? esc(fmt(tot))}</b><span>${esc(opts.sub || 'total')}</span></div></div>
    <ul class="donut-key">${data.filter(d => d.value > 0).map(d => `<li><i class="key ${d.tone || 'c1'}"></i><span>${esc(d.label)}</span><b class="num">${esc(fmt(d.value))}</b></li>`).join('')}</ul></figure>`;
}
/** A radar (spider) chart. axes: [[key, label]]; series: [{ name, tone, values: {key: 0..max} }]. */
export function radarChart(axes, series, opts = {}) {
  const max = opts.max || 10, C = 160, R = 112, n = axes.length; const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i, v) => [C + Math.cos(ang(i)) * R * (v / max), C + Math.sin(ang(i)) * R * (v / max)];
  const ring = (k) => axes.map((_, i) => pt(i, max * k).map(v => v.toFixed(1)).join(',')).join(' ');
  return `<figure class="chart radar-chart"><svg viewBox="0 0 320 320" role="img" aria-label="${esc(opts.label || 'Life score')}">
    ${[0.25, 0.5, 0.75, 1].map(k => `<polygon class="radar-ring" points="${ring(k)}"/>`).join('')}
    ${axes.map((_, i) => { const [x, y] = pt(i, max); return `<line class="radar-spoke" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
    ${series.map((s, si) => `<polygon class="radar-area ${s.tone} ${si ? 'prev' : ''}" points="${axes.map(([k], i) => pt(i, Number(s.values[k]) || 0).map(v => v.toFixed(1)).join(',')).join(' ')}"/>`).reverse().join('')}
    ${series.slice(0, 1).map(s => axes.map(([k, l], i) => { const [x, y] = pt(i, Number(s.values[k]) || 0); return `<g class="mark" tabindex="0" data-tip="${esc(`${l}: ${Number(s.values[k]) || 0} / ${max}`)}"><circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/><circle class="dot-mark ${s.tone}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/></g>`; }).join('')).join('')}
    ${axes.map(([, l], i) => { const [x, y] = pt(i, max * 1.2); return `<text class="radar-label" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(x - C) < 8 ? 'middle' : x > C ? 'start' : 'end'}">${esc(l)}</text>`; }).join('')}
  </svg>${series.length > 1 ? legend(series) : ''}</figure>`;
}
export const legend = (series) => `<div class="legend">${series.map(s => `<span><i class="key ${s.tone}"></i>${esc(s.name)}</span>`).join('')}</div>`;
// Tooltip for any [data-tip] mark.
let tipEl = null;
const showTip = (e) => { const m = e.target.closest?.('[data-tip]'); if (!m) { tipEl?.remove(); tipEl = null; return; } if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); } tipEl.textContent = m.dataset.tip; const r = m.getBoundingClientRect(); tipEl.style.left = Math.min(innerWidth - 12, Math.max(12, r.left + r.width / 2)) + 'px'; tipEl.style.top = (r.top - 8) + 'px'; };
document.addEventListener('pointerover', showTip); document.addEventListener('focusin', showTip);
document.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-tip]')) { tipEl?.remove(); tipEl = null; } });
document.addEventListener('scroll', () => { tipEl?.remove(); tipEl = null; }, true);

// ---------------------------------------------------------------------
// Quick brain dump: get it out of your head from anywhere (press D)
// ---------------------------------------------------------------------
export const jotBox = (id = 'jot-side') => `<form class="dumpbox" data-form="jot" autocomplete="off"><label class="sr-only" for="${id}">Brain dump</label>
  <input class="input" id="${id}" name="thought" maxlength="300" placeholder="Dump a thought… (D)" enterkeyhint="send"><button class="icon-btn" aria-label="Add to the brain dump">${icon('brain')}</button></form>`;
FORMS.jot = async (f) => {
  const v = f.elements.thought.value.trim(); if (!v) return;
  try {
    await save({ kind: 'dump', title: v.slice(0, 300), status: 'inbox', cat: /\$|buy|order|get a new/i.test(v) ? 'buy' : 'task' }); f.reset(); buzz(10);
    toast('Dumped. The Sorting Hat will deal with it later.', { ms: 2400 });
    if (document.activeElement?.form !== f) rerender(); else { const keep = f.querySelector('input').id; rerender(); document.getElementById(keep)?.focus(); }
  } catch (e) { fail(e); }
};
export function openJot() {
  openModal(modalShell('Brain dump', `<p class="small muted" style="margin-top:0">Whatever just popped into your head: a task, a worry, an idea, something to buy. Type it and press Enter. Keep going. Sort it later.</p>${jotBox('jot-modal')}
    <p class="small muted"><a href="#/dump">Open the Sorting Hat</a> (${plural(items('dump').filter(d => (d.status || 'inbox') === 'inbox').length, 'thing')} not sorted)</p>`), { size: 'narrow' });
}
ACTIONS.jot = () => openJot();

/** A window: a card with traffic-light dots and a title bar, like a desktop app. */
export const win = (title, body, opts = {}) => `<section class="win ${opts.cls || ''}" ${opts.id ? `id="${opts.id}"` : ''}>
  <header class="win-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><h2>${title}</h2>${opts.actions ? `<div class="win-actions">${opts.actions}</div>` : ''}</header>
  <div class="win-body">${body}</div></section>`;
/** A blue folder tile with a label (used as big navigation buttons). */
export const folderTile = (href, label, sub = '', opts = {}) => `<a class="folder-tile ${opts.cls || ''}" href="${href}"><span class="ft-folder" aria-hidden="true">${opts.icon ? icon(opts.icon) : ''}</span><b>${esc(label)}</b>${sub ? `<small>${sub}</small>` : ''}</a>`;
/** An iMessage-style bubble. */
export const bubble = (text, opts = {}) => `<div class="bubble ${opts.mine ? 'mine' : ''}">${opts.who ? `<span class="b-who">${opts.who}</span>` : ''}<p>${text}</p>${opts.meta ? `<small>${opts.meta}</small>` : ''}</div>`;

export function download(name, content, type) { if (demoGate('export')) return; const b = content instanceof Blob ? content : new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
/** The big one: paper confetti across the whole screen, plus a chime. */
export function confetti(n = 140) {
  chime([523.25, 659.25, 783.99, 1046.5]);
  if (calm()) return; const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['var(--yellow)', 'var(--lav)', 'var(--pink)', 'var(--mint)', 'var(--sky)', '#FFFFFF'];
  for (let i = 0; i < n; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + 'vw'; p.style.background = cols[i % cols.length]; p.style.setProperty('--d', (1.8 + Math.random() * 1.6).toFixed(2) + 's'); p.style.setProperty('--x', (Math.random() * 30 - 15).toFixed(0) + 'vw'); p.style.setProperty('--r', (Math.random() * 1080).toFixed(0) + 'deg'); p.style.animationDelay = (Math.random() * 0.35).toFixed(2) + 's'; if (i % 3 === 0) p.style.borderRadius = '50%'; box.appendChild(p); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}
/** A short chime, made in the browser (no sound files). */
export function chime(notes = [659.25, 880], gap = 0.11) {
  if (S.settings.sound === false) return;
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; const t0 = ctx.currentTime + i * gap; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9); o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 1); });
  } catch { /* no audio */ }
}
/** A tilted pill sticker. */
export const sticker = (text, tone = 'flame', rot = -6) => `<span class="sticker ${tone}" style="--rot:${rot}deg">${esc(text)}</span>`;
/** A paper note held by a binder clip. tone tints the clip. */
export const clipNote = (body, opts = {}) => `<div class="clip-note ${opts.cls || ''}" style="--tilt:${opts.tilt ?? -1.5}deg">${binder(opts.tone || 'flame')}<div class="cn-paper">${body}</div></div>`;
export const binder = (tone = 'flame') => `<svg class="binder ${tone}" viewBox="0 0 60 46" aria-hidden="true"><path class="bd-wire" d="M19 28 L15 7 Q14.5 3.5 18 3.5 L25 3.5 Q28.5 3.5 27.5 7 L24 28 M41 28 L45 7 Q45.5 3.5 42 3.5 L35 3.5 Q31.5 3.5 32.5 7 L36 28" fill="none" stroke-width="2.6" stroke-linejoin="round"/><path class="bd-body" d="M9 24 H51 L47 44 H13 Z" stroke-linejoin="round"/><rect class="bd-shine" x="14" y="28" width="32" height="3" rx="1.5"/></svg>`;
/** A chrome star, for decoration. */
export const star = (cls = '', style = '') => `<svg class="cstar ${cls}" style="${style}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="cs-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#B9B4AE"/><stop offset=".6" stop-color="#F4F2EE"/><stop offset="1" stop-color="#6E6862"/></linearGradient></defs><path d="M20 2.5l5.1 11.2 12.2 1.3-9.1 8.2 2.6 12-10.8-6.2-10.8 6.2 2.6-12-9.1-8.2 12.2-1.3z" fill="url(#cs-g)" stroke="#57514B" stroke-width="1" stroke-linejoin="round"/></svg>`;
/** A scalloped badge with a big number (like a seal). */
export const seal = (big, small, tone = 'flame') => `<span class="seal ${tone}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 46 : 50; return `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; }).join(' ')}Z"/></svg><b class="num">${big}</b><small>${esc(small)}</small></span>`;
/** An empty photo slot that invites an upload. */
export const photoSlot = (opts = {}) => `<label class="photo-slot ${opts.cls || ''}" ${opts.drop != null ? `data-drop="${esc(opts.drop)}"` : ''} ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''} ${opts.data || ''}>${icon('camera')}<span>${esc(opts.label || '[Upload Aesthetic Photo Here]')}</span>${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}<input type="file" accept="image/*" ${opts.single ? '' : 'multiple'} class="sr-only" data-bind="photo-pick" ${opts.item ? `data-item="${esc(opts.item)}"` : ''} ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''} ${opts.data || ''}></label>`;
/** An iPhone-style alert: a title, a line and one button. */
export const iosAlert = (title, text, btn = '', opts = {}) => `<div class="ios-alert ${opts.cls || ''}" role="note"><div class="ia-body"><b>${esc(title)}</b><p>${text}</p></div>${btn ? `<div class="ia-btns">${btn}</div>` : ''}</div>`;
/** A message bubble, like a text. */
export const imsg = (text, opts = {}) => `<div class="imsg ${opts.mine === false ? 'theirs' : ''}"><p>${text}</p>${opts.meta ? `<small>${esc(opts.meta)}</small>` : ''}</div>`;
/** A paperclip. */
export const paperclip = (cls = '') => `<svg class="clip ${cls}" viewBox="0 0 24 60" aria-hidden="true"><path d="M8 50V12a5 5 0 0 1 10 0v34a8 8 0 0 1-16 0V16" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>`;
/** A desktop-style window with traffic lights. */
export const winCard = (title, body, opts = {}) => `<section class="mwin ${opts.cls || ''}" ${opts.label ? `aria-label="${esc(opts.label)}"` : ''}><header class="mw-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><h2>${title}</h2>${opts.actions ? `<div class="mw-actions">${opts.actions}</div>` : ''}</header><div class="mw-body">${body}</div></section>`;
/** Grouped columns. labels: [..]; series: [{ name, tone, values }]. */
export function groupBars(labels, series, opts = {}) {
  const W = opts.w || 640, H = opts.h || 220, pad = { l: 52, r: 8, t: 12, b: 26 }; const all = series.flatMap(s => s.values);
  const nice = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const max = nice(Math.max(...all, 0)); const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const slot = iw / Math.max(1, labels.length); const bw = Math.min(22, (slot - 10) / series.length);
  const y = (v) => pad.t + ih - (v / max) * ih; const fmt = opts.fmt || (v => Math.round(v));
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}">
    ${[0, max / 2, max].map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    ${labels.map((l, i) => { const x0 = pad.l + slot * i + (slot - bw * series.length - 3 * (series.length - 1)) / 2; return series.map((s, si) => { const v = s.values[i] || 0; const h = Math.max(v > 0 ? 2 : 0, (v / max) * ih); const x = x0 + si * (bw + 3);
      return `<g class="mark" tabindex="0" data-tip="${esc(`${l} · ${s.name}: ${fmt(v)}`)}"><rect class="bar-mark ${s.tone}" x="${x.toFixed(1)}" y="${(y(0) - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2)}"/></g>`; }).join('') + `<text class="axis" x="${pad.l + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`; }).join('')}
    <line class="base" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/></svg>${legend(series)}</figure>`;
}
/** A big number with a small label underneath (the stats row). */
export const bigStat = (value, label, tone = '') => `<div class="bigstat ${tone}"><b class="num">${value}</b><span>${esc(label)}</span></div>`;

/** Two measures on one chart, each with its own axis (left and right).
 *  a, b: { name, tone, values, type: 'line'|'bar', min, max, fmt }. */
export function dualChart(labels, a, b, opts = {}) {
  const W = opts.w || W0, H = opts.h || 220, pad = { l: 44, r: 50, t: 14, b: 26 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b; const n = labels.length; const slot = iw / Math.max(1, n);
  const scale = (s) => { const vals = s.values.filter(v => v != null); const min = s.min ?? 0; const max = s.max ?? niceMax(Math.max(...vals, 0)); return { min, max, y: (v) => pad.t + ih - ((v - min) / (max - min || 1)) * ih, fmt: s.fmt || (v => Math.round(v * 10) / 10) }; };
  const A = scale(a), B = scale(b); const cx = (i) => pad.l + slot * i + slot / 2;
  const draw = (s, sc) => {
    if (s.type === 'bar') { const bw = Math.min(26, slot - 4); return s.values.map((v, i) => { if (!v) return ''; const top = sc.y(v), h = sc.y(sc.min) - top; return `<rect class="bar-mark ${s.tone} soft" x="${(cx(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2, h).toFixed(1)}" rx="4"/>`; }).join(''); }
    let d = '', pen = false; s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)},${sc.y(v).toFixed(1)} `; pen = true; });
    return `<path class="line-mark ${s.tone}" d="${d}"/>${s.values.map((v, i) => (v == null ? '' : `<circle class="dot-mark ${s.tone}" cx="${cx(i).toFixed(1)}" cy="${sc.y(v).toFixed(1)}" r="3.5"/>`)).join('')}`;
  };
  const tk = [0, 0.5, 1];
  return `<figure class="chart dual"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || `${a.name} and ${b.name}`)}">
    ${tk.map(k => { const va = A.min + (A.max - A.min) * k, vb = B.min + (B.max - B.min) * k; const yy = A.y(va); return `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/><text class="axis ${a.tone}-t" x="${pad.l - 6}" y="${yy + 4}" text-anchor="end">${esc(A.fmt(va))}</text><text class="axis ${b.tone}-t" x="${W - pad.r + 6}" y="${yy + 4}">${esc(B.fmt(vb))}</text>`; }).join('')}
    ${labels.map((l, i) => (n <= 16 || i % Math.ceil(n / 10) === 0 ? `<text class="axis" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '')).join('')}
    ${a.type === 'bar' ? draw(a, A) + draw(b, B) : b.type === 'bar' ? draw(b, B) + draw(a, A) : draw(a, A) + draw(b, B)}
    ${labels.map((l, i) => `<g class="mark" tabindex="0" data-tip="${esc(`${l} · ${a.name}: ${a.values[i] == null ? '—' : A.fmt(a.values[i])} · ${b.name}: ${b.values[i] == null ? '—' : B.fmt(b.values[i])}`)}"><rect class="hit" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${ih}"/></g>`).join('')}
  </svg>${legend([{ name: `${a.name} (left)`, tone: a.tone }, { name: `${b.name} (right)`, tone: b.tone }])}${opts.caption ? `<figcaption class="small muted">${opts.caption}</figcaption>` : ''}</figure>`;
}

// ---------------------------------------------------------------------
// Drag with a finger or a mouse (pointer events, so it works on phones too).
// dragCards({ sel, handle, onDrop(id, zoneEl, x, y), zones }) — a ghost follows the pointer and
// the zone under it (any element matching zones) is highlighted.
// ---------------------------------------------------------------------
export function dragCards({ sel, zones, onDrop, idAttr = 'id' }) {
  let st = null;
  const zoneAt = (x, y) => { const el = document.elementFromPoint(x, y); return el?.closest?.(zones) || null; };
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest?.(sel); if (!c || e.button > 0 || e.target.closest('input, select, textarea')) return;
    if (e.pointerType !== 'mouse' && !e.target.closest('.grip')) return; // on touch screens, drag by the grip so the page can still scroll
    st = { c, id: c.dataset[idAttr], x0: e.clientX, y0: e.clientY, on: false, pid: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.pid) return; const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.on) { if (Math.hypot(dx, dy) < 7) return; st.on = true; const r = st.c.getBoundingClientRect(); st.ox = st.x0 - r.left; st.oy = st.y0 - r.top;
      st.g = st.c.cloneNode(true); st.g.classList.add('drag-ghost'); st.g.style.width = r.width + 'px'; document.body.appendChild(st.g); st.c.classList.add('dragging'); document.body.classList.add('is-dragging'); }
    e.preventDefault(); st.g.style.transform = `translate(${e.clientX - st.ox}px, ${e.clientY - st.oy}px) rotate(3deg)`;
    st.g.style.visibility = 'hidden'; const z = zoneAt(e.clientX, e.clientY); st.g.style.visibility = '';
    document.querySelectorAll('.drop-over').forEach(x => x !== z && x.classList.remove('drop-over')); z?.classList.add('drop-over');
  }, { passive: false });
  const end = (e) => {
    if (!st || e.pointerId !== st.pid) return; const s = st; st = null; if (!s.on) return;
    s.g.style.visibility = 'hidden'; const z = zoneAt(e.clientX, e.clientY); s.g.remove(); s.c.classList.remove('dragging'); document.body.classList.remove('is-dragging');
    document.querySelectorAll('.drop-over').forEach(x => x.classList.remove('drop-over'));
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', swallow, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 50);
    if (z) onDrop(s.id, z, e.clientX, e.clientY, s.c);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', (e) => { if (st && st.pid === e.pointerId) { st.g?.remove(); st.c.classList.remove('dragging'); document.body.classList.remove('is-dragging'); st = null; } });
}

/** A scale of five buttons (energy, mood, focus). */
export const fiveDots = (action, cur, label, extra = '') => `<div class="five" role="group" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-action="${action}" data-v="${n}" ${extra} aria-pressed="${Number(cur) === n}" aria-label="${esc(label)} ${n} of 5">${n}</button>`).join('')}</div>`;

/** Little burst and a message, for finishing things. */
export function celebrate(el, msg) { pop(el, 18); buzz([10, 40, 10]); if (msg) toast(msg); }
export { today, closeModal };
