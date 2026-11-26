// Estado compartilhado, funções auxiliares, datas, dinheiro, paletas de cores, notificações (toasts), modais e o registro de ações.
import { CONFIG } from './config.js';
import { I } from './icons.js';

exportar const $ = (s, el = documento) => el.querySelector(s);
exportar const $$ = (s, el = documento) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[c]));
export const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
export const APP = CONFIG.appName || 'HUB';
export const PRODUCT = CONFIG.product || 'hub';
export const plural = (n, one, many = one + 's') => `${Number(n).toLocaleString()} ${Number(n) === 1 ? one : many}`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
export const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

// ---------------------------------------------------------------------
// Datas: dias locais simples (AAAA-MM-DD), nunca UTC
// ---------------------------------------------------------------------
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDate(new Date());
export const parseDay = (d) => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, dd); };
export const addDays = (d, n) => { const x = parseDay(d); x.setDate(x.getDate() + n); return isoDate(x); };
export const addMonths = (d, n) => { const x = parseDay(d); const day = x.getDate(); const t = new Date(x.getFullYear(), x.getMonth() + n, 1); t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return isoDate(t); };
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
exportar const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const fmtDay = (d) => { const x = parseDay(d); return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`; };
export const fmtShort = (d) => { const x = parseDay(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}`; };
export const fmtLong = (d) => { const x = parseDay(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
export const fmtMonth = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MONTHS_LONG[m - 1]} ${y}`; };
export const relDay = (d) => { const n = daysBetween(today(), d); return n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : n === -1 ? 'Ontem' : n < 0 ? `${-n} dias atrás` : n < 7 ? DAYS_LONG[parseDay(d).getDay()] : fmtShort(d); };
export const relLow = (d) => { const r = relDay(d); return /^(Today|Tomorrow|Yesterday)$/.test(r) ? r.toLowerCase() : r; };
export const monthKey = (d = today()) => d.slice(0, 7);
export const monthStart = (d = today()) => d.slice(0, 8) + '01';
export const monthEnd = (d = today()) => { const x = parseDay(d); return isoDate(new Date(x.getFullYear(), x.getMonth() + 1, 0)); };
export const inMonth = (d, ym) => String(d || '').startsWith(ym);
export const weekStart = (d = today()) => { const x = parseDay(d); const ws = Number(S.settings.week_start ?? 1); return addDays(d, -((x.getDay() - ws + 7) % 7)); };
/** O dia local de um registro de data e hora. */
export const dayOf = (ts) => (ts ? isoDate(new Date(ts)) : '');
/** 9h05, no formato de relógio da pessoa. */
export const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const hhmm = (t) => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return clock(d); };
/** "3h20min", "12min", "45s". */
export const dur = (min) => { const m = Number(min) || 0; if (m <= 0) return '0 min'; if (m < 1) return `${Math.max(1, Math.round(m * 60))} s`; if (m < 60) return `${Math.round(m)} min`; const h = Math.floor(m / 60), r = Math.round(m % 60); return r ? `${h} h ${r} min` : `${h} h`; };
export const ago = (ts) => { const m = (Date.now() - new Date(ts).getTime()) / 6e4; if (m < 1) return 'agora mesmo'; if (m < 60) return `${Math.round(m)} min atrás`; if (m < 60 * 24) return `${Math.floor(m / 60)} h atrás`; const d = Math.floor(m / 1440); return d === 1 ? 'ontem' : `${d} dias atrás`; };
export const hoursSince = (ts) => (ts ? (Date.now() - new Date(ts).getTime()) / 36e5 : Infinity);

// ---------------------------------------------------------------------
// Dinheiro
// ---------------------------------------------------------------------
exportar const MOEDAS = [
  ['USD', 'Dólar americano'], ['EUR', 'Euro'], ['GBP', 'Libra esterlina'], ['CAD', 'Dólar canadense'], ['AUD', 'Dólar australiano'], ['NZD', 'Dólar neozelandês'],
  ['SGD', 'Dólar de Singapura'], ['PHP', 'Peso filipino'], ['MYR', 'Ringgit malaio'], ['IDR', 'Rúpia indonésia'], ['THB', 'Baht tailandês'], ['VND', 'Dong vietnamita'],
  ['JPY', 'Iene japonesa'], ['KRW', 'Won sul-coreano'], ['CNY', 'Yuan chinês'], ['HKD', 'Dólar de Hong Kong'], ['INR', 'Rúpia indiana'], ['AED', 'Dirham dos Emirados Árabes Unidos'],
  ['SAR', 'Riyal saudita'], ['ZAR', 'Rand sul-africano'], ['BRL', 'Real brasileiro'], ['MXN', 'Peso mexicano'], ['CHF', 'Franco suíço'], ['SEK', 'Coroa sueca'],
  ['NOK', 'Coroa norueguesa'], ['DKK', 'Coroa dinamarquesa'],
];
const fmtCache = novo Map();
const nf = (cur, whole) => { const k = cur + whole; if (!fmtCache.has(k)) { try { fmtCache.set(k, new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, ...(whole ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}) })); } catch { fmtCache.set(k, new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })); } } return fmtCache.get(k); };
/** O símbolo da moeda isoladamente, por exemplo, "$", "S$", "₱". */
export const curSym = () => { try { return (nf(S.settings.currency || 'USD').formatToParts(0).find(p => p.type === 'currency') || {}).value || ''; } catch { return '$'; } };
/** Um número com agrupamento, mas sem moeda, para células compactas ("1.250"). */
export const plainNum = (n, dp = 0) => new Intl.NumberFormat(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp }).format(Number(n) || 0);
export const money = (n, opts = {}) => nf(opts.cur || S.settings.currency || 'USD', opts.whole).format(Number(n) || 0);
export const moneyWhole = (n, cur) => money(Math.round(Number(n) || 0), { whole: true, cur });
export const moneyShort = (n) => { const v = Number(n) || 0; const a = Math.abs(v); if (a < 10000) return moneyWhole(v); const parts = nf(S.settings.currency || 'USD', true).formatToParts(0); const sym = parts.find(p => p.type === 'currency')?.value || ''; const pre = parts[0]?.type === 'currency'; const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'm' : (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k'; return `${v < 0 ? '−' : ''}${pre ? sym : ''}${s}${pre ? '' : ' ' + sym}`; };
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const sum = (list, f = x => (x && typeof x === 'object' ? x.amount : x)) => round2(list.reduce((a, x) => a + (Number(f(x)) || 0), 0));

// ---------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------
exportar const S = {
  sessão: nula, desbloqueado: falso, visualização de autenticação: 'login', mensagem de autenticação: '', erro de autenticação: '', e-mail de autenticação: '',
  eu: nulo,
  configurações: { tema: 'pó', baixa_estimulação: falso, calma: falso, decoração: verdadeiro, som: verdadeiro, moeda: 'USD', orçamento_mensal: nulo, ano_do_quadro: nulo, início_da_semana: 1, nome_de_exibição: '', alter_ego: '', intenção: '', dia_da_intenção: nulo, dados: {} },
  itens: [], fotos: [],
  interface do usuário: {},
};
export const firstName = () => (S.settings.display_name || '').split(' ')[0];

// ---------------------------------------------------------------------
// Aparência: paletas claras, suaves e neutras. Tamanho do texto, movimento reduzido e
// A opção "ocultar saldos exatos" também está disponível nas configurações.
// ---------------------------------------------------------------------
exportar const TEMAS = [
  { id: 'custom', grupo: 'soft', nome: 'Personalizada', nota: 'Escolha todas as cores', sw: ['#FFFDF8', '#F6F0E5', '#A86D8C', '#DCCB9D', '#342B25'] },
  { id: 'pó', grupo: 'soft', nome: 'Pó e Peônia', nota: 'Azul bebê e rosa peônia', sw: ['#FCF8F3', '#BFDCF5', '#F9C9DF', '#F6E3A1', '#1F1C2C'] },
  { id: 'lilás', grupo: 'soft', nome: 'Carta Lilás', nota: 'Lavanda, manteiga e hortelã', sw: ['#FBF8FC', '#D9CCF4', '#F8E7A6', '#C7EBDA', '#26213A'] },
  { id: 'matcha', grupo: 'soft', nome: 'Matcha e Leite', nota: 'Sálvia, aveia e damasco', sw: ['#F8F6EE', '#C9DDBF', '#F6D2B8', '#EFE4C7', '#22301F'] },
  { id: 'damasco', grupo: 'soft', nome: 'Sol de Damasco', nota: 'Damasco, coral e céu', sw: ['#FFF8F1', '#FFD3B0', '#F9B8B0', '#C9E2F5', '#2C211B'] },
  { id: 'lavanda', grupo: 'soft', nome: 'Lavanda', nota: 'Lavanda, lilás e creme', sw: ['#FAF8FD', '#DCCFEF', '#C9D7F2', '#F1D8E5', '#302A40'] },
  { id: 'peônia', grupo: 'soft', nome: 'Peônia', nota: 'Rosa chá, violeta e morango', sw: ['#FCF5F7', '#F3C8D8', '#D8C7EE', '#F6D3CA', '#372735'] },
  { id: 'lagoa', grupo: 'soft', nome: 'Lagoa', nota: 'Turquesa, água e conchas', sw: ['#F3FAF8', '#BDE3D8', '#A9D7E8', '#F2D2C2', '#183338'] },
  { id: 'sunbeam', grupo: 'soft', nome: 'Raio de Sol', nota: 'Manteiga, lavanda e sálvia', sw: ['#FFFBEF', '#F5E58A', '#DCCDEF', '#C9DFBE', '#30301F'] },
  { id: 'oxford', grupo: 'neutro', nome: 'Oxford', nota: 'Azul-marinho, pedra e latão', sw: ['#F5F3EE', '#D6DCE6', '#E5DCCB', '#C9B37E', '#18233A'] },
  { id: 'olive', grupo: 'neutro', nome: 'Campo de Oliveiras', nota: 'Oliva, areia e linho', sw: ['#F3F1E8', '#D5D9BC', '#E6D7B8', '#C9C3AE', '#262A1C'] },
  { id: 'ardósia', grupo: 'neutro', nome: 'Ardósia', nota: 'Cinzas frios com toque de azul aço', sw: ['#F2F3F4', '#D3DAE1', '#DDDBD6', '#B9C4CC', '#1D2328'] },
  { id: 'espresso', grupo: 'neutro', nome: 'Expresso', nota: 'Café, creme e caramelo', sw: ['#F6F1EA', '#E3D2BF', '#D9CBB8', '#C7A98A', '#2A1F18'] },
  { id: 'arenito', grupo: 'neutro', nome: 'Pedra e Areia', nota: 'Areia, pedra e terracota clara', sw: ['#F8F5EF', '#DDD2C2', '#CBBEAC', '#DABAA8', '#3C342D'] },
  { id: 'cogumelo', grupo: 'neutro', nome: 'Cogumelo', nota: 'Taupe, rosa seco e musgo', sw: ['#F6F2ED', '#D8CEC3', '#DFC9C7', '#CBD1BD', '#332E29'] },
  { id: 'eucalipto', grupo: 'neutro', nome: 'Eucalipto', nota: 'Verde-fumo, cinza e terracota', sw: ['#F2F5F1', '#CAD8CE', '#C9D1CF', '#DDBAA4', '#26352F'] },
  { id: 'nuvem', grupo: 'neutro', nome: 'Nuvem', nota: 'Cinza claro, azul e lavanda', sw: ['#F7F8FA', '#DEE4EA', '#D5DCE8', '#DDD5E8', '#303744'] },
];
export function themeId() { const t = S.settings.theme; return THEMES.some(x => x.id === t) ? t : 'powder'; }
export const isDark = () => Boolean(THEMES.find(x => x.id === themeId())?.dark);
export function applyTheme() {
  const root = document.documentElement; const id = themeId(); const dark = isDark();
  root.dataset.theme = id; root.style.colorScheme = dark ? 'dark' : 'light';
  const D = S.settings.data || {};
  se (id === 'custom') {
    const c = D.customTheme || {};
    const custom = {
      papel: c.papel || '#FFFDF8', superfície: c.superfície || '#FFFFFF', superfície2: c.superfície2 || '#F6F0E5',
      tinta: c.ink || '#342B25', silenciado: c.muted || '#74675E', acento: c.accent || '#A86D8C',
      acento2: c.accent2 || '#6F7E52', t1: c.t1 || '#D6E4F0', t2: c.t2 || '#F1CEDA',
      t3: c.t3 || '#E9D6A5', t4: c.t4 || '#CADDBD', t5: c.t5 || '#D7CCEB',
    };
    Objeto.entradas({
      '--paper': custom.paper, '--surface': custom.surface, '--surface2': custom.surface2,
      '--ink': custom.ink, '--ink2': custom.ink, '--muted': custom.muted, '--edge': custom.ink,
      '--hair': custom.surface2, '--accent': custom.accent, '--accent2': custom.accent2,
      '--t1': custom.t1, '--t2': custom.t2, '--t3': custom.t3, '--t4': custom.t4, '--t5': custom.t5,
      '--on': custom.ink,
    }).forEach(([chave, valor]) => root.style.setProperty(chave, valor));
  } outro {
    ['--paper','--surface','--surface2','--ink','--ink2','--muted','--edge','--hair','--accent','--accent2','--t1','--t2','--t3','--t4','--t5','--on'].forEach(key => root.style.removeProperty(key));
  }
  root.classList.toggle('calm', Boolean(S.settings.calm));
  root.classList.toggle('plain', S.settings.decor === false);
  root.classList.toggle('hide-bal', Boolean(D.hideBal));
  root.dataset.text = String(D.textSize ?? 1);
  $('meta[name="theme-color"]')?.setAttribute('content', THEMES.find(x => x.id === id).sw[0]);
}

/** Minutos desde a meia-noite para um registro de data e hora, e o instante para um dia + "HH:MM". */
export const minOfDay = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
export const atTime = (day, hhmmStr) => { const [y, m, d] = day.split('-').map(Number); const [h, mi] = String(hhmmStr || '00:00').split(':').map(Number); return new Date(y, m - 1, d, h, mi).toISOString(); };
export const hm24 = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** "2 d 4 h", "3 h 20 min", "12 min". */
export const until = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60; return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`; };
export const calm = () => Boolean(S.settings.calm) || matchMedia('(prefers-reduced-motion: reduce)').matches;

export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${I[n] || ''}</svg>`;

// ---------------------------------------------------------------------
// Feedback: brindes, confetes, um burburinho
// ---------------------------------------------------------------------
export function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.error ? ' err' : '');
  el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
  if (opts.action) el.querySelector('button').onclick = () => { opts.onAction(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), opts.ms || 3800);
}
export const fail = (e) => { console.error(e); toast(e?.message || 'Algo deu errado. Tente novamente.', { error: true, ms: 6000 }); };
export function buzz(pattern = 18) { if (S.settings.haptics !== false && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) try { navigator.vibrate(pattern); } catch { /* não suportado */ } }
/** Confete de papel de um ponto na tela. Ignorado no modo calmo. */
export function pop(el, n = 16) {
  se (calma() || !el) retorne;
  const r = el.getBoundingClientRect(); const box = document.createElement('div'); box.className = 'pop'; box.setAttribute('aria-hidden', 'true');
  box.style.left = (r.left + r.width / 2) + 'px'; box.style.top = (r.top + r.height / 2) + 'px';
  const cores = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)', 'var(--accent)'];
  para (seja i = 0; i < n; i++) {
    const p = document.createElement('i'); const a = (Math.PI * 2 * i) / n + Math.random() * 0.4; const d = 30 + Math.random() * 40;
    p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d - 12 + 'px'); p.style.background = colors[i % colors.length];
    p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg'); box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 950);
}

// ---------------------------------------------------------------------
// Modal (diálogo nativo)
// ---------------------------------------------------------------------
export const modal = () => $('#modal');
export function openModal(html, opts = {}) {
  const m = modal(); m.innerHTML = html; m._onClose = opts.onClose; m.className = opts.size || '';
  se (!m.aberto) m.mostrarModal();
  const first = m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=range]), select, textarea');
  primeiro?.foco();
}
export function closeModal() { const m = modal(); if (m.open) m.close(); }
export function modalShell(title, body, foot = '', opts = {}) {
  retornar `<${opts.form ? `form data-form="${opts.form}" ${opts.attrs || ''}` : 'div'} class="modal-inner" novalidate>
    <header class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
    <div class="modal-body">${body div>
    ${foot ? `<footer class="modal-foot">${foot}</footer>` : ''}
  </${opts.form ? 'form' : 'div'}>`;
}

// ---------------------------------------------------------------------
// Ações, formulários e ganchos de renderização (preenchidos pelos módulos)
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Modo de pré-visualização (a demonstração). Nada é armazenado: tudo fica na memória e
// desaparece ao atualizar a página ou em uma nova visita. Os uploads, downloads e o cofre são para proprietários.
// ---------------------------------------------------------------------
export const DEMO = !(CONFIG.supabaseUrl && CONFIG.supabaseKey) || new URLSearchParams(location.search).has('demo');
export const SHOP = /^https:\/\//i.test(CONFIG.shopUrl || '') ? CONFIG.shopUrl : '';
const GATES = {
  fotos: ['Suas próprias fotos', 'Adicionar suas próprias fotos e arquivos faz parte da versão completa.']
  Exportar: ['Downloads', 'Backups, planilhas e downloads de fotos fazem parte da versão completa.']
  cofre: ['O cofre de senhas', 'O cofre de senhas criptografado faz parte da versão completa.']
  restaurar: ['Restaurando um backup', 'Restaurar um backup faz parte da versão completa.']
};
export const buyLink = (cls = 'btn solid') => LOJA ? `<a class="${cls}" href="${esc(LOJA)}" target="_blank" rel="noopener">Obtenha seu próprio ${esc(APP)}</a>` : (CONFIG.supabaseUrl && CONFIG.supabaseKey ? `<a class="${cls}" href="${esc(location.pathname)}">Faça login ou cadastre-se</a>` : '');
/** No modo de pré-visualização, explique que este é um recurso da versão completa e retorne verdadeiro (o chamador para). */
export function demoGate(what = 'photos') {
  Se (!DEMO || window.__testHarness) retornar falso;
  const [título, linha] = GATES[o que] || GATES.fotos;
  if (modal().open) { toast(`${line} Esta pré-visualização não guarda nada.`, SHOP ? { action: `Obter ${APP}`, onAction: () => window.open(SHOP, '_blank', 'noopener'), ms: 7000 } : { ms: 6000 }); return true; }
  openModal(modalShell(title, `<p style="margin-top:0"><b>${esc(line)}</b></p><p class="small muted">Você está na pré-visualização do ${esc(APP)}. Experimente tudo o que quiser, mas nada é salvo: tudo recomeça quando você atualiza ou sai da página. Com seu próprio ${esc(APP)}, tudo é salvo em sua conta privada e funciona em todos os seus dispositivos.</p>`,
    `<span></span><div class="right"><button type="button" class="btn ghost" data-action="close-modal">Continue explorando</button>${buyLink()}</div>`), { size: 'narrow' });
  retornar verdadeiro;
}

export const ACTIONS = {};
export const FORMS = {};
export const BINDS = {};
export const hooks = { rerender: () => {}, render: () => {}, after: [] };
export const rerender = () => hooks.rerender();
export const go = (h) => { if (location.hash === h) rerender(); else location.hash = h; };
export function confirmButton(btn, label, fn) {
  se (btn.dataset.armed) retorne fn();
  btn.dataset.armed = '1'; const antigo = btn.innerHTML; btn.textContent=rótulo;
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = old; } }, 4000);
}
export function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'welcome', parts, params: new URLSearchParams(query), tab: new URLSearchParams(query).get('tab') };
}
/** Tons, usados ​​onde a cor tem um significado. Cada tema os define. */
export const TONES = ['t1', 't2', 't3', 't4', 't5', 't6'];
export const TONE_NAMES = { t1: 'Tom 1', t2: 'Tom 2', t3: 'Tom 3', t4: 'Tom 4', t5: 'Tom 5', t6: 'Tom 6' };
export const toneOf = (s) => TONES[hash(s) % TONES.length];
/** Um brilho: uma estrela de quatro pontas. */
export const sparkle = (cls = '') => `<svg class="spk ${cls}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2c1.5 9 4.6 13.4 18 18-13.4 4.6-16.5 9-18 18-1.5-9-4.6-13.4-18-18 13.4-4.6 16.5-9 18-18z"/></svg>`;
