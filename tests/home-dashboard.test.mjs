import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { hash: '#/home', pathname: '/', search: '' };
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { VIEWS_HOME } = await import('../js/views/home.js');
const { HUBS } = await import('../js/hubs.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('home dashboard no longer renders the habit heatmap card', () => {
  const html = VIEWS_HOME.home({}, HUBS);
  assert.doesNotMatch(html, /m-heat|Mapa de <em>hábitos<\/em>/);
  assert.match(html, /Tendência de <em>humor<\/em>/);
});
