// Settings: how it looks (theme, text size, motion, celebrations, sound), the basics (name,
// currency, week start, the planner year), your daily habits, and your data.
import { S, esc, icon, ACTIONS, BINDS, FORMS, rerender, today, toast, fail, applyTheme, THEMES, themeId, APP, CURRENCIES } from '../core.js';
import { db, hasCloud } from '../data.js';
import { saveSettings, download } from '../ui.js';
import { items, dget, sortBy, addBtn, EXP_CATS, INC_CATS } from '../kinds.js';
import { photoBytes, fmtBytes, makeZip, isPdf } from '../photos.js';
import { habits, habitStreak } from '../hub.js';
import { D, saveData, seg, hubHead } from './common.js';
import { calendarIcs } from '../calendar-export.mjs';

const tog = (key, on, label, sub, kind = 'data') => `<div class="set-row"><span class="sr-t"><b>${esc(label)}</b><small>${esc(sub)}</small></span><label class="tog-wrap"><span class="sr-only">${esc(label)}</span><input type="checkbox" class="tog" data-bind="set-tog" data-k="${key}" data-kind="${kind}" ${on ? 'checked' : ''}></label></div>`;
const THEME_PT = {
  powder: ['Pó e Peônia', 'Azul bebê e rosa peônia'],
  lilac: ['Carta Lilás', 'Lavanda, manteiga e hortelã'],
  matcha: ['Matcha e Leite', 'Sálvia, aveia e damasco'],
  apricot: ['Sol de Damasco', 'Damasco, coral e céu'],
  velvet: ['Noite Aveludada', 'Ameixa escura com luzes pastéis'],
  oxford: ['Oxford', 'Azul-marinho, pedra e latão'],
  olive: ['Campo de Oliveiras', 'Oliva, areia e linho'],
  slate: ['Ardósia', 'Cinzas frios com toque de azul aço'],
  espresso: ['Expresso', 'Café, creme e caramelo'],
  graphite: ['Grafite', 'Grafite com aço e latão'],
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
export function viewSettings() {
  const s = S.settings; const d = D(); const ts = Number(d.textSize ?? 1);
  return `${hubHead(0, 'Personalize', 'Suas <em>Configurações</em>', 'A aparência, os dados básicos, seus hábitos e suas informações.')}
  <div class="set-cols"><div class="set-col">
    <section class="card box"><h2>Aparência</h2>
      <div class="set-row"><span class="sr-t"><b>Paleta</b><small>Cinco suaves, cinco neutras. Noite Aveludada e Grafite são escuras.</small></span></div>${[['soft', 'Suaves'], ['neutral', 'Neutras']].map(([g, gl]) => `<h4 class="pal-g">${gl}</h4><div class="palettes" role="group" aria-label="Paletas ${gl.toLowerCase()}">${THEMES.filter(t => t.group === g).map(t => { const pt = THEME_PT[t.id] || [t.name, t.note]; return `<button class="pal" data-action="theme" data-v="${t.id}" aria-pressed="${themeId() === t.id}"><span class="pal-sw">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(pt[0])}</b><small>${esc(pt[1])}</small></button>`; }).join('')}</div>`).join('')}
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
      <p class="small muted">Baixe eventos e blocos de tempo do HUB em um arquivo .ics. No Google Agenda, vá a Configurações → Importar e exportar → Importar e selecione o arquivo. A importação é manual e não sincroniza alterações de volta; importar o arquivo novamente pode criar duplicatas.</p>
      <button class="btn sm solid" data-action="calendar-export">${icon('download')} Exportar agenda (.ics)</button></section>
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
