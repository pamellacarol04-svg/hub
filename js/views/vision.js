// 1 · Vision & Identity: a masonry vision board, the annual theme, core values, anti-goals and a
// manifestation log.  2 · Strategic Planning: the evergreen week (tasks fill in by date, overdue ones
// roll forward), a weekly reset checklist, the 12-week year with an execution score, OKRs with key
// results that add themselves up, and quarterly reviews that start with the quarter's numbers.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, parseDay, DAYS, DAYS_LONG, MONTHS, fmtShort, fmtLong, daysBetween, plural, hhmm, moneyWhole, round2 } from '../core.js';
import { items, byId, save, patch, dget, sortBy, addBtn, LIFE_AREAS, QUARTERS, PLAN_CATEGORIES, blockColor } from '../kinds.js';
import { photosOf, PICK_HOOKS } from '../photos.js';
import { GROUPS } from './lightbox.js';
import { D, saveData, card, hubHead, folderTabs, pickTab, emptyNote, photoDrop, masonry, itemsFromFiles, label, meter, sparkleWin, bigWin, seg, pin, twoCol, amt } from './common.js';
import { taskRow } from './home.js';
import { tabDay, tabQuarterPlan, tabYear } from './planners.js';
import * as C from '../hub.js';

// =====================================================================
// 1 · Vision & Identity
// =====================================================================
const VTABS = [['board', 'Quadro de visão'], ['identity', 'Identidade'], ['manifest', 'Diário de realizações']];
PICK_HOOKS.vpin = async (files) => { await itemsFromFiles(files, 'vpin', { cat: S.ui.vArea || 'self' }); toast('Fixado no quadro.'); };
GROUPS.vpin = () => items('vpin').filter(v => !S.ui.vArea || v.cat === S.ui.vArea).flatMap(v => photosOf(v.id));
ACTIONS['v-area'] = (b) => { S.ui.vArea = b.dataset.v || null; rerender(); };
const themeOf = (y = C.year()) => (D().themes || {})[y] || {};
FORMS['theme-save'] = async (f) => { const y = C.year(); try { await saveData({ themes: { ...(D().themes || {}), [y]: { word: f.elements.word.value.trim().slice(0, 40), line: f.elements.line.value.trim().slice(0, 200) } } }); toast('Sua palavra do ano foi definida.'); rerender(); } catch (e) { fail(e); } };
function themeCard() {
  const th = themeOf(); const y = C.year();
  return `<section class="theme-card">${pin()}<span class="kick">${y} · o ano de</span>${th.word ? `<p class="theme-word">${esc(th.word)}</p><p class="theme-line">${esc(th.line || '')}</p>` : '<p class="theme-word muted">sua palavra</p>'}
    <details class="theme-edit"><summary class="small">${th.word ? 'Alterar' : 'Escolha sua palavra'}</summary><form class="inline" data-form="theme-save"><label class="sr-only" for="th-w">Palavra</label><input class="input" id="th-w" name="word" maxlength="40" value="${esc(th.word || '')}" placeholder="Uma palavra, por exemplo: Raízes"><label class="sr-only" for="th-l">Significado</label><input class="input grow" id="th-l" name="line" maxlength="200" value="${esc(th.line || '')}" placeholder="O que ela significa, em uma frase"><button class="btn solid sm">Salvar</button></form></details></section>`;
}
function tabBoard() {
  const a = S.ui.vArea; const pins = sortBy(items('vpin').filter(v => !a || v.cat === a), v => v.created_at, -1);
  return `<div class="board-bar"><div class="chips" role="group" aria-label="Área da vida"><button class="chip" data-action="v-area" data-v="" aria-pressed="${!a}">Tudo</button>${Object.entries(LIFE_AREAS).map(([k, l]) => `<button class="chip" data-action="v-area" data-v="${k}" aria-pressed="${a === k}">${esc(l)}</button>`).join('')}</div></div>
  ${masonry(pins.map(v => ({ p: photosOf(v.id)[0], cap: v.title, id: v.id, sub: LIFE_AREAS[v.cat] || '' })).filter(x => x.p), 'vpin', photoDrop({ hook: 'vpin', label: 'Fixar mais fotos no quadro', sub: 'Vida dos sonhos, viagens e objetivos. Escolha várias de uma vez.', multiple: true, cls: 'm-add' }), 'vboard')}`;
}
function tabIdentity() {
  const vals = sortBy(items('value'), v => v.position || 0); const anti = items('antigoal');
  return `${themeCard()}${twoCol(
    card(`Valores <em>essenciais</em>`, vals.length ? `<ol class="values">${vals.map((v, i) => `<li><span class="v-n">${String(i + 1).padStart(2, '0')}</span><span><button class="link-plain" data-action="edit" data-id="${esc(v.id)}"><b>${esc(v.title)}</b></button><small>${esc(v.body || '')}</small></span></li>`).join('')}</ol>` : emptyNote('Pelo que você se posiciona?'), { link: addBtn('value', 'Valor', { cls: 'sm ghost' }), cls: 'lined', clip: true }),
    card(`Anti-<em>objetivos</em>`, `<p class="small muted">A vida que você está recusando viver. Tão esclarecedor quanto objetivos.</p>${anti.length ? `<ul class="antis">${anti.map(v => `<li><button class="link-plain" data-action="edit" data-id="${esc(v.id)}"><s>${esc(v.title)}</s></button><small>${esc(v.body || '')}</small></li>`).join('')}</ul>` : emptyNote('O que você não fará?')}`, { link: addBtn('antigoal', 'Anti-objetivo', { cls: 'sm ghost' }), cls: 'anti-card', tape: 'pink' }))}`;
}
ACTIONS['man-arrived'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { status: 'arrived', data: { arrived: today() } }); bigWin('Aconteceu. Registre como você se sente.'); rerender(); } catch (e) { fail(e); } };
function tabManifest() {
  const l = sortBy(items('manifest'), x => x.day || '', -1); const calling = l.filter(x => x.status !== 'arrived'); const came = l.filter(x => x.status === 'arrived');
  const row = (x) => `<li class="man ${x.status === 'arrived' ? 'arr' : ''}"><span class="man-d">${x.day ? esc(fmtShort(x.day)) : ''}</span><span class="man-t"><button class="link-plain" data-action="edit" data-id="${esc(x.id)}"><b>${esc(x.title)}</b></button>${x.body ? `<small>${esc(x.body)}</small>` : ''}${x.status === 'arrived' && dget(x, 'arrived') ? `<small class="good">Aconteceu em ${esc(fmtLong(dget(x, 'arrived')))}, ${plural(Math.max(0, daysBetween(x.day, dget(x, 'arrived'))), 'dia')} depois de escrito</small>` : ''}</span>${x.status !== 'arrived' ? `<button class="btn sm" data-action="man-arrived" data-id="${esc(x.id)}">${icon('sparkle')} Aconteceu</button>` : `<span class="hilite hl-butter">Realizado</span>`}</li>`;
  return `${twoCol(card(`Manifestando`, calling.length ? `<ul class="mans">${calling.map(row).join('')}</ul>` : emptyNote('Escreva como se já fosse seu.'), { link: addBtn('manifest', 'Escrever', { cls: 'sm', preset: { day: today(), status: 'calling' } }), cls: 'lined', pin: true }),
    card(`Já <em>aconteceu</em>`, came.length ? `<ul class="mans">${came.map(row).join('')}</ul>` : `<p class="small muted">Quando algo que você escreveu acontecer, toque em “Aconteceu”. Ele aparecerá aqui, junto ao tempo que levou.</p>`, { cls: 'arrived-card', tape: 'butter' }))}`;
}
function viewVision(r) {
  const tab = pickTab(VTABS, r.tab);
  return `${hubHead(1, 'Quem Estou Me Tornando', 'Visão e <em>Identidade</em>', 'A imagem da vida que você está construindo, os valores que guiam suas escolhas e o que você se recusa a trocar por ela.', addBtn('vpin', 'Adicionar foto', { cls: 'sm' }))}${folderTabs('vision', VTABS, tab)}<div class="tab-body">${{ board: tabBoard, identity: tabIdentity, manifest: tabManifest }[tab]()}</div>`;
}

// =====================================================================
// 2 · Strategic Planning
// =====================================================================
const PTABS = [['day', 'Diário'], ['week', 'Semanal'], ['quarter', 'Trimestral'], ['year', 'Anual'], ['twelve', 'Ano de 12 semanas'], ['okr', 'OKRs'], ['review', 'Revisão trimestral']];
ACTIONS['wk-nav'] = (b) => { S.ui.wk = b.dataset.v === '0' ? 0 : (S.ui.wk || 0) + Number(b.dataset.v); rerender(); };
ACTIONS['week-page-nav'] = (b) => { S.ui.weekPage = b.dataset.v === '0' ? 0 : (S.ui.weekPage || 0) + Number(b.dataset.v); rerender(); };
FORMS['week-task'] = async (form) => {
  const title = form.elements.task.value.trim();
  if (!title) return;
  try {
    await save({ kind: 'task', title: title.slice(0, 300), day: form.dataset.day, cat: 'med', status: 'todo', data: { fixedDate: true } });
    form.reset();
    rerender();
  } catch (e) { fail(e); }
};
ACTIONS['week-priority'] = async (button) => {
  const task = byId(button.dataset.id);
  if (!task || task.kind !== 'task') return;
  try {
    await patch(task, { data: { weekPriority: !dget(task, 'weekPriority') } });
    rerender();
  } catch (e) { fail(e); }
};
function tabWeek() {
  const wk = addDays(C.weekOf(), 4 * (S.ui.weekPage || 0)); const days = Array.from({ length: 4 }, (_, i) => addDays(wk, i)); const t = today(); const v = C.velocity(C.weekOf());
  const dayTasks = (d) => sortBy(C.tasks().filter(x => (x.status === 'done' ? (dget(x, 'doneOn') || x.day) : C.taskDay(x)) === d), x => (x.status === 'done' ? 9 : 0) + (C.PRIO[x.cat] ?? 1));
  const dayBlocks = (d) => sortBy(items('block').filter(x => x.day === d), x => dget(x, 'start') || '');
  return `<div class="wk-bar"><button class="icon-btn" data-action="week-page-nav" data-v="-1" aria-label="Quatro dias anteriores">${icon('back')}</button><b>${esc(fmtShort(wk))} – ${esc(fmtShort(addDays(wk, 3)))}</b><span class="hilite hl-blue">4 dias · Semana ${C.isoWeek(wk)}</span><button class="icon-btn" data-action="week-page-nav" data-v="1" aria-label="Próximos quatro dias">${icon('fwd')}</button>${S.ui.weekPage ? `<button class="btn sm ghost" data-action="week-page-nav" data-v="0">Esta semana</button>` : ''}<span class="right small muted">${v.done} de ${plural(v.total, 'tarefa')} concluídas · ${Math.round(v.pct * 100)}%</span></div>
  <p class="small muted evergreen">${icon('repeat')} Planejamento contínuo: esta página sempre acompanha sua semana atual. Tarefas abertas de dias anteriores avançam automaticamente.</p>
  <div class="wk-grid">${days.map(d => {
    const x = parseDay(d); const l = dayTasks(d); const open = l.filter(task => task.status !== 'done'); const done = l.filter(task => task.status === 'done');
    const pending = open.length; const total = l.length; const pctDone = total ? Math.round(done.length / total * 100) : 0;
    const blocks = dayBlocks(d); const priorities = l.filter(task => dget(task, 'weekPriority'));
    const dailyTasks = l.filter(task => !dget(task, 'weekPriority'));
    const dailyDone = dailyTasks.filter(task => task.status === 'done').length;
    return `<section class="wk-day ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}">
      <header class="week-day-head"><div><b>${x.getDate()}</b><strong>${esc(DAYS_LONG[x.getDay()])}</strong></div>${d === t ? '<span class="week-today">Hoje</span>' : ''}</header>
      <div class="week-day-date">${esc(fmtLong(d))}</div>
      <section class="week-day-section week-progress">
        <h3>Progresso diário</h3>
        <div class="week-progress-main"><strong>${pctDone}%</strong><dl><div><dt>Concluídas</dt><dd>${done.length}</dd></div><div><dt>Pendentes</dt><dd>${pending}</dd></div><div><dt>Total</dt><dd>${total}</dd></div></dl></div>
      </section>
      <section class="week-day-section"><h3>Prioridades</h3>${priorities.length ? `<ul class="tasks week-priorities">${priorities.map(task => taskRow(task, { weekPriority: true })).join('')}</ul>` : '<p>Nenhuma prioridade.</p>'}</section>
      <section class="week-day-section week-tasks"><div class="week-section-title"><h3>Tarefas do dia</h3><small>${dailyDone}/${dailyTasks.length}</small></div>${dailyTasks.length ? `<ul class="tasks">${dailyTasks.map(task => taskRow(task, { weekPriority: true })).join('')}</ul>` : '<p>Nenhuma tarefa.</p>'}
        <form class="week-task-form" data-form="week-task" data-day="${d}" autocomplete="off"><label class="sr-only" for="week-task-${d}">Adicionar tarefa</label><input class="input" id="week-task-${d}" name="task" maxlength="300" placeholder="Adicionar tarefa..."><button class="btn square" aria-label="Adicionar tarefa">${icon('plus')}</button></form>
      </section>
      <section class="week-day-section week-agenda"><h3>Agenda</h3>${blocks.length ? `<ul class="week-blocks">${blocks.map(block => { const color = blockColor(block); const start = dget(block, 'start'); const end = dget(block, 'end'); const time = start || end ? `${start ? hhmm(start) : '—'}–${end ? hhmm(end) : '—'}` : ''; const category = PLAN_CATEGORIES[dget(block, 'category')] || 'Sem categoria'; return `<li ${color ? `style="--block-color:${color}"` : ''}><button class="link-plain" data-action="edit" data-id="${esc(block.id)}">${time ? `${esc(time)} · ` : ''}${esc(block.title)}</button><small>Categoria: ${esc(category)}</small></li>`; }).join('')}</ul>` : '<p>Nenhum compromisso.</p>'}<button class="week-event" data-action="add" data-kind="block" data-preset="${esc(JSON.stringify({ day: d, cat: 'sky', data: { start: '09:00', end: '10:00' } }))}"><strong>Evento</strong>${icon('calendar')}</button></section>
    </section>`;
  }).join('')}</div>`;
}
// The 12-week year
const sprintNow = () => { const l = sortBy(items('sprint'), s => s.day || '', -1); return l.find(s => s.day <= today() && daysBetween(s.day, today()) < 84) || l[0] || null; };
const weekIdx = (s, d = today()) => Math.min(11, Math.max(0, Math.floor(daysBetween(s.day, d) / 7)));
ACTIONS['tac-tick'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const done = { ...(dget(x, 'done') || {}) }; const w = b.dataset.w; done[w] ? delete done[w] : done[w] = true; try { await patch(x, { data: { done } }); rerender(); } catch (e) { fail(e); } };
const weekScore = (s, w) => { const ts = items('tactic').filter(t => t.parent_id === s.id); return ts.length ? ts.filter(t => (dget(t, 'done') || {})[w]).length / ts.length : 0; };
function tabTwelve() {
  const s = sprintNow(); if (!s) return emptyNote('Doze semanas são tempo suficiente para mudar tudo e curto o bastante para manter o senso de urgência.', addBtn('sprint', 'Começar um ano de 12 semanas', { preset: { day: C.weekOf() } }));
  const w = weekIdx(s); const ts = items('tactic').filter(t => t.parent_id === s.id); const goals = dget(s, 'goals') || [];
  const scores = Array.from({ length: 12 }, (_, i) => weekScore(s, i)); const past = scores.slice(0, w + 1); const avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : 0;
  return `<section class="sprint-head">${label(`Week ${w + 1} of 12`, 'blue')}<h2 class="sprint-t">${esc(s.title)}</h2><p class="small muted">${esc(fmtLong(s.day))} – ${esc(fmtLong(addDays(s.day, 83)))} · ${plural(Math.max(0, 83 - daysBetween(s.day, today())), 'day')} left</p>
    <div class="sprint-goals">${goals.map((g, i) => `<span class="goal-tag"><b>${i + 1}</b>${esc(g)}</span>`).join('')}</div>
    <div class="exec"><span class="kick">Execution score so far</span><b class="num">${Math.round(avg * 100)}%</b><small class="muted">${avg >= .85 ? 'Above 85%: you’ll hit your goals.' : 'Aim for 85% of tactics done each week.'}</small></div>
    <div class="inline"><button class="btn sm ghost" data-action="edit" data-id="${esc(s.id)}">${icon('edit')} Edit</button>${addBtn('tactic', 'Tactic', { cls: 'sm', parent: s.id, preset: { parent_id: s.id } })}${addBtn('sprint', 'New 12 weeks', { cls: 'sm ghost', preset: { day: C.weekOf() } })}</div></section>
  <div class="tw-wrap"><table class="tw"><thead><tr><th scope="col">Tactic</th>${scores.map((_, i) => `<th scope="col" class="${i === w ? 'now' : ''}">W${i + 1}</th>`).join('')}</tr></thead><tbody>
    ${ts.map(t => `<tr><th scope="row"><button class="link-plain" data-action="edit" data-id="${esc(t.id)}">${esc(t.title)}</button>${dget(t, 'goal') ? `<small>${esc(dget(t, 'goal'))}</small>` : ''}</th>${scores.map((_, i) => `<td class="${i === w ? 'now' : ''}"><button class="cell ${(dget(t, 'done') || {})[i] ? 'on' : ''} ${i > w ? 'future' : ''}" data-action="tac-tick" data-id="${esc(t.id)}" data-w="${i}" aria-pressed="${Boolean((dget(t, 'done') || {})[i])}" aria-label="${esc(t.title)}, week ${i + 1}">${icon('check')}</button></td>`).join('')}</tr>`).join('') || `<tr><td colspan="13" class="small muted">Add the weekly tactics that move each goal.</td></tr>`}
    <tr class="score-row"><th scope="row">Score</th>${scores.map((sc, i) => `<td class="${i === w ? 'now' : ''}">${i <= w ? `${Math.round(sc * 100)}%` : ''}</td>`).join('')}</tr></tbody></table></div>`;
}
// OKRs
ACTIONS['okr-q'] = (b) => { S.ui.okrQ = b.dataset.v; rerender(); };
BINDS['kr-cur'] = async (t, type) => { if (type !== 'change') return; const x = byId(t.dataset.id); if (!x) return; const krs = (dget(x, 'krs') || []).map((k, i) => (i === Number(t.dataset.i) ? { ...k, cur: Math.max(0, Number(t.value) || 0) } : k)); try { await patch(x, { data: { krs } }); if (krs.every(k => (Number(k.cur) || 0) >= (Number(k.target) || 1))) bigWin('Objetivo concluído.'); rerender(); } catch (e) { fail(e); } };
export const okrPct = (o) => { const k = dget(o, 'krs') || []; return k.length ? k.reduce((a, x) => a + Math.min(1, (Number(x.cur) || 0) / (Number(x.target) || 1)), 0) / k.length : 0; };
function tabOkr() {
  const y = C.year(); const q = S.ui.okrQ || String(C.quarterOf()); const list = items('objective').filter(o => Number(o.num) === y && String(dget(o, 'q') || '') === q);
  return `<div class="okr-bar">${seg('okr-q', Object.entries(QUARTERS), q, 'Quarter')}<span class="small muted">${y}</span>${addBtn('objective', 'Objective', { cls: 'sm right', preset: { num: y, data: { q } } })}</div>
  ${list.length ? `<div class="okr-grid">${list.map(o => { const p = okrPct(o); return `<article class="okr card">${pin()}<header><span class="kick">${esc(LIFE_AREAS[o.cat] || 'Objective')}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(o.id)}">${esc(o.title)}</button></h3><b class="okr-p num">${Math.round(p * 100)}%</b></header>${meter(p, 'c1')}
    <ul class="krs">${(dget(o, 'krs') || []).map((k, i) => `<li><span>${esc(k.t)}</span><span class="kr-in"><label class="sr-only" for="kr-${esc(o.id)}-${i}">${esc(k.t)} so far</label><input class="input sm num" id="kr-${esc(o.id)}-${i}" type="number" min="0" value="${Number(k.cur) || 0}" data-bind="kr-cur" data-id="${esc(o.id)}" data-i="${i}"><small>/ ${esc(String(k.target))}</small></span>${meter(Math.min(1, (Number(k.cur) || 0) / (Number(k.target) || 1)), 'c4')}</li>`).join('')}</ul></article>`; }).join('')}</div>` : emptyNote(`No objectives for Q${q} yet. One to three is plenty.`)}`;
}
// Quarterly reviews
function qStats(y, q) {
  const a = `${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`; const b = C.quarterEnd(a); const ms = [0, 1, 2].map(i => a.slice(0, 5) + String((q - 1) * 3 + 1 + i).padStart(2, '0'));
  const days = []; for (let d = a; d <= b && d <= today(); d = addDays(d, 1)) days.push(d);
  return { tasks: C.tasks().filter(t => t.status === 'done' && (dget(t, 'doneOn') || t.day || '') >= a && (dget(t, 'doneOn') || t.day || '') <= b).length, habit: days.length ? days.reduce((s, d) => s + C.habitRate(d), 0) / days.length : 0,
    saved: round2(ms.reduce((s, m) => s + C.incomeIn(m) - C.spentIn(m), 0)), deep: Math.round(C.focusMins(C.sessionsIn(a, b).filter(s => s.cat !== 'shallow')) / 60), books: items('book').filter(x => x.status === 'done' && (dget(x, 'finished') || '') >= a && (dget(x, 'finished') || '') <= b).length };
}
function tabQuarter() {
  const y = C.year(); const cq = C.quarterOf();
  return `<div class="q-grid">${[1, 2, 3, 4].map(q => { const r = items('qreview').find(x => Number(x.num) === y && String(x.cat) === String(q)); const st = q <= cq ? qStats(y, q) : null; const col = (k, t) => (dget(r, k) || []).length ? `<h4>${t}</h4><ul>${dget(r, k).map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : '';
    return `<article class="qrev card ${q === cq ? 'now' : ''} ${q > cq ? 'future' : ''}"><header><h3>Q${q} <small>${y}</small></h3>${r && dget(r, 'score') ? `<span class="q-score">${esc(String(dget(r, 'score')))}<small>/10</small></span>` : ''}</header>
      ${st ? `<dl class="q-stats"><div><dt>Tasks done</dt><dd>${st.tasks}</dd></div><div><dt>Habits</dt><dd>${Math.round(st.habit * 100)}%</dd></div><div><dt>Saved</dt><dd>${amt(st.saved)}</dd></div><div><dt>Deep work</dt><dd>${st.deep} h</dd></div><div><dt>Books</dt><dd>${st.books}</dd></div></dl>` : `<p class="small muted">Still to come.</p>`}
      ${r ? `${col('wins', 'Wins')}${col('lessons', 'Lessons')}${col('next', 'Next quarter')}<button class="btn sm ghost" data-action="edit" data-id="${esc(r.id)}">${icon('edit')} Edit</button>` : q <= cq ? addBtn('qreview', `Review Q${q}`, { cls: 'sm', preset: { num: y, cat: String(q) } }) : ''}</article>`; }).join('')}</div>`;
}
function viewPlan(r) {
  const tab = pickTab(PTABS, r.tab);
  return `${hubHead(2, 'Estratégia, sem Estresse', 'Planejamento <em>Estratégico</em>', 'Planejadores diário, semanal, trimestral e anual, as doze semanas que importam, os objetivos do trimestre e uma visão honesta do que passou.', `<button class="btn sm solid" data-action="quick" data-v="task">${icon('plus')} Tarefa</button>`)}${folderTabs('plan', PTABS, tab)}<div class="tab-body">${{ day: tabDay, week: tabWeek, quarter: tabQuarterPlan, year: tabYear, twelve: tabTwelve, okr: tabOkr, review: tabQuarter }[tab]()}</div>`;
}
export const VIEWS_VISION = { vision: viewVision, plan: viewPlan };
