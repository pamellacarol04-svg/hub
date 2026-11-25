// 13 · The Knowledge Vault: a web clipper and read-later inbox, a tagged library, a tag network and
// linked notes, and a swipe file.  14 · Time-Boxing & Deep Work: a Pomodoro timer that logs itself,
// today's time boxes, a deep work log, a time-waster audit and an energy map.  15 · The Memory
// Archive: a highlight reel (one photo a month), annual reflections, letters to your future self,
// and the year in numbers.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, parseDay, DAYS, MONTHS, MONTHS_LONG, fmtShort, fmtLong, daysBetween, plural, hhmm, hooks, $ } from '../core.js';
import { items, byId, save, patch, remove, dget, sortBy, addBtn, openEditor, CLIP_KINDS, CLIP_STATUS, SESSION_KINDS, WASTE_KINDS, BLOCK_TONES } from '../kinds.js';
import { photosOf, img, PICK_HOOKS, addPhotos } from '../photos.js';
import { barChart, chime, confetti } from '../ui.js';
import { GROUPS } from './lightbox.js';
import { D, saveData, card, hubHead, folderTabs, pickTab, emptyNote, photoDrop, masonry, label, meter, sparkleWin, bigWin, seg, pin, binder, tape, twoCol, polaroid, seal, postmark, amt, itemsFromFiles } from './common.js';
import * as C from '../hub.js';

// =====================================================================
// 13 · The Knowledge Vault
// =====================================================================
const KTABS = [['inbox', 'Ler depois'], ['library', 'Biblioteca'], ['network', 'Etiquetas e notas'], ['swipe', 'Arquivos inspiradores']];
ACTIONS['clip-st'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { status: b.dataset.v }); toast(b.dataset.v === 'read' ? 'Lido. Arquivado na biblioteca.' : 'Arquivado.'); rerender(); } catch (e) { fail(e); } };
ACTIONS['tag'] = (b) => { S.ui.tag = S.ui.tag === b.dataset.v ? null : b.dataset.v; if (b.dataset.go) location.hash = '#/knowledge?tab=library'; else rerender(); };
FORMS['clip-add'] = async (f) => { const u = f.elements.url.value.trim(); if (!u) return; const url = /^https?:\/\//i.test(u) ? u : `https://${u}`; let host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* fine */ }
  try { const x = await save({ kind: 'clip', title: f.elements.title.value.trim() || host || url, url, status: 'unread', cat: 'article', data: { tags: [] } }); f.reset(); toast('Capturado. Adicione etiquetas ou trechos importantes a qualquer momento.'); rerender(); openEditor('clip', x); } catch (e) { fail(e); } };
const clipLi = (c) => `<li class="clip-row ${esc(c.status || 'unread')}"><span class="cl-k">${esc(CLIP_KINDS[c.cat] || 'Link')}</span><div class="cl-b"><button class="link-plain" data-action="edit" data-id="${esc(c.id)}"><b>${esc(c.title)}</b></button>${c.url ? `<a class="small muted" href="${esc(c.url)}" target="_blank" rel="noopener">${esc((() => { try { return new URL(c.url).hostname.replace(/^www\./, ''); } catch { return c.url; } })())} ${icon('external')}</a>` : ''}${c.body ? `<p class="small">${esc(String(c.body).slice(0, 200))}</p>` : ''}<p class="tags">${C.tagsOf(c).map(t => `<button class="tg" data-action="tag" data-v="${esc(t)}" data-go="1">#${esc(t)}</button>`).join('')}</p></div>
  <span class="cl-acts">${c.status === 'unread' ? `<button class="btn sm" data-action="clip-st" data-id="${esc(c.id)}" data-v="read">${icon('check')} Lido</button>` : ''}${c.status !== 'archived' ? `<button class="icon-btn sm" data-action="clip-st" data-id="${esc(c.id)}" data-v="archived" aria-label="Arquivar">${icon('archive')}</button>` : ''}</span></li>`;
function tabInbox() {
  const l = sortBy(items('clip').filter(c => c.status === 'unread'), c => c.created_at, -1); const mark = `javascript:(function(){location.href='${location.origin}${location.pathname}#/knowledge?clip='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)})()`;
  return `${card(`Captura <em>da web</em>`, `<form class="clip-form" data-form="clip-add" autocomplete="off"><label class="sr-only" for="cl-u">Link</label><input class="input" id="cl-u" name="url" placeholder="Cole um link" inputmode="url"><label class="sr-only" for="cl-t">Título</label><input class="input" id="cl-t" name="title" placeholder="Título (opcional)"><button class="btn solid">${icon('paperclip')} Capturar</button></form>
    <p class="small muted">Ou arraste este botão para a barra de favoritos e toque nele em qualquer página para capturar: <a class="bookmarklet" href="${esc(mark)}" onclick="return false">${icon('paperclip')} Capturar no HUB</a></p>`, { cls: 'clipper', tape: 'blue' })}
  ${card(`Ler <em>depois</em> <small class="muted">${l.length}</small>`, l.length ? `<ul class="clips">${l.map(clipLi).join('')}</ul>` : emptyNote('Nada pendente. Capture algo que mereça sua atenção.'), { cls: 'lined' })}`;
}
function tabLibrary() {
  const t = S.ui.tag; const q = (S.ui.kq || '').toLowerCase(); const l = sortBy(items('clip').filter(c => c.status !== 'unread' && (!t || C.tagsOf(c).includes(t)) && (!q || `${c.title} ${c.body || ''} ${C.tagsOf(c).join(' ')}`.toLowerCase().includes(q))), c => c.created_at, -1); const g = C.tagGraph();
  return `<div class="okr-bar"><label class="sr-only" for="kq">Pesquisar na biblioteca</label><input class="input" id="kq" placeholder="Pesquisar na biblioteca" value="${esc(S.ui.kq || '')}" data-bind="kq">${addBtn('clip', 'Recorte', { cls: 'sm right', preset: { status: 'read', cat: 'article' } })}</div>
  <p class="tags tag-cloud">${g.nodes.map(n => `<button class="tg ${t === n.t ? 'on' : ''}" data-action="tag" data-v="${esc(n.t)}">#${esc(n.t)} <small>${n.n}</small></button>`).join('')}</p>
  ${card(t ? `#${esc(t)}` : `A <em>biblioteca</em>`, l.length ? `<ul class="clips">${l.map(clipLi).join('')}</ul>` : emptyNote('Nada por aqui ainda.'), { cls: 'lined' })}`;
}
BINDS.kq = (t) => { S.ui.kq = t.value; clearTimeout(BINDS.kq.t); BINDS.kq.t = setTimeout(() => { rerender(); const i = $('#kq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
ACTIONS['z-open'] = (b) => { const z = b.dataset.id ? byId(b.dataset.id) : items('zettel').find(x => x.title.toLowerCase() === String(b.dataset.v).toLowerCase()); if (z) { S.ui.zet = z.id; rerender(); } else openEditor('zettel', { kind: 'zettel', title: b.dataset.v, data: { tags: [] } }); };
const linkify = (body) => esc(body || '').replace(/\[\[([^\]]{1,120})\]\]/g, (_, t) => `<button class="zlink" data-action="z-open" data-v="${t}">${t}</button>`).replace(/\n/g, '<br>');
function tabNetwork() {
  const g = C.tagGraph(); const N = g.nodes.length; const W = 640, H = 420, R = 160; const pos = Object.fromEntries(g.nodes.map((n, i) => [n.t, [W / 2 + Math.cos(i / Math.max(1, N) * Math.PI * 2 - Math.PI / 2) * R * (i % 2 ? .78 : 1.08), H / 2 + Math.sin(i / Math.max(1, N) * Math.PI * 2 - Math.PI / 2) * R * (i % 2 ? .62 : .9)]]));
  const maxN = Math.max(1, ...g.nodes.map(n => n.n)); const zs = sortBy(items('zettel'), z => z.updated_at || z.created_at, -1); const open = (S.ui.zet && byId(S.ui.zet)) || zs[0];
  return `${card(`A rede de <em>etiquetas</em>`, N ? `<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="Como suas etiquetas se conectam">${g.edges.filter(e => pos[e.a] && pos[e.b]).map(e => `<line x1="${pos[e.a][0].toFixed(1)}" y1="${pos[e.a][1].toFixed(1)}" x2="${pos[e.b][0].toFixed(1)}" y2="${pos[e.b][1].toFixed(1)}" style="stroke-width:${Math.min(6, e.n * 1.3)}"/>`).join('')}
    ${g.nodes.map(n => `<g class="node" data-action="tag" data-v="${esc(n.t)}" data-go="1" role="button" tabindex="0" aria-label="#${esc(n.t)}, ${n.n}" transform="translate(${pos[n.t][0].toFixed(1)} ${pos[n.t][1].toFixed(1)})"><circle r="${(8 + n.n / maxN * 18).toFixed(1)}"/><text y="${(8 + n.n / maxN * 18 + 14).toFixed(1)}">#${esc(n.t)}</text></g>`).join('')}</svg><p class="small muted">Círculos maiores indicam etiquetas mais usadas; linhas unem etiquetas que aparecem juntas. Toque em uma etiqueta para ver tudo associado a ela.</p>` : emptyNote('Marque seus recortes e notas e a rede será criada.'), { pin: true })}
  <div class="notes-layout"><aside class="note-list">${addBtn('zettel', 'Nota', { cls: 'sm', preset: { data: { tags: [] } } })}<ul>${zs.map(z => `<li><button class="nl ${open?.id === z.id ? 'on' : ''}" data-action="z-open" data-id="${esc(z.id)}"><b>${esc(z.title)}</b><small>${C.linksIn(z.body).length} links · ${C.backlinks(z).length} referências</small></button></li>`).join('')}</ul></aside>
    ${open ? `<article class="zettel card lined">${binder()}<header class="card-head"><h2>${esc(open.title)}</h2><button class="btn sm ghost" data-action="edit" data-id="${esc(open.id)}">${icon('edit')} Editar</button></header><p class="z-body">${linkify(open.body)}</p><p class="tags">${C.tagsOf(open).map(t => `<button class="tg" data-action="tag" data-v="${esc(t)}" data-go="1">#${esc(t)}</button>`).join('')}</p>
      <h4>Referenciado por</h4>${C.backlinks(open).length ? `<p>${C.backlinks(open).map(z => `<button class="zlink" data-action="z-open" data-id="${esc(z.id)}">${esc(z.title)}</button>`).join(' ')}</p>` : '<p class="small muted">Nenhuma nota referencia esta ainda. Escreva [[' + esc(open.title) + ']] em outra nota.</p>'}</article>` : emptyNote('Uma ideia por nota. Vincule-as com [[colchetes duplos]].')}</div>`;
}
PICK_HOOKS.swipe = async (files) => { await itemsFromFiles(files, 'swipe', { data: { tags: [] } }); toast('Adicionado aos arquivos inspiradores.'); };
GROUPS.swipe = () => items('swipe').flatMap(x => photosOf(x.id));
function tabSwipe() {
  const l = sortBy(items('swipe'), x => x.created_at, -1);
  return `<p class="small muted">Capturas de telas bem feitas: anúncios, e-mails, layouts e legendas. Inspire-se como um artista.</p>${masonry(l.map(x => ({ p: photosOf(x.id)[0], cap: x.title || 'Por que funciona…', id: x.id, sub: C.tagsOf(x).map(t => '#' + t).join(' ') })).filter(x => x.p), 'swipe', photoDrop({ hook: 'swipe', label: 'Adicionar capturas', multiple: true, cls: 'm-add' }))}`;
}
function viewKnowledge(r) {
  const tab = pickTab(KTABS, r.tab);
  if (r.params.get('clip')) { const u = r.params.get('clip'); const t = r.params.get('title') || ''; history.replaceState(null, '', `${location.pathname}${location.search}#/knowledge?tab=inbox`); setTimeout(async () => { try { const x = await save({ kind: 'clip', title: t.slice(0, 300) || u, url: /^https?:/i.test(u) ? u : null, status: 'unread', cat: 'article', data: { tags: [] } }); toast('Clipped to HUB.'); rerender(); openEditor('clip', x); } catch (e) { fail(e); } }, 0); }
  return `${hubHead(13, 'O Cérebro Externo', 'O Cofre de <em>Conhecimento</em>', 'Capture, etiquete, vincule e encontre novamente. Tudo o que você lê e pensa em um só lugar pesquisável.', `<button class="btn sm solid" data-action="quick" data-v="note">${icon('inbox')} Capturar</button>`)}${folderTabs('knowledge', KTABS, tab)}<div class="tab-body">${{ inbox: tabInbox, library: tabLibrary, network: tabNetwork, swipe: tabSwipe }[tab]()}</div>`;
}

// =====================================================================
// 14 · Time-Boxing & Deep Work
// =====================================================================
const FTABS = [['timer', 'Pomodoro'], ['boxes', 'Blocos de tempo'], ['log', 'Registro de foco'], ['audit', 'Perdas de tempo'], ['energy', 'Mapa de energia']];
const P = () => (S.ui.pomo ||= { mode: 'focus', mins: Number(D().pomoMins) || 25, brk: Number(D().pomoBreak) || 5, start: null, paused: null, task: '', label: '' });
const left = () => { const p = P(); const total = (p.mode === 'focus' ? p.mins : p.brk) * 60000; if (!p.start) return total; const used = (p.paused || Date.now()) - p.start; return Math.max(0, total - used); };
const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
let tick = null;
async function finish() {
  const p = P(); clearInterval(tick); tick = null;
  if (p.mode === 'focus') { const t = p.task && byId(p.task); try { await save({ kind: 'session', title: p.label || t?.title || 'Foco', day: today(), num: p.mins, cat: 'pomodoro', parent_id: t?.id || null }); } catch (e) { fail(e); } if (S.settings.sound !== false) chime([659.25, 880, 1046.5], 0.14); if (S.settings.decor !== false) confetti(60); toast('Pomodoro concluído. Faça uma pausa.'); Object.assign(p, { mode: 'break', start: Date.now(), paused: null }); }
  else { toast('A pausa terminou. Pronto para mais um?'); Object.assign(p, { mode: 'focus', start: null, paused: null }); }
  rerender(); if (P().start) run();
}
function run() { clearInterval(tick); tick = setInterval(() => { const el = $('#pomo-left'); const ms = left(); if (el) el.textContent = mmss(ms); const r = $('#pomo-ring'); if (r) r.style.setProperty('--p', String(1 - ms / ((P().mode === 'focus' ? P().mins : P().brk) * 60000))); document.title = P().start && !P().paused ? `${mmss(ms)} · ${P().mode === 'focus' ? 'Foco' : 'Pausa'}` : document.title; if (ms <= 0) finish(); }, 500); }
ACTIONS['pomo'] = (b) => { const p = P(); const v = b.dataset.v;
  if (v === 'start') { p.start = Date.now(); p.paused = null; run(); } else if (v === 'pause') { p.paused = Date.now(); clearInterval(tick); } else if (v === 'resume') { p.start += Date.now() - p.paused; p.paused = null; run(); } else if (v === 'reset') { Object.assign(p, { start: null, paused: null, mode: 'focus' }); clearInterval(tick); } else if (v === 'skip') { finish(); return; }
  rerender(); };
BINDS['pomo-task'] = (t, type) => { if (type === 'change') P().task = t.value; };
BINDS['pomo-label'] = (t) => { P().label = t.value; };
BINDS['pomo-len'] = async (t, type) => { if (type !== 'change') return; const v = Math.max(5, Math.min(120, Number(t.value) || 25)); P().mins = v; await saveData({ pomoMins: v }); rerender(); };
function tabTimer() {
  const p = P(); const ms = left(); const running = p.start && !p.paused; const todays = items('session').filter(s => s.day === today() && s.cat === 'pomodoro'); const open = C.tasks().filter(t => t.status !== 'done' && C.taskDay(t) && C.taskDay(t) <= today());
  if (running && !tick) run();
  return `${twoCol(`<section class="pomo card ${p.mode}">${pin()}<span class="kick">${p.mode === 'focus' ? 'Foco' : 'Pausa'}</span><div class="pomo-ring" id="pomo-ring" style="--p:${1 - ms / ((p.mode === 'focus' ? p.mins : p.brk) * 60000)}"><b id="pomo-left" class="num" aria-live="off">${mmss(ms)}</b></div>
    <div class="pomo-btns">${!p.start ? `<button class="btn solid" data-action="pomo" data-v="start">${icon('play')} Iniciar</button>` : p.paused ? `<button class="btn solid" data-action="pomo" data-v="resume">${icon('play')} Retomar</button>` : `<button class="btn" data-action="pomo" data-v="pause">${icon('pause')} Pausar</button>`}${p.start ? `<button class="btn ghost" data-action="pomo" data-v="reset">${icon('undo')} Reiniciar</button><button class="btn ghost" data-action="pomo" data-v="skip">${icon('fwd')} ${p.mode === 'focus' ? 'Concluir agora' : 'Pular pausa'}</button>` : ''}</div>
    <div class="pomo-set"><label class="field"><span>Em que está trabalhando</span><select class="input" data-bind="pomo-task"><option value="">Outra atividade</option>${open.map(t => `<option value="${esc(t.id)}" ${p.task === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label><label class="field"><span>Ou dê um nome</span><input class="input" data-bind="pomo-label" value="${esc(p.label)}" placeholder="Ex.: Escrever o brief"></label><label class="field"><span>Minutos</span><input class="input num" type="number" min="5" max="120" value="${p.mins}" data-bind="pomo-len"></label></div></section>`,
    card(`Pomodoros de <em>hoje</em>`, `<p class="tomatoes">${todays.map(() => `<span class="tomato" aria-hidden="true">${icon('timer')}</span>`).join('') || '<small class="muted">Nenhum ainda.</small>'}</p><p class="small">${plural(todays.length, 'pomodoro')} · ${C.deepMins(today())} min de foco hoje</p><ul class="rows">${todays.map(s => `<li><span class="r-t"><b>${esc(s.title)}</b><small>${s.num} min</small></span></li>`).join('')}</ul>`, { cls: 'lined' }))}`;
}
function tabBoxes() {
  const d = today(); const bl = sortBy(items('block').filter(b => b.day === d), b => dget(b, 'start') || ''); const H0 = 6, H1 = 22; const toM = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  return `<div class="okr-bar"><b>${esc(fmtLong(d))}</b>${addBtn('block', 'Bloco de tempo', { cls: 'sm right', preset: { day: d, cat: 'sky', data: { start: '09:00', end: '10:00' } } })}</div>
  <section class="timeline card">${pin()}<div class="tl" style="--rows:${H1 - H0}">${Array.from({ length: H1 - H0 }, (_, i) => `<div class="tl-h"><span>${C.hourLabel(H0 + i)}</span></div>`).join('')}
    ${bl.map(b => { const s = Math.max(H0 * 60, toM(dget(b, 'start'))), e = Math.min(H1 * 60, Math.max(s + 15, toM(dget(b, 'end')))); return `<button class="tl-b tn-${esc(b.cat || 'sky')}" style="top:${((s - H0 * 60) / ((H1 - H0) * 60) * 100).toFixed(2)}%;height:${((e - s) / ((H1 - H0) * 60) * 100).toFixed(2)}%" data-action="edit" data-id="${esc(b.id)}"><b>${esc(b.title)}</b><small>${esc(hhmm(dget(b, 'start')))}–${esc(hhmm(dget(b, 'end')))}</small></button>`; }).join('')}
    ${nowM >= H0 * 60 && nowM <= H1 * 60 ? `<i class="tl-now" style="top:${((nowM - H0 * 60) / ((H1 - H0) * 60) * 100).toFixed(2)}%" aria-hidden="true"></i>` : ''}</div></section>
  ${C.energyMap().best ? `<p class="small muted evergreen">${icon('lightning')} Seu mapa de energia indica maior concentração por volta das ${C.hourLabel(C.energyMap().best.h)}. Reserve esse horário para seu trabalho mais difícil.</p>` : ''}`;
}
function tabLog() {
  const days = C.lastDays(14); const wk = C.weekOf(); const wkM = C.focusMins(C.sessionsIn(wk, addDays(wk, 6)).filter(s => s.cat !== 'shallow')); const l = sortBy(items('session'), s => s.day + s.created_at, -1);
  const best = [...days].sort((a, b) => C.deepMins(b) - C.deepMins(a))[0];
  return `<div class="tickets">${[['Esta semana', `${(wkM / 60).toFixed(1)} h`, 'c1'], ['Hoje', `${C.deepMins(today())} min`, 'c4'], ['Melhor dia recente', best && C.deepMins(best) ? `${DAYS[parseDay(best).getDay()]} · ${C.deepMins(best)} min` : '—', 'c3'], ['Este ano', `${C.rollup().deep} h`, 'c2']].map(([a, b, t]) => `<div class="ticket ${t}"><span class="kick">${a}</span><b class="num">${b}</b></div>`).join('')}</div>
  ${card(`Trabalho profundo: <em>14 dias</em>`, barChart(days.map(d => ({ label: String(parseDay(d).getDate()), value: C.deepMins(d), tone: 'c1', tip: `${fmtShort(d)}: ${C.deepMins(d)} min` })), { label: 'Minutos de trabalho profundo por dia', h: 220, w: 1000 }), { link: addBtn('session', 'Registrar sessão', { cls: 'sm ghost', preset: { day: today(), cat: 'deep', num: 60 } }) })}
  ${card(`O <em>registro</em>`, `<ul class="rows">${l.slice(0, 20).map(s => { const t = s.parent_id && byId(s.parent_id); return `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(s.id)}"><b>${esc(s.title)}</b></button><small>${esc(fmtShort(s.day))} · ${esc(SESSION_KINDS[s.cat] || '')}${t ? ` · ${esc(t.title)}` : ''}</small></span><span class="num">${s.num} min</span></li>`; }).join('') || '<li class="small muted">Sessões iniciadas no Pomodoro também aparecem aqui.</li>'}</ul>`, { cls: 'lined' })}`;
}
function tabAudit() {
  const a = addDays(today(), -6); const l = sortBy(items('waste').filter(w => w.day >= a), w => w.day, -1); const by = {}; for (const w of l) by[w.cat || 'other'] = (by[w.cat || 'other'] || 0) + (Number(w.num) || 0);
  const waste = C.wasteMins(a, today()); const deep = C.focusMins(C.sessionsIn(a, today()).filter(s => s.cat !== 'shallow'));
  return `<div class="okr-bar">${addBtn('waste', 'Registrar perda de tempo', { cls: 'sm', preset: { day: today(), cat: 'social', num: 20 } })}<span class="small muted">Últimos 7 dias, sem julgamentos.</span></div>
  <div class="tickets">${[['Distrações', `${(waste / 60).toFixed(1)} h`, 'c2'], ['Trabalho profundo', `${(deep / 60).toFixed(1)} h`, 'c1'], ['Proporção', deep ? `${(waste / deep).toFixed(1)} : 1` : '—', 'c3']].map(([x, y, t]) => `<div class="ticket ${t}"><span class="kick">${x}</span><b class="num">${y}</b></div>`).join('')}</div>
  ${twoCol(card(`Onde o tempo <em>escapa</em>`, Object.keys(by).length ? barChart(Object.entries(by).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ label: (WASTE_KINDS[k] || k).split(/[ ,]/)[0], value: v, tone: 'c2', tip: `${WASTE_KINDS[k] || k}: ${v} min` })), { label: 'Minutos por tipo', h: 180 }) : emptyNote('Nada registrado esta semana.')),
    card(`Troque <em>isso</em>`, `<ul class="rows">${l.map(w => `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(w.id)}"><b>${esc(w.title)}</b></button><small>${esc(fmtShort(w.day))} · ${esc(WASTE_KINDS[w.cat] || '')}${dget(w, 'instead') ? ` · alternativa: ${esc(dget(w, 'instead'))}` : ''}</small></span><span class="num">${w.num} min</span></li>`).join('') || '<li class="small muted">Registre quando perceber.</li>'}</ul>`, { cls: 'lined' }))}`;
}
ACTIONS['energy'] = async (b) => { const h = b.dataset.h; const d = today(); const all = { ...(D().energy || {}) }; const day = { ...(all[d] || {}) }; const v = ((Number(day[h]) || 0) % 5) + 1; day[h] = v; all[d] = day; await saveData({ energy: all }); rerender(); };
function tabEnergy() {
  const map = C.energyMap(28); const t = C.energyOn(today()); const days = C.lastDays(7);
  return `${card(`Como está sua <em>energia</em> agora?`, `<p class="small muted">Toque em um horário para avaliá-lo de 1 a 5. Toque novamente para alterar. Depois de alguns dias, o padrão aparecerá.</p><div class="en-row">${C.ENERGY_HOURS.map(h => `<button class="en e${Number(t[h]) || 0}" data-action="energy" data-h="${h}" aria-label="${C.hourLabel(h)}: ${t[h] ? `${t[h]} de 5` : 'não avaliado'}"><b>${t[h] || ''}</b><small>${C.hourLabel(h)}</small></button>`).join('')}</div>`, { pin: true })}
  ${card(`Seu mapa de <em>energia</em>`, `<div class="en-grid" role="img" aria-label="Energia por horário, últimos 7 dias"><span></span>${C.ENERGY_HOURS.map(h => `<b>${h % 3 === 0 ? C.hourLabel(h) : ''}</b>`).join('')}${days.map(d => `<b>${DAYS[parseDay(d).getDay()]}</b>${C.ENERGY_HOURS.map(h => `<i class="e${Number(C.energyOn(d)[h]) || 0}" data-tip="${esc(`${fmtShort(d)} ${C.hourLabel(h)}: ${C.energyOn(d)[h] || '—'}`)}"></i>`).join('')}`).join('')}</div>
    <div class="en-avg">${map.hours.map(x => `<span style="--v:${(x.avg || 0) / 5}" data-tip="${esc(`${C.hourLabel(x.h)}: ${x.avg ? x.avg.toFixed(1) : '—'} em média`)}"><i></i><small>${x.h % 3 === 0 ? C.hourLabel(x.h) : ''}</small></span>`).join('')}</div>
    ${map.best ? `<p class="callout">${icon('lightning')}<span>Seu pico ocorre por volta das <b>${C.hourLabel(map.best.h)}</b>. Reserve esse período para trabalho profundo e use os momentos de queda para tarefas administrativas.</span></p>` : ''}`)}`;
}
function viewFocus(r) {
  const tab = pickTab(FTABS, r.tab);
  return `${hubHead(14, 'Proteja Suas Horas', 'Trabalho Profundo e <em>Blocos de Tempo</em>', 'Concentre-se em Pomodoros, organize o dia em blocos, veja para onde o tempo realmente vai e descubra quando você trabalha melhor.', '')}${folderTabs('focus', FTABS, tab)}<div class="tab-body">${{ timer: tabTimer, boxes: tabBoxes, log: tabLog, audit: tabAudit, energy: tabEnergy }[tab]()}</div>`;
}

// =====================================================================
// 15 · The Memory Archive
// =====================================================================
const ATABS = [['reel', 'Melhores momentos'], ['reflect', 'Reflexões'], ['letters', 'Cartas para o futuro'], ['numbers', 'O ano em números']];
ACTIONS['ay'] = (b) => { S.ui.ay = Number(b.dataset.v); rerender(); };
const yearOf = () => S.ui.ay || C.year();
const yearBar = () => { const now = C.year(); const ys = [...new Set([now, now - 1, now - 2, ...items('reel').map(r => Number(String(dget(r, 'month') || '').slice(0, 4))), ...items('reflect').map(r => Number(r.num))].filter(Boolean))].sort((a, b) => b - a); return `<div class="chips year-chips">${ys.map(y => `<button class="chip" data-action="ay" data-v="${y}" aria-pressed="${y === yearOf()}">${y}</button>`).join('')}</div>`; };
PICK_HOOKS.reel = async (files, el) => { const m = el?.dataset?.month; if (!m) return; try { for (const r of items('reel').filter(r => dget(r, 'month') === m)) await remove(r.id); const x = await save({ kind: 'reel', title: '', data: { month: m } }); await addPhotos(x.id, files.slice(0, 1)); toast(`${MONTHS_LONG[Number(m.slice(5)) - 1]} foi adicionado aos melhores momentos.`); } catch (e) { fail(e); } };
GROUPS.reel = () => sortBy(items('reel').filter(r => String(dget(r, 'month') || '').startsWith(String(yearOf()))), r => dget(r, 'month')).flatMap(r => photosOf(r.id));
function tabReel() {
  const y = yearOf(); const nowYm = today().slice(0, 7);
  return `${yearBar()}<p class="small muted">Uma foto favorita de cada mês. No fim do ano, fica um álbum criado por si mesmo.</p>
  <div class="reel">${MONTHS.map((m, i) => { const ym = `${y}-${String(i + 1).padStart(2, '0')}`; const r = items('reel').find(x => dget(x, 'month') === ym); const p = r && photosOf(r.id)[0]; const future = ym > nowYm;
    return `<div class="reel-slot ${future ? 'future' : ''}">${p ? polaroid(p, r.title || MONTHS_LONG[i], { group: 'reel', tilt: [-3, 2, -1.5, 3, -2, 1.5][i % 6], sub: MONTHS_LONG[i], tools: `<button class="icon-btn sm pol-edit" data-action="edit" data-id="${esc(r.id)}" aria-label="Edit ${MONTHS_LONG[i]}">${icon('edit')}</button>`, ...(i % 4 === 0 ? { clip: true } : i % 4 === 2 ? { tape: 'blue' } : {}) })
      : `<label class="reel-empty" data-drop="" data-hook="reel" data-month="${ym}"><span class="kick">${MONTHS_LONG[i]}</span>${future ? `<small>Ainda por vir</small>` : `${icon('camera')}<small>Adicionar a melhor foto do mês</small><input type="file" accept="image/*" class="sr-only" data-bind="photo-pick" data-hook="reel" data-month="${ym}">`}</label>`}</div>`; }).join('')}</div>`;
}
function tabReflect() {
  const y = yearOf(); const r = items('reflect').find(x => Number(x.num) === y);
  const sec = (k, t) => (dget(r, k) || []).length ? `<section class="rf"><h3>${t}</h3><ul>${dget(r, k).map(v => `<li>${esc(v)}</li>`).join('')}</ul></section>` : '';
  return `${yearBar()}${r ? `<article class="reflect card lined">${binder()}<header class="card-head"><div><span class="kick">${y}, em uma palavra</span><h2 class="rf-word">${esc(dget(r, 'word') || '…')}</h2></div><button class="btn sm ghost" data-action="edit" data-id="${esc(r.id)}">${icon('edit')} Editar</button></header><div class="rf-grid">${sec('best', 'Melhores momentos')}${sec('hard', 'Momentos mais difíceis')}${sec('learned', 'O que aprendi')}${sec('proud', 'Do que me orgulho')}${sec('keep', 'O que levo para o próximo ano')}</div></article>`
    : `${card(`${y}, <em>relembrando</em>`, `<ul class="guide-steps"><li>Quais foram os melhores momentos?</li><li>O que foi mais difícil e como você superou?</li><li>O que aprendeu?</li><li>Do que tem orgulho?</li><li>O que leva consigo para o próximo ano?</li></ul>${addBtn('reflect', `Refletir sobre ${y}`, { preset: { num: y } })}`, { cls: 'lined', pin: true })}`}`;
}
ACTIONS['letter-open'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { status: 'opened', data: { openedOn: today() } }); if (S.settings.decor !== false) confetti(90); rerender(); } catch (e) { fail(e); } };
function tabLetters() {
  const l = sortBy(items('letter'), x => dget(x, 'open') || '');
  return `<div class="okr-bar">${addBtn('letter', 'Escrever uma carta', { cls: 'sm', preset: { day: today(), status: 'sealed', data: { open: addDays(today(), 365) } } })}<span class="small muted">Fechada até a data escolhida.</span></div>
  <div class="letters">${l.map(x => { const open = dget(x, 'open'); const ready = open && open <= today(); const opened = x.status === 'opened'; return `<article class="letter ${opened ? 'opened' : ready ? 'ready' : 'sealed'}"><div class="env"><span class="env-flap" aria-hidden="true"></span>${opened ? '' : seal('C', 'letter-seal')}<span class="env-to">Para mim em ${esc(open ? fmtLong(open) : 'algum dia')}</span><span class="env-stamp" aria-hidden="true">${icon('heart')}</span></div>
    <div class="letter-b"><span class="kick">Escrita em ${esc(fmtLong(x.day))}</span><h3>${esc(x.title)}</h3>${opened ? `<p class="letter-text">${esc(x.body || '')}</p><button class="btn sm ghost" data-action="edit" data-id="${esc(x.id)}">${icon('edit')} Editar</button>` : ready ? `<button class="btn solid" data-action="letter-open" data-id="${esc(x.id)}">${icon('envelopeOpen')} Abrir</button>` : `<p class="small muted">Abre em ${plural(daysBetween(today(), open), 'dia')}. Nada de espiar.</p>`}</div></article>`; }).join('') || emptyNote('Escreva para a pessoa que você será daqui a um ano.')}</div>`;
}
function tabNumbers() {
  const y = yearOf(); const r = C.rollup(y);
  const tiles = [['books', 'livros lidos', 'books'], ['miles', 'quilômetros caminhados ou corridos', 'sneaker'], ['workouts', 'dias de treino', 'barbell'], ['trips', 'viagens realizadas', 'airplane'], ['countries', 'países visitados', 'globe'], ['deep', 'horas de trabalho profundo', 'brain'], ['pomodoros', 'pomodoros', 'timer'], ['habits', 'hábitos concluídos', 'repeat'], ['tasks', 'tarefas concluídas', 'checkCircle'], ['watched', 'filmes e séries', 'film'], ['clips', 'conteúdos capturados', 'paperclip']];
  return `${yearBar()}<div class="rollup">${tiles.map(([k, l, ic], i) => `<div class="roll-stamp t${i % 6}">${icon(ic)}<b class="num">${(r[k] ?? 0).toLocaleString()}</b><small>${l}</small></div>`).join('')}<div class="roll-stamp t2">${icon('piggyBank')}<b class="num">${amt(r.saved)}</b><small>economizado</small></div>${r.moodAvg ? `<div class="roll-stamp t3">${icon('smiley')}<b class="num">${r.moodAvg}</b><small>humor médio, de 5</small></div>` : ''}</div>
  <p class="small muted evergreen">${icon('repeat')} Calculado automaticamente a partir de todos os hubs durante o ano.</p>`;
}
function viewArchive(r) {
  const tab = pickTab(ATABS, r.tab);
  return `${hubHead(15, 'O Hub do Fim do Ano', 'O Arquivo de <em>Memórias</em>', 'Uma foto por mês, uma visão honesta do ano, cartas para a pessoa que você está se tornando e o ano inteiro resumido.', '')}${folderTabs('archive', ATABS, tab)}<div class="tab-body">${{ reel: tabReel, reflect: tabReflect, letters: tabLetters, numbers: tabNumbers }[tab]()}</div>`;
}
export const VIEWS_VAULT = { knowledge: viewKnowledge, focus: viewFocus, archive: viewArchive };
