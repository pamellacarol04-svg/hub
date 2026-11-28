import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/settings', pathname: '/', search: '' };
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { S, THEMES, applyTheme, isDark, themeId } = await import('../js/core.js');
const { viewSettings } = await import('../js/views/settings.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('new palettes are available in settings and the night palette enables dark mode', () => {
  const originalSettings = S.settings;
  const expected = ['brilho', 'chiclete', 'vinca', 'sorvete', 'noite'];

  try {
    for (const id of expected) {
      const theme = THEMES.find(item => item.id === id);
      assert.ok(theme, `${id} is registered`);
      assert.ok(theme.sw.length > 0);
      assert.ok(theme.sw.every(color => /^#[0-9A-F]{6}$/i.test(color)));
    }
    assert.equal(THEMES.find(item => item.id === 'brilho').sw[0], '#FCF8F3');
    assert.equal(THEMES.find(item => item.id === 'chiclete').sw[0], '#FCF8F3');

    S.settings = { ...S.settings, theme: 'noite' };
    assert.equal(themeId(), 'noite');
    assert.equal(isDark(), true);

    const root = {
      dataset: {},
      style: { removeProperty() {} },
      classList: { toggle() {} },
    };
    globalThis.document = {
      documentElement: root,
      querySelector: () => ({ setAttribute() {} }),
    };
    applyTheme();
    assert.equal(root.dataset.theme, 'noite');
    assert.equal(root.style.colorScheme, 'dark');

    const html = viewSettings();
    assert.match(html, /Paletas modo noturno/);
    for (const id of expected) assert.match(html, new RegExp(`data-v="${id}"`));
  } finally {
    S.settings = originalSettings;
    if (importDocument === undefined) delete globalThis.document;
    else globalThis.document = importDocument;
  }
});
