import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/', hash: '#/mind?tab=mood' };
const { S, FORMS, BINDS, ACTIONS, hooks } = await import('../js/core.js');
const { db } = await import('../js/data.js');
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { VIEWS_LIFE } = await import('../js/views/life.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

const mockDocument = (toasts) => ({
  createElement: () => ({ className: '', innerHTML: '', remove() {} }),
  querySelector: () => ({ appendChild: element => toasts.push({ className: element.className, innerHTML: element.innerHTML }) }),
});

test('mood, feelings, and note can be recorded for a past date', async () => {
  const originalSettings = S.settings;
  const originalUi = S.ui;
  const originalSaveSettings = db.saveSettings;
  const originalRerender = hooks.rerender;
  const originalDocument = globalThis.document;
  const toasts = [];
  const pastDay = '2025-03-04';
  S.settings = { ...S.settings, data: {}, haptics: false, decor: false };
  S.ui = {};
  db.saveSettings = async patch => patch;
  hooks.rerender = () => {};
  globalThis.document = mockDocument(toasts);

  try {
    const dateInput = { value: pastDay };
    BINDS['mind-record-day'](dateInput, 'change');
    await ACTIONS.feel({ dataset: { day: pastDay, v: 'Ansioso' } });
    await FORMS['mood-note']({ elements: { day: { value: pastDay }, note: { value: 'Dia difícil' } } });

    assert.equal(S.ui.mindDay, pastDay);
    assert.deepEqual(S.settings.data.feelings[pastDay], ['Ansioso']);
    assert.equal(S.settings.data.moodNote[pastDay], 'Dia difícil');
    const html = VIEWS_LIFE.mind({ tab: 'mood' });
    assert.match(html, new RegExp(`data-day="${pastDay}"`));
    assert.match(html, new RegExp(`name="day" value="${pastDay}"`));

    dateInput.value = '2099-01-01';
    BINDS['mind-record-day'](dateInput, 'change');
    assert.equal(S.ui.mindDay, pastDay);
    assert.equal(dateInput.value, pastDay);
    assert.match(toasts.at(-1).className, /toast err/);
  } finally {
    S.settings = originalSettings;
    S.ui = originalUi;
    db.saveSettings = originalSaveSettings;
    hooks.rerender = originalRerender;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('journal and gratitude forms save retroactive dates', async () => {
  const originalSettings = S.settings;
  const originalUi = S.ui;
  const originalItems = S.items;
  const originalSave = db.save;
  const originalRerender = hooks.rerender;
  const originalDocument = globalThis.document;
  const pastDay = '2025-03-04';
  S.ui = { ...S.ui, mindDay: pastDay };
  S.settings = { ...S.settings, haptics: false, decor: false };
  S.items = [];
  db.save = async (_kind, row) => ({ ...row, id: row.id || `saved-${S.items.length + 1}` });
  hooks.rerender = () => {};
  globalThis.document = mockDocument([]);

  try {
    await FORMS['journal-write']({
      elements: { body: { value: 'Uma lembrança importante.' }, day: { value: pastDay }, prompt: { value: 'O que aprendi?' } },
      reset() {},
    });
    await FORMS['grat-write']({
      elements: { day: { value: pastDay }, g1: { value: 'Uma conversa boa' }, g2: { value: '' }, g3: { value: '' } },
    });

    assert.match(VIEWS_LIFE.mind({ tab: 'journal' }), new RegExp(`name="day" value="${pastDay}"`));
    assert.deepEqual(S.items.map(({ cat, day, body }) => ({ cat, day, body })), [
      { cat: 'prompt', day: pastDay, body: 'Uma lembrança importante.' },
      { cat: 'gratitude', day: pastDay, body: 'Uma conversa boa' },
    ]);
  } finally {
    S.settings = originalSettings;
    S.ui = originalUi;
    S.items = originalItems;
    db.save = originalSave;
    hooks.rerender = originalRerender;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
