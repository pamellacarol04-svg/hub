import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/settings', pathname: '/', search: '' };
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { S, BINDS, hooks } = await import('../js/core.js');
const { db } = await import('../js/data.js');
const { viewSettings } = await import('../js/views/settings.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('settings expose a color picker for each weekday and use saved colors', () => {
  const originalSettings = S.settings;
  S.settings = {
    ...S.settings,
    data: { ...(S.settings.data || {}), weekDayHeaderColors: { 3: '#123ABC' } },
  };

  try {
    const html = viewSettings();
    assert.equal((html.match(/data-bind="week-day-color"/g) || []).length, 7);
    assert.match(html, /value="#123ABC" data-bind="week-day-color" data-day="3"/);
    assert.match(html, /Escolha uma cor para cada dia no Planejamento Semanal/);
  } finally {
    S.settings = originalSettings;
  }
});

test('changing one weekday color preserves other saved colors', async () => {
  const originalSettings = S.settings;
  const originalSaveSettings = db.saveSettings;
  const originalRerender = hooks.rerender;
  S.settings = {
    ...S.settings,
    data: { ...(S.settings.data || {}), weekDayHeaderColors: { 2: '#ABCDEF' } },
  };
  db.saveSettings = async patch => patch;
  hooks.rerender = () => {};

  try {
    await BINDS['week-day-color']({ value: '#123abc', dataset: { day: '4' } }, 'change');
    assert.equal(S.settings.data.weekDayHeaderColors[2], '#ABCDEF');
    assert.equal(S.settings.data.weekDayHeaderColors[4], '#123ABC');
  } finally {
    S.settings = originalSettings;
    db.saveSettings = originalSaveSettings;
    hooks.rerender = originalRerender;
  }
});
