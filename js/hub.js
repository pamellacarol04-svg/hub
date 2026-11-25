// What HUB works out. Every hub reads from here, so nothing lives on its own: tasks belong to
// projects, meals point at recipes, gifts at people, flashcards at decks, sessions at tasks, and the
// home page and the Memory Archive roll everything up. All of it is evergreen: dates are worked out
// from today, so weeks, quarters and years never need a new page.
import { S, today, addDays, addMonths, parseDay, daysBetween, monthKey, round2, hash, MONTHS } from './core.js';
import { items, dget, sortBy, byId, EXP_CATS, INC_CATS } from './kinds.js';
export { EXP_CATS, INC_CATS };

export const D = () => S.settings.data || {};
export const sumA = (l, f = x => Number(x.amount) || 0) => round2(l.reduce((a, x) => a + (Number(f(x)) || 0), 0));
export const inM = (d, ym) => String(d || '').startsWith(ym);
export const year = () => new Date().getFullYear();
export const weekOf = (d = today()) => { const x = parseDay(d); const ws = Number(S.settings.week_start ?? 1); return addDays(d, -((x.getDay() - ws + 7) % 7)); };
export const weekDays = (wk = weekOf()) => Array.from({ length: 7 }, (_, i) => addDays(wk, i));
export const monthsBack = (n, end = monthKey()) => Array.from({ length: n }, (_, i) => monthKey(addMonths(end + '-01', i - n + 1)));
export const lastDays = (n, d = today()) => Array.from({ length: n }, (_, i) => addDays(d, i - n + 1));
export const stepsOf = (x) => (dget(x, 'steps') || []).map(s => (typeof s === 'string' ? { t: s, done: false } : s));
export const stepPct = (x) => { const st = stepsOf(x); return st.length ? st.filter(s => s.done).length / st.length : 0; };
export const pctOf = (a, b) => (b > 0 ? Math.max(0, Math.min(1, a / b)) : 0);

// ---------------------------------------------------------------------
// The evergreen clock: date, ISO week number and quarter, worked out from today.
// ---------------------------------------------------------------------
export function isoWeek(d = today()) { const x = parseDay(d); const t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
export const quarterOf = (d = today()) => Math.floor(parseDay(d).getMonth() / 3) + 1;
export const quarterStart = (d = today()) => `${d.slice(0, 4)}-${String((quarterOf(d) - 1) * 3 + 1).padStart(2, '0')}-01`;
export const quarterEnd = (d = today()) => addDays(addMonths(quarterStart(d), 3), -1);
export const dayOfYear = (d = today()) => daysBetween(`${d.slice(0, 4)}-01-01`, d) + 1;
export const daysInYear = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
export const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Ainda acordado' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

// ---------------------------------------------------------------------
// Tasks. Open tasks whose date has passed roll over to today on their own,
// with a note of how long they've been carried.
// ---------------------------------------------------------------------
export const PRIO = { high: 0, med: 1, low: 2 };
export const isDone = (t) => t.status === 'done';
/** The day a task shows up on: its own date, or today if it's open and overdue. */
export const taskDay = (t, d = today()) => (!isDone(t) && t.day && t.day < d ? d : t.day);
export const carried = (t, d = today()) => (!isDone(t) && t.day && t.day < d ? daysBetween(t.day, d) : 0);
export const tasks = () => items('task');
export const tasksOn = (d = today()) => sortBy(tasks().filter(t => taskDay(t, today()) === d && (!isDone(t) || dget(t, 'doneOn') === d || t.day === d)), t => (isDone(t) ? 9 : 0) + (PRIO[t.cat] ?? 1));
export const tasksIn = (a, b) => tasks().filter(t => { const d = isDone(t) ? (dget(t, 'doneOn') || t.day) : taskDay(t); return d && d >= a && d <= b; });
/** The top three: today's open tasks, high priority first, carried-over ones before new ones. */
export const top3 = (d = today()) => sortBy(tasks().filter(t => !isDone(t) && taskDay(t) === d), t => (PRIO[t.cat] ?? 1) * 1000 - carried(t)).slice(0, 3);
/** Task velocity: of the tasks dated this week (plus any carried into it), how many are done. */
export function velocity(wk = weekOf()) { const end = addDays(wk, 6); const list = tasks().filter(t => (t.day && t.day >= wk && t.day <= end) || (isDone(t) && dget(t, 'doneOn') >= wk && dget(t, 'doneOn') <= end) || (!isDone(t) && t.day && t.day < wk)); const done = list.filter(isDone).length; return { done, total: list.length, open: list.length - done, pct: pctOf(done, list.length) }; }
export const projectTasks = (p) => sortBy(tasks().filter(t => t.parent_id === p.id), t => (isDone(t) ? 1 : 0) * 1e4 + (t.day ? daysBetween(today(), t.day) : 999));
export const projectPct = (p) => { const l = projectTasks(p); return l.length ? l.filter(isDone).length / l.length : (p.status === 'done' ? 1 : 0); };

// ---------------------------------------------------------------------
// Habits, mood, energy
// ---------------------------------------------------------------------
export const habits = () => sortBy(items('habit'), h => h.position || 0);
export const habitsDone = (d = today()) => (D().habitsDone || {})[d] || [];
export function habitRate(d = today()) { const hs = habits(); if (!hs.length) return 0; const done = new Set(habitsDone(d)); return hs.filter(h => done.has(h.id)).length / hs.length; }
export function habitStreak(id, d = today()) { let n = 0; let x = habitsDone(d).includes(id) ? d : addDays(d, -1); while ((D().habitsDone || {})[x]?.includes(id) && n < 999) { n++; x = addDays(x, -1); } return n; }
/** A year of days for the heat map (GitHub style: weeks as columns, Monday at the top). */
export function heatYear(y = year()) { const out = []; for (let x = `${y}-01-01`; x <= `${y}-12-31`; x = addDays(x, 1)) out.push({ day: x, rate: x > today() ? null : habitRate(x) }); return out; }
export const moodOn = (d = today()) => Number((D().mood || {})[d]) || null;
export const moodNote = (d = today()) => (D().moodNote || {})[d] || '';
export const feelingsOn = (d = today()) => (D().feelings || {})[d] || [];
export const FEELINGS = ['Calmo', 'Grato', 'Esperançoso', 'Orgulhoso', 'Cansado', 'Ansioso', 'Sobrecarregado', 'Solitário', 'Irritado', 'Animado', 'Contente', 'Triste'];
export const energyOn = (d = today()) => (D().energy || {})[d] || {};
export const ENERGY_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 am to 9 pm
/** Average energy for each hour across the last n days, and the best hour. */
export function energyMap(n = 28) { const days = lastDays(n); const out = ENERGY_HOURS.map(h => { const v = days.map(d => Number(energyOn(d)[h])).filter(Boolean); return { h, avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length }; }); const best = [...out].filter(x => x.avg != null).sort((a, b) => b.avg - a.avg)[0] || null; return { hours: out, best }; }
export const hourLabel = (h) => h === 12 ? '12h' : h === 0 ? '0h' : `${h}h`;

// ---------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------
export const txns = () => items('txn');
export const incomeIn = (ym = monthKey()) => sumA(txns().filter(t => t.status === 'in' && inM(t.day, ym)));
export const spentIn = (ym = monthKey()) => sumA(txns().filter(t => t.status !== 'in' && inM(t.day, ym)));
export function spendByCat(ym = monthKey()) { const m = {}; for (const t of txns().filter(t => t.status !== 'in' && inM(t.day, ym))) m[t.cat || 'other'] = round2((m[t.cat || 'other'] || 0) + (Number(t.amount) || 0)); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
export const subMonthly = (s) => { const p = Number(s.amount) || 0; return s.cat === 'yearly' ? p / 12 : s.cat === 'weekly' ? p * 52 / 12 : s.cat === 'quarterly' ? p / 3 : p; };
/** A subscription is active unless it's paused or cancelled, or its end date has passed. */
export const subActive = (s, d = today()) => !['paused', 'cancelled'].includes(s.status) && !(dget(s, 'ends') && dget(s, 'ends') < d);
/** The next charge rolls forward on its own from the first charge date. */
export function nextCharge(s, d = today()) { if (!s.day) return null; let x = s.day; const step = s.cat === 'yearly' ? 12 : s.cat === 'quarterly' ? 3 : 1; let guard = 0; if (s.cat === 'weekly') { while (x < d && guard++ < 2000) x = addDays(x, 7); return x; } while (x < d && guard++ < 600) x = addMonths(x, step); return x; }
export const subsTotals = () => { const m = sumA(items('sub').filter(s => subActive(s)), subMonthly); return { monthly: round2(m), yearly: round2(m * 12) }; };
export const accounts = () => sortBy(items('account'), a => -(Number(a.amount) || 0));
export const debts = () => items('debt').filter(x => Number(x.amount) > 0);
export const assetsNow = () => sumA(accounts());
export const debtNow = () => sumA(debts());
export const netWorthNow = () => round2(assetsNow() - debtNow());
export function netWorthSeries(n = 12) { const snaps = D().netWorth || {}; return monthsBack(n).map(m => ({ ym: m, v: m === monthKey() ? netWorthNow() : snaps[m] ?? null })); }
/** Snowball (smallest balance first) or avalanche (highest rate first), with an extra monthly payment. */
export function debtPlan(method = 'snowball', extra = 0) {
  const order = (l) => (method === 'snowball' ? sortBy(l, z => z.bal) : sortBy(l, z => -z.rate || z.bal));
  const ds = debts().map(x => ({ id: x.id, title: x.title, bal: Number(x.amount), min: Number(dget(x, 'min')) || 0, rate: Number(dget(x, 'rate')) || 0 }));
  const series = [round2(ds.reduce((a, x) => a + x.bal, 0))]; const done = {}; let m = 0; let interest = 0;
  while (ds.some(x => x.bal > 0.5) && m < 600) {
    m++; let pool = extra;
    for (const x of ds) if (x.bal > 0) { const i = x.bal * x.rate / 1200; interest += i; x.bal += i; }
    for (const x of ds) { if (x.bal <= 0.5) { pool += x.min; continue; } const p = Math.min(x.min, x.bal); x.bal -= p; pool += x.min - p; }
    for (const x of order(ds.filter(z => z.bal > 0.5))) { const p = Math.min(pool, x.bal); x.bal -= p; pool -= p; if (pool <= 0) break; }
    for (const x of ds) if (x.bal <= 0.5 && !done[x.id]) done[x.id] = m;
    series.push(round2(ds.reduce((a, x) => a + Math.max(0, x.bal), 0)));
  }
  return { months: m, series, done, interest: round2(interest), stuck: m >= 600, order: order(debts().map(x => ({ ...x, bal: Number(x.amount), rate: Number(dget(x, 'rate')) || 0 }))) };
}
export const wishSaved = (w) => Number(dget(w, 'saved')) || 0;

// ---------------------------------------------------------------------
// Learning: spaced repetition (Leitner boxes 1–5: 1, 2, 4, 8 and 16 days)
// ---------------------------------------------------------------------
export const BOX_DAYS = [0, 1, 2, 4, 8, 16];
export const cardDue = (c, d = today()) => !dget(c, 'due') || dget(c, 'due') <= d;
export const dueCards = (deckId = null, d = today()) => items('flash').filter(c => (!deckId || c.parent_id === deckId) && cardDue(c, d));
export const syllabusPct = (c) => stepPct(c);

// ---------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------
export const lifts = (name) => sortBy(items('lift').filter(l => !name || l.title.toLowerCase() === name.toLowerCase()), l => l.day || '', -1);
export const liftVolume = (l) => (Number(dget(l, 'weight')) || 0) * (Number(dget(l, 'reps')) || 0) * (Number(dget(l, 'sets')) || 0);
/** Progressive overload: if the last session hit the target reps on every set, add weight next time. */
export function overload(name) {
  const l = lifts(name); if (!l.length) return null; const last = l[0]; const w = Number(dget(last, 'weight')) || 0; const reps = Number(dget(last, 'reps')) || 0; const target = Number(dget(last, 'target')) || 10; const step = Number(dget(last, 'step')) || 2.5;
  return reps >= target ? { w: round2(w + step), reps: Math.max(6, target - 2), why: `You hit ${reps} reps at ${w}: add ${step}.` } : { w, reps: reps + 1, why: `Stay at ${w} and aim for ${reps + 1} reps.` };
}
export const liftNames = () => [...new Set(items('lift').map(l => l.title.trim()).filter(Boolean))].sort();
export const macroTargets = () => ({ cal: 2000, protein: 120, carbs: 220, fat: 65, ...(D().macros || {}) });
export function macrosOn(d = today()) { const l = items('meal').filter(m => m.day === d); const t = (k) => round2(l.reduce((a, m) => a + (Number(dget(m, k)) || 0), 0)); return { cal: t('cal'), protein: t('protein'), carbs: t('carbs'), fat: t('fat'), list: l }; }
export const stepsOn = (d = today()) => Number((D().steps || {})[d]) || 0;
export const stepGoal = () => Number(D().stepGoal) || 8000;
export const measures = () => sortBy(items('measure'), m => m.day || '');

// ---------------------------------------------------------------------
// Kitchen: the meal plan points at recipes, and the grocery list writes itself
// ---------------------------------------------------------------------
export const SLOTS = { b: 'Breakfast', l: 'Lunch', d: 'Dinner' };
export const recipes = () => sortBy(items('recipe'), r => String(r.title).toLowerCase());
export const mealPlan = (wk = weekOf()) => (D().mealPlan || {})[wk] || {};
export function groceryList(wk = weekOf()) {
  const plan = mealPlan(wk); const map = new Map();
  for (const rid of Object.values(plan)) { const r = rid && byId(rid); if (!r || r.kind !== 'recipe') continue; for (const raw of dget(r, 'ingredients') || []) { const k = raw.trim().toLowerCase(); if (!k) continue; const e = map.get(k) || { name: raw.trim(), n: 0, from: new Set() }; e.n++; e.from.add(r.title); map.set(k, e); } }
  const done = new Set(((D().groceryDone || {})[wk]) || []);
  const extra = items('grocery').filter(g => !g.day || g.day >= wk).map(g => ({ name: g.title, n: 1, from: ['Added by you'], id: g.id, done: g.status === 'done' }));
  return [...[...map.values()].map(e => ({ ...e, from: [...e.from], done: done.has(e.name.toLowerCase()) })), ...extra].sort((a, b) => a.done - b.done || a.name.localeCompare(b.name));
}
export const timesCooked = (r) => Object.values(D().mealPlan || {}).reduce((a, w) => a + Object.values(w || {}).filter(x => x === r.id).length, 0);

// ---------------------------------------------------------------------
// Home: chores, plants and warranties
// ---------------------------------------------------------------------
export const FREQ = { daily: ['Daily', 1], weekly: ['Weekly', 7], fortnightly: ['Fortnightly', 14], monthly: ['Monthly', 30], quarterly: ['Quarterly', 91], yearly: ['Yearly', 365] };
export const choreNext = (c) => (c.day ? addDays(c.day, (FREQ[dget(c, 'freq') || 'weekly'] || FREQ.weekly)[1]) : today());
export const plantNext = (p) => (p.day ? addDays(p.day, Number(dget(p, 'every')) || 7) : today());
export const warrantyLeft = (w, d = today()) => (dget(w, 'ends') ? daysBetween(d, dget(w, 'ends')) : null);

// ---------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------
export const trips = () => sortBy(items('trip'), t => t.day || '9999');
export const nextTrip = (d = today()) => trips().find(t => (dget(t, 'back') || t.day) >= d) || null;
export const BUDGET_LINES = { flights: 'Voos', stay: 'Hospedagem', food: 'Alimentação', activities: 'Passeios', transport: 'Deslocamentos', shopping: 'Compras', other: 'Outro' };
export const tripBudget = (t) => { const b = dget(t, 'budget') || {}; const est = round2(Object.values(b).reduce((a, v) => a + (Number(v?.est) || 0), 0)); const act = round2(Object.values(b).reduce((a, v) => a + (Number(v?.act) || 0), 0)); return { est, act, lines: b }; };
export const tripDays = (t) => (t.day ? Math.max(1, daysBetween(t.day, dget(t, 'back') || t.day) + 1) : 1);

// ---------------------------------------------------------------------
// Media, people, knowledge
// ---------------------------------------------------------------------
export const bookPct = (b) => (b.status === 'done' ? 1 : pctOf(Number(dget(b, 'at')) || 0, Number(dget(b, 'pages')) || 0));
/** The next birthday or anniversary on or after d. */
export function nextDate(md, d = today()) { if (!md) return null; const mmdd = md.slice(5, 10); let x = `${d.slice(0, 4)}-${mmdd}`; if (x < d) x = `${Number(d.slice(0, 4)) + 1}-${mmdd}`; return x; }
export function occasions(d = today(), within = 400) {
  const out = [];
  for (const p of items('person')) { for (const [k, label] of [['day', 'Birthday'], ['d.anniv', 'Anniversary']]) { const v = k === 'day' ? p.day : dget(p, 'anniv'); const n = nextDate(v, d); if (!n) continue; const inDays = daysBetween(d, n); if (inDays <= within) out.push({ p, label, on: n, inDays, age: v && label === 'Birthday' && Number(v.slice(0, 4)) > 1900 ? Number(n.slice(0, 4)) - Number(v.slice(0, 4)) : null }); } }
  return sortBy(out, o => o.inDays);
}
export const tagsOf = (x) => (dget(x, 'tags') || []).map(t => String(t).trim().toLowerCase()).filter(Boolean);
/** The tag network: every tag, how often it's used, and which tags appear together. */
export function tagGraph() {
  const src = [...items('clip'), ...items('swipe'), ...items('zettel')]; const count = {}; const pairs = {};
  for (const x of src) { const t = [...new Set(tagsOf(x))]; t.forEach(a => { count[a] = (count[a] || 0) + 1; }); for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { const k = [t[i], t[j]].sort().join('|'); pairs[k] = (pairs[k] || 0) + 1; } }
  return { nodes: Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([t, n]) => ({ t, n })), edges: Object.entries(pairs).map(([k, n]) => { const [a, b] = k.split('|'); return { a, b, n }; }) };
}
/** [[Note title]] links between notes, and the notes that link back. */
export const linksIn = (body) => [...String(body || '').matchAll(/\[\[([^\]]{1,120})\]\]/g)].map(m => m[1].trim());
export const backlinks = (z) => items('zettel').filter(o => o.id !== z.id && linksIn(o.body).some(t => t.toLowerCase() === String(z.title).toLowerCase()));

// ---------------------------------------------------------------------
// Focus: pomodoros and deep work
// ---------------------------------------------------------------------
export const sessionsIn = (a, b) => items('session').filter(s => s.day >= a && s.day <= b);
export const focusMins = (list) => list.reduce((a, s) => a + (Number(s.num) || 0), 0);
export const deepMins = (d) => focusMins(items('session').filter(s => s.day === d && s.cat !== 'shallow'));
export const wasteMins = (a, b) => items('waste').filter(w => w.day >= a && w.day <= b).reduce((x, w) => x + (Number(w.num) || 0), 0);

// ---------------------------------------------------------------------
// The year in numbers (Memory Archive) and the hub stamps on Home
// ---------------------------------------------------------------------
export function rollup(y = year()) {
  const Y = String(y); const inY = (d) => String(d || '').startsWith(Y);
  const km = round2(items('cardio').filter(c => inY(c.day)).reduce((a, c) => a + (Number(dget(c, 'km')) || 0), 0));
  return {
    books: items('book').filter(b => b.status === 'done' && inY(dget(b, 'finished') || b.day)).length,
    km, miles: round2(km * 0.621371),
    workouts: new Set([...items('lift'), ...items('cardio')].filter(x => inY(x.day)).map(x => x.day)).size,
    trips: items('trip').filter(t => inY(t.day) && t.day <= today()).length,
    countries: (D().visited || []).length,
    deep: Math.round(focusMins(items('session').filter(s => inY(s.day) && s.cat !== 'shallow')) / 60),
    pomodoros: items('session').filter(s => inY(s.day) && s.cat === 'pomodoro').length,
    habits: Object.entries(D().habitsDone || {}).filter(([d]) => inY(d)).reduce((a, [, l]) => a + l.length, 0),
    tasks: tasks().filter(t => isDone(t) && inY(dget(t, 'doneOn') || t.day)).length,
    watched: items('watch').filter(w => w.status === 'done' && inY(w.day)).length,
    saved: round2(monthsBack(12, `${Y}-12`).reduce((a, m) => a + incomeIn(m) - spentIn(m), 0)),
    clips: items('clip').filter(c => inY(String(c.created_at))).length,
    moodAvg: (() => { const v = Object.entries(D().mood || {}).filter(([d]) => inY(d)).map(([, m]) => Number(m)).filter(Boolean); return v.length ? round2(v.reduce((a, b) => a + b, 0) / v.length) : null; })(),
  };
}
export const monthName = (m) => MONTHS[m];
export const pick = (list, seed) => list[hash(seed) % list.length];
