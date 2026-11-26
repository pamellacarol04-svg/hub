import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { blockColor, normalizeHexColor } = await import('../js/kinds.js');

test('normalizes six-digit HEX colors with or without a leading hash', () => {
  assert.equal(normalizeHexColor('#a1b2c3'), '#A1B2C3');
  assert.equal(normalizeHexColor('a1b2c3'), '#A1B2C3');
});

test('rejects invalid colors and only returns safe colors for appointments', () => {
  assert.equal(normalizeHexColor('#GGGGGG'), null);
  assert.equal(blockColor({ data: { color: '#12ab34' } }), '#12AB34');
  assert.equal(blockColor({ data: { color: 'red' } }), null);
});
