// The planners in Strategic Planning: a daily planner (an hour-by-hour timeline, the day's top 3 and
// tasks, habits, mood, notes and everything else landing that day), a quarterly planner (the quarter's
// focus and priorities, its objectives, three month calendars and the key dates) and a yearly planner
// (yearly goals with steps, twelve month calendars and the key dates of each month). All of them
// work out their dates from today and step forward or back, so they never run out.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, addMonths, parseDay, isoDate, DAYS, DAYS_LONG, MONTHS, MONTHS_LONG, fmtShort, fmtLong, daysBetween, plural, hhmm } from '../core.js';
import { items, byId, save, patch, dget, sortBy, addBtn, LIFE_AREAS, blockColor } from '../kinds.js';
import { D, saveData, card, emptyNote, label, meter, sparkleWin, bigWin, pin, binder, faces } from './common.js';
import { taskRow } from './home.js';
import * as C from '../hub.js';

// ---------------------------------------------------------------------
// What lands on a day: everything with a date, from every hub
// ---------------------------------------------------------------------
const yearsIn = (a, b) => { const out = []; for (let y = Number(a.slice(0, 4)); y <= Number(b.slice(0, 4)); y++) out.push(y); return out; };
/** Key dates between a and b (inclusive): events, trips, birthdays, deadlines, letters, renewals. */
export function keyDates(a, b) {
  const out = []; const add = (day, t, ic, href, tone = 'c1') => { if (day && day >= a && day <= b) out.push({ day, t, ic, href, tone }); };
  for (const e of items('event')) add(e.day, e.title, 'champagne', '#/social?tab=events', 'c3');
  for (const t of items('trip')) { add(t.day, `${t.title} begins`, 'airplane', '#/travel?tab=trips', 'c1'); if (dget(t, 'back') && dget(t, 'back') !== t.day) add(dget(t, 'back'), `Back from ${t.title}`, 'airplane', '#/travel?tab=trips', 'c1'); }
  for (const p of items('person')) for (const y of yearsIn(a, b)) { if (p.day) add(`${y}${p.day.slice(4, 10)}`, `${p.title}’s birthday`, 'cake', '#/social', 'c2'); if (dget(p, 'anniv')) add(`${y}${dget(p, 'anniv').slice(4, 10)}`, `${p.title}’s anniversary`, 'heart', '#/social', 'c2'); }
  for (const p of items('project').filter(p => p.status !== 'done')) add(p.day, `${p.title} due`, 'briefcase', '#/career', 'c6');
  for (const c of items('course')) add(c.day, `${c.title} ends`, 'graduation', '#/learn', 'c4');
  for (const l of items('letter').filter(l => l.status !== 'opened')) add(dget(l, 'open'), 'A letter to open', 'envelope', '#/archive?tab=letters', 'c3');
  for (const w of items('warranty')) add(dget(w, 'ends'), `${w.title} warranty ends`, 'shieldCheck', '#/house?tab=vault', 'c5');
  for (const s of items('sub').filter(s => C.subActive(s) && s.cat === 'yearly')) add(C.nextCharge(s, a), `${s.title} renews`, 'repeat', '#/money?tab=subs', 'c5');
  for (const m of items('meeting')) add(m.day, m.title, 'users', '#/career?tab=meetings', 'c1');
  return sortBy(out, x => x.day);
}
const tasksDue = (d) => C.tasks().filter(t => (t.status === 'done' ? (dget(t, 'doneOn') || t.day) : C.taskDay(t)) === d);
const blocksOn = (d) => sortBy(items('block').filter(b => b.day === d), b => dget(b, 'start') || '');
/** A small month calendar. Days with key dates or tasks get a dot; every day opens the daily planner. */
export function monthGrid(ym, opts = {}) {
  const first = `${ym}-01`; const ws = Number(S.settings.week_start ?? 1); const lead = (parseDay(first).getDay() - ws + 7) % 7; const dim = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const kd = opts.kd || keyDates(first, `${ym}-${String(dim).padStart(2, '0')}`); const names = Array.from({ length: 7 }, (_, i) => DAYS[(i + ws) % 7][0]); const t = today();
  return `<div class="mcal"><div class="mcal-h"><b>${esc(MONTHS_LONG[Number(ym.slice(5, 7)) - 1])}</b>${opts.year ? `<small>${ym.slice(0, 4)}</small>` : ''}</div><div class="mcal-g">${names.map(n => `<span class="mc-dn">${n}</span>`).join('')}${'<i></i>'.repeat(lead)}
    ${Array.from({ length: dim }, (_, i) => { const d = `${ym}-${String(i + 1).padStart(2, '0')}`; const k = kd.filter(x => x.day === d); const tk = tasksDue(d).length; const tip = [...k.map(x => x.t), tk ? plural(tk, 'task') : ''].filter(Boolean).join(' · ');
      return `<button class="mc-d ${d === t ? 'today' : ''} ${d < t ? 'past' : ''} ${k.length ? 'key' : ''}" data-action="goto-day" data-v="${d}" aria-label="${esc(fmtLong(d))}${tip ? `: ${esc(tip)}` : ''}" ${tip ? `data-tip="${esc(`${fmtShort(d)}: ${tip}`)}"` : ''}>${i + 1}${k.length || tk ? `<i class="${k.length ? esc(k[0].tone) : 'tk'}"></i>` : ''}</button>`; }).join('')}</div></div>`;
}
ACTIONS['goto-day'] = (b) => { S.ui.pday = b.dataset.v; location.hash = '#/plan?tab=day'; };

// ---------------------------------------------------------------------
// The daily planner
// ---------------------------------------------------------------------
ACTIONS['day-nav'] = (b) => { S.ui.pday = b.dataset.v === '0' ? null : addDays(S.ui.pday || today(), Number(b.dataset.v)); rerender(); };
BINDS['day-pick'] = (t, type) => { if (type === 'change' && t.value) { S.ui.pday = t.value === today() ? null : t.value; rerender(); } };
BINDS['day-note'] = async (t, type) => { if (type !== 'change') return; await saveData({ dayNotes: { ...(D().dayNotes || {}), [t.dataset.day]: t.value.slice(0, 4000) } }); toast('Saved.'); };
FORMS['day-task'] = async (f) => { const t = f.elements.t.value.trim(); if (!t) return; try { await save({ kind: 'task', title: t.slice(0, 300), day: f.dataset.day, cat: f.elements.p.value || 'med', status: 'todo' }); f.reset(); rerender(); setTimeout(() => document.getElementById('dt-in')?.focus(), 30); } catch (e) { fail(e); } };
const H0 = 6, H1 = 23;
const toM = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
export function tabDay() {
  const d = S.ui.pday || today(); const x = parseDay(d); const isToday = d === today(); const past = d < today();
  const bl = blocksOn(d); const ts = tasksDue(d); const open = sortBy(ts.filter(t => t.status !== 'done'), t => (C.PRIO[t.cat] ?? 1) * 1000 - C.carried(t)); const top = open.slice(0, 3); const rest = [...open.slice(3), ...ts.filter(t => t.status === 'done')];
  const hs = C.habits(); const hd = new Set(C.habitsDone(d)); const kd = keyDates(d, d); const plan = C.mealPlan(C.weekOf(d)); const di = C.weekDays(C.weekOf(d)).indexOf(d);
  const meals = Object.entries(C.SLOTS).map(([k, l]) => [l, plan[`${di}${k}`] && byId(plan[`${di}${k}`])]).filter(([, r]) => r);
  const chores = items('chore').filter(c => C.choreNext(c) === d || (isToday && C.choreNext(c) < d)); const plants = items('plant').filter(p => C.plantNext(p) === d || (isToday && C.plantNext(p) < d));
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  return `<div class="wk-bar"><button class="icon-btn" data-action="day-nav" data-v="-1" aria-label="Dia anterior">${icon('back')}</button><b>${esc(DAYS_LONG[x.getDay()])}, ${x.getDate()} de ${esc(MONTHS_LONG[x.getMonth()])}</b><button class="icon-btn" data-action="day-nav" data-v="1" aria-label="Próximo dia">${icon('fwd')}</button>
    ${label(`Semana ${C.isoWeek(d)}`, 'blue')}${label(`T${C.quarterOf(d)}`, 'butter')}${isToday ? label('Hoje', 'pink') : `<button class="btn sm ghost" data-action="day-nav" data-v="0">Hoje</button>`}<label class="right sr-only" for="day-pick">Ir para uma data</label><input class="input sm day-pick right" id="day-pick" type="date" value="${d}" data-bind="day-pick"></div>
  <div class="day-grid">
    <section class="timeline card day-tl">${pin()}<header class="card-head"><h2>A <em>agenda</em></h2>${addBtn('block', 'Bloco de tempo', { cls: 'sm ghost', preset: { day: d, cat: 'sky', data: { start: '09:00', end: '10:00' } } })}</header>
      <div class="tl" style="--rows:${H1 - H0}">${Array.from({ length: H1 - H0 }, (_, i) => { const h = H0 + i; const hh = `${String(h).padStart(2, '0')}:00`; return `<div class="tl-h"><span>${C.hourLabel(h)}</span><button class="tl-slot" data-action="add" data-kind="block" data-preset="${esc(JSON.stringify({ day: d, cat: 'sky', data: { start: hh, end: `${String(Math.min(23, h + 1)).padStart(2, '0')}:00` } }))}" aria-label="Planejar algo às ${C.hourLabel(h)}"></button></div>`; }).join('')}
      ${bl.map(b => { const s = Math.max(H0 * 60, toM(dget(b, 'start'))), e = Math.min(H1 * 60, Math.max(s + 20, toM(dget(b, 'end')))); const color = blockColor(b); return `<button class="tl-b tn-${esc(b.cat || 'sky')}" style="${color ? `--block-color:${color};` : ''}top:${((s - H0 * 60) / ((H1 - H0) * 60) * 100).toFixed(2)}%;height:${((e - s) / ((H1 - H0) * 60) * 100).toFixed(2)}%" data-action="edit" data-id="${esc(b.id)}"><b>${dget(b, 'meet') ? `${icon('users')} ` : ''}${esc(b.title)}</b><small>${esc(hhmm(dget(b, 'start')))}–${esc(hhmm(dget(b, 'end')))}</small></button>`; }).join('')}
      ${isToday && nowM >= H0 * 60 && nowM <= H1 * 60 ? `<i class="tl-now" style="top:${((nowM - H0 * 60) / ((H1 - H0) * 60) * 100).toFixed(2)}%" aria-hidden="true"></i>` : ''}</div>
      <p class="small muted">Toque em qualquer horário para planejar algo.</p></section>
    <div class="day-side">
      ${card(`Top <em>3</em>`, `${top.length ? `<ol class="tasks top">${top.map(t => taskRow(t)).join('')}</ol>` : `<p class="small muted">${past ? 'Não havia nada pendente.' : 'Nada planejado ainda. O que faria este dia valer a pena?'}</p>`}
        ${rest.length ? `<h4>Outras tarefas</h4><ul class="tasks">${rest.map(t => taskRow(t)).join('')}</ul>` : ''}
        <form class="cap-form day-task" data-form="day-task" data-day="${d}" autocomplete="off"><label class="sr-only" for="dt-in">Adicionar tarefa</label><input class="input" id="dt-in" name="t" maxlength="300" placeholder="Adicionar tarefa para este dia"><label class="sr-only" for="dt-p">Prioridade</label><select class="input dt-p" id="dt-p" name="p"><option value="high">Alta</option><option value="med" selected>Média</option><option value="low">Baixa</option></select><button class="btn solid" aria-label="Adicionar">${icon('plus')}</button></form>`, { cls: 'lined', clip: true })}
      ${d <= today() ? card('Hábitos e <em>humor</em>', `<ul class="habits">${hs.map(h => `<li><button class="hab ${hd.has(h.id) ? 'on' : ''}" data-action="habit-tick" data-id="${esc(h.id)}" data-day="${d}" aria-pressed="${hd.has(h.id)}">${icon(dget(h, 'icon') || 'sparkle')}<span>${esc(h.title)}</span></button></li>`).join('') || '<li class="small muted">Nenhum hábito ainda.</li>'}</ul><div class="mood-today"><span class="small muted">Humor:</span>${faces('mood-set', C.moodOn(d), `data-day="${d}"`)}</div>`) : ''}
      ${card('Mais <em>hoje</em>', `<ul class="also">${[
        ...kd.map(k => `<li><a href="${k.href}">${icon(k.ic)} ${esc(k.t)}</a></li>`),
        ...meals.map(([l, r]) => `<li><a href="#/kitchen?tab=plan">${icon('chef')} ${esc(l)}: ${esc(r.title)}</a></li>`),
        ...chores.map(c => `<li><a href="#/house">${icon('broom')} ${esc(c.title)}</a></li>`),
        ...plants.map(p => `<li><a href="#/house?tab=plants">${icon('drop')} Water the ${esc(p.title.toLowerCase())}</a></li>`),
      ].join('') || '<li class="small muted">Nada mais está marcado para este dia.</li>'}</ul>`, { tape: 'blue' })}
      ${card('Notas', `<label class="sr-only" for="day-note">Notas do dia</label><textarea class="input day-note" id="day-note" rows="5" data-bind="day-note" data-day="${d}" placeholder="Ideias, lembretes, como foi o dia…">${esc((D().dayNotes || {})[d] || '')}</textarea>`, { cls: 'lined' })}
    </div></div>`;
}

// ---------------------------------------------------------------------
// The quarterly planner
// ---------------------------------------------------------------------
ACTIONS['q-nav'] = (b) => { S.ui.pq = b.dataset.v === '0' ? 0 : (S.ui.pq || 0) + Number(b.dataset.v); rerender(); };
const qKey = (y, q) => `${y}-Q${q}`;
FORMS['q-plan'] = async (f) => { const k = f.dataset.k; const pr = ['p1', 'p2', 'p3'].map(n => f.elements[n].value.trim().slice(0, 200)); await saveData({ qPlan: { ...(D().qPlan || {}), [k]: { ...((D().qPlan || {})[k] || {}), focus: f.elements.focus.value.trim().slice(0, 240), pri: pr } } }); toast('Plano trimestral salvo.'); rerender(); };
ACTIONS['qp-tick'] = async (b) => { const k = b.dataset.k; const all = { ...(D().qPlan || {}) }; const cur = { ...(all[k] || {}) }; const done = new Set(cur.done || []); const i = Number(b.dataset.i); done.has(i) ? done.delete(i) : done.add(i); cur.done = [...done]; all[k] = cur; await saveData({ qPlan: all }); if (done.has(i)) await sparkleWin('Prioridade trimestral concluída.', b); rerender(); };
export function tabQuarterPlan() {
  const start = addMonths(C.quarterStart(), 3 * (S.ui.pq || 0)); const y = Number(start.slice(0, 4)); const q = C.quarterOf(start); const end = C.quarterEnd(start); const k = qKey(y, q); const qp = (D().qPlan || {})[k] || {}; const done = new Set(qp.done || []);
  const kd = keyDates(start, end); const objs = items('objective').filter(o => Number(o.num) === y && String(dget(o, 'q')) === String(q)); const okrPct = (o) => { const kr = dget(o, 'krs') || []; return kr.length ? kr.reduce((a, x) => a + Math.min(1, (Number(x.cur) || 0) / (Number(x.target) || 1)), 0) / kr.length : 0; };
  const t = today(); const inQ = t >= start && t <= end; const months = [0, 1, 2].map(i => addMonths(start, i).slice(0, 7));
  const span = daysBetween(start, end) + 1; const gone = inQ ? daysBetween(start, t) + 1 : t > end ? span : 0;
  return `<div class="wk-bar"><button class="icon-btn" data-action="q-nav" data-v="-1" aria-label="Trimestre anterior">${icon('back')}</button><b>T${q} ${y}</b><button class="icon-btn" data-action="q-nav" data-v="1" aria-label="Próximo trimestre">${icon('fwd')}</button><span class="small muted">${esc(fmtShort(start))} – ${esc(fmtShort(end))}</span>${S.ui.pq ? `<button class="btn sm ghost" data-action="q-nav" data-v="0">Este trimestre</button>` : ''}<span class="right reset-row q-prog">${meter(gone / span, 'c1', 'Trimestre até agora')}<small>${inQ ? `${span - gone} dias restantes` : t > end ? 'Concluído' : 'Ainda por vir'}</small></span></div>
  <div class="two-col">
    ${card(`Foco do <em>trimestre</em>`, `<form data-form="q-plan" data-k="${k}" class="q-plan"><label class="field"><span>Uma frase para o trimestre</span><input class="input q-focus" name="focus" maxlength="240" value="${esc(qp.focus || '')}" placeholder="Ex.: Finalizar o portfólio e proteger minhas manhãs"></label>
      ${[0, 1, 2].map(i => `<div class="qp-row"><button type="button" class="cb ${done.has(i) ? 'on' : ''}" data-action="qp-tick" data-k="${k}" data-i="${i}" aria-pressed="${done.has(i)}" aria-label="Prioridade ${i + 1} concluída">${icon('check')}</button><label class="sr-only" for="qp${i}">Prioridade ${i + 1}</label><input class="input" id="qp${i}" name="p${i + 1}" maxlength="200" value="${esc((qp.pri || [])[i] || '')}" placeholder="Prioridade ${i + 1}"></div>`).join('')}<button class="btn sm solid">Salvar</button></form>`, { cls: 'lined', pin: true })}
    ${card(`Objetivos`, objs.length ? `<ul class="q-objs">${objs.map(o => `<li><a href="#/plan?tab=okr"><b>${esc(o.title)}</b></a>${meter(okrPct(o), 'c4')}<small>${Math.round(okrPct(o) * 100)}%</small></li>`).join('')}</ul>` : emptyNote(`Ainda não há objetivos para o T${q}.`), { link: addBtn('objective', 'Objetivo', { cls: 'sm ghost', preset: { num: y, data: { q: String(q) } } }), tape: 'butter' })}
  </div>
  <section class="q-months">${months.map(m => `<div class="card qm">${monthGrid(m, { kd })}<ul class="kd-list">${kd.filter(x => x.day.startsWith(m)).slice(0, 6).map(x => `<li><span class="kd-d">${parseDay(x.day).getDate()}</span><a href="${x.href}"><i class="kd-dot ${esc(x.tone)}"></i>${esc(x.t)}</a></li>`).join('') || '<li class="small muted">No key dates.</li>'}</ul></div>`).join('')}</section>
  <p class="small muted evergreen">${icon('repeat')} Key dates come from every hub: events, trips, birthdays, project deadlines, courses, letters and renewals. Tap a day to open it in the daily planner.</p>`;
}

// ---------------------------------------------------------------------
// The yearly planner
// ---------------------------------------------------------------------
ACTIONS['y-nav'] = (b) => { S.ui.py = b.dataset.v === '0' ? 0 : (S.ui.py || 0) + Number(b.dataset.v); rerender(); };
ACTIONS['goal-step'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const st = C.stepsOf(x); const i = Number(b.dataset.i); st[i] = { ...st[i], done: !st[i].done }; try { await patch(x, { data: { steps: st } }); if (st.every(s => s.done)) bigWin(`Goal reached: ${x.title}.`); else if (st[i].done) await sparkleWin('', b); rerender(); } catch (e) { fail(e); } };
export function tabYear() {
  const y = new Date().getFullYear() + (S.ui.py || 0); const a = `${y}-01-01`, b = `${y}-12-31`; const kd = keyDates(a, b); const goals = sortBy(items('goal').filter(g => Number(g.num) === y), g => g.cat || ''); const th = (D().themes || {})[y] || {};
  const t = today(); const pct = y < Number(t.slice(0, 4)) ? 1 : y > Number(t.slice(0, 4)) ? 0 : C.dayOfYear(t) / C.daysInYear(y);
  return `<div class="wk-bar"><button class="icon-btn" data-action="y-nav" data-v="-1" aria-label="Ano anterior">${icon('back')}</button><b>${y}</b><button class="icon-btn" data-action="y-nav" data-v="1" aria-label="Próximo ano">${icon('fwd')}</button>${S.ui.py ? `<button class="btn sm ghost" data-action="y-nav" data-v="0">Este ano</button>` : ''}${th.word ? label(`O ano de ${th.word}`, 'pink') : ''}<span class="right reset-row q-prog">${meter(pct, 'c1', 'O ano até agora')}<small>${Math.round(pct * 100)}%</small></span></div>
  <section class="sec-head goals-head"><h2>Metas <em>anuais</em></h2>${addBtn('goal', 'Meta', { cls: 'sm', preset: { num: y, cat: 'growth' } })}</section>
  ${goals.length ? `<div class="goal-grid">${goals.map(g => { const st = C.stepsOf(g); const p = C.stepPct(g); return `<article class="goal card">${binder()}<span class="kick">${esc(LIFE_AREAS[g.cat] || 'Goal')}${g.day ? ` · by ${esc(fmtShort(g.day))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(g.id)}">${esc(g.title)}</button></h3><div class="reset-row">${meter(p, 'c4', 'Progress')}<small>${Math.round(p * 100)}%</small></div>
    <ul class="checks">${st.map((s, i) => `<li><button class="cb ${s.done ? 'on' : ''}" data-action="goal-step" data-id="${esc(g.id)}" data-i="${i}" aria-pressed="${s.done}">${icon('check')}<span>${esc(s.t)}</span></button></li>`).join('')}</ul></article>`; }).join('')}</div>` : emptyNote(`What will ${y} be about? Add a goal and break it into steps.`)}
  <section class="sec-head"><h2>The year at a <em>glance</em></h2><p class="small muted">${plural(kd.length, 'key date')} across ${y}. Tap any day to plan it.</p></section>
  <div class="year-grid">${Array.from({ length: 12 }, (_, i) => { const m = `${y}-${String(i + 1).padStart(2, '0')}`; const mk = kd.filter(x => x.day.startsWith(m)); return `<div class="card ym ${m === t.slice(0, 7) ? 'now' : ''}">${monthGrid(m, { kd })}<ul class="kd-list sm">${mk.slice(0, 3).map(x => `<li><span class="kd-d">${parseDay(x.day).getDate()}</span><a href="${x.href}"><i class="kd-dot ${esc(x.tone)}"></i>${esc(x.t)}</a></li>`).join('')}${mk.length > 3 ? `<li class="small muted">+ ${mk.length - 3} more</li>` : ''}</ul></div>`; }).join('')}</div>`;
}
