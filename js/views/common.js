// Shared pieces for every hub, in the atelier style: a sparkle pill and a big serif title on every
// page, section tabs along the top, folder cards with an ink outline and a hard shadow, framed
// photos, tags, little rewards, and the quick-capture pop-up.
import { S, esc, icon, ACTIONS, FORMS, rerender, route, fail, toast, today, moneyWhole, pop, buzz, openModal, closeModal, plural, calm, sparkle } from '../core.js';
import { saveSettings, confetti, chime } from '../ui.js';
import { HUBS, HUB_TABS } from '../hubs.js';
import { items, save, patch, remove, sortBy, byId, dget, addBtn, EXP_CATS, INC_CATS, PRIORITIES, PLAN_CATEGORIES, APPOINTMENT_TYPES, normalizeHexColor } from '../kinds.js';
import { img, photosOf, addPhotos, PICK_HOOKS } from '../photos.js';

export const D = () => S.settings.data || {};
export const saveData = (p) => saveSettings({ data: { ...D(), ...p } });
/** An amount that "Hide exact balances" can blur. */
export const amt = (v, cls = '') => `<span class="amt ${cls}">${esc(moneyWhole(v))}</span>`;
export const emptyNote = (text, action = '') => `<div class="empty-note"><p>${text}</p>${action}</div>`;
export const seg = (action, list, cur, label, extra = '') => `<div class="segs" role="group" aria-label="${esc(label)}">${list.map(([v, l]) => `<button type="button" data-action="${action}" data-v="${esc(v)}" ${extra} aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
export const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(1, a / b)) : 0);
export const meter = (p, tone = 'c1', label = '') => `<span class="meter t-${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}" ${label ? `aria-label="${esc(label)}"` : ''}><i style="width:${(p * 100).toFixed(1)}%"></i></span>`;

// ---------------------------------------------------------------------
// Paper furniture
// ---------------------------------------------------------------------
/** A push pin, a binder clip, a strip of washi tape. */
export const pin = (cls = '') => `<svg class="pin ${cls}" viewBox="0 0 40 52" aria-hidden="true"><ellipse class="pin-shadow" cx="24" cy="47" rx="9" ry="3"/><path class="pin-needle" d="M20 30 L23 48" /><path class="pin-body" d="M11 8 Q20 3 29 8 L27 18 Q33 21 33 26 Q20 33 7 26 Q7 21 13 18 Z"/><ellipse class="pin-top" cx="20" cy="7.5" rx="9" ry="4"/><path class="pin-shine" d="M14 9 Q17 7 20 7.5"/></svg>`;
export const binder = (cls = '') => `<svg class="binder ${cls}" viewBox="0 0 64 70" aria-hidden="true"><path class="bd-wire" d="M22 40 L16 10 Q15 4 21 4 L27 4 Q32 4 30 10 L27 34 M42 40 L48 10 Q49 4 43 4 L37 4 Q32 4 34 10 L37 34"/><path class="bd-body" d="M10 38 H54 L50 66 H14 Z"/><path class="bd-lip" d="M10 38 H54 L53 44 H11 Z"/></svg>`;
export const tape = (tone = 'blue', cls = '') => `<i class="tape tp-${tone} ${cls}" aria-hidden="true"></i>`;
/** A round postmark: text around a circle, with wavy cancellation lines. */
export const postmark = (top, mid, cls = '') => `<span class="postmark ${cls}" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><path id="pm-arc" d="M60 60 m-42 0 a42 42 0 1 1 84 0 a42 42 0 1 1 -84 0"/></defs><circle cx="60" cy="60" r="54"/><circle cx="60" cy="60" r="34"/><text><textPath href="#pm-arc" startOffset="0">${esc(top)}</textPath></text></svg><b>${esc(mid)}</b></span>`;
/** A wax seal with a letter in it. */
export const seal = (ch = 'C', cls = '') => `<span class="wax ${cls}" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="${Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; const r = i % 2 ? 46 : 42 + (i % 3); return `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; }).join(' ')}Z"/><circle cx="50" cy="50" r="31"/></svg><b>${esc(ch)}</b></span>`;
/** A highlighter label, like a strip of coloured paper. */
export const label = (text, tone = 'butter', cls = '') => `<span class="hilite hl-${tone} ${cls}">${esc(text)}</span>`;
/** A hub's badge: its icon on a pinstriped tile in the hub's colour. */
export const TONES = { yellow: 't3', purple: 't5', blue: 't1', green: 't4', brown: 't6', pink: 't2', orange: 't6', gray: 't1', red: 't2' };
export const hubTone = (id) => { const h = HUBS.find(x => x[0] === id); return h ? TONES[h[4]] || 't1' : 't1'; };
export const badge = (id, cls = '') => { const h = HUBS.find(x => x[0] === id); return `<span class="hbadge ${hubTone(id)} ${cls}" aria-hidden="true">${icon(h ? h[2] : 'sparkle')}</span>`; };
/** Kept for older call sites: a hub badge stands in for the folder. */
export const macFolder = (cls = '') => `<span class="hbadge t1 ${cls}" aria-hidden="true">${icon('sparkle')}</span>`;

/** A page header, atelier-style: a sparkle pill with the kicker, a big serif title with one word in
 * italic colour, the description underneath, and the page's main buttons on the right. */
export const hubHead = (n, kicker, title, lede = '', actions = '') => {
  const h = HUBS.find(x => x[0] === route().name); const tone = h ? TONES[h[4]] || 't2' : 't2';
  return `<header class="hub-head page-head"><div class="ph-text"><span class="kicker ${tone}">${sparkle()}${n ? `<b>No. ${String(n).padStart(2, '0')}</b><i aria-hidden="true">·</i>` : ''}<span>${esc(kicker)}</span></span>
    <h1 class="hh-title">${title}</h1>${lede ? `<p class="hh-lede">${lede}</p>` : ''}</div>${actions ? `<div class="hh-actions">${actions}</div>` : ''}</header>`;
};
/** Section tabs: a row of underlined tabs, like the pages of a pillar. */
export const folderTabs = (route, list, cur) => `<nav class="ftabs tabs" aria-label="Seções">${list.map(([id, l]) => `<a href="#/${route}?tab=${id}" class="ftab" ${cur === id ? 'aria-current="page"' : ''}><span>${esc(l)}</span></a>`).join('')}</nav>`;
export const pickTab = (list, want) => (list.some(t => t[0] === want) ? want : list[0][0]);
/** A folder card. opts: cls, tone (t1–t6), kicker, link, id. (pin, clip, tape and stamp stay quiet here.) */
export const card = (title, body, opts = {}) => `<section class="card ${opts.tone ? `tone ${opts.tone}` : ''} ${opts.lined ? 'lined' : ''} ${opts.cls || ''}" ${opts.id ? `id="${opts.id}"` : ''}>${title ? `<header class="card-head"><div class="ch-t">${opts.kicker ? `<span class="label">${esc(opts.kicker)}</span>` : ''}<h2>${title}</h2></div>${opts.link || ''}</header>` : ''}${body}</section>`;
export const twoCol = (a, b, cls = '') => `<div class="two-col ${cls}">${a}${b}</div>`;
export const threeCol = (a, b, c, cls = '') => `<div class="three-col ${cls}">${a}${b}${c}</div>`;

// ---------------------------------------------------------------------
// Photos: a drop zone, a polaroid, a phone-story frame, a masonry wall
// ---------------------------------------------------------------------
/** An upload slot. hook: a PICK_HOOKS name, or item: an item id to add photos to. */
export const photoDrop = (opts = {}) => `<label class="pdrop ${opts.cls || ''}" data-drop="${esc(opts.item || '')}" ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''}><span class="pd-ic">${icon(opts.icon || 'camera')}</span><b>${esc(opts.label || 'Add a photo')}</b>${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}<input type="file" accept="${opts.files ? 'image/*,application/pdf' : 'image/*'}" ${opts.multiple ? 'multiple' : ''} class="sr-only" data-bind="photo-pick" ${opts.hook ? `data-hook="${esc(opts.hook)}"` : ''} ${opts.item ? `data-item="${esc(opts.item)}"` : ''}></label>`;
/** A polaroid with a handwritten caption. p: a photo or null. */
export const polaroid = (p, caption = '', opts = {}) => `<figure class="polaroid ${opts.cls || ''}" style="--tilt:${opts.tilt ?? -2}deg">${opts.clip ? binder() : ''}${opts.pin ? pin() : ''}${opts.tape ? tape(opts.tape) : ''}<div class="pol-img">${p ? `<button class="pol-open" data-action="photo-view" data-id="${esc(p.id)}" ${opts.group ? `data-group="${esc(opts.group)}"` : ''} aria-label="Open photo${caption ? `: ${esc(caption)}` : ''}">${img(p, { ratio: false, alt: caption || '' })}</button>` : (opts.empty || '')}</div>${caption || opts.sub ? `<figcaption>${esc(caption)}${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}</figcaption>` : ''}${opts.tools || ''}</figure>`;
/** A phone-story frame (progress bars on top, a reply bar at the bottom) around a photo. */
export const storyFrame = (p, opts = {}) => `<figure class="story ${opts.cls || ''}">${opts.tape !== false ? tape('blue', 'st-tape') : ''}<div class="st-bars" aria-hidden="true">${Array.from({ length: opts.bars || 3 }, (_, i) => `<i class="${i < (opts.at ?? 1) ? 'on' : ''}"></i>`).join('')}</div><span class="st-dot" aria-hidden="true"></span>
  <div class="st-img">${p ? `<button class="pol-open" data-action="photo-view" data-id="${esc(p.id)}" ${opts.group ? `data-group="${esc(opts.group)}"` : ''} aria-label="Open photo">${img(p, { ratio: false, alt: opts.alt || '' })}</button>` : (opts.empty || '')}</div>
  <div class="st-foot" aria-hidden="true"><span></span>${icon('heart')}${icon('paperPlane')}</div>${opts.tools || ''}</figure>`;
/** Photos as a masonry wall of tiles. list: [{ p, cap, id }]. */
export const masonry = (list, group, extra = '', cls = '') => `<div class="masonry ${cls}">${list.map(({ p, cap, id, sub }) => `<figure class="m-tile">${p ? `<button class="pol-open" data-action="photo-view" data-id="${esc(p.id)}" data-group="${esc(group)}" aria-label="Open ${esc(cap || 'photo')}">${img(p, { ratio: false, alt: cap || '' })}</button>` : ''}${cap || id ? `<figcaption>${id ? `<button class="link-plain" data-action="edit" data-id="${esc(id)}">${esc(cap || 'Add a caption')}</button>` : esc(cap)}${sub ? `<small>${esc(sub)}</small>` : ''}</figcaption>` : ''}</figure>`).join('')}${extra}</div>`;
/** Make a fresh item for each picked file, with its photo. */
export async function itemsFromFiles(files, kind, extra = {}) {
  for (const f of files) { try { const x = await save({ kind, title: '', ...extra, data: { ...(extra.data || {}) } }); await addPhotos(x.id, [f]); } catch (e) { fail(e); } }
}

// ---------------------------------------------------------------------
// Moods and stars
// ---------------------------------------------------------------------
export const FACES = ['', 'smileySad', 'smileyMeh', 'smiley', 'smileyHappy', 'smileyWink'];
export const FACE_WORDS = ['', 'Pesado', 'Baixo', 'Neutro', 'Bem', 'Muito bem'];
export const faces = (action, cur, extra = '') => `<div class="faces" role="group" aria-label="Humor">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="face f${n}" data-action="${action}" data-v="${n}" ${extra} aria-pressed="${Number(cur) === n}" aria-label="${FACE_WORDS[n]}">${icon(FACES[n])}</button>`).join('')}</div>`;
export const stars = (n, max = 5, ic = 'starFill') => `<span class="stars" aria-label="${n || 0} of ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icon(ic)}</i>`).join('')}</span>`;

// ---------------------------------------------------------------------
// Small rewards
// ---------------------------------------------------------------------
export async function sparkleWin(msg = '', el = null) {
  if (S.settings.decor !== false) { if (el) pop(el, 14); chime([784, 1046.5], 0.09); }
  buzz(10); if (msg) toast(msg, { ms: 2400 });
}
export const bigWin = (msg) => { if (S.settings.decor !== false) confetti(110); toast(msg, { ms: 4200 }); };

// ---------------------------------------------------------------------
// Quick capture from anywhere: the inbox, a task, a meeting, money in or out
// ---------------------------------------------------------------------
const QUICK = [['note', 'Entrada', 'inbox'], ['task', 'Tarefa', 'checkCircle'], ['block', 'Compromisso', 'clock'], ['txn', 'Dinheiro', 'wallet']];
const planCategoryField = () => `<label class="field"><span>Categoria</span><select class="input" name="category"><option value="">Sem categoria</option>${Object.entries(PLAN_CATEGORIES).map(([k, label]) => `<option value="${k}">${esc(label)}</option>`).join('')}</select></label>`;
const appointmentTypeField = () => `<label class="field"><span>Tipo de compromisso</span><select class="input" name="appointmentType" required>${Object.entries(APPOINTMENT_TYPES).map(([k, label]) => `<option value="${k}">${esc(label)}</option>`).join('')}</select></label>`;
const appointmentColorField = () => `<label class="field"><span>Cor do compromisso (HEX)</span><span class="hex-wrap"><input type="color" value="#BFDCF5" data-bind="block-color-picker" aria-label="Escolher cor do compromisso"><input class="input" type="text" name="color" value="#BFDCF5" maxlength="7" pattern="#?[0-9A-Fa-f]{6}" spellcheck="false" inputmode="text" data-bind="block-color-hex" required aria-label="Código hexadecimal da cor"></span></label>`;
export function openQuick(mode = 'note') {
  const tabs = `<div class="q-tabs" role="tablist">${QUICK.map(([v, l, ic]) => `<button type="button" role="tab" class="q-tab" data-action="quick" data-v="${v}" aria-selected="${mode === v}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`;
  let body = '';
  if (mode === 'block') body = `<form class="q-form" data-form="qblock" autocomplete="off"><label class="field"><span>Título</span><input class="input" name="title" maxlength="200" placeholder="Ex.: Reunião com cliente" autofocus></label>
    <div class="form-grid three"><label class="field"><span>Data</span><input class="input" type="date" name="day" value="${today()}"></label><label class="field"><span>Início</span><input class="input" type="time" name="start" value="09:00"></label><label class="field"><span>Término</span><input class="input" type="time" name="end" value="10:00"></label></div>${planCategoryField()}
    ${appointmentTypeField()}${appointmentColorField()}<button class="btn solid block">Adicionar à agenda</button></form>`;
  else if (mode === 'txn') body = `<form class="q-form" data-form="qtxn" autocomplete="off"><div class="q-io" role="radiogroup" aria-label="Entrada ou saída"><label><input type="radio" name="io" value="out" checked><span>Despesa</span></label><label><input type="radio" name="io" value="in"><span>Receita</span></label></div><label class="field"><span>Valor</span><input class="input big-in" name="amount" inputmode="decimal" placeholder="0" autofocus></label><label class="field"><span>Descrição</span><input class="input" name="title" maxlength="200" placeholder="Ex.: Café"></label>
    <label class="field"><span>Categoria</span><select class="input" name="cat">${Object.entries(EXP_CATS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}${Object.entries(INC_CATS).map(([k, l]) => `<option value="${k}">${esc(l)} (receita)</option>`).join('')}</select></label><button class="btn solid block">Registrar</button></form>`;
  else if (mode === 'task') body = `<form class="q-form" data-form="qtask" autocomplete="off"><label class="field"><span>Tarefa</span><input class="input" name="title" maxlength="200" placeholder="Ex.: Enviar a fatura" autofocus></label><div class="form-grid"><label class="field"><span>Data</span><input class="input" type="date" name="day" value="${today()}"></label><label class="field"><span>Prioridade</span><select class="input" name="cat">${Object.entries(PRIORITIES).map(([k, l]) => `<option value="${k}" ${k === 'med' ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>${planCategoryField()}
    <label class="field"><span>Projeto</span><select class="input" name="project"><option value="">Sem projeto</option>${items('project').filter(p => p.status !== 'done').map(p => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label><button class="btn solid block">Adicionar tarefa</button></form>`;
  else body = `<form class="q-form" data-form="qnote" autocomplete="off"><label class="sr-only" for="q-note">Caixa de entrada</label><textarea class="input dump-in" id="q-note" name="text" rows="5" maxlength="4000" placeholder="Uma ideia, tarefa ou link. Escreva um por linha e organize depois na Caixa de entrada." autofocus></textarea><button class="btn solid block">Salvar na caixa de entrada</button></form>`;
  openModal(`<div class="modal-inner quick-modal"><button type="button" class="icon-btn lm-close" data-action="close-modal" aria-label="Fechar">${icon('close')}</button><h2 class="q-h">Captura <em>rápida</em></h2>${tabs}${body}</div>`, { size: 'narrow' });
}
ACTIONS.quick = (b) => openQuick(b.dataset.v || 'note');
/** Lines into the inbox: links become links, "todo:" or "- [ ]" become tasks, the rest are thoughts. */
export async function capture(text) {
  const lines = String(text).split(/\r?\n/).map(t => t.trim()).filter(Boolean).slice(0, 40); let n = 0;
  for (const raw of lines) {
    const url = (raw.match(/https?:\/\/\S+/) || [])[0] || null; const isTask = /^(todo:|task:|-\s*\[\s?\]|\[\s?\])/i.test(raw);
    const title = raw.replace(/^(todo:|task:|-\s*\[\s?\]|\[\s?\])\s*/i, '').replace(url || '\u0000', '').trim() || url || raw;
    await save({ kind: 'capture', title: title.slice(0, 300), url, cat: url ? 'link' : isTask ? 'task' : 'thought', status: 'inbox' }); n++;
  }
  return n;
}
FORMS.qnote = async (f) => {
  const t = f.elements.text.value.trim(); if (!t) { toast('Escreva algo primeiro.', { error: true }); return; }
  try { const n = await capture(t); closeModal(); toast(`${plural(n, 'item', 'itens')} na caixa de entrada.`); rerender(); } catch (e) { fail(e); }
};
FORMS.qtask = async (f) => {
  const t = f.elements.title.value.trim(); if (!t) { toast('Digite o nome da tarefa.', { error: true }); return; }
  try { await save({ kind: 'task', title: t.slice(0, 300), day: f.elements.day.value || today(), cat: f.elements.cat.value || 'med', status: 'todo', parent_id: f.elements.project.value || null, data: { category: f.elements.category.value || null } }); closeModal(); toast('Tarefa adicionada.'); rerender(); } catch (e) { fail(e); }
};
FORMS.qblock = async (f) => {
  const t = f.elements.title.value.trim(); if (!t) { toast('Digite um título.', { error: true }); return; }
  const appointmentType = f.elements.appointmentType.value;
  if (!appointmentType) { toast('Selecione o tipo de compromisso.', { error: true }); return; }
  const color = normalizeHexColor(f.elements.color.value);
  if (!color) { toast('Informe uma cor hexadecimal válida, como #AABBCC.', { error: true }); return; }
  try { await save({ kind: 'block', title: t.slice(0, 200), day: f.elements.day.value || today(), cat: 'sky', data: { start: f.elements.start.value || '09:00', end: f.elements.end.value || '10:00', appointmentType, color, meet: appointmentType === 'reuniao', category: f.elements.category.value || null } }); closeModal(); toast('Adicionado à agenda.'); rerender(); } catch (e) { fail(e); }
};
FORMS.qtxn = async (f) => {
  const a = Number(String(f.elements.amount.value).replace(/[^\d.]/g, '')); if (!a) { toast('Informe um valor.', { error: true }); return; }
  const io = f.querySelector('input[name=io]:checked')?.value || 'out'; let cat = f.elements.cat.value; if (io === 'in' && !INC_CATS[cat]) cat = 'other'; if (io === 'out' && !EXP_CATS[cat]) cat = 'other';
  try { await save({ kind: 'txn', amount: a, title: f.elements.title.value.trim().slice(0, 200) || (io === 'in' ? 'Receita' : 'Despesa'), status: io, cat, day: today() }); closeModal(); toast(`${moneyWhole(a)} registrado.`); rerender(); } catch (e) { fail(e); }
};
export { plural, calm, addBtn, photosOf, img, PICK_HOOKS, byId, dget };
