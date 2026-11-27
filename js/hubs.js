// Home and the thirteen hubs: [route, label, icon, a short line, callout colour].
/** Home and the thirteen hubs: [route, label, icon, a short line]. */
export const HUBS = [
  ['home', 'Início', 'house', 'hoje, em resumo', 'yellow'],
  ['vision', 'Visão e Identidade', 'crystal', 'quem estou me tornando', 'purple'],
  ['plan', 'Planejamento Estratégico', 'target', 'semanas, trimestres, objetivos', 'blue'],
  ['money', 'Finanças', 'wallet', 'entradas, saídas e patrimônio', 'green'],
  ['career', 'Carreira e Negócios', 'briefcase', 'projetos, pessoas e portfólio', 'blue'],
  ['learn', 'Aprendizado', 'graduation', 'cursos, cartões e notas', 'brown'],
  ['mind', 'Bem-estar Mental', 'heartbeat', 'humor, gatilhos e terapia', 'pink'],
  ['travel', 'Viagens e Aventuras', 'airplane', 'mapa, viagens e diário', 'blue'],
  ['media', 'Conteúdo e Mídia', 'books', 'ler, assistir, ouvir e jogar', 'purple'],
  ['social', 'Relacionamentos', 'users', 'datas, presentes e eventos', 'pink'],
  ['knowledge', 'Cofre de Conhecimento', 'network', 'clipes, etiquetas e links', 'gray'],
  ['focus', 'Trabalho Profundo', 'timer', 'pomodoros e energia', 'red'],
  ['archive', 'Arquivo de Memórias', 'archive', 'o ano guardado', 'brown'],
];

/** Each hub's pages, shown under it in the sidebar and as tabs on the page. */
export const HUB_TABS = {
  vision: [['board', 'Quadro de visão'], ['identity', 'Identidade'], ['manifest', 'Diário de realizações']],
  plan: [['day', 'Diário'], ['week', 'Semanal'], ['quarter', 'Trimestral'], ['year', 'Anual'], ['twelve', 'Ano de 12 semanas'], ['okr', 'OKRs'], ['review', 'Revisão trimestral']],
  money: [['flow', 'Entradas e saídas'], ['subs', 'Assinaturas'], ['debt', 'Pagamento de dívidas'], ['worth', 'Patrimônio líquido'], ['wish', 'Lista de desejos']],
  career: [['projects', 'Projetos'], ['crm', 'Rede de contatos'], ['meetings', 'Notas de reuniões'], ['portfolio', 'Portfólio e currículo']],
  learn: [['courses', 'Cursos'], ['cards', 'Flashcards'], ['notes', 'Notas Cornell'], ['certs', 'Certificados'], ['study', 'Tempo de estudo']],
  mind: [['mood', 'Humor'], ['triggers', 'Gatilhos'], ['therapy', 'Notas de terapia'], ['journal', 'Diário e gratidão']],
  travel: [['map', 'Mapa mundial'], ['trips', 'Viagens'], ['bucket', 'Lista de desejos'], ['diary', 'Diário de viagem']],
  media: [['books', 'Livros'], ['watch', 'Lista para assistir'], ['pods', 'Notas de podcasts'], ['games', 'Jogos']],
  social: [['people', 'Pessoas e encontros'], ['gifts', 'Ideias de presentes'], ['events', 'Eventos'], ['repair', 'Diário de conflitos']],
  knowledge: [['inbox', 'Ler depois'], ['library', 'Biblioteca'], ['network', 'Etiquetas e notas'], ['swipe', 'Arquivos inspiradores']],
  focus: [['timer', 'Pomodoro'], ['boxes', 'Blocos de tempo'], ['log', 'Registro de foco'], ['audit', 'Perdas de tempo'], ['energy', 'Mapa de energia']],
  archive: [['reel', 'Melhores momentos'], ['reflect', 'Reflexões'], ['letters', 'Cartas para o futuro'], ['numbers', 'O ano em números']],
};
