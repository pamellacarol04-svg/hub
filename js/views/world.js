// 10 · Travel & Adventure: a world map you colour in, trips with a day-by-day itinerary builder,
// packing lists and a budget estimator, a bucket list and a travel diary.  11 · Content & Media:
// books with progress bars, a watchlist, podcast notes and a game backlog, all with covers.
// 12 · Relationship & Social: people with birthdays, anniversaries and sizes, gift ideas, events,
// and a conflict resolution journal.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, parseDay, DAYS, MONTHS, fmtShort, fmtLong, fmtDay, daysBetween, plural, round2, relDay } from '../core.js';
import { items, byId, save, patch, remove, dget, sortBy, addBtn, STOP_KINDS, BUCKET_STATUS, BOOK_STATUS, WATCH_KINDS, WATCH_STATUS, GAME_STATUS, RELATIONS, GIFT_STATUS, OCCASIONS, CONFLICT_STATUS } from '../kinds.js';
import { photosOf, img } from '../photos.js';
import { GROUPS } from './lightbox.js';
import { MAP_W, MAP_H, SPHERE, COUNTRIES } from '../worldmap.js';
import { D, saveData, card, hubHead, folderTabs, pickTab, emptyNote, photoDrop, masonry, label, meter, sparkleWin, bigWin, seg, pin, binder, tape, twoCol, polaroid, stars, amt, storyFrame, postmark } from './common.js';
import * as C from '../hub.js';

// =====================================================================
// 10 · Travel & Adventure
// =====================================================================
const TTABS = [['map', 'Mapa mundial'], ['trips', 'Viagens'], ['bucket', 'Lista de desejos'], ['diary', 'Diário de viagem']];
/** Countries you've been to: ones you tapped, plus past trips and diary entries. */
export const visited = () => { const s = new Set(D().visited || []); for (const t of items('trip')) if (dget(t, 'country') && t.day <= today()) s.add(dget(t, 'country')); for (const x of items('tdiary')) if (dget(x, 'country')) s.add(dget(x, 'country')); return s; };
const wanted = () => new Set(D().wishCountries || []);
ACTIONS['country'] = async (b) => { const n = b.dataset.v; const v = new Set(D().visited || []); const w = new Set(D().wishCountries || []); if (v.has(n)) { v.delete(n); w.add(n); } else if (w.has(n)) w.delete(n); else v.add(n);
  await saveData({ visited: [...v], wishCountries: [...w] }); toast(v.has(n) ? `${n}: visitado.` : w.has(n) ? `${n}: na lista de desejos.` : `${n}: removido.`); rerender(); };
function tabMap() {
  const v = visited(); const w = wanted(); const pins = [...items('tdiary'), ...items('trip').filter(t => t.day > today())].map(x => ({ c: COUNTRIES.find(k => k[0] === dget(x, 'country')), x })).filter(p => p.c);
  return `<div class="tickets">${[['Países visitados', String(v.size), 'c1'], ['Do mundo', `${Math.round(v.size / 195 * 100)}%`, 'c4'], ['Na lista de desejos', String(w.size), 'c2'], ['Viagens este ano', String(C.rollup().trips), 'c3']].map(([a, b, t]) => `<div class="ticket ${t}"><span class="kick">${a}</span><b class="num">${b}</b></div>`).join('')}</div>
  <section class="map-card card">${tape('blue')}<svg class="world" viewBox="0 0 ${MAP_W} ${MAP_H}" role="group" aria-label="Mapa mundial. Toque em um país: visitado, desejo visitar ou limpar."><path class="sphere" d="${SPHERE}"/>
    ${COUNTRIES.map(([n, d]) => `<path class="ctry ${v.has(n) ? 'v' : w.has(n) ? 'w' : ''}" d="${d}" data-action="country" data-v="${esc(n)}" role="button" tabindex="0" aria-label="${esc(n)}${v.has(n) ? ', visitado' : w.has(n) ? ', desejo visitar' : ''}"><title>${esc(n)}</title></path>`).join('')}
    ${pins.map(({ c, x }) => `<g class="mpin ${x.kind}" transform="translate(${c[2]} ${c[3]})" aria-hidden="true"><circle r="5"/><circle r="10" class="halo"/></g>`).join('')}</svg>
    <div class="map-key"><span><i class="v"></i>Já visitei</span><span><i class="w"></i>Quero visitar</span><span><i class="p"></i>Diário e próximas viagens</span><small class="muted">Toque em um país para alternar o status.</small></div></section>
  ${v.size ? `<p class="visited-list">${[...v].sort().map(n => label(n, 'blue')).join('')}</p>` : ''}`;
}
ACTIONS['trip-pick'] = (b) => { S.ui.trip = b.dataset.id; rerender(); };
ACTIONS['pack'] = async (b) => { const id = b.dataset.id; const all = { ...(D().packed || {}) }; const s = new Set(all[id] || []); const k = b.dataset.v; s.has(k) ? s.delete(k) : s.add(k); all[id] = [...s]; await saveData({ packed: all }); rerender(); };
BINDS['bud'] = async (t, type) => { if (type !== 'change') return; const x = byId(t.dataset.id); if (!x) return; const b = { ...(dget(x, 'budget') || {}) }; b[t.dataset.k] = { ...(b[t.dataset.k] || {}), [t.dataset.f]: Math.max(0, Number(t.value) || 0) }; try { await patch(x, { data: { budget: b } }); rerender(); } catch (e) { fail(e); } };
function tabTrips() {
  const l = C.trips(); const cur = (S.ui.trip && byId(S.ui.trip)) || C.nextTrip() || l[l.length - 1];
  if (!cur) return emptyNote('Para onde ir agora?', addBtn('trip', 'Planejar viagem'));
  const n = C.tripDays(cur); const stops = items('stop').filter(s => s.parent_id === cur.id); const packed = new Set((D().packed || {})[cur.id] || []); const pk = dget(cur, 'packing') || []; const bud = C.tripBudget(cur); const stopCost = round2(stops.reduce((a, s) => a + (Number(s.amount) || 0), 0)); const until = daysBetween(today(), cur.day);
  return `<div class="okr-bar"><div class="chips">${l.map(t => `<button class="chip" data-action="trip-pick" data-id="${esc(t.id)}" aria-pressed="${t.id === cur.id}">${esc(t.title)}</button>`).join('')}</div>${addBtn('trip', 'Viagem', { cls: 'sm right' })}</div>
  <section class="boarding">${postmark(`${(dget(cur, 'place') || cur.title).toUpperCase()} · ${String(cur.day).slice(0, 4)} ·`, until > 0 ? `${until}d` : '✈', 'bp-pm')}<div class="bp-main"><span class="kick">Cartão de embarque</span><h2>${esc(cur.title)}</h2><p>${esc(dget(cur, 'place') || '')}</p><dl><div><dt>Saída</dt><dd>${esc(fmtShort(cur.day))}</dd></div><div><dt>Retorno</dt><dd>${esc(fmtShort(dget(cur, 'back') || cur.day))}</dd></div><div><dt>Dias</dt><dd>${n}</dd></div><div><dt>Orçamento</dt><dd>${amt(bud.est)}</dd></div></dl></div>
    <div class="bp-stub"><b class="num">${until > 0 ? until : until === 0 ? 'Hoje' : '—'}</b><small>${until > 0 ? 'dias restantes' : until === 0 ? 'Boa viagem' : 'Concluída'}</small><button class="btn sm ghost" data-action="edit" data-id="${esc(cur.id)}">${icon('edit')} Editar</button></div></section>
  ${card(`O <em>roteiro</em>`, `<div class="itin">${Array.from({ length: Math.min(n, 21) }, (_, i) => { const d = addDays(cur.day, i); const ss = sortBy(stops.filter(s => s.day === d), s => dget(s, 'time') || '99'); return `<section class="it-day"><header><b>Dia ${i + 1}</b><small>${esc(fmtDay(d))}</small></header><ul>${ss.map(s => `<li class="st-${esc(s.cat || 'do')}"><span class="it-t">${esc(dget(s, 'time') || '')}</span><span class="it-k">${esc(STOP_KINDS[s.cat] || '')}</span><button class="link-plain" data-action="edit" data-id="${esc(s.id)}">${esc(s.title)}</button>${s.amount ? `<small>${amt(s.amount)}</small>` : ''}</li>`).join('')}</ul><button class="add-mini" data-action="add" data-kind="stop" data-preset="${esc(JSON.stringify({ parent_id: cur.id, day: d, cat: 'sight' }))}" aria-label="Adicionar ao dia ${i + 1}">${icon('plus')}</button></section>`; }).join('')}</div>`, { cls: 'lined' })}
  ${twoCol(card(`Estimativa do <em>orçamento</em>`, `<table class="bud"><thead><tr><th>Categoria</th><th>Previsto</th><th>Real</th></tr></thead><tbody>${Object.entries(C.BUDGET_LINES).map(([k, l2]) => `<tr><th scope="row">${esc(l2)}</th>${['est', 'act'].map(f => `<td><input class="input sm num" type="number" min="0" value="${Number(bud.lines[k]?.[f]) || ''}" placeholder="0" data-bind="bud" data-id="${esc(cur.id)}" data-k="${k}" data-f="${f}" aria-label="${esc(l2)} ${f === 'est' ? 'previsto' : 'real'}"></td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td>${amt(bud.est)}</td><td>${amt(bud.act)}</td></tr></tfoot></table>${stopCost ? `<p class="small muted">Os passeios somam ${amt(stopCost)}.</p>` : ''}${bud.est ? `<p class="small">${bud.act > bud.est ? `<span class="bad">${amt(bud.act - bud.est)} acima</span>` : `${amt(bud.est - bud.act)} restantes`} · cerca de ${amt(bud.est / n)} por dia.</p>` : ''}`, { pin: true }),
    card(`Lista de <em>bagagem</em>`, pk.length ? `<div class="reset-row">${meter(C.pctOf(pk.filter(p => packed.has(p)).length, pk.length), 'c4')}<small>${pk.filter(p => packed.has(p)).length}/${pk.length}</small></div><ul class="checks two">${pk.map(p => `<li><button class="cb ${packed.has(p) ? 'on' : ''}" data-action="pack" data-id="${esc(cur.id)}" data-v="${esc(p)}" aria-pressed="${packed.has(p)}">${icon('check')}<span>${esc(p)}</span></button></li>`).join('')}</ul>` : `<p class="small muted">Adicione uma lista de bagagem nas configurações da viagem.</p>`, { cls: 'lined', clip: true }))}`;
}
ACTIONS['bucket-done'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; try { await patch(x, { status: 'done', day: today() }); bigWin('Conquistado. Que vida.'); rerender(); } catch (e) { fail(e); } };
function tabBucket() {
  const l = sortBy(items('bucket'), x => ['planned', 'dream', 'done'].indexOf(x.status || 'dream'));
  return `<div class="okr-bar">${addBtn('bucket', 'Sonho', { cls: 'sm', preset: { status: 'dream' } })}<span class="small muted">${l.filter(x => x.status === 'done').length} de ${l.length} concluídos</span></div>
  ${card('', `<ol class="bucket">${l.map(x => `<li class="${x.status === 'done' ? 'done' : ''}"><span class="hilite hl-${x.status === 'done' ? 'butter' : x.status === 'planned' ? 'blue' : 'pink'}">${esc(BUCKET_STATUS[x.status || 'dream'])}</span><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${x.status === 'done' ? `<s>${esc(x.title)}</s>` : esc(x.title)}</button>${x.status === 'done' && x.day ? `<small>${esc(fmtLong(x.day))}</small>` : `<button class="btn sm ghost" data-action="bucket-done" data-id="${esc(x.id)}">${icon('check')} Concluído</button>`}</li>`).join('') || '<li class="muted">Sonhe alto.</li>'}</ol>`, { cls: 'lined bucket-card', pin: true })}`;
}
GROUPS.tdiary = () => sortBy(items('tdiary'), x => x.day || '', -1).flatMap(x => photosOf(x.id));
function tabDiary() {
  const l = sortBy(items('tdiary'), x => x.day || '', -1);
  return `<div class="okr-bar">${addBtn('tdiary', 'Registro de viagem', { cls: 'sm', preset: { day: today() } })}</div>
  <div class="diary">${l.map((x, i) => { const ps = photosOf(x.id); return `<article class="diary-e ${i % 2 ? 'flip' : ''}">${storyFrame(ps[0], { group: 'tdiary', bars: Math.max(1, Math.min(5, ps.length)), at: 1, alt: x.title, empty: photoDrop({ item: x.id, label: 'Add the hero photo' }) })}
    <div class="diary-note card lined">${pin()}<span class="kick">${esc(fmtLong(x.day))}${dget(x, 'country') ? ` · ${esc(dget(x, 'country'))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.title)}</button></h3>${x.body ? `<p>${esc(x.body)}</p>` : ''}${ps.length > 1 ? `<small class="muted">${icon('images')} ${ps.length} fotos</small>` : ''}</div></article>`; }).join('') || emptyNote('Uma foto principal e algumas linhas de cada viagem.')}</div>`;
}
function viewTravel(r) {
  const tab = pickTab(TTABS, r.tab);
  return `${hubHead(10, 'Viaje Bem', 'Viagens e <em>Aventuras</em>', 'Pinte o mapa, planeje cada dia da próxima viagem, acompanhe o orçamento e preserve as memórias.', addBtn('trip', 'Viagem', { cls: 'sm' }))}${folderTabs('travel', TTABS, tab)}<div class="tab-body">${{ map: tabMap, trips: tabTrips, bucket: tabBucket, diary: tabDiary }[tab]()}</div>`;
}

// =====================================================================
// 11 · Content & Media
// =====================================================================
const MTABS = [['books', 'Livros'], ['watch', 'Lista para assistir'], ['pods', 'Notas de podcasts'], ['games', 'Jogos']];
BINDS['book-at'] = async (t, type) => { if (type !== 'change') return; const x = byId(t.dataset.id); if (!x) return; const v = Math.max(0, Number(t.value) || 0); const pages = Number(dget(x, 'pages')) || 0; const fin = pages && v >= pages; try { await patch(x, { status: fin ? 'done' : x.status, data: { at: v, ...(fin ? { finished: today() } : {}) } }); if (fin) bigWin(`Concluí ${x.title}.`); rerender(); } catch (e) { fail(e); } };
const cover = (x, group, ic) => { const p = photosOf(x.id)[0]; return p ? `<button class="cv-ph" data-action="photo-view" data-id="${esc(p.id)}" data-group="${group}" aria-label="Capa de ${esc(x.title)}">${img(p, { ratio: false, alt: '' })}</button>` : `<button class="cv-ph none" data-action="edit" data-id="${esc(x.id)}" aria-label="Adicionar capa">${icon(ic)}</button>`; };
GROUPS.book = () => items('book').flatMap(b => photosOf(b.id));
ACTIONS['md-f'] = (b) => { S.ui.mdF = b.dataset.v || null; rerender(); };
function tabBooks() {
  const reading = items('book').filter(b => b.status === 'reading'); const f = S.ui.mdF && BOOK_STATUS[S.ui.mdF] ? S.ui.mdF : null; const shelf = sortBy(items('book').filter(b => b.status !== 'reading' && (!f || b.status === f)), b => (dget(b, 'finished') || b.created_at), -1); const goal = Number(D().readingGoal) || 24; const done = C.rollup().books;
  return `<div class="okr-bar"><span class="hilite hl-butter">${done} de ${goal} livros este ano</span>${meter(C.pctOf(done, goal), 'c3', 'Meta de leitura')}${addBtn('book', 'Livro', { cls: 'sm right', preset: { status: 'tbr' } })}</div>
  ${reading.length ? `<section class="reading-now"><h2>Lendo <em>agora</em></h2><div class="rn-grid">${reading.map(b => { const p = C.bookPct(b); return `<article class="rn">${cover(b, 'book', 'book')}<div><h3><button class="link-plain" data-action="edit" data-id="${esc(b.id)}">${esc(b.title)}</button></h3><small class="muted">${esc(dget(b, 'author') || '')}</small>${meter(p, 'c1', 'Progresso')}<label class="inline small">Página <input class="input sm num" type="number" min="0" value="${Number(dget(b, 'at')) || 0}" data-bind="book-at" data-id="${esc(b.id)}" aria-label="Página de ${esc(b.title)}"> de ${dget(b, 'pages') || '?'} · ${Math.round(p * 100)}%</label></div></article>`; }).join('')}</div></section>` : ''}
  <div class="chips">${[['', 'Estante completa'], ...Object.entries(BOOK_STATUS).filter(([k]) => k !== 'reading')].map(([k, l]) => `<button class="chip" data-action="md-f" data-v="${k}" aria-pressed="${(f || '') === k}">${esc(l)}</button>`).join('')}</div>
  <div class="cover-grid books">${shelf.map(b => `<article class="cv">${cover(b, 'book', 'book')}<b><button class="link-plain" data-action="edit" data-id="${esc(b.id)}">${esc(b.title)}</button></b><small>${esc(dget(b, 'author') || '')}</small>${dget(b, 'rating') ? stars(dget(b, 'rating')) : `<small class="muted">${esc(BOOK_STATUS[b.status] || '')}</small>`}</article>`).join('')}</div>`;
}
GROUPS.watch = () => items('watch').flatMap(b => photosOf(b.id));
function tabWatch() {
  return Object.entries(WATCH_STATUS).map(([st, l]) => { const xs = items('watch').filter(w => (w.status || 'list') === st); return `<section class="shelf"><h2>${esc(l)} <small class="muted">${xs.length}</small></h2><div class="cover-grid posters">${xs.map(w => `<article class="cv">${cover(w, 'watch', 'film')}<b><button class="link-plain" data-action="edit" data-id="${esc(w.id)}">${esc(w.title)}</button></b><small>${esc(WATCH_KINDS[w.cat] || '')}${dget(w, 'where') ? ` · ${esc(dget(w, 'where'))}` : ''}</small>${dget(w, 'rating') ? stars(dget(w, 'rating')) : ''}</article>`).join('')}${st === 'list' ? `<button class="cv add" data-action="add" data-kind="watch" data-preset='{"status":"list","cat":"movie"}'>${icon('plus')}<b>Adicionar</b></button>` : ''}</div></section>`; }).join('');
}
GROUPS.pod = () => items('pod').flatMap(b => photosOf(b.id));
function tabPods() {
  const l = sortBy(items('pod'), x => x.day || '', -1);
  return `<div class="okr-bar">${addBtn('pod', 'Nota de podcast', { cls: 'sm', preset: { day: today() } })}</div><div class="pod-list">${l.map(x => `<article class="pod card">${cover(x, 'pod', 'headphones')}<div><span class="kick">${esc(dget(x, 'show') || 'Podcast')}${x.day ? ` · ${esc(fmtShort(x.day))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.title)}</button></h3>${x.body ? `<p class="small">${esc(x.body)}</p>` : ''}${(dget(x, 'takeaways') || []).length ? `<ul class="take">${dget(x, 'takeaways').map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${x.url ? `<a class="small" href="${esc(x.url)}" target="_blank" rel="noopener">${icon('play')} Ouvir</a>` : ''}</div></article>`).join('') || emptyNote('As melhores ideias do que você ouviu.')}</div>`;
}
GROUPS.game = () => items('game').flatMap(b => photosOf(b.id));
function tabGames() {
  return Object.entries(GAME_STATUS).map(([st, l]) => { const xs = items('game').filter(g => (g.status || 'backlog') === st); if (!xs.length && st !== 'backlog') return ''; return `<section class="shelf"><h2>${esc(l)} <small class="muted">${xs.length}</small></h2><div class="cover-grid posters">${xs.map(g => `<article class="cv">${cover(g, 'game', 'gauge')}<b><button class="link-plain" data-action="edit" data-id="${esc(g.id)}">${esc(g.title)}</button></b><small>${esc(dget(g, 'platform') || '')}${dget(g, 'hours') ? ` · ${dget(g, 'hours')} h` : ''}</small>${dget(g, 'rating') ? stars(dget(g, 'rating')) : ''}</article>`).join('')}${st === 'backlog' ? `<button class="cv add" data-action="add" data-kind="game" data-preset='{"status":"backlog"}'>${icon('plus')}<b>Adicionar</b></button>` : ''}</div></section>`; }).join('');
}
function viewMedia(r) {
  const tab = pickTab(MTABS, r.tab);
  return `${hubHead(11, 'O que Estou Consumindo', 'Conteúdo e <em>Mídia</em>', 'Livros, filmes, séries, episódios e jogos, todos com suas capas, organizados em uma biblioteca visual.', '')}${folderTabs('media', MTABS, tab)}<div class="tab-body">${{ books: tabBooks, watch: tabWatch, pods: tabPods, games: tabGames }[tab]()}</div>`;
}

// =====================================================================
// 12 · Relationship & Social
// =====================================================================
const STABS = [['people', 'Pessoas e datas'], ['gifts', 'Ideias de presentes'], ['events', 'Eventos'], ['repair', 'Diário de conflitos']];
GROUPS.person = () => items('person').flatMap(b => photosOf(b.id));
function tabPeople() {
  const occ = C.occasions().slice(0, 6); const l = sortBy(items('person'), p => C.nextDate(p.day) || '9999');
  return `${occ.length ? `<div class="countdowns">${occ.map(o => `<article class="cd ${o.inDays <= 14 ? 'soon' : ''}">${o.inDays <= 14 ? pin() : ''}<b class="num">${o.inDays === 0 ? '🎉' : o.inDays}</b><small>${o.inDays === 0 ? 'hoje' : o.inDays === 1 ? 'dia' : 'dias'}</small><span>${esc(o.p.title)}: ${esc(o.label.toLowerCase())}${o.age ? ` (${o.age})` : ''}</span><small class="muted">${esc(fmtShort(o.on))}</small></article>`).join('')}</div>` : ''}
  <div class="okr-bar">${addBtn('person', 'Pessoa', { cls: 'sm' })}</div>
  <div class="people">${l.map((p, i) => { const ph = photosOf(p.id)[0]; const gifts = items('gift').filter(g => dget(g, 'person') === p.id && g.status !== 'given').length; const nd = C.nextDate(p.day);   return `<article class="person">${polaroid(ph, '', { group: 'person', tilt: i % 2 ? 2 : -2, empty: photoDrop({ item: p.id, label: 'Adicionar foto' }) })}<div><span class="kick">${esc(RELATIONS[p.cat] || '')}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(p.id)}">${esc(p.title)}</button></h3>
    <dl class="mini-dl">${nd ? `<div><dt>${icon('cake')}</dt><dd>${esc(fmtShort(p.day))} · em ${plural(daysBetween(today(), nd), 'dia')}</dd></div>` : ''}${dget(p, 'anniv') ? `<div><dt>${icon('heart')}</dt><dd>${esc(fmtShort(dget(p, 'anniv')))}</dd></div>` : ''}${dget(p, 'sizes') ? `<div><dt>${icon('tShirt')}</dt><dd>${esc(dget(p, 'sizes'))}</dd></div>` : ''}${dget(p, 'likes') ? `<div><dt>${icon('heartFill')}</dt><dd>${esc(dget(p, 'likes'))}</dd></div>` : ''}</dl>
    <a class="small" href="#/social?tab=gifts">${plural(gifts, 'ideia de presente')}</a></div></article>`; }).join('') || emptyNote('As pessoas importantes e as datas que você não quer esquecer.')}</div>`;
}
ACTIONS['gift-next'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const o = ['idea', 'bought', 'given']; const n = o[(o.indexOf(x.status || 'idea') + 1) % 3]; try { await patch(x, { status: n }); if (n === 'given') await sparkleWin('Presente entregue. Vai adorar.', b); rerender(); } catch (e) { fail(e); } };
GROUPS.gift = () => items('gift').flatMap(b => photosOf(b.id));
function tabGifts() {
  const ps = items('person'); const groups = [...ps.map(p => [p, items('gift').filter(g => dget(g, 'person') === p.id)]), [null, items('gift').filter(g => !ps.some(p => p.id === dget(g, 'person')))]].filter(([, gs]) => gs.length);
  return `<div class="okr-bar">${addBtn('gift', 'Ideia de presente', { cls: 'sm', preset: { status: 'idea', cat: 'birthday' } })}<span class="small muted">${amt(items('gift').filter(g => g.status !== 'given').reduce((a, g) => a + (Number(g.amount) || 0), 0))} em ideias e presentes comprados</span></div>
  ${groups.map(([p, gs]) => { const nd = p && C.nextDate(p.day); return `<section class="gift-group"><h2>${esc(p ? p.title : 'Qualquer pessoa')} ${nd ? `<small class="muted">aniversário em ${plural(daysBetween(today(), nd), 'dia')}</small>` : ''}</h2><div class="gift-row">${gs.map(g => { const ph = photosOf(g.id)[0]; return `<article class="gift ${esc(g.status || 'idea')}">${ph ? `<button class="gift-ph" data-action="photo-view" data-id="${esc(ph.id)}" data-group="gift">${img(ph, { ratio: false, alt: '' })}</button>` : `<span class="gift-ph none">${icon('gift')}</span>`}<div><h3><button class="link-plain" data-action="edit" data-id="${esc(g.id)}">${esc(g.title)}</button></h3><small class="muted">${[OCCASIONS[g.cat], g.amount ? amt(g.amount) : '', dget(g, 'size') ? `tamanho ${esc(dget(g, 'size'))}` : ''].filter(Boolean).join(' · ')}</small>
    <div class="inline"><button class="pill-btn ${g.status === 'given' ? 'on' : ''}" data-action="gift-next" data-id="${esc(g.id)}">${esc(GIFT_STATUS[g.status || 'idea'])}</button>${g.url ? `<a class="small" href="${esc(g.url)}" target="_blank" rel="noopener">${icon('external')} Link</a>` : ''}</div></div></article>`; }).join('')}</div></section>`; }).join('') || emptyNote('Anote ideias de presentes assim que elas surgirem.')}`;
}
ACTIONS['ev-step'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const st = C.stepsOf(x); const i = Number(b.dataset.i); st[i] = { ...st[i], done: !st[i].done }; try { await patch(x, { data: { steps: st } }); rerender(); } catch (e) { fail(e); } };
GROUPS.event = () => items('event').flatMap(b => photosOf(b.id));
function tabEvents() {
  const l = sortBy(items('event'), e => (e.day < today() ? '9' : '0') + e.day);
  return `<div class="okr-bar">${addBtn('event', 'Evento', { cls: 'sm', preset: { day: addDays(today(), 14) } })}</div><div class="event-list">${l.map(e => { const st = C.stepsOf(e); const until = daysBetween(today(), e.day); return `<article class="event card ${until < 0 ? 'past' : ''}">${binder()}<header><div><span class="kick">${esc(fmtLong(e.day))}${dget(e, 'time') ? ` · ${esc(dget(e, 'time'))}` : ''}${dget(e, 'place') ? ` · ${esc(dget(e, 'place'))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(e.id)}">${esc(e.title)}</button></h3></div><span class="ev-count"><b class="num">${until < 0 ? '✓' : until}</b><small>${until < 0 ? 'concluído' : 'dias'}</small></span></header>
    ${twoCol(`<div>${st.length ? `<h4>Para fazer</h4><ul class="checks">${st.map((s, i) => `<li><button class="cb ${s.done ? 'on' : ''}" data-action="ev-step" data-id="${esc(e.id)}" data-i="${i}" aria-pressed="${s.done}">${icon('check')}<span>${esc(s.t)}</span></button></li>`).join('')}</ul>` : ''}${(dget(e, 'guests') || []).length ? `<h4>Convidados <small class="muted">${dget(e, 'guests').length}</small></h4><p class="guests">${dget(e, 'guests').map(g => `<span>${esc(g)}</span>`).join('')}</p>` : ''}${e.amount ? `<p class="small">Orçamento ${amt(e.amount)}</p>` : ''}</div>`,
      masonry(photosOf(e.id).map(p => ({ p })), 'event', photoDrop({ item: e.id, label: 'Adicionar inspiração', multiple: true, cls: 'm-add' }), 'small-m'))}</article>`; }).join('') || emptyNote('Jantares, aniversários, casamentos: planeje tudo aqui.')}</div>`;
}
function tabRepair() {
  const l = sortBy(items('conflict'), x => (x.status === 'resolved' ? 1 : 0) * 1e9 - (parseDay(x.day || today()).getTime() / 1e5));
  return `${card(`Antes de <em>escrever</em>`, `<ol class="guide-steps"><li>Apenas os fatos: o que aconteceu, sem interpretar.</li><li>Nomeie o que sentiu, em uma ou duas palavras.</li><li>Descreva o ponto de vista da outra pessoa com justiça.</li><li>Do que você precisa? Essa é a conversa a ter.</li></ol>`, { cls: 'repair-guide', tape: 'pink' })}
  <div class="okr-bar">${addBtn('conflict', 'Registro', { cls: 'sm', preset: { day: today(), status: 'open' } })}</div>
  <div class="trig-list">${l.map(x => { const p = dget(x, 'person') && byId(dget(x, 'person')); return `<article class="trig card lined ${x.status === 'resolved' ? 'resolved' : ''}"><header><span class="kick">${esc(fmtLong(x.day))}${p ? ` · com ${esc(p.title)}` : ''}</span><span class="hilite hl-${x.status === 'resolved' ? 'butter' : x.status === 'talking' ? 'blue' : 'pink'}">${esc(CONFLICT_STATUS[x.status || 'open'])}</span></header><h3><button class="link-plain" data-action="edit" data-id="${esc(x.id)}">${esc(x.title)}</button></h3>
    <dl>${[['happened', 'O que aconteceu'], ['felt', 'Eu senti'], ['theirs', 'O ponto de vista deles'], ['need', 'Eu preciso']].filter(([k]) => dget(x, k)).map(([k, l2]) => `<div><dt>${l2}</dt><dd>${esc(dget(x, k))}</dd></div>`).join('')}${x.body ? `<div><dt>Resolvido</dt><dd>${esc(x.body)}</dd></div>` : ''}</dl></article>`; }).join('') || emptyNote('Um lugar tranquilo para refletir sobre um desacordo antes ou depois da conversa.')}</div>`;
}
function viewSocial(r) {
  const tab = pickTab(STABS, r.tab);
  return `${hubHead(12, 'Suas Pessoas', 'Relacionamentos e <em>Vida Social</em>', 'Aniversários e datas especiais em contagem regressiva, ideias de presentes com links e tamanhos, eventos planejados e uma forma mais gentil de resolver desacordos.', addBtn('person', 'Pessoa', { cls: 'sm' }))}${folderTabs('social', STABS, tab)}<div class="tab-body">${{ people: tabPeople, gifts: tabGifts, events: tabEvents, repair: tabRepair }[tab]()}</div>`;
}
export const VIEWS_WORLD = { travel: viewTravel, media: viewMedia, social: viewSocial };
