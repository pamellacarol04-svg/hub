// Home: the front page, in the atelier style. The grand vision board in a pinstriped frame with the
// year's word, a big greeting with what's on now and next, every hub as a coloured tile with the live
// number that matters most there, the four planners as file folders, Today's focus (meetings, the
// top three, habits), the inbox, the numbers (money in vs out, task velocity, mood)
// and, down the side, money this month, what's coming up, the month on one card, the month's vibe
// photo and an evergreen summary of the day, week, quarter and year.
import { S, $, esc, icon, sparkle, ACTIONS, FORMS, hooks, rerender, fail, toast, today, addDays, parseDay, DAYS_LONG, MONTHS_LONG, MONTHS, daysBetween, firstName, plural, moneyWhole, hhmm } from '../core.js';
import { items, byId, save, patch, remove, dget, sortBy, addBtn, PRIORITIES, LIFE_AREAS, EXP_CATS, blockColor } from '../kinds.js';
import { photosOf, PICK_HOOKS, addPhotos, img } from '../photos.js';
import { donut, lineChart, groupBars } from '../ui.js';
import { GROUPS } from './lightbox.js';
import { D, saveData, card, hubHead, badge, hubTone, photoDrop, polaroid, itemsFromFiles, sparkleWin, emptyNote, capture, faces, FACE_WORDS, meter, amt } from './common.js';
import * as C from '../hub.js';

// ---------------------------------------------------------------------
// The current vibe: one photo per month (a mood board or a single picture)
// ---------------------------------------------------------------------
const vibeNow = () => sortBy(items('vibe').filter(v => photosOf(v.id).length && String(v.day || '') <= today()), v => v.day || '', -1)[0] || null;
PICK_HOOKS.vibe = async (files) => { try { const ym = today().slice(0, 7); for (const v of items('vibe').filter(v => String(v.day || '').startsWith(ym))) await remove(v.id); const x = await save({ kind: 'vibe', title: '', day: today() }); await addPhotos(x.id, files.slice(0, 1)); toast('A vibe deste mês foi adicionada.'); } catch (e) { fail(e); } };
GROUPS.vibe = () => sortBy(items('vibe'), v => v.day || '', -1).flatMap(v => photosOf(v.id));

/** The month's vibe, as a photo card with a Mac title bar. */
function vibeCard() {
  const v = vibeNow(); const p = v && photosOf(v.id)[0];
  return `<section class="card vibe-card"><header class="card-head"><div class="ch-t"><span class="label">${esc(MONTHS_LONG[parseDay(today()).getMonth()])}</span><h2>A <em>vibe</em> atual</h2></div></header>
    <div class="side-photo ${p ? '' : 'empty'}">${p ? `<button class="pol-open" data-action="photo-view" data-id="${esc(p.id)}" data-group="vibe" aria-label="Abrir foto da vibe">${img(p, { ratio: false, alt: v.title || 'Sua foto da vibe' })}</button>` : photoDrop({ hook: 'vibe', label: 'Adicionar a vibe do mês', sub: 'Um quadro de visão ou uma foto que te inspire' })}
    ${p ? `<label class="cover-btn" data-drop="" data-hook="vibe">${icon('camera')}<span>Alterar</span><input type="file" accept="image/*" class="sr-only" data-bind="photo-pick" data-hook="vibe"></label>` : ''}</div>
    ${v ? `<p class="vibe-cap"><button class="link-plain" data-action="edit" data-id="${esc(v.id)}">${esc(v.title || 'Adicionar legenda')}</button></p>` : ''}</section>`;
}
/** This month on one card. Opens the day planner. */
function calWidget() {
  const d = parseDay(today()); const y = d.getFullYear(), m = d.getMonth(); const first = (new Date(y, m, 1).getDay() + 6) % 7; const n = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(''), ...Array.from({ length: n }, (_, i) => i + 1)];
  return `<a class="w-cal card" href="#/plan?tab=day" aria-label="${esc(MONTHS_LONG[m])}: abrir o planejador diário"><span class="label">Este mês</span><b class="wc-m">${esc(MONTHS_LONG[m])} <em>${y}</em></b><div class="wc-g">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<i>${x}</i>`).join('')}${cells.map(c => `<span class="${c === d.getDate() ? 'on' : ''}">${c}</span>`).join('')}</div></a>`;
}
/** What's coming up: the nudges, as a short list with a sparkle each. */
function nudgesCard(nudges) {
  return card(`Próximos <em>eventos</em>`, nudges.length ? `<ul class="nudge-list">${nudges.map(n => `<li>${sparkle()}<span>${n}</span></li>`).join('')}</ul>` : `<p class="small muted">Nada urgente por enquanto. Capture ideias e organize depois.</p>`, { kicker: 'Vale saber', cls: 'nudge-card' });
}
/** Money this month: in, out and what's left, with the last few things spent. */
function moneyCard() {
  const ym = today().slice(0, 7); const inn = C.incomeIn(); const out = C.spentIn(); const left = inn - out;
  const last = sortBy(items('txn').filter(t => t.status !== 'in' && String(t.day || '').startsWith(ym)), t => t.day || '', -1).slice(0, 3);
  return card(`Dinheiro deste <em>mês</em>`, `<div class="mm-figs"><div><span class="label">Gasto</span><b class="mm-n">${amt(out)}</b><small class="muted">de ${amt(inn)} recebidos</small></div><div><span class="label">${left >= 0 ? 'Restante' : 'A mais'}</span><b class="mm-n">${amt(Math.abs(left))}</b></div></div>
    ${meter(inn > 0 ? Math.min(1, out / inn) : 0, 'c1', 'Valor gasto em relação às entradas')}
    ${last.length ? `<ul class="mm-last">${last.map(t => `<li>${icon('receipt')}<span>${esc(t.title)}${EXP_CATS[t.cat] && EXP_CATS[t.cat] !== t.title ? ` <small class="muted">${esc(EXP_CATS[t.cat])}</small>` : ''}</span><b class="num">${amt(t.amount)}</b></li>`).join('')}</ul>` : ''}`, { tone: 't1', kicker: MONTHS_LONG[parseDay(today()).getMonth()], cls: 'money-card', link: `<button class="btn sm" data-action="quick" data-v="txn">${icon('plus')} Gasto</button>` });
}
const CLOCK_TONES = { sky: 'var(--c1)', blush: 'var(--c2)', butter: 'var(--c3)', sage: 'var(--c4)', lilac: 'var(--c6)' };
const clockMinutes = (value) => {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const clockPoint = (minute, radius) => {
  const angle = ((minute % 1440) / 1440) * Math.PI * 2 + Math.PI / 2;
  return { x: 120 + Math.cos(angle) * radius, y: 120 + Math.sin(angle) * radius };
};
const clockArc = (start, end, radius) => {
  const duration = Math.min(1440, end - start);
  if (duration <= 0) return '';
  if (duration >= 1440) return `M 120 ${120 - radius} A ${radius} ${radius} 0 1 1 120 ${120 + radius} A ${radius} ${radius} 0 1 1 120 ${120 - radius}`;
  const a = clockPoint(start, radius); const b = clockPoint(end, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${duration > 720 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};
const agendaClockEvents = () => meetingsOn(today()).flatMap(event => {
  const start = clockMinutes(event.at);
  if (start === null) return [];
  const rawEnd = clockMinutes(event.to);
  const end = rawEnd === null ? null : rawEnd < start ? rawEnd + 1440 : rawEnd;
  return [{ ...event, start, end, color: event.color || CLOCK_TONES[event.tone] || 'var(--c1)' }];
});
const shortClockTitle = (title) => {
  const text = String(title || 'Compromisso');
  return text.length > 27 ? `${text.slice(0, 26).trimEnd()}…` : text;
};
const agendaClockMessage = (minute, events) => {
  const active = events.find(event => event.end !== null && event.end > event.start && event.start <= minute && event.end > minute);
  if (active) return `Em andamento · ${shortClockTitle(active.t)}`;
  const next = events.find(event => event.start >= minute);
  if (!next) return events.length ? 'Sem próximos horários' : meetingsOn(today()).length ? 'Compromisso sem horário' : 'Dia sem compromissos';
  const remaining = next.start - minute;
  const distance = remaining < 60 ? `${remaining} min` : `${Math.floor(remaining / 60)} h${remaining % 60 ? ` ${remaining % 60} min` : ''}`;
  return `${shortClockTitle(next.t)} · em ${distance}`;
};
let agendaClockInterval = null;
function updateAgendaClock() {
  const clock = document.querySelector('[data-agenda-clock]');
  if (!clock) { clearInterval(agendaClockInterval); agendaClockInterval = null; return; }
  if (clock.dataset.day !== today()) { rerender(); return; }
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeNode = clock.querySelector('[data-clock-time]');
  const messageNode = clock.querySelector('[data-clock-message]');
  if (timeNode) timeNode.textContent = time;
  if (messageNode) messageNode.textContent = agendaClockMessage(minute, agendaClockEvents());
  clock.querySelectorAll('[data-clock-minute]').forEach(dot => {
    const isPast = Number(dot.dataset.clockMinute) <= minute;
    dot.classList.toggle('is-past', isPast);
  });
}
hooks.after.push(() => {
  clearInterval(agendaClockInterval);
  agendaClockInterval = document.querySelector('[data-agenda-clock]') ? setInterval(updateAgendaClock, 30_000) : null;
  if (agendaClockInterval) updateAgendaClock();
});
function agendaClock() {
  const now = new Date(); const minute = now.getHours() * 60 + now.getMinutes();
  const events = agendaClockEvents();
  const arcs = events.filter(event => event.end !== null).map(event => {
    const end = event.end;
    const path = clockArc(event.start, end, 76);
    return path ? `<path class="day-clock-event-arc" d="${path}" style="--clock-event-color:${event.color}"><title>${esc(event.t)} · ${esc(hhmm(event.at))}–${esc(hhmm(event.to))}</title></path>` : '';
  }).join('');
  const markers = events.map(event => {
    const point = clockPoint(event.start, 93);
    const color = event.color;
    return `<g class="day-clock-event-marker" style="--clock-event-color:${color}"><title>${esc(event.t)} · ${esc(hhmm(event.at))}${event.to ? `–${esc(hhmm(event.to))}` : ''}</title><circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="5.5"></circle><circle class="day-clock-event-center" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="2"></circle></g>`;
  }).join('');
  const dots = Array.from({ length: 48 }, (_, index) => {
    const dotMinute = index * 30; const point = clockPoint(dotMinute, 93); const isPast = dotMinute <= minute;
    return `<circle class="day-clock-dot ${isPast ? 'is-past' : ''}" data-clock-minute="${dotMinute}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.5"></circle>`;
  }).join('');
  return `<div class="day-clock" data-agenda-clock data-day="${today()}">
    <svg class="day-clock-svg" viewBox="0 0 240 240" role="img" aria-label="Relógio de 24 horas com os compromissos de hoje">
      <circle class="day-clock-track" cx="120" cy="120" r="76"></circle>${arcs}${dots}${markers}
      <text class="day-clock-hour" x="120" y="61">12h</text><text class="day-clock-hour" x="179" y="123">18h</text>
      <text class="day-clock-hour" x="120" y="187">00h</text><text class="day-clock-hour" x="61" y="123">06h</text>
      <text class="day-clock-now-label" x="120" y="105">AGORA</text>
      <text class="day-clock-time" data-clock-time x="120" y="128"></text>
      <text class="day-clock-message" data-clock-message x="120" y="149">${esc(agendaClockMessage(minute, events))}</text>
    </svg>
  </div>`;
}
/** The evergreen summary: the date, week, quarter and the year so far. Nothing to set up, ever. */
function summary() {
  const t = today(); const d = parseDay(t); const y = d.getFullYear(); const doy = C.dayOfYear(t), diy = C.daysInYear(y); const v = C.velocity(); const m = C.moodOn();
  const li = (ic, text) => `<li>${icon(ic)}<span>${text}</span></li>`;
  return `<section class="card insights"><header class="card-head"><div class="ch-t"><span class="label">Tudo Atualizado Automaticamente</span><h2>Resumo de <em>Hoje</em></h2></div></header>
    <div class="ins-card"><b class="ins-date">${esc(DAYS_LONG[d.getDay()])}, ${d.getDate()} ${esc(MONTHS_LONG[d.getMonth()])} ${y}</b>
    <div class="clock-tags"><span class="tag t-blue">Semana ${C.isoWeek(t)}</span><span class="tag t-yellow">T${C.quarterOf(t)}</span><span class="tag t-pink">Dia ${doy} de ${diy}</span></div>
    <div class="year-bar"><span class="kick">${y} até agora</span>${meter(doy / diy, 'c1', 'O ano até agora')}<small>${Math.round(doy / diy * 100)}%, faltam ${diy - doy} dias · ${daysBetween(t, C.quarterEnd(t))} dias restantes no T${C.quarterOf(t)}</small></div>
    <h3>Planejamento</h3><ul>${li('checkCircle', `Tarefas desta semana: <b>${v.done} de ${v.total}</b> concluídas`)}${li('calendarCheck', `<b>${plural(meetingsOn(t).length, 'compromisso')}</b> marcado hoje`)}</ul>
    <h3>Bem-estar</h3><ul>${li('repeat', `Hábitos: <b>${C.habitsDone(t).length} de ${C.habits().length}</b> concluídos`)}${li('smiley', m ? `Humor de hoje: <b>${esc(FACE_WORDS[m])}</b>` : 'Humor ainda não registrado')}${li('timer', `Trabalho profundo hoje: <b>${C.deepMins(t)} min</b>`)}</ul>
    <h3>Vida</h3><ul>${li('wallet', `Patrimônio líquido: <b>${amt(C.netWorthNow())}</b>`)}${li('inbox', `Caixa de entrada: <b>${plural(items('capture').filter(x => x.status !== 'done').length, 'item', 'itens')}</b> para organizar`)}</ul></div></section>`;
}
/** The four planners, each a coloured file folder with its name on the tab. */
function plannerCards() {
  const t = today(); const d = parseDay(t); const y = d.getFullYear(); const v = C.velocity(); const top = C.top3(t);
  const tone = { yellow: 't3', blue: 't1', green: 't4', pink: 't2' };
  const one = (title, href, sub, tag) => `<a class="pcard folder ${tone[tag[1]]}" href="${href}"><span class="folder-body"><span class="label">${esc(sub)}</span><b class="pc-t">${esc(title)}</b><span class="tag">${esc(tag[0])}</span></span></a>`;
  return `<section class="planners-blk"><header class="sec-head"><span class="label">Tudo Se Organiza Sozinho, sem Novas Páginas para Criar</span><h2>Seus <em>Planejadores</em></h2></header>
    <div class="pcards">${one('Hoje', '#/plan?tab=day', DAYS_LONG[d.getDay()], [top.length ? `${plural(top.length, 'Prioridade')}` : 'Livre', 'yellow'])}${one('Esta Semana', '#/plan?tab=week', `Semana ${C.isoWeek(t)}`, [`${v.done}/${v.total} concluídas`, 'blue'])}${one(`T${C.quarterOf(t)}`, '#/plan?tab=quarter', `${MONTHS[C.quarterStart(t).slice(5, 7) - 1]}–${MONTHS[C.quarterEnd(t).slice(5, 7) - 1]} ${y}`, [`Faltam ${daysBetween(t, C.quarterEnd(t))} Dias`, 'green'])}${one(String(y), '#/plan?tab=year', 'O Ano Inteiro', [`${Math.round(C.dayOfYear(t) / C.daysInYear(y) * 100)}% Concluído`, 'pink'])}</div></section>`;
}

// ---------------------------------------------------------------------
// Today's focus: meetings, the top three, habits
// ---------------------------------------------------------------------
ACTIONS['task-done'] = async (b) => { const t = byId(b.dataset.id); if (!t) return; const done = t.status !== 'done'; try { await patch(t, { status: done ? 'done' : 'todo', data: { doneOn: done ? today() : null } }); if (done) await sparkleWin('Concluído. Ótimo.', b); rerender(); } catch (e) { fail(e); } };
ACTIONS['habit-tick'] = async (b) => { const d = b.dataset.day || today(); const all = { ...(D().habitsDone || {}) }; const l = new Set(all[d] || []); const on = !l.has(b.dataset.id); on ? l.add(b.dataset.id) : l.delete(b.dataset.id); all[d] = [...l]; await saveData({ habitsDone: all }); if (on) await sparkleWin('', b); rerender(); };
ACTIONS['mood-set'] = async (b) => { const d = b.dataset.day || today(); await saveData({ mood: { ...(D().mood || {}), [d]: Number(b.dataset.v) } }); toast(`Sentimento: ${FACE_WORDS[Number(b.dataset.v)].toLowerCase()}. Registrado.`); rerender(); };
export const meetingsOn = (d = today()) => sortBy([
  ...items('block').filter(b => b.day === d).map(b => ({ t: b.title, at: dget(b, 'start') || '', to: dget(b, 'end') || '', id: b.id, meet: dget(b, 'meet'), tone: b.cat || 'sky', color: blockColor(b) })),
  ...items('meeting').filter(m => m.day === d && !items('block').some(b => b.day === d && b.title === m.title)).map(m => ({ t: m.title, at: dget(m, 'time') || '', to: '', id: m.id, meet: true, tone: 'blush' })),
  ...items('event').filter(e => e.day === d).map(e => ({ t: e.title, at: dget(e, 'time') || '', to: '', id: e.id, meet: true, tone: 'butter' })),
], m => m.at || '99');
export const taskRow = (t, opts = {}) => { const c = C.carried(t); const p = t.parent_id && byId(t.parent_id); return `<li class="task ${t.status === 'done' ? 'done' : ''} pr-${t.cat || 'med'}"><button class="tick" data-action="task-done" data-id="${esc(t.id)}" aria-pressed="${t.status === 'done'}" aria-label="${t.status === 'done' ? 'Marcar como pendente' : 'Concluir'}: ${esc(t.title)}">${icon('check')}</button><span class="task-t"><button class="link-plain" data-action="edit" data-id="${esc(t.id)}">${esc(t.title)}</button><small>${[c ? `${icon('arrowCircle')} adiada ${plural(c, 'dia')}` : '', p ? esc(p.title) : '', opts.day && t.day ? esc(C.taskDay(t) === today() ? 'hoje' : t.day) : ''].filter(Boolean).join(' · ')}</small></span>${t.cat === 'high' ? '<span class="prio" aria-label="Prioridade alta">!</span>' : ''}${opts.weekPriority ? `<button class="week-priority-toggle" data-action="week-priority" data-id="${esc(t.id)}" aria-pressed="${Boolean(dget(t, 'weekPriority'))}" aria-label="${dget(t, 'weekPriority') ? 'Remover das prioridades' : 'Definir como prioridade'}">${icon('star')}</button>` : ''}</li>`; };
function focus() {
  const t = today(); const m = meetingsOn(t); const top = C.top3(t); const hs = C.habits(); const done = new Set(C.habitsDone(t)); const openToday = C.tasksOn(t).filter(x => x.status !== 'done').length;
  return card(`Foco de <em>Hoje</em>`, `<div class="focus-cols">
    <div class="fc"><h3>${icon('clock')} Reuniões e blocos</h3>${m.length ? `<ul class="meets">${m.map(x => `<li class="tn-${esc(x.tone)}" ${x.color ? `style="--block-color:${x.color}"` : ''}><span class="mt-at">${x.at ? esc(hhmm(x.at)) : 'Dia inteiro'}</span><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.t)}</button>${x.meet ? `<small>${icon('users')}</small>` : ''}</li>`).join('')}</ul>` : `<p class="small muted">Nada marcado. Seu dia está livre.</p>`}<button class="btn sm ghost" data-action="quick" data-v="block">${icon('plus')} Reunião</button></div>
    <div class="fc"><h3>${icon('target')} Top 3</h3>${top.length ? `<ol class="tasks top">${top.map(x => taskRow(x)).join('')}</ol>` : `<p class="small muted">Nenhuma tarefa aberta para hoje.</p>`}${openToday > 3 ? `<a class="small" href="#/plan?tab=day">+ ${openToday - 3} mais hoje</a>` : ''}<button class="btn sm ghost" data-action="quick" data-v="task">${icon('plus')} Tarefa</button></div>
    <div class="fc"><h3>${icon('repeat')} Hábitos <small class="muted">${done.size}/${hs.length}</small></h3><ul class="habits">${hs.map(h => `<li><button class="hab ${done.has(h.id) ? 'on' : ''}" data-action="habit-tick" data-id="${esc(h.id)}" aria-pressed="${done.has(h.id)}">${icon(dget(h, 'icon') || 'sparkle')}<span>${esc(h.title)}</span><small>${C.habitStreak(h.id)}d</small></button></li>`).join('')}</ul>${addBtn('habit', 'Hábito', { cls: 'sm ghost' })}</div>
  </div>`, { cls: 'focus-card', tone: 't2', kicker: 'Se só estas acontecerem, será um bom dia', link: `<a class="btn sm ghost" href="#/plan?tab=day">Planejador diário</a>` });
}

// ---------------------------------------------------------------------
// The inbox: drop anything in, sort it later
// ---------------------------------------------------------------------
FORMS['cap-add'] = async (f) => { const t = f.elements.t.value.trim(); if (!t) return; try { await capture(t); f.reset(); rerender(); setTimeout(() => document.getElementById('cap-in')?.focus(), 30); } catch (e) { fail(e); } };
const SORTS = { task: ['Tarefa para hoje', 'checkCircle'], clip: ['Ler depois', 'bookmark'], zettel: ['Nota', 'notePencil'], journal: ['Diário', 'book'] };
ACTIONS['cap-sort'] = async (b) => {
  const x = byId(b.dataset.id); if (!x) return; const to = b.dataset.v;
  try {
    if (to === 'task') await save({ kind: 'task', title: x.title, day: today(), cat: 'med', status: 'todo' });
    if (to === 'clip') await save({ kind: 'clip', title: x.title, url: x.url, status: 'unread', cat: 'article', data: { tags: [] } });
    if (to === 'zettel') await save({ kind: 'zettel', title: x.title, body: x.url || '', data: { tags: [] } });
    if (to === 'journal') await save({ kind: 'journal', title: 'Da caixa de entrada', cat: 'free', day: today(), body: x.title });
    await remove(x.id); toast({ task: 'Agora é uma tarefa para hoje.', clip: 'Salvo para ler depois no Cofre de Conhecimento.', zettel: 'Agora é uma nota no Cofre de Conhecimento.', journal: 'No diário de hoje.' }[to]); rerender();
  } catch (e) { fail(e); }
};
ACTIONS['cap-del'] = async (b) => { try { await remove(b.dataset.id); rerender(); } catch (e) { fail(e); } };
export function inbox(opts = {}) {
  const l = sortBy(items('capture').filter(x => x.status !== 'done'), x => x.created_at, -1);
  return card(`A <em>Caixa de Entrada</em>`, `<form class="cap-form" data-form="cap-add" autocomplete="off"><label class="sr-only" for="cap-in">Capturar</label><input class="input" id="cap-in" name="t" maxlength="600" placeholder="Uma ideia, tarefa ou link…"><button class="btn solid" aria-label="Adicionar à caixa de entrada">${icon('plus')}</button></form>
    ${l.length ? `<ul class="caps">${l.slice(0, opts.all ? 100 : 6).map(x => `<li><span class="cap-k k-${esc(x.cat || 'thought')}">${icon({ link: 'link', task: 'checkCircle' }[x.cat] || 'lightbulb')}</span><span class="cap-t">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</span>
      <span class="cap-sort" role="group" aria-label="Organizar em">${Object.entries(SORTS).map(([k, [l2, ic]]) => `<button class="icon-btn sm" data-action="cap-sort" data-id="${esc(x.id)}" data-v="${k}" title="${esc(l2)}" aria-label="${esc(l2)}">${icon(ic === 'bookmark' ? 'books' : ic)}</button>`).join('')}<button class="icon-btn sm" data-action="cap-del" data-id="${esc(x.id)}" aria-label="Excluir">${icon('trash')}</button></span></li>`).join('')}</ul>${l.length > 6 && !opts.all ? `<p class="small muted">${l.length - 6} itens aguardando.</p>` : ''}` : `<p class="small muted cap-empty">Caixa de entrada vazia. Aproveite.</p>`}
    <p class="small muted cap-hint">Organize com um toque: ${Object.values(SORTS).map(s => s[0].toLowerCase()).join(', ')}, ou exclua.</p>`, { cls: 'inbox-card', kicker: 'Despeje aqui, organize depois' });
}

// ---------------------------------------------------------------------
// The numbers
// ---------------------------------------------------------------------
function metrics() {
  const ms = C.monthsBack(6); const v = C.velocity(); const days = C.lastDays(30); const moods = days.map(C.moodOn);
  const logged = moods.filter(Boolean); const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null;
  return `<section class="metrics" aria-label="Os números"><header class="sec-head"><span class="label">Calculado com Tudo o que Você Registra</span><h2>Os <em>Números</em></h2></header>
    <div class="metric-grid">
      ${card(`Pulso <em>financeiro</em>`, groupBars(ms.map(m => MONTHS[Number(m.slice(5)) - 1]), [{ name: 'Entradas', tone: 'c4', values: ms.map(C.incomeIn) }, { name: 'Saídas', tone: 'c2', values: ms.map(C.spentIn) }], { fmt: (x) => moneyWhole(x), label: 'Entradas e saídas nos últimos seis meses', h: 210 }), { cls: 'm-money', link: `<a class="small" href="#/money">Economizado este mês: ${amt(C.incomeIn() - C.spentIn())}</a>` })}
      ${card(`Velocidade das <em>tarefas</em>`, `${donut([{ label: 'Concluídas', value: v.done, tone: 'c1' }, { label: 'Pendentes', value: v.open, tone: 'c5' }], { center: `${Math.round(v.pct * 100)}%`, sub: 'esta semana', label: 'Tarefas concluídas nesta semana' })}<p class="small muted">${v.done} de ${plural(v.total, 'tarefa')} nesta semana, incluindo tarefas transferidas.</p>`, { cls: 'm-vel' })}
      ${card(`Tendência de <em>humor</em>`, `${lineChart(days.map(d => `${parseDay(d).getDate()}`), [{ name: 'Humor', tone: 'c2', values: moods }], { min: 1, max: 5, ticks: [1, 3, 5], fmt: (x) => FACE_WORDS[Math.round(x)] || '', label: 'Humor nos últimos 30 dias', h: 190 })}
        <div class="mood-today"><span class="small muted">Hoje:</span>${faces('mood-set', C.moodOn())}</div><p class="small muted">${avg ? `Média de 30 dias: ${FACE_WORDS[Math.round(avg)].toLowerCase()} (${avg.toFixed(1)} de 5).` : 'Registre um humor para iniciar o gráfico.'}</p>`, { cls: 'm-mood' })}
    </div></section>`;
}

// ---------------------------------------------------------------------
// Every hub's live number, shown under its folder on Home
// ---------------------------------------------------------------------
export function hubStat(id) {
  const t = today(); const r = C.rollup();
  switch (id) {
    case 'vision': return `${plural(items('vpin').length, 'foto')} no quadro`;
    case 'plan': { const v = C.velocity(); return `${v.done}/${v.total} tarefas nesta semana`; }
    case 'money': return `Patrimônio ${moneyWhole(C.netWorthNow())}`;
    case 'career': return `${plural(items('project').filter(p => p.status !== 'done').length, 'projeto ativo')}`;
    case 'learn': return `${plural(C.dueCards().length, 'cartão')} para revisar`;
    case 'health': return `${plural(r.workouts, 'treino')} este ano`;
    case 'mind': { const m = C.moodOn(); return m ? `Sentimento: ${FACE_WORDS[m].toLowerCase()}` : 'Como você está, de verdade?'; }
    case 'kitchen': return `${plural(Object.values(C.mealPlan()).filter(Boolean).length, 'refeição')} planejada`;
    case 'house': return `${plural(items('plant').filter(p => C.plantNext(p) <= t).length, 'planta')} precisa de água`;
    case 'travel': { const n = C.nextTrip(); return n ? `${n.title}: ${Math.max(0, daysBetween(t, n.day))} dias` : `${plural(r.countries, 'país')} visitado`; }
    case 'media': return `${plural(items('book').filter(b => b.status === 'reading').length, 'livro')} em andamento`;
    case 'social': { const o = C.occasions()[0]; return o ? `${o.p.title}: ${o.label.toLowerCase()} em ${o.inDays} d` : 'Em quem você está pensando?'; }
    case 'knowledge': return `${plural(items('clip').filter(c => c.status === 'unread').length, 'item')} para ler`;
    case 'focus': return `${C.deepMins(t)} min de trabalho profundo hoje`;
    case 'archive': return `${items('reel').filter(x => String(dget(x, 'month') || '').startsWith(String(C.year()))).length}/12 destaques`;
    default: return '';
  }
}
/** Every hub as a coloured tile with its badge, its name and its live number. */
export function folders(HUBS) {
  return `<section class="hubs-sec"><header class="sec-head"><span class="label">Quinze Hubs, Um Sistema</span><h2>Seus <em>Hubs</em></h2></header>
    <nav class="folders" aria-label="Seus hubs">${HUBS.filter(h => h[0] !== 'home').map(([id, l, , line], i) => `<a class="folder pillar-tile ${hubTone(id)}" href="#/${id}">${badge(id)}<span class="fd-txt"><span class="fd-no">Nº ${String(i + 1).padStart(2, '0')}</span><b class="fd-name">${esc(l)}</b><small class="fd-stat">${esc(hubStat(id))}</small></span></a>`).join('')}</nav></section>`;
}

// ---------------------------------------------------------------------
// The grand vision board: the board's photos in a pinstriped frame, with the year's word
// ---------------------------------------------------------------------
PICK_HOOKS['vpin-home'] = async (files) => { await itemsFromFiles(files, 'vpin', { cat: 'self' }); toast('Fixado no quadro.'); };
GROUPS['vpin-home'] = () => sortBy(items('vpin'), v => v.created_at, -1).flatMap(v => photosOf(v.id));
function visionBand() {
  const pins = sortBy(items('vpin').filter(v => photosOf(v.id).length), v => v.created_at, -1).slice(0, 9);
  const y = C.year(); const th = (D().themes || {})[y] || {};
  const tools = `<div class="vh-tools"><label class="btn sm vb-add" data-drop="" data-hook="vpin-home">${icon('camera')}<span>Adicionar fotos</span><input type="file" accept="image/*" multiple class="sr-only" data-bind="photo-pick" data-hook="vpin-home"></label><a class="btn sm ghost" href="#/vision?tab=board">Abrir quadro</a></div>`;
  const tiles = pins.map((v, i) => `<button class="cl c${i}" data-action="photo-view" data-id="${esc(photosOf(v.id)[0].id)}" data-group="vpin-home" aria-label="Abrir ${esc(v.title || 'foto')}">${img(photosOf(v.id)[0], { ratio: false, alt: v.title || '' })}${v.title ? `<span class="cap hand">${esc(v.title)}</span>` : ''}</button>`).join('');
  return `<section class="vision-hero ${pins.length ? '' : 'empty-hero'}" aria-label="O grande quadro de visão"><div class="vh-bar"><span class="kicker t3">${sparkle()}<span>O grande quadro de visão</span></span>${tools}</div>
    ${pins.length ? `<div class="collage n${pins.length}">${tiles}</div>` : photoDrop({ hook: 'vpin-home', label: 'Comece seu quadro de visão', sub: 'Sonhos, viagens e objetivos. Escolha várias fotos de uma vez.', multiple: true, cls: 'vdrop' })}
    <a class="aff-card" href="#/vision?tab=identity"><span class="label">${y} · o ano de</span>${esc(th.word || 'sua palavra')}${th.line ? `<small>${esc(th.line)}</small>` : ''}</a></section>`;
}
/** The greeting, with what's on now and what's next. */
function greetRow() {
  const name = firstName(); const t = today(); const d = parseDay(t); const now = new Date(); const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const m = meetingsOn(t).filter(x => x.at); const cur = m.find(x => x.at <= hm && (x.to || x.at) > hm); const nxt = m.find(x => x.at > hm);
  return `<div class="greet"><div><span class="label">${esc(DAYS_LONG[d.getDay()])}, ${d.getDate()} de ${esc(MONTHS_LONG[d.getMonth()])} de ${d.getFullYear()}</span><h1 class="greet-h">${esc(C.greeting())}${name ? `, <em>${esc(name)}</em>` : ''}</h1></div>
    <div class="nownext"><div><span class="label">Agora</span><b>${cur ? esc(cur.t) : 'Tempo livre'}</b></div><div><span class="label">Depois</span><b>${nxt ? esc(nxt.t) : 'Nada marcado'}</b>${nxt ? `<small>${esc(hhmm(nxt.at))}</small>` : ''}</div></div></div>`;
}

function viewHome(r, HUBS) {
  const nt = C.nextTrip(); const occ = C.occasions()[0]; const letter = items('letter').find(l => l.status !== 'opened' && dget(l, 'open') <= today());
  const nudges = [
    letter ? `<a href="#/archive?tab=letters">A letter from past you is ready to open.</a>` : '',
    occ && occ.inDays <= 14 ? `<a href="#/social">${esc(occ.p.title)}’s ${occ.label.toLowerCase()} is ${occ.inDays === 0 ? 'today' : `in ${plural(occ.inDays, 'day')}`}.</a>` : '',
    C.dueCards().length ? `<a href="#/learn?tab=cards">${plural(C.dueCards().length, 'cartão', 'cartões')} para revisar.</a>` : '',
    nt && daysBetween(today(), nt.day) <= 30 && daysBetween(today(), nt.day) >= 0 ? `<a href="#/travel">${esc(nt.title)} in ${plural(daysBetween(today(), nt.day), 'day')}.</a>` : '',
  ].filter(Boolean);
  return `${visionBand()}${greetRow()}
    <div class="home-acts"><button class="btn sm solid" data-action="quick" data-v="note">${icon('inbox')} Capturar</button><button class="btn sm" data-action="quick" data-v="task">${icon('checkCircle')} Tarefa</button><button class="btn sm" data-action="quick" data-v="block">${icon('clock')} Reunião</button><button class="btn sm" data-action="quick" data-v="txn">${icon('wallet')} Dinheiro</button></div>
    <div class="home-grid">
      <div class="hg-main">${focus()}${plannerCards()}${inbox()}</div>
      <aside class="hg-right">${agendaClock()}${moneyCard()}${nudgesCard(nudges)}${calWidget()}</aside>
    </div>
    ${folders(HUBS)}
    <div class="home-grid low"><div class="hg-main">${metrics()}</div><aside class="hg-right">${summary()}</aside></div>`;
}
export const VIEWS_HOME = { home: viewHome };
