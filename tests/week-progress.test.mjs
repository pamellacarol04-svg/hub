import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/plan?tab=week', pathname: '/', search: '' };
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { S, addDays, today } = await import('../js/core.js');
const { weekOf } = await import('../js/hub.js');
const { VIEWS_VISION } = await import('../js/views/vision.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('completed date-pinned weekly tasks count toward progress on their original day', () => {
  const originalItems = S.items;
  const originalWeekPage = S.ui.weekPage;
  const originalHash = globalThis.location.hash;
  const day = addDays(weekOf(), -4);
  S.items = [{
    id: 'past-week-task',
    kind: 'task',
    title: 'Revisar aula',
    day,
    status: 'done',
    data: { fixedDate: true, doneOn: today() },
  }];
  S.ui.weekPage = -1;
  globalThis.location.hash = '#/plan?tab=week';

  try {
    const html = VIEWS_VISION.plan({ tab: 'week' });
    assert.match(html, /class="week-progress-main"><span class="ring c[1-5]" role="img" aria-label="Progresso diário: 100%">[\s\S]*?<\/span><dl><div class="week-stat-done"><dt>Concluídas<\/dt><dd>1<\/dd><\/div><div class="week-stat-pending"><dt>Pendentes<\/dt><dd>0<\/dd><\/div><div class="week-stat-total"><dt>Total<\/dt><dd>1<\/dd><\/div>/);
  } finally {
    S.items = originalItems;
    S.ui.weekPage = originalWeekPage;
    globalThis.location.hash = originalHash;
  }
});

test('completed weekly tasks without a fixed-date flag stay on their original day', () => {
  const originalItems = S.items;
  const originalWeekPage = S.ui.weekPage;
  const originalHash = globalThis.location.hash;
  const day = addDays(weekOf(), -4);
  S.items = [{
    id: 'moved-week-task',
    kind: 'task',
    title: 'Revisar aula',
    day,
    status: 'done',
    data: { doneOn: today() },
  }];
  S.ui.weekPage = -1;
  globalThis.location.hash = '#/plan?tab=week';

  try {
    const html = VIEWS_VISION.plan({ tab: 'week' });
    assert.match(html, /class="week-progress-main"><span class="ring c[1-5]" role="img" aria-label="Progresso diário: 100%">[\s\S]*?<\/span><dl><div class="week-stat-done"><dt>Concluídas<\/dt><dd>1<\/dd><\/div><div class="week-stat-pending"><dt>Pendentes<\/dt><dd>0<\/dd><\/div><div class="week-stat-total"><dt>Total<\/dt><dd>1<\/dd><\/div>/);
  } finally {
    S.items = originalItems;
    S.ui.weekPage = originalWeekPage;
    globalThis.location.hash = originalHash;
  }
});

test('weekly cards show circular progress and styled schedule entries', () => {
  const originalItems = S.items;
  const originalWeekPage = S.ui.weekPage;
  const originalHash = globalThis.location.hash;
  const day = weekOf();
  S.items = [{
    id: 'week-block',
    kind: 'block',
    title: 'Revisão de conteúdo',
    day,
    data: { start: '09:00', end: '09:30', category: 'pessoal' },
  }];
  S.ui.weekPage = 0;
  globalThis.location.hash = '#/plan?tab=week';

  try {
    const html = VIEWS_VISION.plan({ tab: 'week' });
    assert.match(html, /class="ring c[1-5]" role="img" aria-label="Progresso diário: 0%"/);
    assert.match(html, /class="week-block-time">9:00 AM–9:30 AM<\/span>/);
    assert.match(html, /class="week-block-category">Pessoal<\/span>/);
    assert.match(html, /class="week-event"[^>]*>[\s\S]*Adicionar à agenda/);
  } finally {
    S.items = originalItems;
    S.ui.weekPage = originalWeekPage;
    globalThis.location.hash = originalHash;
  }
});
