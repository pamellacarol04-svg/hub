// Settings: how it looks (theme, text size, motion, celebrations, sound), the basics (name,
// currency, week start, the planner year), your daily habits, and your data.
import { S, esc, icon, ACTIONS, BINDS, FORMS, rerender, today, toast, fail, applyTheme, THEMES, themeId, APP, CURRENCIES, openModal, closeModal, modalShell, confirmButton } from '../core.js';
import { db, hasCloud } from '../data.js';
import { saveSettings, download } from '../ui.js';
import { items, dget, sortBy, addBtn, EXP_CATS, INC_CATS, normalizeHexColor } from '../kinds.js';
import { photoBytes, fmtBytes, makeZip, isPdf } from '../photos.js';
import { habits, habitStreak } from '../hub.js';
import { D, saveData, seg, hubHead } from './common.js';
import { calendarIcs } from '../calendar-export.mjs';

const tog = (key, on, label, sub, kind = 'data') => `<div class="set-row"><span class="sr-t"><b>${esc(label)}</b><small>${esc(sub)}</small></span><label class="tog-wrap"><span class="sr-only">${esc(label)}</span><input type="checkbox" class="tog" data-bind="set-tog" data-k="${key}" data-kind="${kind}" ${on ? 'checked' : ''}></label></div>`;
const THEME_PT = {
  custom: ['Personalizada', 'Escolha todas as cores'],
  powder: ['Pó e Peônia', 'Azul bebê e rosa peônia'],
  lilac: ['Carta Lilás', 'Lavanda, manteiga e hortelã'],
  matcha: ['Matcha e Leite', 'Sálvia, aveia e damasco'],
  apricot: ['Sol de Damasco', 'Damasco, coral e céu'],
  lavender: ['Lavanda', 'Lavanda, lilás e creme'],
  peony: ['Peônia', 'Rosa chá, violeta e morango'],
  lagoon: ['Lagoa', 'Turquesa, água e conchas'],
  sunbeam: ['Raio de Sol', 'Manteiga, lavanda e sálvia'],
  oxford: ['Oxford', 'Azul-marinho, pedra e latão'],
  olive: ['Campo de Oliveiras', 'Oliva, areia e linho'],
  slate: ['Ardósia', 'Cinzas frios com toque de azul aço'],
  espresso: ['Expresso', 'Café, creme e caramelo'],
  sandstone: ['Pedra e Areia', 'Areia, pedra e terracota clara'],
  mushroom: ['Cogumelo', 'Taupe, rosa seco e musgo'],
  eucalyptus: ['Eucalipto', 'Verde-fumo, cinza e terracota'],
  cloud: ['Nuvem', 'Cinza claro, azul e lavanda'],
};
const CURRENCY_PT = {
  USD: 'Dólar americano', EUR: 'Euro', GBP: 'Libra esterlina', CAD: 'Dólar canadense',
  AUD: 'Dólar australiano', NZD: 'Dólar neozelandês', SGD: 'Dólar de Singapura',
  PHP: 'Peso filipino', MYR: 'Ringgit malaio', IDR: 'Rúpia indonésia',
  THB: 'Baht tailandês', VND: 'Dong vietnamita', JPY: 'Iene japonês',
  KRW: 'Won sul-coreano', CNY: 'Yuan chinês', HKD: 'Dólar de Hong Kong',
  INR: 'Rúpia indiana', AED: 'Dirham dos Emirados', SAR: 'Riyal saudita',
  ZAR: 'Rand sul-africano', BRL: 'Real brasileiro', MXN: 'Peso mexicano',
  CHF: 'Franco suíço', SEK: 'Coroa sueca', NOK: 'Coroa norueguesa',
  DKK: 'Coroa dinamarquesa',
};
const WEEKDAY_COLOR_SETTINGS = [
  [0, 'Domingo', 'c5', '#8661C6'], [1, 'Segunda-feira', 'c1', '#3B74B5'],
  [2, 'Terça-feira', 'c2', '#D0558D'], [3, 'Quarta-feira', 'c4', '#3E9468'],
  [4, 'Quinta-feira', 'c3', '#B07E0A'], [5, 'Sexta-feira', 'c1', '#3B74B5'],
  [6, 'Sábado', 'c2', '#D0558D'],
];
const themeToneColor = (tone, fallback) => {
  const root = globalThis.document?.documentElement;
  const value = root && typeof globalThis.getComputedStyle === 'function'
    ? globalThis.getComputedStyle(root).getPropertyValue(`--${tone}`)
    : '';
  return normalizeHexColor(value) || fallback;
};
export function viewSettings() {
  const s = S.settings; const d = D(); const ts = Number(d.textSize ?? 1);
  const custom = d.customTheme || {};
  const customColors = {
    paper: custom.paper || '#FFFDF8', surface: custom.surface || '#FFFFFF', surface2: custom.surface2 || '#F6F0E5',
    ink: custom.ink || '#342B25', muted: custom.muted || '#74675E', accent: custom.accent || '#A86D8C',
    accent2: custom.accent2 || '#6F7E52', t1: custom.t1 || '#D6E4F0', t2: custom.t2 || '#F1CEDA',
    t3: custom.t3 || '#E9D6A5', t4: custom.t4 || '#CADDBD', t5: custom.t5 || '#D7CCEB',
  };
  const colorFields = [
    ['paper', 'Fundo'], ['surface', 'Cartões'], ['surface2', 'Superfícies'],
    ['ink', 'Texto'], ['muted', 'Texto suave'], ['accent', 'Destaque'],
    ['accent2', 'Destaque secundário'], ['t1', 'Tonalidade azul'], ['t2', 'Tonalidade rosa'],
    ['t3', 'Tonalidade dourada'], ['t4', 'Tonalidade verde'], ['t5', 'Tonalidade lilás'],
  ];
  const calendarResult = new URLSearchParams(location.hash.split('?')[1] || '').get('calendar');
  const calendarFeedback = {
    connected: 'Google Agenda conectado. A sincronização automática está ativa.',
    expired: 'O link de autorização expirou. Tente conectar novamente.',
    error: 'Não foi possível conectar o Google Agenda. Verifique a configuração OAuth e tente novamente.',
    reauthorize: 'O Google não forneceu um token de renovação. Tente conectar novamente e aceite as permissões.',
  }[calendarResult] || '';
  return `${hubHead(0, 'Personalize', 'Suas <em>Configurações</em>', 'A aparência, os dados básicos, seus hábitos e suas informações.')}
  <div class="set-cols"><div class="set-col">
    <section class="card box"><h2>Aparência</h2>
      <div class="set-row"><span class="sr-t"><b>Paleta</b><small>Escolha entre opções suaves e neutras, todas claras.</small></span></div>${[['soft', 'Suaves'], ['neutral', 'Neutras']].map(([g, gl]) => `<h4 class="pal-g">${gl}</h4><div class="palettes" role="group" aria-label="Paletas ${gl.toLowerCase()}">${THEMES.filter(t => t.group === g).map(t => { const pt = THEME_PT[t.id] || [t.name, t.note]; return `<button class="pal" data-action="theme" data-v="${t.id}" aria-pressed="${themeId() === t.id}"><span class="pal-sw">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(pt[0])}</b><small>${esc(pt[1])}</small></button>`; }).join('')}</div>`).join('')}
      <details class="custom-colors" ${themeId() === 'custom' ? 'open' : ''}>
        <summary><b>Cores personalizadas</b><small>Edite os códigos hexadecimal</small></summary>
        <form data-form="custom-theme" class="custom-color-form">
          <div class="custom-color-grid">${colorFields.map(([key, label]) => `<label class="custom-color-field"><span>${esc(label)}</span><span class="hex-wrap"><input type="color" value="${esc(customColors[key])}" data-bind="custom-color" data-key="${key}" aria-label="Escolher ${esc(label)}"><input class="input" type="text" name="${key}" value="${esc(customColors[key])}" maxlength="7" pattern="#[0-9A-Fa-f]{6}" spellcheck="false" inputmode="text"></span></label>`).join('')}</div>
          <button class="btn solid sm" type="submit">Aplicar cores</button>
        </form>
      </details>
      <div class="week-header-colors"><h3>Cabeçalhos da semana</h3><p class="small muted">Escolha uma cor para cada dia no Planejamento Semanal.</p>
        <div class="week-color-settings">${WEEKDAY_COLOR_SETTINGS.map(([day, label, tone, fallback]) => {
          const color = normalizeHexColor(d.weekDayHeaderColors?.[day]) || themeToneColor(tone, fallback);
          return `<label class="week-color-setting"><span>${label}</span><input type="color" value="${esc(color)}" data-bind="week-day-color" data-day="${day}" aria-label="Cor do cabeçalho de ${label}"></label>`;
        }).join('')}</div>
      </div>
      <div class="set-row"><span class="sr-t"><b>Tamanho do texto</b><small>Texto maior, mesma disposição</small></span><div class="tsizes" role="group" aria-label="Tamanho do texto">${[0, 1, 2, 3].map(i => `<button data-action="text-size" data-v="${i}" aria-pressed="${ts === i}" aria-label="Tamanho do texto ${i + 1}" style="font-size:${[.8, 1, 1.2, 1.4][i]}rem">A</button>`).join('')}</div></div>
      ${tog('calm', s.calm, 'Reduzir movimento', 'Sem animações, etiquetas flutuantes ou confetes', 'col')}
      ${tog('decor', s.decor !== false, 'Detalhes visuais', 'Brilhos, fotos inclinadas, escrita manual e confetes', 'col')}
      ${tog('sound', s.sound !== false, 'Sons', 'Um toque suave junto aos brilhos', 'col')}</section>
    <form class="card box" data-form="basics"><h2>Dados básicos</h2>
      <div class="set-row"><span class="sr-t"><b>Seu nome</b><small>Para a saudação no início</small></span><input class="input set-in" name="display_name" maxlength="60" value="${esc(s.display_name || '')}"></div>
      <div class="set-row"><span class="sr-t"><b>Moeda</b></span><select class="input set-in" name="currency">${CURRENCIES.map(([cc]) => `<option value="${cc}" ${(s.currency || 'USD') === cc ? 'selected' : ''}>${esc(CURRENCY_PT[cc] || cc)}, ${cc}</option>`).join('')}</select></div>
      <div class="set-row"><span class="sr-t"><b>A semana começa em</b></span><select class="input set-in" name="week_start">${[[1, 'Segunda-feira'], [0, 'Domingo']].map(([v, l]) => `<option value="${v}" ${Number(s.week_start ?? 1) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="set-save"><button class="btn solid">Salvar</button></div></form></div>
  <div class="set-col">
    <section class="card box"><h2>Google Agenda</h2>
      ${db.mode === 'cloud' ? `<p class="small muted">Depois de conectar sua conta, o Supabase sincroniza automaticamente a cada 5 minutos, mesmo com o HUB fechado. Eventos e blocos vinculados são atualizados nos dois sentidos; em conflitos, o Google prevalece. Exclusões são espelhadas. Eventos novos do Google só entram no HUB quando você os seleciona.</p>
        <div class="inline"><button class="btn sm solid" data-action="calendar-connect">Conectar Google</button><button class="btn sm" data-action="calendar-sync">Sincronizar agora</button><button class="btn sm" data-action="calendar-import">Escolher eventos</button><button class="btn sm ghost danger" data-action="calendar-disconnect">Desconectar</button></div>
        ${calendarFeedback ? `<p class="small" role="status">${esc(calendarFeedback)}</p>` : ''}
        <p class="small muted">A integração usa a agenda principal. A conexão segura e a sincronização automática só funcionarão depois que o OAuth do Google e a função do Supabase forem configurados.</p>` : `<p class="small muted">A sincronização com Google Agenda exige uma conta HUB conectada, não está disponível na prévia.</p>`}
      <button class="btn sm ghost" data-action="calendar-export">${icon('download')} Exportar agenda (.ics)</button></section>
    <section class="card box"><header class="box-head"><h2>Hábitos diários</h2>${addBtn('habit', 'Adicionar hábito', { cls: 'sm ghost', preset: { data: { icon: 'sparkle' } } })}</header><p class="small muted">Marcados no Início, contados no mapa de hábitos e no Arquivo de Memórias.</p>
      <ul class="rows">${habits().map(h => `<li><span class="sk-ic">${icon(dget(h, 'icon') || 'sparkle')}</span><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(h.id)}"><b>${esc(h.title)}</b></button><small>${habitStreak(h.id)} dias seguidos</small></span></li>`).join('') || '<li class="muted small">Nenhum hábito ainda.</li>'}</ul></section>
    <section class="card box"><h2>Seus dados</h2>
      <div class="inline"><button class="btn" data-action="backup">${icon('download')} Exportar tudo</button><button class="btn" data-action="csv" data-v="money">${icon('download')} Dinheiro (.csv)</button><button class="btn" data-action="csv" data-v="books">${icon('download')} Livros (.csv)</button><button class="btn" data-action="photos-zip">${icon('download')} Fotos (.zip)</button></div>
      <p class="small muted">${S.photos.length} fotos, ${fmtBytes(photoBytes())}. As fotos são reduzidas no dispositivo e guardadas em uma pasta privada.</p>
      ${db.mode === 'cloud' ? `<p class="small">Conectado como <b>${esc(S.session?.user?.email)}</b>.</p>
        <form class="inline" data-form="password"><label class="sr-only" for="newpw">Nova senha</label><input id="newpw" class="input set-in" type="password" name="password" minlength="8" placeholder="Nova senha, 8+ caracteres" autocomplete="new-password" required><button class="btn">Alterar senha</button></form>
        <div class="inline section-sm"><button class="btn" data-action="sign-out">${icon('signOut')} Sair</button></div>`
      : `<p class="small">Você está explorando a prévia. Nada é salvo e tudo recomeça ao atualizar ou sair da página.</p><div class="inline"><button class="btn" data-action="reset-demo">Redefinir demonstração</button><button class="btn ghost danger" data-action="wipe-demo">Começar vazio</button>${hasCloud ? `<a class="btn" href="${esc(location.pathname)}">Sair da demonstração</a>` : ''}</div>`}</section></div></div>`;
}
ACTIONS.theme = async (b) => { await saveSettings({ theme: b.dataset.v }); applyTheme(); rerender(); };
ACTIONS['text-size'] = async (b) => { await saveData({ textSize: Number(b.dataset.v) }); applyTheme(); rerender(); };
BINDS['set-tog'] = async (t, type) => { if (type !== 'change') return; const k = t.dataset.k; if (t.dataset.kind === 'col') await saveSettings({ [k]: t.checked }); else await saveData({ [k]: t.checked }); applyTheme(); rerender(); };
BINDS['custom-color'] = (input, type) => {
  if (type !== 'change') return;
  const text = input.closest('.hex-wrap')?.querySelector('input[type="text"]');
  if (text) text.value = input.value.toUpperCase();
};
BINDS['week-day-color'] = async (input, type) => {
  if (type !== 'change') return;
  const day = Number(input.dataset.day);
  const color = normalizeHexColor(input.value);
  if (!Number.isInteger(day) || day < 0 || day > 6 || !color) {
    toast('Selecione uma cor válida para o cabeçalho.', { error: true }); return;
  }
  await saveData({ weekDayHeaderColors: { ...(D().weekDayHeaderColors || {}), [day]: color } });
  rerender();
};
FORMS['custom-theme'] = async (form) => {
  const keys = ['paper','surface','surface2','ink','muted','accent','accent2','t1','t2','t3','t4','t5'];
  const customTheme = {};
  for (const key of keys) {
    const value = String(form.elements[key]?.value || '').trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(value)) { toast(`Código hexadecimal inválido em ${key}.`); return; }
    customTheme[key] = value;
  }
  await saveData({ customTheme });
  await saveSettings({ theme: 'custom' });
  applyTheme();
  rerender();
  toast('Cores personalizadas aplicadas.');
};
ACTIONS['calendar-export'] = () => {
  const entries = S.items.filter(item => ['event', 'block'].includes(item.kind) && /^\d{4}-\d{2}-\d{2}$/.test(item.day || ''));
  if (!entries.length) { toast('Não há eventos ou blocos com data para exportar.'); return; }
  const content = calendarIcs(entries);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hub-agenda-${today()}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast('Arquivo da agenda baixado. Importe-o no Google Agenda.');
};
ACTIONS['calendar-connect'] = async (button) => {
  button.disabled = true;
  try {
    const result = await db.calendar('connect', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
    if (!result.authorizationUrl) throw new Error('O serviço não retornou o endereço de autorização do Google.');
    location.assign(result.authorizationUrl);
  } catch (e) { fail(e); if (button.isConnected) button.disabled = false; }
};
ACTIONS['calendar-sync'] = async (button) => {
  button.disabled = true;
  try {
    const result = await db.calendar('sync');
    await ACTIONS._reload();
    toast(`Sincronização concluída: ${result.synced || 0} evento(s), ${result.deleted || 0} exclusão(ões).`);
    rerender();
  } catch (e) { fail(e); }
  finally { if (button.isConnected) button.disabled = false; }
};
ACTIONS['calendar-import'] = async (button) => {
  button.disabled = true;
  try {
    const result = await db.calendar('list-imports');
    const events = result.events || [];
    if (!events.length) {
      openModal(modalShell('Nenhum evento novo', '<p class="small">Não há eventos futuros não vinculados na agenda principal do Google.</p>', '<div class="right"><button type="button" class="btn solid" data-action="close-modal">Fechar</button></div>'), { size: 'narrow' });
      return;
    }
    const body = `<p class="small muted">Selecione quais eventos futuros deseja adicionar ao HUB. Somente os selecionados serão vinculados e sincronizados automaticamente.</p><div class="stack">${events.map(event => {
      const start = event.start?.date || event.start?.dateTime || '';
      const when = start.includes('T') ? start.replace('T', ' · ').slice(0, 16) : start;
      return `<label class="set-row"><span class="sr-t"><b>${esc(event.summary || 'Sem título')}</b><small>${esc(when)}${event.location ? ` · ${esc(event.location)}` : ''}</small></span><input type="checkbox" name="google-event" value="${esc(event.id)}"></label>`;
    }).join('')}</div>`;
    openModal(modalShell('Importar do Google Agenda', body, '<div class="right"><button type="button" class="btn ghost" data-action="close-modal">Cancelar</button><button class="btn solid">Importar selecionados</button></div>', { form: 'google-import' }), { size: 'wide' });
  } catch (e) { fail(e); }
  finally { if (button.isConnected) button.disabled = false; }
};
ACTIONS['calendar-disconnect'] = (button) => confirmButton(button, 'Toque novamente para desconectar', async () => {
  try {
    const result = await db.calendar('disconnect');
    toast(result.revocationWarning || 'Conta Google desconectada.');
    rerender();
  }
  catch (e) { fail(e); }
});
FORMS['google-import'] = async (form) => {
  const eventIds = [...form.querySelectorAll('input[name="google-event"]:checked')].map(input => input.value);
  if (!eventIds.length) { toast('Selecione pelo menos um evento.'); return; }
  try {
    const result = await db.calendar('import', { eventIds });
    await ACTIONS._reload();
    closeModal();
    rerender();
    toast(`${result.imported || 0} evento(s) importado(s) do Google Agenda.`);
  } catch (e) { fail(e); }
};
FORMS.basics = async (f) => { const v = (n) => f.elements[n].value.trim(); await saveSettings({ display_name: v('display_name') || null, currency: v('currency'), week_start: Number(v('week_start')), board_year: null }); rerender(); toast('Salvo'); };
FORMS.password = async (f) => { try { await db.updatePassword(f.elements.password.value); f.reset(); toast('Senha alterada'); } catch (e) { fail(e); } };
ACTIONS['reset-demo'] = async (b) => { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Toque novamente para redefinir tudo'; return; } await db.resetDemo(); await ACTIONS._reload(); rerender(); toast('Demonstração redefinida'); };
ACTIONS['wipe-demo'] = async (b) => { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Toque novamente para esvaziar a demonstração'; return; } await db.wipe(); await ACTIONS._reload(); location.hash = '#/home'; rerender(); toast('Tudo limpo'); };

// ---------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => rows.map(r => r.map(csvCell).join(',')).join('\n');
ACTIONS.csv = (b) => {
  const k = b.dataset.v; let rows;
  if (k === 'money') rows = [['Data', 'Descrição', 'Entrada ou saída', 'Categoria', 'Valor', 'Nota'], ...sortBy(items('txn'), s => s.day).map(s => [s.day, s.title, s.status === 'in' ? 'Entrada' : 'Saída', EXP_CATS[s.cat] || INC_CATS[s.cat] || '', s.amount, s.body])];
  else rows = [['Título', 'Autor', 'Status', 'Concluído', 'Avaliação', 'Páginas'], ...sortBy(items('book'), b => dget(b, 'finished') || '').map(b => [b.title, dget(b, 'author'), b.status, dget(b, 'finished'), dget(b, 'rating'), dget(b, 'pages')])];
  download(`${APP.toLowerCase()}-${k}-${today()}.csv`, '﻿' + csv(rows), 'text/csv');
};
ACTIONS.backup = () => download(`${APP.toLowerCase()}-backup-${today()}.json`, JSON.stringify({ app: APP, exported: new Date().toISOString(), settings: S.settings, items: S.items, photos: S.photos.map(p => ({ ...p })) }, null, 1), 'application/json');
ACTIONS['photos-zip'] = async (b) => {
  if (!S.photos.length) { toast('Nenhuma foto ainda.'); return; } b.disabled = true; const old = b.innerHTML; const files = []; let i = 0;
  try {
    for (const p of S.photos) { i++; b.textContent = `Preparando ${i} de ${S.photos.length}…`; const blob = await db.download(p.path); if (!blob) continue; const it = S.items.find(x => x.id === p.item_id); const base = `${it?.kind || 'foto'}-${(it?.title || 'sem-titulo').replace(/[^\w-]+/g, '-').slice(0, 40)}-${p.id.slice(0, 6)}`; files.push({ name: `${base}.${isPdf(p) ? 'pdf' : (blob.type.split('/')[1] || 'jpg')}`, data: new Uint8Array(await blob.arrayBuffer()) }); }
    download(`${APP.toLowerCase()}-photos-${today()}.zip`, makeZip(files));
  } catch (e) { fail(e); } finally { b.disabled = false; b.innerHTML = old; }
};
