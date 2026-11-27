// 7 · Mental Wellness: a daily mood logger, a trigger tracker, therapy notes, guided prompts and a
// gratitude log.  8 · Kitchen & Nutrition: a Pinterest-style recipe grid, a weekly meal planner that
// points at those recipes, and a grocery list that writes itself.  9 · Home & Lifestyle: a chore
// frequency matrix, plants that tell you when they're thirsty, a home inventory, a warranty and
// manual vault, and interior mood boards.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, parseDay, DAYS, DAYS_LONG, MONTHS, MONTHS_LONG, fmtShort, fmtLong, daysBetween, plural, hash, relDay } from '../core.js';
import { items, byId, save, patch, remove, dget, sortBy, addBtn, TRIGGER_KINDS, JOURNAL_KINDS, RECIPE_KINDS, ROOMS, CHORE_FREQ, LIGHT } from '../kinds.js';
import { photosOf, img, isPdf, PICK_HOOKS } from '../photos.js';
import { lineChart, barChart } from '../ui.js';
import { GROUPS } from './lightbox.js';
import { D, saveData, card, hubHead, folderTabs, pickTab, emptyNote, photoDrop, masonry, label, meter, sparkleWin, bigWin, seg, pin, binder, twoCol, polaroid, faces, FACE_WORDS, amt, itemsFromFiles } from './common.js';
import * as C from '../hub.js';

// =====================================================================
// 7 · Mental Wellness
// =====================================================================
const WTABS = [['mood', 'Humor'], ['triggers', 'Gatilhos'], ['therapy', 'Notas de terapia'], ['journal', 'Diário e gratidão']];
export const PROMPTS = ['O que faria hoje parecer um bom dia, honestamente?', 'O que estou carregando que não é meu para carregar?', 'Quando me senti mais eu mesmo nesta semana?', 'Qual pequena coisa posso perdoar em mim?', 'Do que meu corpo precisa neste momento?', 'Qual pensamento continua voltando, e ele é verdadeiro?', 'Que limite faria a próxima semana ficar mais leve?', 'Quem me fez sentir seguro recentemente, e como?', 'Do que tenho orgulho que ninguém viu?', 'Se minha ansiedade pudesse falar, o que pediria?', 'O que eu diria a um amigo na minha situação?', 'O que fiz hoje que meu eu do futuro agradecerá?'];
export const promptOf = (d = today()) => PROMPTS[hash(d) % PROMPTS.length];
const validMindDay = (day) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today()) return false;
  const parsed = parseDay(day);
  return parsed.getFullYear() === Number(day.slice(0, 4)) && parsed.getMonth() + 1 === Number(day.slice(5, 7)) && parsed.getDate() === Number(day.slice(8, 10));
};
const mindRecordDay = () => validMindDay(S.ui.mindDay) ? S.ui.mindDay : today();
const mindDayPicker = (day) => `<label class="field mind-day-field"><span>Data do registro</span><input class="input" type="date" name="mind-day" value="${esc(day)}" max="${today()}" data-bind="mind-record-day"></label>`;
BINDS['mind-record-day'] = (input, type) => {
  if (type !== 'change') return;
  if (!validMindDay(input.value)) { toast('Escolha uma data válida até hoje.', { error: true }); input.value = mindRecordDay(); return; }
  S.ui.mindDay = input.value;
  rerender();
};
ACTIONS['feel'] = async (b) => { const d = validMindDay(b.dataset.day) ? b.dataset.day : mindRecordDay(); const all = { ...(D().feelings || {}) }; const s = new Set(all[d] || []); s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v); all[d] = [...s]; await saveData({ feelings: all }); rerender(); };
FORMS['mood-note'] = async (f) => {
  const day = f.elements.day.value;
  if (!validMindDay(day)) { toast('Escolha uma data válida até hoje.', { error: true }); return; }
  await saveData({ moodNote: { ...(D().moodNote || {}), [day]: f.elements.note.value.trim().slice(0, 1000) } });
  toast('Salvo.'); rerender();
};
function tabMood() {
  const t = mindRecordDay(); const m = C.moodOn(t); const fs = new Set(C.feelingsOn(t)); const days = C.lastDays(30); const counts = {};
  for (const d of days) for (const f of C.feelingsOn(d)) counts[f] = (counts[f] || 0) + 1;
  const ms = new Date(parseDay(t).getFullYear(), parseDay(t).getMonth(), 1); const lead = (ms.getDay() + 6) % 7; const dim = new Date(ms.getFullYear(), ms.getMonth() + 1, 0).getDate();
  const status = m ? `${t === today() ? 'Hoje' : 'Nesse dia'} você se sentiu ${FACE_WORDS[m].toLowerCase()}.` : (t === today() ? 'Toque em uma expressão. Não há resposta errada.' : 'Nenhum humor registrado nesta data.');
  return `${twoCol(card(`Como você está, <em>de verdade?</em>`, `${mindDayPicker(t)}${faces('mood-set', m, `data-day="${t}"`)}<p class="small muted center">${status}</p>
    <h3>Nomeie o sentimento</h3><div class="chips feel-chips">${C.FEELINGS.map(f => `<button class="chip" data-action="feel" data-day="${t}" data-v="${esc(f)}" aria-pressed="${fs.has(f)}">${esc(f)}</button>`).join('')}</div>
    <form data-form="mood-note" class="mood-note"><input type="hidden" name="day" value="${esc(t)}"><label class="sr-only" for="mn">Uma nota sobre esta data</label><textarea class="input" id="mn" name="note" rows="2" placeholder="Há algo por trás disso?">${esc(C.moodNote(t))}</textarea><button class="btn sm solid">Salvar</button></form>`, { cls: 'lined', pin: true }),
    card(`${esc(MONTHS_LONG[ms.getMonth()])} ${ms.getFullYear()} <em>em emoções</em>`, `<div class="mood-cal" role="img" aria-label="Humor em cada dia do mês selecionado">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map(x => `<b>${x}</b>`).join('')}${Array(lead).fill('<i></i>').join('')}${Array.from({ length: dim }, (_, i) => { const d = `${t.slice(0, 8)}${String(i + 1).padStart(2, '0')}`; const v = C.moodOn(d); return `<i class="md m${v || 0} ${d === today() ? 'today' : ''} ${d === t ? 'selected' : ''}" data-tip="${esc(`${fmtShort(d)}: ${v ? FACE_WORDS[v] : 'não registrado'}`)}">${i + 1}</i>`; }).join('')}</div>
      <div class="feel-top">${Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => label(`${f} ×${n}`, 'blue')).join('') || '<small class="muted">Os sentimentos mais frequentes aparecem aqui.</small>'}</div>`))}
  ${card(`Trinta <em>dias</em>`, lineChart(days.map(d => `${parseDay(d).getDate()}`), [{ name: 'Humor', tone: 'c2', values: days.map(C.moodOn) }], { min: 1, max: 5, ticks: [1, 3, 5], fmt: (x) => FACE_WORDS[Math.round(x)] || '', label: 'Humor nos últimos 30 dias', h: 200, w: 1000 }))}`;
}
function tabTriggers() {
  const l = sortBy(items('trigger'), x => x.day || '', -1); const since = addDays(today(), -60); const recent = l.filter(x => x.day >= since); const by = {};
  for (const x of recent) { const k = x.cat || 'other'; by[k] = by[k] || { n: 0, sum: 0 }; by[k].n++; by[k].sum += Number(dget(x, 'intensity')) || 0; }
  const top = Object.entries(by).sort((a, b) => b[1].n - a[1].n);
  return `<div class="okr-bar">${addBtn('trigger', 'Registrar gatilho', { cls: 'sm', preset: { day: today(), data: { intensity: 3 } } })}</div>
  ${top.length ? card(`O <em>padrão</em>`, `<p class="small muted">Últimos 60 dias.</p><ul class="pattern">${top.map(([k, v]) => `<li><b>${esc(TRIGGER_KINDS[k] || k)}</b>${meter(v.n / top[0][1].n, 'c2')}<small>${plural(v.n, 'vez')} · média ${(v.sum / v.n).toFixed(1)} de 5</small></li>`).join('')}</ul>`, { cls: 'pattern-card', tape: 'blue' }) : ''}
  <div class="trig-list">${l.map(x => `<article class="trig card"><header><span class="kick">${esc(fmtLong(x.day))} · ${esc(TRIGGER_KINDS[x.cat] || '')}</span><span class="intensity i${Number(dget(x, 'intensity')) || 0}" aria-label="Intensity ${dget(x, 'intensity') || 0} of 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < (Number(dget(x, 'intensity')) || 0) ? 'on' : ''}"></i>`).join('')}</span></header><h3><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.title)}</button></h3>
    <dl>${[['felt', 'Sentimento'], ['did', 'Resposta'], ['helps', 'Na próxima vez']].filter(([k]) => dget(x, k)).map(([k, l2]) => `<div><dt>${l2}</dt><dd>${esc(dget(x, k))}</dd></div>`).join('')}</dl></article>`).join('') || emptyNote('Perceber já é o primeiro passo. Registre o que aconteceu com gentileza.')}</div>`;
}
ACTIONS['hw-tick'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const s = new Set(dget(x, 'hwDone') || []); const i = Number(b.dataset.i); s.has(i) ? s.delete(i) : s.add(i); try { await patch(x, { data: { hwDone: [...s] } }); rerender(); } catch (e) { fail(e); } };
function tabTherapy() {
  const l = sortBy(items('therapy'), x => x.day || '', -1);
  return `<div class="okr-bar">${addBtn('therapy', 'Notas da sessão', { cls: 'sm', preset: { day: today() } })}<span class="small muted">${icon('lock')} Só você pode ver estas notas.</span></div>
  <div class="meet-list">${l.map(x => { const hw = dget(x, 'homework') || []; const hd = new Set(dget(x, 'hwDone') || []); return `<article class="meet card lined">${pin()}<header><span class="kick">${esc(fmtLong(x.day))}${dget(x, 'who') ? ` · ${esc(dget(x, 'who'))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.title)}</button></h3></header>${x.body ? `<p class="meet-notes">${esc(x.body)}</p>` : ''}
    ${(dget(x, 'takeaways') || []).length ? `<h4>Aprendizados</h4><ul class="take">${dget(x, 'takeaways').map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${hw.length ? `<h4>Para praticar</h4><ul class="checks">${hw.map((h, i) => `<li><button class="cb ${hd.has(i) ? 'on' : ''}" data-action="hw-tick" data-id="${esc(x.id)}" data-i="${i}" aria-pressed="${hd.has(i)}">${icon('check')}<span>${esc(h)}</span></button></li>`).join('')}</ul>` : ''}</article>`; }).join('') || emptyNote('Anote cada sessão para que os aprendizados não se percam.')}</div>`;
}
FORMS['journal-write'] = async (f) => {
  const t = f.elements.body.value.trim(); const day = f.elements.day.value;
  if (!t) { toast('Escreva pelo menos uma linha.', { error: true }); return; }
  if (!validMindDay(day)) { toast('Escolha uma data válida até hoje.', { error: true }); return; }
  try { await save({ kind: 'journal', cat: 'prompt', title: f.elements.prompt.value, day, body: t }); f.reset(); await sparkleWin('Salvo no seu diário.'); rerender(); } catch (e) { fail(e); }
};
FORMS['grat-write'] = async (f) => {
  const three = ['g1', 'g2', 'g3'].map(n => f.elements[n].value.trim()).filter(Boolean); const day = f.elements.day.value;
  if (!three.length) { toast('Escreva pelo menos uma coisa.', { error: true }); return; }
  if (!validMindDay(day)) { toast('Escolha uma data válida até hoje.', { error: true }); return; }
  try {
    const ex = items('journal').find(j => j.cat === 'gratitude' && j.day === day);
    if (ex) await patch(ex, { body: three.join('\n'), data: { three } });
    else await save({ kind: 'journal', cat: 'gratitude', title: 'Três coisas boas', day, body: three.join('\n'), data: { three } });
    await sparkleWin('Gratidão registrada.'); rerender();
  } catch (e) { fail(e); }
};
function tabJournal() {
  const day = mindRecordDay(); const p = promptOf(day); const g = items('journal').find(j => j.cat === 'gratitude' && j.day === day); const gt = dget(g, 'three') || []; const l = sortBy(items('journal'), j => (j.day || '') + j.created_at, -1);
  const streak = (() => { let n = 0; let d = g ? day : addDays(day, -1); while (items('journal').some(j => j.cat === 'gratitude' && j.day === d) && n < 999) { n++; d = addDays(d, -1); } return n; })();
  return `${mindDayPicker(day)}${twoCol(card(`Pergunta para <em>${day === today() ? 'hoje' : esc(fmtLong(day))}</em>`, `<p class="prompt">${esc(p)}</p><form data-form="journal-write"><input type="hidden" name="prompt" value="${esc(p)}"><input type="hidden" name="day" value="${esc(day)}"><label class="sr-only" for="jw">Sua resposta</label><textarea class="input" id="jw" name="body" rows="5" placeholder="Comece por qualquer ponto."></textarea><button class="btn solid sm">Salvar no diário</button></form>`, { cls: 'lined', clip: true }),
    card(`Três coisas <em>boas</em>`, `<form data-form="grat-write" class="grat"><input type="hidden" name="day" value="${esc(day)}">${[0, 1, 2].map(i => `<label class="g-line"><span>${i + 1}.</span><input class="input" name="g${i + 1}" maxlength="200" value="${esc(gt[i] || '')}" placeholder="${['Algo pequeno', 'Alguém gentil', 'Algo que você fez bem'][i]}"></label>`).join('')}<button class="btn solid sm">${g ? 'Atualizar' : 'Salvar'}</button></form>${streak ? `<p class="small">${icon('fire')} ${plural(streak, 'dia')} de gratidão seguidos.</p>` : ''}`, { cls: 'grat-card', tape: 'butter' }))}
  ${card(`O <em>diário</em>`, l.length ? `<ul class="journal-l">${l.slice(0, 20).map(j => `<li><span class="kick">${esc(fmtLong(j.day))} · ${esc(JOURNAL_KINDS[j.cat] || '')}</span><button class="link-plain" data-action="edit" data-id="${esc(j.id)}"><b>${esc(j.title || 'Registro')}</b></button><p class="small">${esc(String(j.body || '').slice(0, 220))}${String(j.body || '').length > 220 ? '…' : ''}</p></li>`).join('')}</ul>` : emptyNote('Seu primeiro registro está esperando.'), { link: addBtn('journal', 'Escrita livre', { cls: 'sm ghost', preset: { cat: 'free', day: today() } }), cls: 'lined' })}`;
}
function viewMind(r) {
  const tab = pickTab(WTABS, r.tab);
  return `${hubHead(7, 'Com Cuidado, Sempre', 'Bem-estar <em>Mental</em>', 'Faça uma pausa, observe os padrões, guarde o que aprende na terapia e escreva sobre isso. Privado para você.', '')}${folderTabs('mind', WTABS, tab)}<div class="tab-body">${{ mood: tabMood, triggers: tabTriggers, therapy: tabTherapy, journal: tabJournal }[tab]()}</div>`;
}

// =====================================================================
// 8 · Kitchen & Nutrition
// =====================================================================
const KTABS = [['recipes', 'Receitas'], ['plan', 'Plano alimentar'], ['grocery', 'Lista de compras']];
ACTIONS['rc-f'] = (b) => { S.ui.rcF = b.dataset.v || null; rerender(); };
GROUPS.recipe = () => C.recipes().flatMap(r => photosOf(r.id));
function tabRecipes() {
  const f = S.ui.rcF; const l = C.recipes().filter(r => !f || r.cat === f);
  return `<div class="okr-bar"><div class="chips"><button class="chip" data-action="rc-f" data-v="" aria-pressed="${!f}">Tudo</button>${Object.entries(RECIPE_KINDS).map(([k, l2]) => `<button class="chip" data-action="rc-f" data-v="${k}" aria-pressed="${f === k}">${esc(l2)}</button>`).join('')}</div>${addBtn('recipe', 'Receita', { cls: 'sm right' })}</div>
  <div class="pin-grid">${l.map(r => { const p = photosOf(r.id)[0]; const n = C.timesCooked(r); return `<article class="rpin">${p ? `<button class="rp-ph" data-action="photo-view" data-id="${esc(p.id)}" data-group="recipe">${img(p, { ratio: false, alt: r.title })}</button>` : `<span class="rp-ph none">${icon('chef')}</span>`}<div class="rp-b"><h3><button class="link-plain" data-action="edit" data-id="${esc(r.id)}">${esc(r.title)}</button></h3><small class="muted">${esc(RECIPE_KINDS[r.cat] || '')}${dget(r, 'mins') ? ` · ${dget(r, 'mins')} min` : ''}${n ? ` · planned ${plural(n, 'time')}` : ''}</small>${(dget(r, 'tags') || []).length ? `<p class="tags">${dget(r, 'tags').map(t => `<span>#${esc(t)}</span>`).join('')}</p>` : ''}</div></article>`; }).join('')}
    <button class="rpin add" data-action="add" data-kind="recipe">${icon('plus')}<b>Adicionar receita</b><small>com foto de capa</small></button></div>`;
}
BINDS['plan-set'] = async (t, type) => { if (type !== 'change') return; const wk = t.dataset.wk; const all = { ...(D().mealPlan || {}) }; all[wk] = { ...(all[wk] || {}), [t.dataset.k]: t.value || null }; await saveData({ mealPlan: all }); rerender(); };
function tabPlan() {
  const wk = addDays(C.weekOf(), 7 * (S.ui.wk || 0)); const plan = C.mealPlan(wk); const rs = C.recipes();
  return `<div class="wk-bar"><button class="icon-btn" data-action="wk-nav" data-v="-1" aria-label="Semana anterior">${icon('back')}</button><b>Semana de ${esc(fmtShort(wk))}</b><button class="icon-btn" data-action="wk-nav" data-v="1" aria-label="Próxima semana">${icon('fwd')}</button>${S.ui.wk ? `<button class="btn sm ghost" data-action="wk-nav" data-v="0">Esta semana</button>` : ''}<a class="btn sm right" href="#/home">${icon('cart')} Lista de compras (${C.groceryList(wk).filter(g => !g.done).length})</a></div>
  <div class="meal-grid"><span></span>${Object.values(C.SLOTS).map(s => `<b class="mg-h">${s}</b>`).join('')}
    ${C.weekDays(wk).map((d, i) => `<b class="mg-d ${d === today() ? 'today' : ''}">${DAYS[parseDay(d).getDay()]} <small>${parseDay(d).getDate()}</small></b>${Object.keys(C.SLOTS).map(s => { const k = `${i}${s}`; const r = plan[k] && byId(plan[k]); const p = r && photosOf(r.id)[0]; return `<div class="mg-cell ${r ? 'set' : ''}">${p ? `<span class="mg-ph">${img(p, { ratio: false, alt: '' })}</span>` : ''}<label class="sr-only" for="mp-${k}">${DAYS_LONG[parseDay(d).getDay()]} ${C.SLOTS[s]}</label><select class="input" id="mp-${k}" data-bind="plan-set" data-wk="${wk}" data-k="${k}"><option value="">—</option>${rs.map(x => `<option value="${esc(x.id)}" ${r?.id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>`; }).join('')}`).join('')}</div>
  <p class="small muted evergreen">${icon('link')} Cada refeição está ligada a uma receita, então a lista de compras é criada a partir dos ingredientes.</p>`;
}
ACTIONS['groc-tick'] = async (b) => { const wk = b.dataset.wk; if (b.dataset.id) { const x = byId(b.dataset.id); if (x) await patch(x, { status: x.status === 'done' ? null : 'done' }); rerender(); return; } const all = { ...(D().groceryDone || {}) }; const s = new Set(all[wk] || []); const k = b.dataset.v; s.has(k) ? s.delete(k) : s.add(k); all[wk] = [...s]; await saveData({ groceryDone: all }); rerender(); };
FORMS['groc-add'] = async (f) => { const t = f.elements.t.value.trim(); if (!t) return; try { await save({ kind: 'grocery', title: t.slice(0, 120), day: C.weekOf() }); f.reset(); rerender(); setTimeout(() => document.getElementById('groc-in')?.focus(), 30); } catch (e) { fail(e); } };
ACTIONS['groc-clear'] = async () => { try { for (const g of items('grocery').filter(g => g.status === 'done')) await remove(g.id); rerender(); } catch (e) { fail(e); } };
function tabGrocery() {
  const wk = C.weekOf(); const l = C.groceryList(wk); const left = l.filter(g => !g.done).length;
  return `${card(`Lista <em>desta semana</em>`, `<form class="cap-form" data-form="groc-add" autocomplete="off"><label class="sr-only" for="groc-in">Adicionar item</label><input class="input" id="groc-in" name="t" maxlength="120" placeholder="Adicionar mais um item…"><button class="btn solid" aria-label="Adicionar">${icon('plus')}</button></form>
    <p class="small muted">${plural(left, 'item')} para comprar · de ${plural(Object.values(C.mealPlan(wk)).filter(Boolean).length, 'refeição planejada')}</p>
    <ul class="groc">${l.map(g => `<li class="${g.done ? 'done' : ''}"><button class="cb ${g.done ? 'on' : ''}" data-action="groc-tick" data-wk="${wk}" data-v="${esc(g.name.toLowerCase())}" ${g.id ? `data-id="${esc(g.id)}"` : ''} aria-pressed="${g.done}">${icon('check')}<span>${esc(g.name)}${g.n > 1 ? ` <small>×${g.n}</small>` : ''}</span></button><small class="muted">${esc(g.from.join(', '))}</small></li>`).join('') || '<li class="small muted">Planeje algumas refeições e a lista será preenchida.</li>'}</ul>
    ${items('grocery').some(g => g.status === 'done') ? `<button class="btn sm ghost" data-action="groc-clear">Limpar itens marcados</button>` : ''}`, { cls: 'receipt-card', clip: true })}`;
}
function viewKitchen(r) {
  const tab = pickTab(KTABS, r.tab);
  return `${hubHead(8, 'Boa Comida, Menos Preocupações', 'Cozinha e <em>Alimentação</em>', 'Receitas favoritas, uma semana de refeições planejadas e uma lista de compras criada automaticamente.', addBtn('recipe', 'Receita', { cls: 'sm' }))}${folderTabs('kitchen', KTABS, tab)}<div class="tab-body">${{ recipes: tabRecipes, plan: tabPlan, grocery: tabGrocery }[tab]()}</div>`;
}

// =====================================================================
// 9 · Home & Lifestyle
// =====================================================================
const HOTABS = [['chores', 'Tarefas'], ['plants', 'Plantas'], ['inventory', 'Inventário'], ['vault', 'Garantias'], ['rooms', 'Ambientes']];
ACTIONS['chore-done'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { day: today() }); await sparkleWin(`${x.title}: concluída.`, b); rerender(); } catch (e) { fail(e); } };
const dueTag = (next) => { const n = daysBetween(today(), next); return n < 0 ? `<span class="due late">${plural(-n, 'dia')} atrasada</span>` : n === 0 ? '<span class="due today">Hoje</span>' : `<span class="due">${esc(relDay(next))}</span>`; };
function tabChores() {
  const l = items('chore'); const rooms = Object.keys(ROOMS).filter(r => l.some(c => c.cat === r)); const freqs = Object.keys(CHORE_FREQ).filter(f => l.some(c => (dget(c, 'freq') || 'weekly') === f));
  const due = sortBy(l.filter(c => C.choreNext(c) <= addDays(today(), 1)), C.choreNext);
  return `<div class="okr-bar">${addBtn('chore', 'Tarefa', { cls: 'sm', preset: { data: { freq: 'weekly' }, day: today() } })}<span class="small muted">${plural(due.length, 'tarefa')} para fazer até amanhã</span></div>
  ${due.length ? card(`Pendências <em>agora</em>`, `<ul class="rows">${due.map(c => `<li><span class="r-t"><b>${esc(c.title)}</b><small>${esc(ROOMS[c.cat] || '')} · ${esc(CHORE_FREQ[dget(c, 'freq') || 'weekly'])}${dget(c, 'who') ? ` · ${esc(dget(c, 'who'))}` : ''}</small></span>${dueTag(C.choreNext(c))}<button class="btn sm" data-action="chore-done" data-id="${esc(c.id)}">${icon('check')} Concluir</button></li>`).join('')}</ul>`, { cls: 'lined', pin: true }) : ''}
  ${l.length ? `<div class="tbl-wrap"><table class="matrix"><thead><tr><th scope="col">Ambiente</th>${freqs.map(f => `<th scope="col">${esc(CHORE_FREQ[f])}</th>`).join('')}</tr></thead><tbody>${rooms.map(r => `<tr><th scope="row">${esc(ROOMS[r])}</th>${freqs.map(f => `<td>${l.filter(c => c.cat === r && (dget(c, 'freq') || 'weekly') === f).map(c => { const n = daysBetween(today(), C.choreNext(c)); return `<button class="mx ${n < 0 ? 'late' : n <= 1 ? 'soon' : ''}" data-action="edit" data-id="${esc(c.id)}">${esc(c.title)}<small>${n < 0 ? `${-n}d atrasada` : n === 0 ? 'hoje' : `em ${n}d`}</small></button>`; }).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : emptyNote('Adicione tarefas e a frequência com que devem ser feitas.')}`;
}
ACTIONS['water'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { day: today() }); await sparkleWin(`${x.title} agradece.`, b); rerender(); } catch (e) { fail(e); } };
GROUPS.plant = () => items('plant').flatMap(p => photosOf(p.id));
function tabPlants() {
  const l = sortBy(items('plant'), C.plantNext);
  return `<div class="okr-bar">${addBtn('plant', 'Planta', { cls: 'sm', preset: { day: today(), data: { every: 7 } } })}<span class="small muted">${plural(l.filter(p => C.plantNext(p) <= today()).length, 'planta')} precisa de água hoje</span></div>
  <div class="plant-grid">${l.map((p, i) => { const n = daysBetween(today(), C.plantNext(p)); const ph = photosOf(p.id)[0]; return `<article class="plant ${n <= 0 ? 'thirsty' : ''}">${polaroid(ph, '', { group: 'plant', tilt: i % 2 ? 2 : -2, empty: photoDrop({ item: p.id, label: 'Adicionar foto', icon: 'plant' }) })}<h3><button class="link-plain" data-action="edit" data-id="${esc(p.id)}">${esc(p.title)}</button></h3><small class="muted">${esc(dget(p, 'where') || '')} · a cada ${plural(dget(p, 'every') || 7, 'dia')}${dget(p, 'light') ? ` · ${esc(LIGHT[dget(p, 'light')] || '')}` : ''}</small>
    <div class="water-row">${dueTag(C.plantNext(p))}<button class="btn sm ${n <= 0 ? 'solid' : ''}" data-action="water" data-id="${esc(p.id)}">${icon('drop')} Regada</button></div></article>`; }).join('') || emptyNote('Suas plantas e quando cada uma precisa de água.')}</div>`;
}
GROUPS.belonging = () => items('belonging').flatMap(x => photosOf(x.id));
function tabInventory() {
  const l = items('belonging'); const tot = l.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  return `<div class="okr-bar">${addBtn('belonging', 'Item', { cls: 'sm' })}<span class="small muted">${plural(l.length, 'item')} · ${amt(tot)} no total, útil para seguros</span></div>
  ${Object.keys(ROOMS).filter(r => l.some(x => x.cat === r)).map(r => { const rl = l.filter(x => x.cat === r); return card(`${esc(ROOMS[r])} <small class="muted">${amt(rl.reduce((a, x) => a + (Number(x.amount) || 0), 0))}</small>`, `<ul class="inv">${rl.map(x => { const p = photosOf(x.id)[0]; return `<li>${p ? `<button class="inv-ph" data-action="photo-view" data-id="${esc(p.id)}" data-group="belonging">${img(p, { ratio: false, alt: '' })}</button>` : `<span class="inv-ph none">${icon('box')}</span>`}<span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(x.id)}"><b>${esc(x.title)}</b></button><small>${x.day ? `Comprado em ${esc(fmtShort(x.day))}` : ''}${dget(x, 'serial') ? ` · ${esc(dget(x, 'serial'))}` : ''}</small></span><b class="num">${amt(x.amount || 0)}</b></li>`; }).join('')}</ul>`, { cls: 'lined' }); }).join('') || emptyNote('Fotografe o que você possui uma vez. Você e sua seguradora agradecerão.')}`;
}
GROUPS.warranty = () => items('warranty').flatMap(x => photosOf(x.id)).filter(p => !isPdf(p));
function tabVault() {
  const l = sortBy(items('warranty'), w => C.warrantyLeft(w) ?? 99999);
  return `<div class="okr-bar">${addBtn('warranty', 'Garantia ou manual', { cls: 'sm', preset: { day: today() } })}<span class="small muted">${plural(l.filter(w => (C.warrantyLeft(w) ?? -1) >= 0).length, 'garantia')} ainda ativa</span></div>
  <div class="vault-grid">${l.map(w => { const left = C.warrantyLeft(w); const ps = photosOf(w.id); return `<article class="vault-card ${left != null && left < 0 ? 'expired' : left != null && left <= 60 ? 'soon' : ''}"><span class="vc-tag">${left == null ? 'Sem data final' : left < 0 ? 'Expirada' : left <= 60 ? `Termina em ${plural(left, 'dia')}` : `Coberta até ${esc(fmtShort(dget(w, 'ends')))}`}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(w.id)}">${esc(w.title)}</button></h3><small class="muted">${[dget(w, 'store'), w.day ? `comprado em ${fmtLong(w.day)}` : '', w.amount ? amt(w.amount) : ''].filter(Boolean).join(' · ')}</small>
    <div class="vc-files">${ps.map(p => `<button class="vc-file" data-action="photo-view" data-id="${esc(p.id)}" data-group="warranty" aria-label="Abrir arquivo">${isPdf(p) ? img(p) : img(p, { ratio: false, alt: '' })}</button>`).join('')}${photoDrop({ item: w.id, label: 'Recibo', files: true, multiple: true, cls: 'vc-add' })}</div>${w.url ? `<a class="small" href="${esc(w.url)}" target="_blank" rel="noopener">${icon('book')} Manual e suporte</a>` : ''}</article>`; }).join('') || emptyNote('Guarde o recibo, salve o manual e saiba quando termina a garantia.')}</div>`;
}
ACTIONS['room-pick'] = (b) => { S.ui.room = b.dataset.id; rerender(); };
GROUPS.room = () => photosOf(S.ui.room || items('room')[0]?.id);
function tabRooms() {
  const l = items('room'); const cur = (S.ui.room && byId(S.ui.room)) || l[0];
  return `<div class="okr-bar"><div class="chips">${l.map(r => `<button class="chip" data-action="room-pick" data-id="${esc(r.id)}" aria-pressed="${cur?.id === r.id}">${esc(r.title)}</button>`).join('')}</div>${addBtn('room', 'Quadro', { cls: 'sm right' })}</div>
  ${cur ? `<section class="room-board card">${binder()}<header class="card-head"><div><span class="kick">${esc(ROOMS[cur.cat] || '')}</span><h2>${esc(cur.title)}</h2></div><button class="btn sm ghost" data-action="edit" data-id="${esc(cur.id)}">${icon('edit')} Editar</button></header>${cur.body ? `<p class="theme-line">${esc(cur.body)}</p>` : ''}${dget(cur, 'palette') ? `<p class="palette-line">${String(dget(cur, 'palette')).split(',').map(c => label(c.trim(), 'blue')).join('')}</p>` : ''}
    ${masonry(photosOf(cur.id).map(p => ({ p })), 'room', photoDrop({ item: cur.id, label: 'Adicionar inspiração', sub: 'Capturas, cores e ambientes que você ama', multiple: true, cls: 'm-add' }))}</section>` : emptyNote('Um quadro para cada ambiente que você está sonhando.')}`;
}
function viewHouse(r) {
  const tab = pickTab(HOTABS, r.tab);
  return `${hubHead(9, 'Uma Casa que se Organiza', 'Casa e <em>Estilo de Vida</em>', 'Tarefas em ritmo certo, plantas sempre cuidadas, tudo o que você possui registrado, garantias e manuais em um só lugar e os ambientes que você está sonhando.', '')}${folderTabs('house', HOTABS, tab)}<div class="tab-body">${{ chores: tabChores, plants: tabPlants, inventory: tabInventory, vault: tabVault, rooms: tabRooms }[tab]()}</div>`;
}
export const VIEWS_LIFE = { mind: viewMind };
