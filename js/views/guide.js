// The guide: what each hub is for, how they connect, and the keyboard shortcuts.
import { esc, icon } from '../core.js';
import { card, hubHead } from './common.js';

const PARTS = [
  ['house', 'home', 'Início', 'Uma saudação com a data, semana e trimestre, sua vibe atual, reuniões de hoje, principais tarefas e hábitos, caixa de entrada e mapa de consistência dos hábitos.'],
  ['crystal', 'vision', 'Visão e Identidade', 'Um quadro de visão, tema do ano, valores essenciais, antiobjetivos e um diário que registra quando suas manifestações chegam.'],
  ['target', 'plan', 'Planejamento Estratégico', 'Sua semana atual, tarefas que avançam automaticamente, revisão semanal, ano de 12 semanas, OKRs e revisões trimestrais.'],
  ['wallet', 'money', 'Finanças', 'Entradas e saídas com gráfico de gastos, assinaturas, método de pagamento de dívidas, patrimônio líquido e lista de desejos.'],
  ['briefcase', 'career', 'Carreira e Negócios', 'Projetos que avançam conforme as tarefas são concluídas, contatos, notas de reuniões com ações, foto profissional, currículo e portfólio.'],
  ['graduation', 'learn', 'Aprendizado', 'Cursos com grade curricular importável por JSON, flashcards de repetição espaçada, notas Cornell, cronômetro com heatmap de estudo e arquivo de certificados.'],
  ['heartbeat', 'mind', 'Bem-estar Mental', 'Registro diário de humor e sentimentos, gatilhos, notas de terapia, perguntas guiadas e diário de gratidão.'],
  ['airplane', 'travel', 'Viagens e Aventuras', 'Mapa mundial, viagens com roteiro diário, orçamento e bagagem, lista de desejos e diário de viagem.'],
  ['books', 'media', 'Conteúdo e Mídia', 'Livros com progresso, lista para assistir, notas de podcasts e jogos pendentes, todos com capas.'],
  ['users', 'social', 'Relacionamentos', 'Contagem de aniversários e datas especiais, tamanhos e preferências, presentes com links, eventos e diário de conflitos.'],
  ['network', 'knowledge', 'Cofre de Conhecimento', 'Captura da web e caixa de ler depois, biblioteca etiquetada, rede de notas vinculadas e arquivos inspiradores.'],
  ['timer', 'focus', 'Trabalho Profundo', 'Pomodoro que registra sessões, blocos do dia, registro de foco, análise de distrações e mapa de energia.'],
  ['archive', 'archive', 'Arquivo de Memórias', 'Melhores momentos mensais, reflexões anuais, cartas fechadas para o futuro e o ano resumido em números.'],
];
const LINKS = ['Tarefas pertencem a projetos e o progresso do projeto vem das tarefas concluídas.', 'Itens de ação das reuniões se tornam tarefas no projeto correspondente.', 'Presentes e conflitos estão ligados às pessoas do hub Relacionamentos.', 'Baralhos de flashcards e notas Cornell pertencem aos cursos.', 'Pomodoros são registrados como trabalho profundo e ligados à tarefa escolhida.', 'Viagens e registros no diário atualizam o mapa mundial.', 'Início, revisões trimestrais e Arquivo de Memórias reúnem tudo automaticamente.'];
const KEYS = [['N', 'Captura rápida: caixa de entrada, tarefa, reunião ou dinheiro'], ['D', 'Abrir a caixa de captura da barra lateral'], ['/', 'Pesquisar em tudo'], ['H', 'Início'], ['P', 'Planejamento Estratégico (esta semana)'], ['F', 'Trabalho Profundo'], ['1 – 9', 'Hubs 1 a 9'], ['0', 'Início']];
export function viewGuide() {
  return `${hubHead(0, 'Como Tudo se Conecta', 'O <em>Guia</em>', 'Treze páginas, um sistema. Registre algo uma vez e ele aparece onde for necessário.')}
  <div class="guide-grid">${PARTS.map(([ic, r, t, d], i) => `<a href="#/${r}" class="guide-card card"><span class="g-ic">${icon(ic)}</span><span class="kick">${i ? `Nº ${String(i).padStart(2, '0')}` : 'Comece aqui'}</span><b>${esc(t)}</b><p class="small">${esc(d)}</p></a>`).join('')}</div>
  <div class="two-col">${card('Como os hubs <em>conversam</em>', `<ul class="take">${LINKS.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`, { cls: 'lined', pin: true })}${card('Atalhos do <em>teclado</em>', `<ul class="keys">${KEYS.map(([k, l]) => `<li><kbd>${esc(k)}</kbd><span>${esc(l)}</span></li>`).join('')}</ul>`, { tape: 'blue' })}</div>`;
}
