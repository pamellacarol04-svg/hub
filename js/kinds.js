// The record engine: every kind of thing HUB keeps, its fields, and one editor for all of them.
import { S, $, esc, icon, ACTIONS, FORMS, BINDS, rerender, toast, fail, buzz, pop, openModal, closeModal, modalShell, confirmButton, today, CURRENCIES, money, dayOf, hm24, atTime } from './core.js';
import { db } from './data.js';
import { photosOf, img, addPhotos, deletePhotos, deleteFilesUnder, pickButton, ACCEPT_FILES, isPdf } from './photos.js';
import { COUNTRIES } from './worldmap.js';
export const COUNTRY_NAMES = COUNTRIES.map(c => c[0]).sort();

// ---------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------
/** Live items of a kind. Items archived by the yearly refresh are left out (they're still in S.items). */
export const items = (kind) => S.items.filter(x => x.kind === kind && !x.data?.archived);
export const allItems = (kind) => S.items.filter(x => x.kind === kind);
export const byId = (id) => S.items.find(x => x.id === id) || null;
export const kids = (parentId, kind) => S.items.filter(x => x.parent_id === parentId && (!kind || x.kind === kind)).sort((a, b) => (a.position || 0) - (b.position || 0) || String(a.created_at).localeCompare(String(b.created_at)));
export const dget = (x, k, d = null) => (x?.data && x.data[k] != null ? x.data[k] : d);
export const sortBy = (list, f, dir = 1) => [...list].sort((a, b) => { const x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });

// ---------------------------------------------------------------------
// Saving (keeps S in step with the database)
// ---------------------------------------------------------------------
export async function save(row) {
  const before = row.id ? byId(row.id) : null;
  const saved = await db.save('items', row);
  const i = S.items.findIndex(x => x.id === saved.id);
  if (i >= 0) S.items[i] = saved; else S.items.push(saved);
  return saved;
}
export async function saveMany(rows) { if (!rows.length) return []; const saved = await db.insertMany('items', rows); S.items.push(...saved); return saved; }
export async function patch(x, changes) { return save({ ...x, ...changes, data: changes.data ? { ...(x.data || {}), ...changes.data } : x.data }); }
/** Delete an item, everything under it, and their photo files. */
export async function remove(id) {
  await deleteFilesUnder(id);
  await db.remove('items', id);
  const gone = new Set([id]); let grew = true;
  while (grew) { grew = false; for (const x of S.items) if (x.parent_id && gone.has(x.parent_id) && !gone.has(x.id)) { gone.add(x.id); grew = true; } }
  S.items = S.items.filter(x => !gone.has(x.id)); S.photos = S.photos.filter(p => !gone.has(p.item_id));
}

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------
export const opts = (o) => (Array.isArray(o) ? o.map(x => (Array.isArray(x) ? x : [x, x])) : Object.entries(o));
export const BLOCK_TONES = { sky: 'Azul', blush: 'Rosa', butter: 'Amarelo', sage: 'Verde', lilac: 'Lilás' };
export const PRIORITIES = { high: 'Alta', med: 'Média', low: 'Baixa' };
export const LIFE_AREAS = { self: 'Eu', health: 'Saúde', career: 'Carreira', money: 'Dinheiro', love: 'Amor e amigos', home: 'Casa', travel: 'Viagens', growth: 'Crescimento' };
export const HABIT_ICONS = { drop: 'Água', sun: 'Luz da manhã', barbell: 'Movimento', book: 'Leitura', moon: 'Sono', leaf: 'Vegetais', heart: 'Autocuidado', notePencil: 'Diário', brain: 'Aprendizado', sparkle: 'Outro' };
export const CAPTURE_KINDS = { thought: 'Ideia', task: 'Tarefa', link: 'Link' };
// 1 Vision
export const MANIFEST_STATUS = { calling: 'Manifestando', arrived: 'Realizado' };
// 2 Planning
export const QUARTERS = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
// 3 Money
export const EXP_CATS = { home: 'Casa e aluguel', food: 'Supermercado', eating: 'Restaurantes', transport: 'Transporte', shopping: 'Compras', health: 'Saúde e beleza', fun: 'Diversão e hobbies', subs: 'Assinaturas', travel: 'Viagens', gifts: 'Presentes', learning: 'Estudos', bills: 'Contas', other: 'Outro' };
export const INC_CATS = { salary: 'Salário', freelance: 'Freelancer', side: 'Renda extra', gift: 'Presente', interest: 'Juros', other: 'Outras receitas' };
export const TXN_KINDS = { out: 'Saída', in: 'Entrada' };
export const SUB_CYCLES = { monthly: 'Mensal', yearly: 'Anual', quarterly: 'A cada 3 meses', weekly: 'Semanal' };
export const SUB_STATUS = { active: 'Ativa', paused: 'Pausada', cancelled: 'Cancelada' };
export const ACCOUNT_KINDS = { checking: 'Conta corrente', savings: 'Poupança', invest: 'Investimentos', retirement: 'Aposentadoria', ewallet: 'Carteira digital', cash: 'Dinheiro', property: 'Imóvel', other: 'Outro' };
export const WISH_STATUS = { want: 'Desejando', saving: 'Guardando', bought: 'Comprado' };
// 4 Career
export const PROJECT_STAGES = { backlog: 'Lista de espera', doing: 'Em andamento', review: 'Em revisão', done: 'Concluído' };
export const CONTACT_KINDS = { mentor: 'Mentor', client: 'Cliente', colleague: 'Colega', recruiter: 'Recrutador', founder: 'Fundador', creative: 'Criativo', other: 'Outro' };
export const FOLIO_KINDS = { brand: 'Marca', web: 'Web e UX', photo: 'Fotografia', writing: 'Redação', campaign: 'Campanha', video: 'Vídeo', other: 'Outro' };
// 5 Learning
// 6 Health
export const CARDIO_KINDS = { run: 'Corrida', walk: 'Caminhada', cycle: 'Ciclismo', swim: 'Natação', hike: 'Trilha', other: 'Outro' };
export const MEAL_SLOTS = { b: 'Café da manhã', l: 'Almoço', d: 'Jantar', s: 'Lanche' };
export const ANGLES = { front: 'Frontal', side: 'Lateral', back: 'Costas' };
// 7 Mind
export const TRIGGER_KINDS = { work: 'Trabalho', people: 'Pessoas', body: 'Corpo e sono', money: 'Dinheiro', online: 'Internet', family: 'Família', other: 'Outro' };
export const JOURNAL_KINDS = { prompt: 'Pergunta guiada', gratitude: 'Gratidão', free: 'Escrita livre' };
// 8 Kitchen
export const RECIPE_KINDS = { breakfast: 'Café da manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche', dessert: 'Sobremesa' };
// 9 Home
export const ROOMS = { kitchen: 'Kitchen', living: 'Living room', bedroom: 'Bedroom', bathroom: 'Bathroom', office: 'Office', laundry: 'Laundry', outdoor: 'Outdoor', whole: 'Whole home' };
export const CHORE_FREQ = { daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
export const LIGHT = { bright: 'Bright, indirect', direct: 'Direct sun', medium: 'Medium', low: 'Low light' };
// 10 Travel
export const STOP_KINDS = { sight: 'Visitar', food: 'Comer', stay: 'Hospedar', move: 'Deslocamento', do: 'Fazer' };
export const BUCKET_STATUS = { dream: 'Sonhando', planned: 'Planejado', done: 'Concluído' };
// 11 Media
export const BOOK_STATUS = { reading: 'Lendo', tbr: 'Para ler', done: 'Concluído', dnf: 'Não terminei' };
export const WATCH_KINDS = { movie: 'Filme', show: 'Série', doc: 'Documentário' };
export const WATCH_STATUS = { list: 'Lista para assistir', watching: 'Assistindo', done: 'Assistido' };
export const GAME_STATUS = { backlog: 'Lista de jogos', playing: 'Jogando', done: 'Concluído', dropped: 'Abandonado' };
// 12 Social
export const RELATIONS = { partner: 'Parceiro(a)', family: 'Família', best: 'Melhor amigo(a)', friend: 'Amigo(a)', work: 'Trabalho', other: 'Outro' };
export const GIFT_STATUS = { idea: 'Ideia', bought: 'Comprado', given: 'Entregue' };
export const OCCASIONS = { birthday: 'Aniversário', anniversary: 'Comemoração', holiday: 'Festas', thanks: 'Agradecimento', just: 'Só porque sim' };
export const CONFLICT_STATUS = { open: 'Ainda aberto', talking: 'Conversando sobre o assunto', resolved: 'Resolvido' };
// 13 Knowledge
export const CLIP_KINDS = { article: 'Artigo', video: 'Vídeo', thread: 'Thread', paper: 'Documento', newsletter: 'Newsletter', other: 'Outro' };
export const CLIP_STATUS = { unread: 'Ler depois', read: 'Lido', archived: 'Arquivado' };
// 14 Focus
export const SESSION_KINDS = { pomodoro: 'Pomodoro', deep: 'Trabalho profundo', shallow: 'Trabalho superficial' };
export const WASTE_KINDS = { social: 'Redes sociais', news: 'Notícias', video: 'Vídeos e TV', shopping: 'Compras', phone: 'Telefone sem motivo', meetings: 'Reuniões', other: 'Outro' };
// 15 Archive
export const LETTER_STATUS = { sealed: 'Sealed', opened: 'Opened' };

const opt = (o) => () => opts(o);
const refOpts = (kind, none) => () => [['', none], ...S.items.filter(x => x.kind === kind).map(x => [x.id, x.title || 'Untitled'])];
// Field definitions. k is a column, or "d.name" for something kept in data.
// ---------------------------------------------------------------------
const F = {
  title: (label = 'Title', ph = '') => ({ k: 'title', label, type: 'text', req: true, ph, wide: true, max: 300 }),
  body: (label = 'Notes', ph = '', rows = 3) => ({ k: 'body', label, type: 'textarea', ph, wide: true, rows }),
  day: (label = 'Date', req = false) => ({ k: 'day', label, type: 'date', req }),
  amount: (label = 'Amount', req = false) => ({ k: 'amount', label, type: 'money', req }),
  cat: (label, options, o = {}) => ({ k: 'cat', label, type: 'select', options: typeof options === 'function' ? options : opts(options), ...o }),
  status: (label, options, o = {}) => ({ k: 'status', label, type: 'select', options: opts(options), ...o }),
  url: (label = 'Link') => ({ k: 'url', label, type: 'url', ph: 'https://' }),
  steps: (label = 'Steps (one per line)', ph = '') => ({ k: 'd.steps', label, type: 'steps', ph, nohint: true }),
  ref: (k, of, label, none = 'None') => ({ k, of, label, type: 'ref', none }),
  lines: (name, label, ph = '') => ({ k: 'd.' + name, label, type: 'lines', ph }),
  check: (name, label) => ({ k: 'd.' + name, label, type: 'check' }),
  d: (name, label, type = 'text', o = {}) => ({ k: 'd.' + name, label, type, ...o }),
};

const sel = (k, label, o, x = {}) => ({ k, label, type: 'select', options: typeof o === 'function' ? o : opts(o), ...x });
const num = (name, label, x = {}) => F.d(name, label, 'number', x);
const tags = (label = 'Tags (comma separated)') => ({ k: 'd.tags', label, type: 'csv', wide: true, ph: 'e.g. focus, habits, writing' });

export const DEFS = {
  // Home
  cover:    { label: 'Banner de capa', fields: [{ k: 'title', label: 'Legenda', type: 'text', max: 120, wide: true }], photos: 'one', photoLabel: 'Adicionar foto de capa' },
  vibe:     { label: 'Vibe atual', fields: [{ k: 'title', label: 'Legenda', type: 'text', max: 140, wide: true, ph: 'Ex.: manhãs tranquilas, grandes planos' }, F.day('Mês', true)], photos: 'one', photoLabel: 'Adicionar foto da vibe ou quadro de visão' },
  habit:    { label: 'Hábito', fields: [F.title('Hábito', 'Ex.: Ler 20 páginas'), sel('d.icon', 'Ícone', HABIT_ICONS), F.cat('Área da vida', LIFE_AREAS)] },
  task:     { label: 'Tarefa', fields: [F.title('Tarefa', 'Ex.: Enviar a proposta'), F.day('Fazer em'), F.cat('Prioridade', PRIORITIES), sel('parent_id', 'Projeto', refOpts('project', 'Sem projeto')), F.status('Status', { todo: 'Pendente', done: 'Concluído' }), F.body('Notas', '', 2)] },
  block:    { label: 'Reunião ou bloco de tempo', fields: [F.title('O que', 'Ex.: Reunião rápida da equipe'), F.day('Dia', true), F.d('start', 'Começa', 'time', { req: true }), F.d('end', 'Termina', 'time', { req: true }), F.cat('Cor', BLOCK_TONES), F.check('meet', 'É uma reunião'), F.body('Nota', '', 2)] },
  capture:  { label: 'Item da caixa de entrada', fields: [F.title('O que', 'Uma ideia, tarefa ou link'), F.cat('Tipo', CAPTURE_KINDS), F.url('Link')] },
  // 1 Vision & Identity
  vpin:     { label: 'Foto do quadro de visão', fields: [{ k: 'title', label: 'Legenda', type: 'text', max: 140, wide: true, ph: 'Ex.: um verão tranquilo em Lisboa' }, F.cat('Área da vida', LIFE_AREAS)], photos: 'one', photoLabel: 'Adicionar foto' },
  value:    { label: 'Valor essencial', fields: [F.title('Valor', 'Ex.: Liberdade'), F.body('O que significa para mim', 'Ex.: Meu tempo é meu para gastar.', 2)] },
  antigoal: { label: 'Anti-objetivo', fields: [F.title('Eu me recuso a…', 'Ex.: Trabalhar aos fins de semana por padrão'), F.body('Por que isso importa', '', 2)] },
  manifest: { label: 'Manifestação', fields: [F.title('Estou manifestando…', 'Ex.: Um espaço com luz da manhã'), F.day('Escrito em', true), F.status('Status', MANIFEST_STATUS), F.cat('Área da vida', LIFE_AREAS), F.d('arrived', 'Aconteceu em', 'date'), F.body('Como vai parecer', '', 3)] },
  // 2 Strategic Planning
  objective:{ label: 'Objective', fields: [F.title('Objective', 'e.g. Launch the newsletter'), { k: 'num', label: 'Year', type: 'number', req: true }, sel('d.q', 'Quarter', QUARTERS), F.cat('Life area', LIFE_AREAS), { k: 'd.krs', label: 'Key results (one per line: what | target)', type: 'krs', wide: true, ph: 'Subscribers | 500\nIssues sent | 12' }] },
  goal:     { label: 'Yearly goal', fields: [F.title('Goal', 'e.g. Run a half marathon'), { k: 'num', label: 'Year', type: 'number', req: true }, F.cat('Life area', LIFE_AREAS), F.day('By'), F.steps('Steps (one per line)')] },
  sprint:   { label: '12-week year', fields: [F.title('Vision for these 12 weeks', 'e.g. Ship the portfolio and run 10k'), F.day('Week 1 starts', true), F.lines('goals', 'Goals (one per line, up to 3)')] },
  tactic:   { label: 'Weekly tactic', fields: [F.title('Tactic', 'e.g. Write 2 case studies'), sel('parent_id', '12-week year', refOpts('sprint', 'Pick one')), F.d('goal', 'For which goal', 'text', { ph: 'e.g. Ship the portfolio' })] },
  qreview:  { label: 'Quarterly review', fields: [{ k: 'num', label: 'Year', type: 'number', req: true }, sel('cat', 'Quarter', QUARTERS), num('score', 'How it went (1–10)', { min: 1, max: 10 }), F.lines('wins', 'Wins (one per line)'), F.lines('lessons', 'Lessons (one per line)'), F.lines('next', 'Next quarter, I will… (one per line)')] },
  // 3 Money
  txn:      { label: 'Transaction', fields: [F.title('What', 'e.g. Groceries'), F.status('Kind', TXN_KINDS), F.amount('Amount', true), F.day('Date', true), { k: 'cat', label: 'Category', type: 'select', options: () => [...Object.entries(EXP_CATS), ...Object.entries(INC_CATS).map(([k, v]) => [k, `${v} (income)`])] }, F.body('Note', '', 2)] },
  sub:      { label: 'Subscription', fields: [F.title('Service', 'e.g. Spotify'), F.amount('Price', true), F.cat('Billed', SUB_CYCLES), F.day('First charge', true), F.status('Status', SUB_STATUS), F.d('ends', 'Ends on (if it does)', 'date'), F.url('Manage link')] },
  debt:     { label: 'Debt', fields: [F.title('Debt', 'e.g. Credit card'), F.amount('Balance', true), num('rate', 'Interest rate (% a year)', { min: 0, max: 100 }), F.d('min', 'Minimum payment', 'money')] },
  account:  { label: 'Account', fields: [F.title('Account', 'e.g. High-yield savings'), F.cat('Kind', ACCOUNT_KINDS), F.amount('Balance', true)] },
  wish:     { label: 'Wish list item', fields: [F.title('Item', 'e.g. A good camera'), F.amount('Price'), F.d('saved', 'Saved so far', 'money'), F.status('Status', WISH_STATUS), F.url('Link')], photos: 'one', photoLabel: 'Add a picture' },
  // 4 Career & Business
  project:  { label: 'Projeto', fields: [F.title('Projeto', 'Ex.: Nova identidade da marca'), F.status('Etapa', PROJECT_STAGES), F.day('Prazo'), F.d('client', 'Cliente ou equipe', 'text'), F.body('Resumo', '', 3)], photos: 'many', photoLabel: 'Adicionar imagens de referência' },
  contact:  { label: 'Contato', fields: [F.title('Nome', 'Ex.: Priya Shah'), F.cat('Relacionamento', CONTACT_KINDS), F.d('company', 'Empresa', 'text'), F.d('role', 'Cargo', 'text'), F.day('Último contato'), F.d('next', 'Retornar em', 'date'), F.url('LinkedIn ou site'), F.body('Notas', '', 2)] },
  meeting:  { label: 'Notas da reunião', fields: [F.title('Reunião', 'Ex.: Reunião inicial'), F.day('Data', true), F.d('time', 'Hora', 'time'), sel('d.project', 'Projeto', refOpts('project', 'Sem projeto')), F.d('who', 'Participantes', 'text'), F.body('Notas', '', 5), F.lines('actions', 'Itens de ação (um por linha)')] },
  headshot: { label: 'Foto profissional', fields: [{ k: 'title', label: 'Legenda', type: 'text', max: 120, wide: true }], photos: 'one', photoLabel: 'Adicionar foto profissional' },
  folio:    { label: 'Projeto do portfólio', fields: [F.title('Projeto', 'Ex.: Nova identidade da Juniper'), F.cat('Tipo', FOLIO_KINDS), F.day('Concluído em'), F.url('Link do projeto'), F.body('A história (problema, processo e resultado)', '', 4)], photos: 'many', photoLabel: 'Adicionar imagens' },
  role:     { label: 'Experiência', fields: [F.title('Cargo', 'Ex.: Designer sênior'), F.d('company', 'Empresa', 'text', { req: true }), F.d('from', 'De', 'month'), F.d('to', 'Até (vazio para o cargo atual)', 'month'), F.lines('points', 'Principais resultados (um por linha)')] },
  // 5 Academic & Learning
  course:   { label: 'Curso', fields: [F.title('Curso', 'Ex.: Introdução à pesquisa UX'), F.d('code', 'Código ou plataforma', 'text'), F.d('teacher', 'Professor', 'text'), F.day('Termina em'), F.url('Link do curso'), F.steps('Grade curricular (uma semana ou módulo por linha)')] },
  deck:     { label: 'Baralho de flashcards', fields: [F.title('Baralho', 'Ex.: Métodos de pesquisa'), sel('parent_id', 'Curso', refOpts('course', 'Sem curso'))] },
  flash:    { label: 'Flashcard', fields: [F.title('Frente (pergunta)', 'Ex.: O que é teste com fala em voz alta?'), F.body('Verso (resposta)', '', 3), sel('parent_id', 'Baralho', refOpts('deck', 'Escolha um baralho'))] },
  cnote:    { label: 'Nota Cornell', fields: [F.title('Tema', 'Ex.: Semana 3: entrevistas'), sel('parent_id', 'Curso', refOpts('course', 'Sem curso')), F.day('Data', true), F.lines('cues', 'Perguntas-chave (uma por linha)'), F.body('Anotações', '', 6), F.d('summary', 'Resumo', 'textarea', { wide: true, rows: 2 })] },
  cert:     { label: 'Certificado', fields: [F.title('Certificado', 'Ex.: Google UX Design'), F.d('issuer', 'Emitido por', 'text'), F.day('Conquistado em'), F.url('Link de verificação')], photos: 'one', files: true, photoLabel: 'Adicionar certificado (foto ou PDF)' },
  // 6 Health & Fitness
  lift:     { label: 'Musculação', fields: [F.title('Exercício', 'Ex.: Agachamento'), F.day('Data', true), num('weight', 'Peso (kg)', { min: 0, max: 1000 }), num('reps', 'Repetições', { min: 0, max: 200 }), num('sets', 'Séries', { min: 0, max: 50 }), num('target', 'Meta de repetições', { min: 1, max: 100 }), num('step', 'Aumentar este peso ao atingir a meta (kg)', { min: 0, max: 50 })] },
  cardio:   { label: 'Cardio', fields: [F.title('Sessão', 'Ex.: Corrida leve'), F.cat('Tipo', CARDIO_KINDS), F.day('Data', true), num('km', 'Distância (km)', { min: 0, max: 500 }), { k: 'num', label: 'Minutos', type: 'number', min: 0, max: 1440 }] },
  meal:     { label: 'Registro alimentar', fields: [F.title('O que comi', 'Ex.: Bowl de salmão e arroz'), F.day('Data', true), F.cat('Refeição', MEAL_SLOTS), num('cal', 'Calorias', { min: 0, max: 10000 }), num('protein', 'Proteína (g)', { min: 0, max: 1000 }), num('carbs', 'Carboidratos (g)', { min: 0, max: 1000 }), num('fat', 'Gorduras (g)', { min: 0, max: 1000 })] },
  measure:  { label: 'Medidas corporais', fields: [F.day('Data', true), num('weight', 'Peso (kg)', { min: 0, max: 500 }), num('waist', 'Cintura (cm)', { min: 0, max: 300 }), num('hips', 'Quadril (cm)', { min: 0, max: 300 }), num('chest', 'Peito (cm)', { min: 0, max: 300 }), num('arm', 'Braço (cm)', { min: 0, max: 150 })] },
  physique: { label: 'Foto de progresso', fields: [F.day('Data', true), F.cat('Ângulo', ANGLES), { k: 'title', label: 'Nota', type: 'text', max: 140, wide: true }], photos: 'one', photoLabel: 'Adicionar foto (privada)' },
  // 7 Mental Wellness
  trigger:  { label: 'Gatilho', fields: [F.title('O que aconteceu', 'Ex.: A reunião passou do horário, sem almoço'), F.day('Data', true), F.cat('Tipo', TRIGGER_KINDS), num('intensity', 'Intensidade (1–5)', { min: 1, max: 5 }), F.d('felt', 'O que senti', 'text'), F.d('did', 'O que fiz', 'text'), F.d('helps', 'O que ajudaria na próxima vez', 'textarea', { wide: true, rows: 2 })] },
  therapy:  { label: 'Sessão de terapia', fields: [F.title('Sobre o que conversamos', 'Ex.: Limites no trabalho'), F.day('Data', true), F.d('who', 'Com quem', 'text'), F.body('Notas', '', 5), F.lines('takeaways', 'Aprendizados (um por linha)'), F.lines('homework', 'Para praticar até a próxima sessão (um por linha)')] },
  journal:  { label: 'Registro no diário', fields: [F.title('Pergunta ou título', ''), F.cat('Tipo', JOURNAL_KINDS), F.day('Data', true), F.body('Texto', '', 8)] },
  // 8 Kitchen & Nutrition
  recipe:   { label: 'Receita', fields: [F.title('Receita', 'Ex.: Bowl de salmão com missô'), F.cat('Refeição', RECIPE_KINDS), num('mins', 'Minutos', { min: 0, max: 1440 }), num('serves', 'Porções', { min: 1, max: 50 }), F.lines('ingredients', 'Ingredientes (um por linha)'), F.body('Modo de preparo', '', 4), F.url('Link da receita'), tags('Etiquetas (separadas por vírgulas)')], photos: 'one', photoLabel: 'Adicionar foto de capa' },
  grocery:  { label: 'Item da lista de compras', fields: [F.title('Item', 'Ex.: Azeite')] },
  // 9 Home & Lifestyle
  chore:    { label: 'Tarefa doméstica', fields: [F.title('Tarefa', 'Ex.: Trocar os lençóis'), F.cat('Ambiente', ROOMS), sel('d.freq', 'Frequência', CHORE_FREQ), F.day('Última vez'), F.d('who', 'Responsável', 'text')] },
  plant:    { label: 'Planta', fields: [F.title('Planta', 'Ex.: Monstera'), F.d('where', 'Onde fica', 'text'), num('every', 'Regar a cada (dias)', { min: 1, max: 90 }), F.day('Última rega'), sel('d.light', 'Luz', LIGHT), F.body('Cuidados', '', 2)], photos: 'one', photoLabel: 'Adicionar foto' },
  belonging:{ label: 'Item do inventário', fields: [F.title('Item', 'Ex.: Sofá'), F.cat('Ambiente', ROOMS), F.amount('Valor'), F.day('Comprado em'), F.d('serial', 'Modelo ou número de série', 'text')], photos: 'many', photoLabel: 'Adicionar fotos' },
  warranty: { label: 'Garantia ou manual', fields: [F.title('Produto', 'Ex.: Cafeteira'), F.day('Comprado em'), F.d('ends', 'Garantia termina em', 'date'), F.amount('Preço'), F.d('store', 'Comprado em', 'text'), F.url('Link do manual ou suporte')], photos: 'many', files: true, photoLabel: 'Adicionar recibo, garantia ou manual' },
  room:     { label: 'Quadro de ambiente', fields: [F.title('Quadro', 'Ex.: Um quarto mais tranquilo'), F.cat('Ambiente', ROOMS), F.d('palette', 'Paleta', 'text', { ph: 'Ex.: areia, verde-menta, madeira clara' }), F.body('A visão', '', 2)], photos: 'many', photoLabel: 'Adicionar inspiração' },
  // 10 Travel & Adventure
  trip:     { label: 'Viagem', fields: [F.title('Viagem', 'Ex.: Kyoto na primavera'), F.day('Saída', true), F.d('back', 'Retorno', 'date'), F.d('place', 'Destino', 'text', { ph: 'Ex.: Kyoto, Japão' }), F.d('country', 'País', 'country'), F.lines('packing', 'Lista de bagagem (um item por linha)')] },
  stop:     { label: 'Parada no roteiro', fields: [F.title('O que fazer', 'Ex.: Fushimi Inari ao nascer do sol'), sel('parent_id', 'Viagem', refOpts('trip', 'Escolha uma viagem')), F.day('Dia', true), F.d('time', 'Hora', 'time'), F.cat('Tipo', STOP_KINDS), F.amount('Custo'), F.url('Link ou reserva')] },
  bucket:   { label: 'Lista de desejos', fields: [F.title('Sonho', 'Ex.: Ver a aurora boreal'), F.status('Status', BUCKET_STATUS), F.day('Concluído em')] },
  tdiary:   { label: 'Registro de viagem', fields: [F.title('Lugar', 'Ex.: Lisboa'), F.day('Data', true), F.d('country', 'País', 'country'), F.body('O que quero lembrar', '', 4)], photos: 'many', photoLabel: 'Adicionar foto principal' },
  // 11 Content & Media
  book:     { label: 'Livro', fields: [F.title('Título', ''), F.d('author', 'Autor', 'text'), F.status('Status', BOOK_STATUS), num('pages', 'Páginas', { min: 1, max: 10000 }), num('at', 'Na página', { min: 0, max: 10000 }), F.d('finished', 'Concluído em', 'date'), { k: 'd.rating', label: 'Avaliação', type: 'rating' }], photos: 'one', photoLabel: 'Adicionar capa' },
  watch:    { label: 'Lista para assistir', fields: [F.title('Título', ''), F.cat('Tipo', WATCH_KINDS), F.status('Status', WATCH_STATUS), F.d('where', 'Onde assistir', 'text'), F.day('Assistido em'), { k: 'd.rating', label: 'Avaliação', type: 'rating' }], photos: 'one', photoLabel: 'Adicionar pôster' },
  pod:      { label: 'Nota de podcast', fields: [F.title('Episódio', ''), F.d('show', 'Programa', 'text'), F.day('Ouvido em'), F.url('Link'), F.body('Notas', '', 4), F.lines('takeaways', 'Aprendizados (um por linha)')], photos: 'one', photoLabel: 'Adicionar capa' },
  game:     { label: 'Jogo', fields: [F.title('Jogo', ''), F.d('platform', 'Plataforma', 'text'), F.status('Status', GAME_STATUS), num('hours', 'Horas jogadas', { min: 0, max: 10000 }), { k: 'd.rating', label: 'Avaliação', type: 'rating' }], photos: 'one', photoLabel: 'Adicionar capa' },
  // 12 Relationship & Social
  person:   { label: 'Pessoa', fields: [F.title('Nome', 'Ex.: Maya'), F.cat('É meu', RELATIONS), F.day('Aniversário'), F.d('anniv', 'Comemoração', 'date'), F.d('sizes', 'Tamanhos', 'text', { ph: 'Ex.: Camisa M · Sapato 38 · Anel 6' }), F.d('likes', 'Preferências', 'text', { ph: 'Ex.: matcha, câmeras analógicas' }), F.body('Notas', '', 2)], photos: 'one', photoLabel: 'Adicionar foto' },
  gift:     { label: 'Ideia de presente', fields: [F.title('Presente', 'Ex.: Câmera analógica'), sel('d.person', 'Para', refOpts('person', 'Escolha uma pessoa')), F.cat('Ocasião', OCCASIONS), F.amount('Preço'), F.d('size', 'Tamanho', 'text'), F.status('Status', GIFT_STATUS), F.url('Link')], photos: 'one', photoLabel: 'Adicionar imagem' },
  event:    { label: 'Evento', fields: [F.title('Evento', 'Ex.: Jantar de aniversário da Maya'), F.day('Data', true), F.d('time', 'Hora', 'time'), F.d('place', 'Local', 'text'), F.amount('Orçamento'), F.lines('guests', 'Convidados (um por linha)'), F.steps('Para fazer (um por linha)'), F.body('Notas', '', 2)], photos: 'many', photoLabel: 'Adicionar inspiração' },
  conflict: { label: 'Registro de conflito', fields: [F.title('Sobre o que foi', 'Ex.: Mais um plano cancelado'), F.day('Data', true), sel('d.person', 'Com', refOpts('person', 'Outra pessoa')), F.d('happened', 'O que aconteceu (apenas os fatos)', 'textarea', { wide: true, rows: 2 }), F.d('felt', 'O que senti', 'text'), F.d('theirs', 'Ponto de vista deles, com justiça', 'textarea', { wide: true, rows: 2 }), F.d('need', 'Do que preciso', 'text'), F.status('Status', CONFLICT_STATUS), F.body('Como resolvemos', '', 2)] },
  // 13 Knowledge Vault
  clip:     { label: 'Recorte', fields: [F.title('Título', ''), F.url('Link'), F.cat('Tipo', CLIP_KINDS), F.status('Status', CLIP_STATUS), tags(), F.body('Trechos importantes e por que isso importa', '', 4)] },
  swipe:    { label: 'Arquivo inspirador', fields: [{ k: 'title', label: 'Por que é bom', type: 'text', max: 200, wide: true }, F.url('Fonte'), tags()], photos: 'one', photoLabel: 'Adicionar captura de tela' },
  zettel:   { label: 'Nota', fields: [F.title('Ideia (uma por nota)', 'Ex.: Hábitos vencem metas'), F.body('Nota. Vincule outras notas com [[Título da nota]]', '', 6), tags()] },
  // 14 Time-Boxing & Deep Work
  session:  { label: 'Sessão de foco', fields: [F.title('No que trabalhei', ''), F.day('Data', true), { k: 'num', label: 'Minutos', type: 'number', req: true, min: 1, max: 600 }, F.cat('Tipo', SESSION_KINDS), sel('parent_id', 'Tarefa', refOpts('task', 'Sem tarefa'))] },
  waste:    { label: 'Perda de tempo', fields: [F.title('O que aconteceu', 'Ex.: Naveguei pelas redes depois do almoço'), F.day('Data', true), { k: 'num', label: 'Minutos', type: 'number', req: true, min: 1, max: 1440 }, F.cat('Tipo', WASTE_KINDS), F.d('instead', 'O que eu poderia fazer', 'text')] },
  // 15 Memory Archive
  reel:     { label: 'Melhor momento do mês', fields: [{ k: 'title', label: 'Legenda', type: 'text', max: 140, wide: true }, F.d('month', 'Mês', 'month', { req: true })], photos: 'one', photoLabel: 'Adicionar sua foto favorita do mês' },
  reflect:  { label: 'Reflexão anual', fields: [{ k: 'num', label: 'Ano', type: 'number', req: true }, F.d('word', 'O ano em uma palavra', 'text'), F.lines('best', 'Melhores momentos (um por linha)'), F.lines('hard', 'Momentos mais difíceis (um por linha)'), F.lines('learned', 'O que aprendi (um por linha)'), F.lines('proud', 'Do que me orgulho (um por linha)'), F.lines('keep', 'O que levo para o próximo ano (um por linha)')] },
  letter:   { label: 'Carta para meu eu do futuro', fields: [F.title('Querido eu do futuro…', 'Ex.: Para quando você fizer 30 anos'), F.day('Escrita em', true), F.d('open', 'Abrir em', 'date', { req: true }), F.body('A carta', '', 10)] },
};
export const kindOf = (k) => DEFS[k]?.kind || k;

// ---------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------
const getv = (x, k) => (k.startsWith('d.') ? dget(x, k.slice(2)) : x?.[k]);
const decimals = () => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: S.settings.currency || 'USD' }).resolvedOptions().maximumFractionDigits; } catch { return 2; } };
/** Five faces for mood, energy and focus. */
export const FACES = ['', '😣', '🙁', '😐', '🙂', '😄'];
export function scaleInput(name, v, label) {
  return `<div class="scale" role="radiogroup" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map(n => `<label class="rate face"><input type="radio" name="${name}" value="${n}" ${Number(v) === n ? 'checked' : ''}><span aria-hidden="true">${FACES[n]}</span><span class="sr-only">${n} of 5</span></label>`).join('')}</div>`;
}
export function ratingInput(name, v, label) {
  return `<div class="rating" role="radiogroup" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map(n => `<label class="rate"><input type="radio" name="${name}" value="${n}" ${Number(v) === n ? 'checked' : ''}><span aria-hidden="true">${n}</span><span class="sr-only">${n} of 5</span></label>`).join('')}</div>`;
}
export function fieldHtml(f, x = {}) {
  const v = getv(x, f.k); const name = f.k.replace('.', '__'); const id = 'f-' + name;
  const lab = `<span>${esc(f.label)}${f.req ? '' : ''}</span>`;
  const wide = f.wide || ['textarea', 'lines', 'tags', 'members'].includes(f.type) ? ' wide' : '';
  switch (f.type) {
    case 'textarea': return `<label class="field${wide}">${lab}<textarea class="input" id="${id}" name="${name}" rows="${f.rows || 3}" maxlength="20000" placeholder="${esc(f.ph || '')}">${esc(v || '')}</textarea></label>`;
    case 'lines': return `<label class="field${wide}">${lab}<textarea class="input" id="${id}" name="${name}" rows="5" placeholder="${esc(f.ph || 'One per line')}">${esc((v || []).join('\n'))}</textarea></label>`;
    case 'date': return `<label class="field">${lab}<input class="input" type="date" id="${id}" name="${name}" value="${esc(v || '')}" ${f.req ? 'required' : ''}></label>`;
    case 'month': return `<label class="field">${lab}<input class="input" type="month" id="${id}" name="${name}" value="${esc(String(v || x.__default?.month || '').slice(0, 7))}" ${f.req ? 'required' : ''}></label>`;
    case 'time': return `<label class="field">${lab}<input class="input" type="time" id="${id}" name="${name}" value="${esc(String(v || '').slice(0, 5))}" ${f.req ? 'required' : ''}></label>`;
    case 'money': return `<label class="field">${lab}<input class="input num" inputmode="decimal" id="${id}" name="${name}" value="${v ?? ''}" placeholder="0${decimals() ? '.00' : ''}" ${f.req ? 'required' : ''}></label>`;
    case 'number': return `<label class="field">${lab}<input class="input num" inputmode="decimal" id="${id}" name="${name}" value="${v ?? ''}" ${f.req ? 'required' : ''}></label>`;
    case 'url': return `<label class="field${wide}">${lab}<input class="input" type="url" id="${id}" name="${name}" value="${esc(v || '')}" placeholder="https://"></label>`;
    case 'check': return `<label class="switch${wide}"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    case 'rating': return `<div class="field">${lab}${ratingInput(name, v, f.label)}</div>`;
    case 'select': return `<label class="field${wide}">${lab}<select class="input" id="${id}" name="${name}">${((typeof f.options === 'function' ? f.options() : f.options) || []).map(([k, l]) => `<option value="${esc(k)}" ${String(v ?? x.__default?.[f.k] ?? '') === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    case 'tags': return `<div class="field wide">${lab}<div class="chips">${f.options.map(t => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(t)}" ${(v || []).includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></div>`;
    case 'currency': { const cur = v || x.__default?.currency || S.settings.currency || 'USD'; return `<label class="field">${lab}<select class="input" id="${id}" name="${name}">${CURRENCIES.map(([c, n]) => `<option value="${c}" ${cur === c ? 'selected' : ''}>${c} · ${esc(n)}</option>`).join('')}</select></label>`; }
    case 'ref': { const hs = S.items.filter(g => g.kind === f.of); const cur = v || x.__default?.[f.k] || ''; return `<label class="field">${lab}<select class="input" id="${id}" name="${name}"><option value="">${esc(f.none || 'None')}</option>${hs.map(g => `<option value="${esc(g.id)}" ${cur === g.id ? 'selected' : ''}>${esc(g.title || g.data?.name || 'Untitled')}</option>`).join('')}</select></label>`; }
    case 'hobby': { const hs = S.items.filter(g => g.kind === 'hobby'); const cur = v || x.__default?.parent_id || ''; return `<label class="field">${lab}<select class="input" id="${id}" name="${name}"><option value="">No</option>${hs.map(g => `<option value="${esc(g.id)}" ${cur === g.id ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></label>`; }
    case 'steps': { const list = (v || []).map(st => (typeof st === 'string' ? st : st.t)); return `<label class="field wide">${lab}<textarea class="input lined" id="${id}" name="${name}" rows="${Math.max(3, list.length + 1)}" placeholder="${esc(f.ph || '')}">${esc(list.join('\n'))}</textarea>${f.nohint ? '' : '<small class="muted">Small steps count. Add “+20” to the end of a hard one for more XP.</small>'}</label>`; }
    case 'krs': { const list = (v || []).map(k => `${k.t}${k.target != null && k.target !== '' ? ` | ${k.target}` : ''}`); return `<label class="field wide">${lab}<textarea class="input" id="${id}" name="${name}" rows="${Math.max(3, list.length + 1)}" placeholder="${esc(f.ph || '')}">${esc(list.join('\n'))}</textarea><small class="muted">Update progress on the card itself.</small></label>`; }
    case 'csv': return `<label class="field wide">${lab}<input class="input" id="${id}" name="${name}" value="${esc((v || []).join(', '))}" placeholder="${esc(f.ph || '')}" maxlength="400"></label>`;
    case 'country': { const cur = v || ''; return `<label class="field">${lab}<select class="input" id="${id}" name="${name}"><option value="">Pick a country</option>${COUNTRY_NAMES.map(c => `<option ${cur === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`; }
    case 'scale': return `<div class="field">${lab}${scaleInput(name, v, f.label)}</div>`;
    case 'when': { const d0 = v ? dayOf(v) : (x.__default?.day || x.day || today()); return `<div class="field">${lab}<div class="when"><input class="input" type="date" name="${name}__d" value="${esc(d0)}" aria-label="${esc(f.label)} date"><input class="input" type="time" name="${name}__t" value="${esc(v ? hm24(v) : (x.__default?.time || ''))}" aria-label="${esc(f.label)} time"></div></div>`; }
    default: return `<label class="field${wide}">${lab}<input class="input" id="${id}" name="${name}" value="${esc(v ?? '')}" maxlength="${f.max || 300}" placeholder="${esc(f.ph || '')}" ${f.req ? 'required' : ''}></label>`;
  }
}
const toNum = (s) => { const t = String(s ?? '').replace(/[^\d.\-]/g, ''); return t === '' || t === '-' || t === '.' ? null : Number(t); };
/** Read a form back into a row (columns plus data). Returns { row, error }. */
export function readForm(f, fields, base = {}) {
  const row = { ...base, data: { ...(base.data || {}) } }; const whens = [];
  for (const fd of fields) {
    const name = fd.k.replace('.', '__'); let v;
    switch (fd.type) {
      case 'check': v = Boolean(f.elements[name]?.checked); break;
      case 'rating': case 'scale': v = toNum(f.querySelector(`input[name="${name}"]:checked`)?.value); break;
      case 'steps': { const old = (base.data?.steps || []).map(st => (typeof st === 'string' ? { t: st, done: false } : st)); v = String(f.elements[name]?.value || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean).slice(0, 60).map(t => ({ t, done: Boolean(old.find(o => o.t === t)?.done) })); break; }
      case 'hobby': case 'ref': v = String(f.elements[name]?.value || '') || null; break;
      case 'time': case 'month': v = String(f.elements[name]?.value || '') || null; break;
      case 'tags': case 'members': v = [...f.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value); break;
      case 'when': { whens.push([fd, name]); continue; }
      case 'krs': { const old = base.data?.krs || []; v = String(f.elements[name]?.value || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean).slice(0, 12).map(line => { const [t, tg] = line.split('|').map(z => z.trim()); const o = old.find(k => k.t === t); const target = toNum(tg); return { t: t.slice(0, 200), target: target ?? o?.target ?? 100, cur: o?.cur ?? 0 }; }); break; }
      case 'csv': v = String(f.elements[name]?.value || '').split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 20); break;
      case 'country': v = String(f.elements[name]?.value || '') || null; break;
      case 'lines': v = String(f.elements[name]?.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 200); break;
      case 'money': case 'number': v = toNum(f.elements[name]?.value); break;
      default: v = String(f.elements[name]?.value ?? '').trim(); if (v === '') v = null;
    }
    if ((fd.k === 'num' || fd.k === 'd.target') && fd.type === 'select') v = toNum(v);
    if (fd.req && (v == null || v === '' || (Array.isArray(v) && !v.length))) return { error: `${fd.label} is needed.` };
    if (fd.type === 'url' && v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (fd.min != null && typeof v === 'number' && v < fd.min) return { error: `${fd.label} must be at least ${fd.min}.` };
    if (fd.max != null && typeof v === 'number' && fd.type !== 'text' && v > fd.max) return { error: `${fd.label} can be at most ${fd.max}.` };
    if (fd.k.startsWith('d.')) row.data[fd.k.slice(2)] = v; else row[fd.k] = v;
  }
  // Dates with times (local time).
  for (const [fd, name] of whens) {
    const d = f.elements[name + '__d']?.value; const t = f.elements[name + '__t']?.value;
    const v = d ? atTime(d, t || '09:00') : null; if (fd.req && !v) return { error: `${fd.label} is needed.` };
    row[fd.k] = v; if (fd.k === 'at' && d) row.day = d;
  }
  if ('title' in row && row.title == null) row.title = '';
  return { row };
}

// ---------------------------------------------------------------------
// One editor for everything
// ---------------------------------------------------------------------
/** Pages can adjust a row before it's saved (BEFORE[kind](row, old)) and react after (AFTER[kind](row, isNew)). */
export const AFTER = {};
export const BEFORE = {};
let pending = []; // files chosen before a new item is saved
let editAfter = null;
export function openEditor(kind, x = null, opts = {}) {
  const def = DEFS[kind]; const isNew = !x?.id; const base = { ...(x || {}), kind: kindOf(kind) };
  pending = []; editAfter = opts.after || null;
  const fields = opts.fields || def.fields;
  const shown = { ...base, __default: opts.defaults || {} };
  const photos = def.photos && !isNew ? photosOf(base.id) : [];
  const photoBox = def.photos && !opts.fields ? `<div class="field wide"><span>${def.photos === 'one' ? 'Foto' : 'Fotos'}</span>
    <div class="ed-photos" id="ed-photos">${photos.map(p => `<figure class="ed-ph">${img(p)}<button type="button" class="icon-btn" data-action="ed-photo-del" data-id="${esc(p.id)}" aria-label="Remover foto">${icon('close')}</button></figure>`).join('')}
    ${def.photos === 'one' && photos.length ? '' : `<label class="ed-add">${icon('camera')}<span>${esc(def.photoLabel || (def.photos === 'one' ? 'Adicionar foto' : 'Adicionar fotos'))}</span><input type="file" accept="${def.files ? ACCEPT_FILES : 'image/*'}" ${def.photos === 'many' ? 'multiple' : ''} class="sr-only" data-bind="ed-files"></label>`}</div>
    <p class="small muted" id="ed-pending" style="margin:.3rem 0 0"></p></div>` : '';
  openModal(modalShell(opts.title || (isNew ? `Adicionar ${def.label.toLowerCase()}` : `Editar ${def.label.toLowerCase()}`),
    `<div class="form-grid">${fields.map(f => fieldHtml(f, shown)).join('')}${photoBox}${opts.extra || ''}</div>`,
    `${!isNew && !opts.noDelete ? `<button type="button" class="btn ghost danger" data-action="ed-del" data-id="${esc(base.id)}">${icon('trash')} Excluir</button>` : '<span></span>'}
     <div class="right"><button type="button" class="btn ghost" data-action="close-modal">Cancelar</button><button class="btn solid">${isNew ? 'Adicionar' : 'Salvar'}</button></div>`,
    { form: 'item', attrs: `data-kind="${esc(kind)}" data-id="${esc(base.id || '')}" data-parent="${esc(opts.parent || base.parent_id || '')}"` }), { size: opts.size || (fields.length > 5 || def.photos ? '' : 'narrow') });
  S.ui.editFields = fields; S.ui.editBase = { ...base };
}
BINDS['ed-files'] = async (t, type) => {
  if (type !== 'change') return;
  const f = t.closest('form'); const id = f.dataset.id; const files = [...t.files]; t.value = '';
  if (!files.length) return;
  if (id) { // already saved: upload now
    const label = t.closest('.ed-add'); label.classList.add('busy'); label.querySelector('span').textContent = 'Adding…';
    await addPhotos(id, DEFS[f.dataset.kind].photos === 'one' ? files.slice(0, 1) : files);
    const x = byId(id); const keepOpen = S.ui.editFields; openEditor(f.dataset.kind, x, { fields: keepOpen, after: editAfter }); rerender();
  } else {
    pending = DEFS[f.dataset.kind].photos === 'one' ? files.slice(0, 1) : [...pending, ...files];
    $('#ed-pending').textContent = `${pending.length} ${pending.length === 1 ? 'photo' : 'photos'} will be added when you save.`;
  }
};
ACTIONS['ed-photo-del'] = async (b) => {
  const p = S.photos.find(x => x.id === b.dataset.id); if (!p) return;
  try { await deletePhotos([p]); b.closest('figure').remove(); const f = $('#modal form'); if (f && DEFS[f.dataset.kind].photos === 'one') openEditor(f.dataset.kind, byId(f.dataset.id), { fields: S.ui.editFields, after: editAfter }); rerender(); } catch (e) { fail(e); }
};
FORMS.item = async (f) => {
  const ek = f.dataset.kind; const kind = kindOf(ek); const old = f.dataset.id ? byId(f.dataset.id) : null;
  const nb = { ...(S.ui.editBase || {}) }; delete nb.__default;
  const { row, error } = readForm(f, S.ui.editFields || DEFS[ek].fields, old || { ...nb, kind, parent_id: f.dataset.parent || nb.parent_id || null });
  if (error) { toast(error, { error: true }); return; }
  BEFORE[ek]?.(row, old);
  try {
    const saved = await save(row);
    AFTER[ek]?.(saved, !old); if (ek !== kind) AFTER[kind]?.(saved, !old);
    if (pending.length) { const files = pending; pending = []; await addPhotos(saved.id, files); }
    closeModal(); buzz(10); rerender();
    editAfter?.(saved, !old);
  } catch (e) { fail(e); }
};
ACTIONS['ed-del'] = (b) => confirmButton(b, 'Tap again to delete', async () => {
  try { await remove(b.dataset.id); closeModal(); rerender(); toast('Deleted'); } catch (e) { fail(e); }
});
/** Open the editor for an existing item from a button with data-id. */
export const editorKind = (x) => x.kind;
ACTIONS.edit = (b) => { const x = byId(b.dataset.id); if (x) openEditor(editorKind(x), x); };
/** A new item from a button: data-kind, optional data-parent and data-preset (JSON). */
ACTIONS.add = (b) => {
  const preset = b.dataset.preset ? JSON.parse(b.dataset.preset) : {};
  openEditor(b.dataset.kind, { kind: b.dataset.kind, parent_id: b.dataset.parent || null, ...preset }, { parent: b.dataset.parent, preset });
};
/** Toggle a status between two values: data-id, data-a (off), data-b (on). */
ACTIONS.toggle = async (b) => {
  const x = byId(b.dataset.id); if (!x) return; const on = x.status !== b.dataset.b;
  try { await patch(x, { status: on ? b.dataset.b : b.dataset.a, ...(b.dataset.day && on ? { day: today() } : {}) }); if (on) { buzz(12); pop(b, 10); } rerender(); } catch (e) { fail(e); }
};
export const addBtn = (kind, label, opts = {}) => `<button class="btn ${opts.cls || 'solid'}" data-action="add" data-kind="${kind}" ${opts.parent ? `data-parent="${esc(opts.parent)}"` : ''} ${opts.preset ? `data-preset="${esc(JSON.stringify(opts.preset))}"` : ''}>${icon(opts.icon || 'plus')} ${esc(label)}</button>`;
export { money, CURRENCIES };
