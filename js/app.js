// App shell: the sidebar notebook with every hub and the capture box, the top bar, the drawer and tab bar,
// search, quick capture, routing, uploads and pasting, keyboard shortcuts, sign-in and start-up.
import { db } from './data.js';
import { S, $, esc, icon, APP, ACTIONS, FORMS, BINDS, hooks, route, toast, modal, closeModal, openModal, modalShell, applyTheme, rerender, fail, today, fmtDay, sparkle, DEMO, demoGate, buyLink, firstName, DAYS_LONG, MONTHS, MONTHS_LONG, parseDay } from './core.js';
import { renderAuth, friendlyAuthError } from './views/auth.js';
import { addPhotos, PICK_HOOKS, img } from './photos.js';
import { items, byId, dget, openEditor } from './kinds.js';
import { viewSettings } from './views/settings.js';
import { viewGuide } from './views/guide.js';
import { VIEWS_HOME } from './views/home.js';
import { VIEWS_VISION } from './views/vision.js';
import { VIEWS_WORK } from './views/work.js';
import { VIEWS_GROWTH } from './views/growth.js';
import { VIEWS_LIFE } from './views/life.js';
import { VIEWS_WORLD } from './views/world.js';
import { VIEWS_VAULT } from './views/mindvault.js';
import { openQuick, capture, badge } from './views/common.js';
import { HUBS } from './hubs.js';
import { processRecurringTransactions } from './hub.js';

export { HUBS };
const VIEWS = { settings: viewSettings, guide: viewGuide, home: (r) => VIEWS_HOME.home(r), ...VIEWS_VISION, ...VIEWS_WORK, ...VIEWS_GROWTH, ...VIEWS_LIFE, ...VIEWS_WORLD, ...VIEWS_VAULT };
const pageLabel = (r) => (HUBS.find(x => x[0] === r) || [, { settings: 'Configurações', guide: 'Guia' }[r] || APP])[1];
const known = (n) => Boolean(VIEWS[n]);

// ---------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------
async function loadData() {
  S.settings = { ...S.settings, ...(await db.loadSettings()) };
  const d = await db.loadAll(); S.items = d.items; S.photos = d.photos;
  applyTheme();
}
ACTIONS._reload = loadData;

/** The wordmark: a sparkle on a pinstriped tile, and the name. */
const LOGO = `<span class="logo" aria-hidden="true">${sparkle()}</span>`;
export const mark = () => `<span class="wordmark brand" aria-hidden="true">${LOGO}<b>${esc(APP)}</b></span>`;

// ---------------------------------------------------------------------
// The hub header: logo, folder-tab hub nav, search, quick capture
// ---------------------------------------------------------------------
function header(cur) {
  return `<header class="topbar">
    <button class="tb-btn side-open" data-action="side-toggle" aria-controls="side" aria-expanded="false" aria-label="Abrir barra lateral" title="Abrir barra lateral (Ctrl + \\)">${icon('sidebar')}</button>
    <a class="tb-brand" href="#/home" aria-label="Início">${mark()}</a>
    <nav class="crumbs" aria-label="Navegação">${cur !== 'home' ? `<a class="cr-home" href="#/home">${icon('house')}<span>Início</span></a><span class="cr-sep">/</span><span class="cr-here">${esc(pageLabel(cur))}</span>` : `<span class="cr-here">${icon('house')}Início</span>`}</nav>
    <div class="tb-tools">
      <div class="search"><label class="sr-only" for="q">Pesquisar no HUB</label>${icon('search')}<input id="q" data-bind="search" placeholder="Pesquisar" autocomplete="off" value="${esc(S.ui.q || '')}"><div class="search-res" id="search-res" role="listbox" aria-label="Resultados da pesquisa"></div></div>
      <button class="tb-btn" data-action="quick" data-v="note" aria-label="Captura rápida" title="Captura rápida (N)">${icon('plus')}</button>
      <a class="tb-btn" href="#/settings" aria-label="Configurações" ${cur === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}</a>
      <button class="tb-btn menu-btn" data-action="nav-open" aria-label="Todos os hubs">${icon('menu')}</button>
    </div></header>`;
}
/** The sidebar can be folded away on a laptop; the choice is remembered on this device. */
const sideKey = 'hub-side-collapsed';
const sideCollapsed = () => { try { return localStorage.getItem(sideKey) === '1'; } catch { return false; } };
function setSide(collapsed, store = true) {
  document.body.classList.toggle('side-off', collapsed);
  if (store) try { localStorage.setItem(sideKey, collapsed ? '1' : '0'); } catch { /* private mode: it just won't be remembered */ }
  document.querySelectorAll('[data-action="side-toggle"]').forEach(b => b.setAttribute('aria-expanded', String(!collapsed)));
  const side = $('#side'); if (side) side.inert = collapsed && matchMedia('(min-width: 1101px)').matches;
}
ACTIONS['side-toggle'] = () => { const c = !document.body.classList.contains('side-off'); setSide(c); (c ? $('.side-open') : $('.side-toggle'))?.focus(); };
/** The sidebar: the logo, a capture box (it lands in the inbox on Home), and each hub. */
function sidebar(cur) {
  return `<aside class="side" id="side" aria-label="Hubs">
    <div class="side-top"><a class="side-brand" href="#/home" aria-label="${esc(APP)}: início"><b>${esc(APP)}</b>${LOGO}</a><small class="side-tag">${esc(firstName() ? `cérebro externo de ${firstName()}` : 'seu cérebro externo')}</small><button class="side-toggle" data-action="side-toggle" aria-controls="side" aria-expanded="true" aria-label="Recolher barra lateral" title="Recolher barra lateral (Ctrl + \\)">${icon('sidebar')}</button></div>
    <form class="side-dump dumpbox" data-form="side-dump" autocomplete="off"><label class="sr-only" for="side-dump">Capturar na caixa de entrada</label><input id="side-dump" name="t" maxlength="300" placeholder="Despeje aqui… (pressione D)"><button class="sd-go" aria-label="Adicionar à caixa de entrada">${icon('plus')}</button></form>
    <nav class="side-nav" aria-label="Hubs">${HUBS.map(([id, label, ic]) => `<a href="#/${id}" class="side-link" ${cur === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span></a>`).join('')}</nav>
    <div class="side-foot"><a href="#/guide" class="side-link" ${cur === 'guide' ? 'aria-current="page"' : ''}>${icon('tutorial')}<span>Guia</span></a><a href="#/settings" class="side-link" ${cur === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}<span>Configurações</span></a></div>
  </aside>`;
}
FORMS['side-dump'] = async (f) => { const t = f.elements.t.value.trim(); if (!t) return; try { await capture(t); f.reset(); toast('In the inbox. Sort it on Home.'); rerender(); } catch (e) { fail(e); } };
function drawer(cur) {
  return `<div class="drawer" id="drawer" role="dialog" aria-label="Todos os hubs"><div class="dr-head">${mark()}<button class="icon-btn" data-action="nav-close" aria-label="Fechar">${icon('close')}</button></div>
        <nav>${HUBS.map(([id, label, ic], i) => `<a href="#/${id}" class="dr-link t${i % 5}" ${cur === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(label)}</span></a>`).join('')}</nav>
    <div class="dr-foot"><a href="#/settings">${icon('settings')} Configurações</a><a href="#/guide">${icon('tutorial')} Guia</a></div></div><div class="scrim" data-action="nav-close"></div>`;
}
function renderShell() {
  const r = route(); const cur = known(r.name) ? r.name : 'home';
  document.body.classList.add('with-side'); document.body.classList.toggle('is-demo', db.mode === 'demo');
  const page = VIEWS[cur](r);
  $('#root').innerHTML = `
    ${db.mode === 'demo' ? `<div class="demo-band"><b>Prévia</b> · Experimente à vontade, mas nada será salvo. ${buyLink('demo-cta')}</div>` : ''}
    ${sidebar(cur)}<div class="main-col">${header(cur)}${drawer(cur)}
    <main id="main" class="hub page-${cur}">${page}</main></div>
    <nav class="tabbar" aria-label="Shortcuts">
      <a href="#/home" ${cur === 'home' ? 'aria-current="page"' : ''}>${icon('house')}<span>Início</span></a>
      <a href="#/plan" ${cur === 'plan' ? 'aria-current="page"' : ''}>${icon('target')}<span>Semana</span></a>
      <button class="fab" data-action="quick" data-v="note" aria-label="Captura rápida">${icon('plus')}</button>
      <a href="#/focus" ${cur === 'focus' ? 'aria-current="page"' : ''}>${icon('timer')}<span>Foco</span></a>
      <button data-action="nav-open" ${['home', 'plan', 'focus'].includes(cur) ? '' : 'aria-current="page"'}>${icon('menu')}<span>Hubs</span></button>
    </nav>`;
  setSide(sideCollapsed(), false);
  document.title = `${pageLabel(cur)} · ${APP}`;
  for (const fn of hooks.after) { try { fn(r); } catch (e) { console.error(e); } }
}
function render() {
  if (!S.session) return renderAuth();
  renderShell();
}
hooks.render = render;
hooks.rerender = () => {
  if (!S.session) return render();
  const y = window.scrollY; const active = document.activeElement; const navX = $('.hubnav')?.scrollLeft || 0;
  const key = active?.id || (active?.dataset?.action && `[data-action="${active.dataset.action}"]${active.dataset.id ? `[data-id="${CSS.escape(active.dataset.id)}"]` : ''}${active.dataset.v ? `[data-v="${CSS.escape(active.dataset.v)}"]` : ''}`);
  renderShell(); window.scrollTo(0, y); if ($('.hubnav')) $('.hubnav').scrollLeft = navX;
  if (key && !modal().open) { const el = active.id ? document.getElementById(active.id) : $(key); el?.focus({ preventScroll: true }); }
};
hooks.after.push(() => { const a = $('.hubnav [aria-current="page"]'); const n = $('.hubnav'); if (a && n && !n.dataset.scrolled) { n.scrollLeft = a.offsetLeft - n.clientWidth / 2 + a.clientWidth / 2; } });
const titleConnectors = new Set(['a','ao','aos','às','com','da','das','de','do','dos','e','em','na','nas','no','nos','o','os','ou','para','pela','pelas','pelo','pelos','por','sem']);
function titleCaseNode(el) {
  if (!el) return;
  let first = true;
  const visit = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = node.textContent.replace(/\S+/g, (word) => {
        const match = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}’'_-]*)([^\p{L}\p{N}]*)$/u);
        if (!match) { first = false; return word; }
        const [, leading, core, trailing] = match;
        const lower = core.toLocaleLowerCase('pt-BR');
        const keep = !first && titleConnectors.has(lower);
        const formatted = keep ? lower : lower ? lower[0].toLocaleUpperCase('pt-BR') + lower.slice(1) : lower;
        first = false;
        return leading + formatted + trailing;
      }).replace(/^\s+/, ' ');
    } else node.childNodes.forEach(visit);
  };
  visit(el);
}
hooks.after.push(() => {
  document.querySelectorAll('h1, h2, .sec-head h2, .card-head h2, .hub-head h1').forEach(titleCaseNode);
});

// ---------------------------------------------------------------------
// Search across every hub
// ---------------------------------------------------------------------
const SEARCH_KINDS = { task: 'Tarefa', project: 'Projeto', block: 'Reunião', meeting: 'Notas de reunião', capture: 'Caixa de entrada', vpin: 'Quadro de visão', value: 'Valor', antigoal: 'Antiobjetivo', manifest: 'Manifestação', objective: 'Objetivo', goal: 'Meta anual', sprint: 'Ano de 12 semanas', tactic: 'Tática', qreview: 'Revisão trimestral', txn: 'Finanças', sub: 'Assinatura', debt: 'Dívida', account: 'Conta', wish: 'Lista de desejos', contact: 'Contato', folio: 'Portfólio', role: 'Experiência', course: 'Curso', deck: 'Baralho', flash: 'Flashcard', cnote: 'Nota Cornell', cert: 'Certificado', lift: 'Musculação', cardio: 'Cardio', meal: 'Alimentação', trigger: 'Gatilho', therapy: 'Terapia', journal: 'Diário', recipe: 'Receita', chore: 'Tarefa doméstica', plant: 'Planta', belonging: 'Inventário', warranty: 'Garantia', room: 'Ambiente', trip: 'Viagem', stop: 'Itinerário', bucket: 'Lista de desejos', tdiary: 'Diário de viagem', book: 'Livro', watch: 'Lista para assistir', pod: 'Podcast', game: 'Jogo', person: 'Pessoa', gift: 'Presente', event: 'Evento', conflict: 'Diário de conflitos', clip: 'Clipping', swipe: 'Arquivo inspirador', zettel: 'Nota', session: 'Foco', study: 'Estudo', waste: 'Perda de tempo', reflect: 'Reflexão', letter: 'Carta', habit: 'Hábito' };
function searchResults(q) {
  const t = q.trim().toLowerCase(); if (t.length < 2) return [];
  return S.items.filter(x => SEARCH_KINDS[x.kind] && `${x.title} ${x.body || ''} ${dget(x, 'author') || ''} ${dget(x, 'company') || ''} ${dget(x, 'show') || ''} ${(dget(x, 'tags') || []).join(' ')}`.toLowerCase().includes(t)).slice(0, 10);
}
BINDS.search = (t, type) => {
  S.ui.q = t.value; const box = $('#search-res'); if (!box) return; const res = searchResults(t.value);
  box.innerHTML = res.map(x => `<button role="option" data-action="edit" data-id="${esc(x.id)}"><span class="tag">${esc(SEARCH_KINDS[x.kind])}</span><b>${esc(x.title || x.body?.slice(0, 40) || 'Untitled')}</b></button>`).join('') || (t.value.trim().length >= 2 ? '<p class="small muted">Nothing found.</p>' : '');
  box.classList.toggle('on', t.value.trim().length >= 2);
};
document.addEventListener('focusout', (e) => { if (e.target.id === 'q') setTimeout(() => $('#search-res')?.classList.remove('on'), 200); });

// ---------------------------------------------------------------------
// Global events
// ---------------------------------------------------------------------
ACTIONS['close-modal'] = () => closeModal();
ACTIONS['auth-view'] = (t) => { S.authView = t.dataset.v; S.authErr = ''; S.authMsg = ''; renderAuth(); };
ACTIONS['nav-open'] = () => { document.body.classList.add('nav-on'); $('#drawer')?.querySelector('a, button')?.focus(); };
ACTIONS['nav-close'] = () => document.body.classList.remove('nav-on');
ACTIONS['sign-out'] = async () => { await db.signOut?.(); Object.assign(S, { session: null, unlocked: false, authView: 'login', authErr: '', authMsg: '', items: [], photos: [] }); render(); };
BINDS['photo-pick'] = async (t, type) => {
  if (type !== 'change' || !t.files.length) return;
  const files = [...t.files]; t.value = '';
  const label = t.closest('label'); label?.classList.add('busy');
  try { if (t.dataset.hook) await PICK_HOOKS[t.dataset.hook]?.(files, t); else if (t.dataset.item) await addPhotos(t.dataset.item, files); } finally { label?.classList.remove('busy'); rerender(); }
};
// Paste a picture: into an open form, or onto the vision board / hyper-focus page.
document.addEventListener('paste', async (e) => {
  if (!S.unlocked) return; const files = [...(e.clipboardData?.files || [])].filter(f => /^image\//.test(f.type) || f.type === 'application/pdf'); if (!files.length) return;
  const edit = $('#modal input[data-bind="ed-files"]'); if (edit) { e.preventDefault(); const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); edit.files = dt.files; edit.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (modal().open || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  const hook = { home: 'vibe', vision: 'vpin', knowledge: 'swipe' }[route().name]; if (!hook) return;
  e.preventDefault(); await PICK_HOOKS[hook]?.(files); rerender();
});
document.addEventListener('dragover', (e) => { const z = e.target.closest?.('[data-drop]'); if (z && [...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); z.classList.add('drag'); } });
document.addEventListener('dragleave', (e) => { e.target.closest?.('[data-drop]')?.classList.remove('drag'); });
document.addEventListener('drop', async (e) => {
  const z = e.target.closest?.('[data-drop]'); if (!z || ![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); z.classList.remove('drag');
  const files = [...(e.dataTransfer?.files || [])].filter(f => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name) || f.type === 'application/pdf'); if (!files.length) return;
  if (DEMO && demoGate('photos')) return;
  if (z.dataset.hook) await PICK_HOOKS[z.dataset.hook]?.(files, z); else if (z.dataset.drop) await addPhotos(z.dataset.drop, files);
  rerender();
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (e.target.closest('.drawer a')) document.body.classList.remove('nav-on');
  if (!t || !ACTIONS[t.dataset.action]) return;
  if (t.tagName !== 'A' && !(t.tagName === 'INPUT' && /checkbox|radio/.test(t.type))) e.preventDefault();
  ACTIONS[t.dataset.action](t, e);
});
for (const type of ['input', 'change']) document.addEventListener(type, (e) => { const b = e.target.dataset?.bind; if (b) BINDS[b]?.(e.target, type, e); });
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role=button][data-action]') && !/BUTTON|A/.test(e.target.tagName)) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  if (e.key === 'Escape') { if (document.body.classList.contains('nav-on')) { document.body.classList.remove('nav-on'); return; } }
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || modal().open;
  if (S.unlocked && (e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); ACTIONS['side-toggle'](); return; }
  if (!S.unlocked || typing || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === '/') { e.preventDefault(); $('#q')?.focus(); }
  else if (k === 'n') { e.preventDefault(); openQuick('note'); }
  else if (k === 'd' && $('#side-dump')) { e.preventDefault(); $('#side-dump').focus(); }
  else if (k === 'h') { e.preventDefault(); location.hash = '#/home'; }
  else if (k === 'p') { e.preventDefault(); location.hash = '#/plan'; }
  else if (k === 'f') { e.preventDefault(); location.hash = '#/focus'; }
  else if (/^[0-9]$/.test(k)) { const h = HUBS[Number(k)]; if (h) { e.preventDefault(); location.hash = '#/' + h[0]; } }
});
modal().addEventListener('close', () => { const m = modal(); if (m.open) return; /* something new was opened straight after closing: keep it */ m.innerHTML = ''; const fn = m._onClose; m._onClose = null; fn?.(); });
modal().addEventListener('click', (e) => { if (e.target === modal()) closeModal(); });

document.addEventListener('submit', async (e) => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  if (FORMS[kind]) { const b = f.querySelector('button:not([type="button"])'); if (b?.disabled) return; if (b) b.disabled = true; try { await FORMS[kind](f); } finally { if (b?.isConnected) b.disabled = false; } return; }
  const v = (n) => f.elements[n]?.value.trim();
  const busy = (on) => { const b = f.querySelector('button:not([type="button"])'); if (b) b.disabled = on; };
  S.authErr = ''; S.authMsg = ''; busy(true);
  if (f.elements.email) S.authEmail = v('email');
  try {
    if (kind === 'login') { await db.signIn(v('email'), f.elements.password.value); return; }
    if (kind === 'forgot') { await db.sendReset(v('email')); S.authMsg = 'If that email has an account, a reset link is on its way.'; renderAuth(); return; }
    if (kind === 'resend') { await db.resendConfirm(v('email')); S.needConfirm = false; S.authView = 'login'; S.authMsg = 'If that email is waiting to be confirmed, a new link is on its way. Check spam too, then open it on this device.'; renderAuth(); return; }
    if (kind === 'newpass') { await db.updatePassword(f.elements.password.value); S.authView = 'login'; toast('Password saved'); await afterLogin(); return; }
  } catch (err) { busy(false); S.authErr = friendlyAuthError(err.message); renderAuth(); }
});
// ---------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------
async function afterLogin() {
  S.me = S.session?.user?.id || null; db.me = S.me;
  S.unlocked = await db.owns();
  if (S.unlocked) {
    await loadData();
    render();
    try { if (await processRecurringTransactions()) rerender(); } catch (e) { fail(e); }
    return;
  }
  render();
}
window.addEventListener('hashchange', () => { closeModal(); document.body.classList.remove('nav-on'); if (S.session && S.unlocked) { renderShell(); window.scrollTo(0, 0); } });
(async function start() {
  try {
    await db.init();
    if (db.mode === 'cloud') {
      db.onAuthChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') { S.session = null; S.authView = 'reset'; renderAuth(); S.session = session; return; }
        if (event === 'SIGNED_IN' && !S.session) { S.session = session; await afterLogin(); }
        if (event === 'SIGNED_OUT') { S.session = null; S.unlocked = false; render(); }
        if (event === 'TOKEN_REFRESHED') S.session = session;
      });
    }
    // A confirmation or reset link that expired (or was already used) comes back with an error in the address.
    { const hp = new URLSearchParams(location.hash.replace(/^#\/?/, '')); const qp = new URLSearchParams(location.search);
      const code = hp.get('error_code') || qp.get('error_code'); const desc = hp.get('error_description') || qp.get('error_description');
      if (code || desc) { history.replaceState(null, '', location.pathname); S.authView = 'resend'; S.authErr = /expired|invalid/i.test(`${code} ${desc}`) ? 'That link has expired or was already used. Enter your email and we’ll send you a fresh one.' : `That link didn’t work${desc ? ` (${desc.replace(/\+/g, ' ')})` : ''}. Enter your email and we’ll send you a fresh one.`; } }
    S.session = await db.session();
    if (S.session && S.authView !== 'reset') await afterLogin(); else if (!S.session) render();
  } catch (e) {
    console.error(e);
    $('#root').innerHTML = `<div class="auth-form" style="min-height:100vh"><div class="auth-card"><h2>${esc(APP)} couldn’t start</h2>
      <p class="small">Check your internet connection and refresh the page. If it keeps happening, the app’s settings may be incomplete.</p>
      <button class="btn solid" onclick="location.reload()">Refresh</button></div></div>`;
  }
})();
export { sparkle, items, today, fmtDay, byId, openEditor };

// Preview mode: picking files (photos, PDFs, backups) is for owners.
document.addEventListener('click', (e) => { const f = e.target.closest?.('input[type=file]'); if (f && DEMO && demoGate(/json/.test(f.accept || '') ? 'restore' : 'photos')) e.preventDefault(); }, true);
