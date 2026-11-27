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

test('completed date-pinned weekly tasks count toward progress on their planned day', () => {
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
    assert.match(html, /<strong>100%<\/strong><dl><div><dt>Concluídas<\/dt><dd>1<\/dd><\/div><div><dt>Pendentes<\/dt><dd>0<\/dd><\/div><div><dt>Total<\/dt><dd>1<\/dd><\/div>/);
  } finally {
    S.items = originalItems;
    S.ui.weekPage = originalWeekPage;
    globalThis.location.hash = originalHash;
  }
});
